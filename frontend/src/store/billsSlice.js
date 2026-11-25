import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getErrorMessage } from '../api/client';
import { billsApi, patientsApi } from '../api/services';
import { logout } from './authSlice';

const idleOperation = { loading: false, error: null };

const initialState = {
  items: [],
  total: 0,
  totalPages: 1,
  loading: false,
  error: null,
  requestId: null,
  filters: { search: '', paymentStatus: '', overdue: '', page: 1, limit: 10, sortBy: 'createdAt', order: 'DESC' },
  stats: null,
  selected: null,
  selectedLoading: false,
  selectedError: null,
  patientOptions: [], // lightweight list for the "Patient" dropdown of the bill form
  operations: { create: idleOperation, update: idleOperation, delete: idleOperation },
};

const guarded = (type, request) =>
  createAsyncThunk(`bills/${type}`, async (arg, { rejectWithValue, getState }) => {
    try {
      return await request(arg, getState);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  });

/** Lists the bills matching the filters stored in Redux (search, status, overdue and paging are applied by the backend). */
export const fetchBills = guarded('fetchAll', (_, getState) => billsApi.list(getState().bills.filters));
export const fetchBillStats = guarded('fetchStats', () => billsApi.stats());
export const fetchBillById = guarded('fetchOne', (id) => billsApi.get(id));
export const fetchPatientOptions = guarded('fetchPatientOptions', () =>
  patientsApi.list({ limit: 100, sortBy: 'name', order: 'ASC' }).then((data) => data.items),
);

/** Mutations re-fetch the list and the tab counts afterwards so the UI always reflects the database. */
const mutation = (type, request) =>
  createAsyncThunk(`bills/${type}`, async (arg, { dispatch, rejectWithValue }) => {
    try {
      const result = await request(arg);
      dispatch(fetchBills());
      dispatch(fetchBillStats());
      return result;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  });

export const createBill = mutation('create', (payload) => billsApi.create(payload));
export const updateBill = mutation('update', ({ id, ...payload }) => billsApi.update(id, payload));
export const deleteBill = mutation('delete', (id) => billsApi.remove(id));

const billsSlice = createSlice({
  name: 'bills',
  initialState,
  reducers: {
    /** Changing any filter other than `page` resets to page 1. */
    setBillFilters: (state, { payload }) => {
      const resetsPage = Object.keys(payload).some((key) => key !== 'page');
      state.filters = { ...state.filters, ...(resetsPage && { page: 1 }), ...payload };
    },
    resetBillOperation: (state, { payload }) => {
      state.operations[payload] = idleOperation;
    },
    clearSelectedBill: (state) => {
      state.selected = null;
      state.selectedError = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logout, () => initialState)
      .addCase(fetchBills.pending, (state, { meta }) => {
        state.loading = true;
        state.error = null;
        state.requestId = meta.requestId;
      })
      .addCase(fetchBills.fulfilled, (state, { payload, meta }) => {
        if (meta.requestId !== state.requestId) return; // ignore stale responses (fast typing)
        state.loading = false;
        state.items = payload.items;
        state.total = payload.total;
        state.totalPages = payload.totalPages;
      })
      .addCase(fetchBills.rejected, (state, { payload, error, meta }) => {
        if (meta.requestId !== state.requestId) return;
        state.loading = false;
        state.error = payload ?? error.message;
      })
      .addCase(fetchBillStats.fulfilled, (state, { payload }) => {
        state.stats = payload;
      })
      .addCase(fetchBillById.pending, (state) => {
        state.selectedLoading = true;
        state.selectedError = null;
      })
      .addCase(fetchBillById.fulfilled, (state, { payload }) => {
        state.selectedLoading = false;
        state.selected = payload;
      })
      .addCase(fetchBillById.rejected, (state, { payload, error }) => {
        state.selectedLoading = false;
        state.selected = null;
        state.selectedError = payload ?? error.message;
      })
      .addCase(fetchPatientOptions.fulfilled, (state, { payload }) => {
        state.patientOptions = payload;
      });

    [
      ['create', createBill],
      ['update', updateBill],
      ['delete', deleteBill],
    ].forEach(([key, action]) => {
      builder
        .addCase(action.pending, (state) => {
          state.operations[key] = { loading: true, error: null };
        })
        .addCase(action.fulfilled, (state) => {
          state.operations[key] = idleOperation;
        })
        .addCase(action.rejected, (state, { payload, error }) => {
          state.operations[key] = { loading: false, error: payload ?? error.message };
        });
    });
  },
});

export const { setBillFilters, resetBillOperation, clearSelectedBill } = billsSlice.actions;
export default billsSlice.reducer;
