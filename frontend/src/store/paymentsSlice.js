import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { paymentsApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import { loadRazorpayScript, openCheckout } from '../utils/razorpay';
import { logout } from './authSlice';
import { fetchBillById, fetchBillStats, fetchBills } from './billsSlice';

/**
 * Payment lifecycle kept in Redux:
 * idle -> creating_order -> awaiting_payment -> verifying -> succeeded | failed | cancelled
 */
const initialState = {
  status: 'idle',
  activeBillId: null,
  loading: false, // true while any step of a payment is running
  error: null,
  lastPayment: null,
  history: [],
  historyTotal: 0,
  historyTotalPages: 1,
  historyFilters: { status: '', page: 1, limit: 10 },
  historyLoading: false,
  historyError: null,
  selected: null,
  selectedLoading: false,
  selectedError: null,
};

/** Payment history for the filters in Redux (status + paging); pass `{ billId }` to override for a single bill. */
export const fetchPaymentHistory = createAsyncThunk('payments/fetchHistory', async (params, { getState, rejectWithValue }) => {
  try {
    return await paymentsApi.list({ ...getState().payments.historyFilters, ...params });
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchPaymentById = createAsyncThunk('payments/fetchOne', async (id, { rejectWithValue }) => {
  try {
    return await paymentsApi.get(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

/**
 * Full "Pay Bill" flow:
 * 1. ask backend to create a Razorpay order  2. open Checkout  3. send the result to the backend for
 * signature verification  4. refresh bills/payments so the UI shows the new status.
 */
export const payBill = createAsyncThunk('payments/payBill', async (billId, { dispatch, rejectWithValue }) => {
  let order;
  try {
    dispatch(paymentStatusChanged('creating_order'));
    order = await paymentsApi.createOrder(billId);
    await loadRazorpayScript();

    dispatch(paymentStatusChanged('awaiting_payment'));
    const checkoutResult = await openCheckout({
      order,
      onPaymentFailed: ({ reason, paymentId }) =>
        paymentsApi
          .reportFailure({ razorpay_order_id: order.orderId, razorpay_payment_id: paymentId, reason })
          .catch(() => {}), // best effort - the user already sees the failure
    });

    dispatch(paymentStatusChanged('verifying'));
    const payment = await paymentsApi.verify(checkoutResult);
    return payment;
  } catch (error) {
    // Errors thrown by openCheckout are plain objects; everything else is an axios/Error instance.
    const isCheckoutEvent = error && (error.dismissed || error.failure);
    return rejectWithValue({
      message: isCheckoutEvent ? error.message : getErrorMessage(error),
      cancelled: Boolean(error?.dismissed),
    });
  } finally {
    // Always refresh so a Failed/Paid status written by the backend becomes visible.
    dispatch(fetchBills());
    dispatch(fetchBillStats());
    dispatch(fetchBillById(billId));
    dispatch(fetchPaymentHistory());
  }
});

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {
    paymentStatusChanged: (state, { payload }) => {
      state.status = payload;
      state.loading = true;
    },
    resetPaymentState: (state) => {
      state.status = 'idle';
      state.loading = false;
      state.error = null;
      state.activeBillId = null;
      state.lastPayment = null;
    },
    setPaymentFilters: (state, { payload }) => {
      const resetsPage = Object.keys(payload).some((key) => key !== 'page');
      state.historyFilters = { ...state.historyFilters, ...(resetsPage && { page: 1 }), ...payload };
    },
    clearSelectedPayment: (state) => {
      state.selected = null;
      state.selectedError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logout, () => initialState)
      .addCase(payBill.pending, (state, { meta }) => {
        state.status = 'creating_order';
        state.loading = true;
        state.error = null;
        state.lastPayment = null;
        state.activeBillId = meta.arg;
      })
      .addCase(payBill.fulfilled, (state, { payload }) => {
        state.status = 'succeeded';
        state.loading = false;
        state.lastPayment = payload;
      })
      .addCase(payBill.rejected, (state, { payload, error }) => {
        const failure = payload ?? { message: error.message };
        state.status = failure.cancelled ? 'cancelled' : 'failed';
        state.loading = false;
        state.error = failure.message;
      })
      .addCase(fetchPaymentHistory.pending, (state) => {
        state.historyLoading = true;
        state.historyError = null;
      })
      .addCase(fetchPaymentHistory.fulfilled, (state, { payload }) => {
        state.historyLoading = false;
        state.history = payload.items;
        state.historyTotal = payload.total;
        state.historyTotalPages = payload.totalPages;
      })
      .addCase(fetchPaymentHistory.rejected, (state, { payload, error }) => {
        state.historyLoading = false;
        state.historyError = payload ?? error.message;
      })
      .addCase(fetchPaymentById.pending, (state) => {
        state.selectedLoading = true;
        state.selectedError = null;
      })
      .addCase(fetchPaymentById.fulfilled, (state, { payload }) => {
        state.selectedLoading = false;
        state.selected = payload;
      })
      .addCase(fetchPaymentById.rejected, (state, { payload, error }) => {
        state.selectedLoading = false;
        state.selected = null;
        state.selectedError = payload ?? error.message;
      });
  },
});

export const { paymentStatusChanged, resetPaymentState, setPaymentFilters, clearSelectedPayment } = paymentsSlice.actions;
export default paymentsSlice.reducer;
