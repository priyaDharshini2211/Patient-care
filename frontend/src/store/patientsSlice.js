import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { patientsApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import { logout } from './authSlice';

const idleOperation = { loading: false, error: null };

const initialState = {
  items: [],
  total: 0,
  totalPages: 1,
  loading: false,
  error: null,
  requestId: null,
  filters: { search: '', gender: '', page: 1, limit: 10, sortBy: 'createdAt', order: 'DESC' },
  selected: null,
  selectedLoading: false,
  selectedError: null,
  operations: { create: idleOperation, update: idleOperation, delete: idleOperation },
};

/** Removes empty filters so they are not sent as `?gender=`. */
const toQueryParams = (filters) => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));

/** Fetches the current page using the filters stored in Redux (search + gender are applied by the backend). */
export const fetchPatients = createAsyncThunk('patients/fetchAll', async (_, { getState, rejectWithValue }) => {
  try {
    return await patientsApi.list(toQueryParams(getState().patients.filters));
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

export const fetchPatientById = createAsyncThunk('patients/fetchOne', async (id, { rejectWithValue }) => {
  try {
    return await patientsApi.get(id);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

/** Mutations re-fetch the list afterwards so the UI always reflects the database. */
const mutation = (type, request) =>
  createAsyncThunk(`patients/${type}`, async (arg, { dispatch, rejectWithValue }) => {
    try {
      const result = await request(arg);
      dispatch(fetchPatients());
      return result;
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  });

export const createPatient = mutation('create', (payload) => patientsApi.create(payload));
export const updatePatient = mutation('update', ({ id, ...payload }) => patientsApi.update(id, payload));
export const deletePatient = mutation('delete', (id) => patientsApi.remove(id));

const patientsSlice = createSlice({
  name: 'patients',
  initialState,
  reducers: {
    /** Changing search/gender/sort resets to page 1; changing only `page` keeps it. */
    setFilters: (state, { payload }) => {
      const resetsPage = Object.keys(payload).some((key) => key !== 'page');
      state.filters = { ...state.filters, ...(resetsPage && { page: 1 }), ...payload };
    },
    clearSelectedPatient: (state) => {
      state.selected = null;
      state.selectedError = null;
    },
    resetOperation: (state, { payload }) => {
      state.operations[payload] = idleOperation;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(logout, () => initialState)
      .addCase(fetchPatients.pending, (state, { meta }) => {
        state.loading = true;
        state.error = null;
        state.requestId = meta.requestId;
      })
      .addCase(fetchPatients.fulfilled, (state, { payload, meta }) => {
        if (meta.requestId !== state.requestId) return; // ignore stale responses (fast typing)
        state.loading = false;
        state.items = payload.items;
        state.total = payload.total;
        state.totalPages = payload.totalPages;
      })
      .addCase(fetchPatients.rejected, (state, { payload, error, meta }) => {
        if (meta.requestId !== state.requestId) return;
        state.loading = false;
        state.error = payload ?? error.message;
      })
      .addCase(fetchPatientById.pending, (state) => {
        state.selectedLoading = true;
        state.selectedError = null;
      })
      .addCase(fetchPatientById.fulfilled, (state, { payload }) => {
        state.selectedLoading = false;
        state.selected = payload;
      })
      .addCase(fetchPatientById.rejected, (state, { payload, error }) => {
        state.selectedLoading = false;
        state.selected = null;
        state.selectedError = payload ?? error.message;
      });

    [
      ['create', createPatient],
      ['update', updatePatient],
      ['delete', deletePatient],
    ].forEach(([key, thunk]) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.operations[key] = { loading: true, error: null };
        })
        .addCase(thunk.fulfilled, (state) => {
          state.operations[key] = idleOperation;
        })
        .addCase(thunk.rejected, (state, { payload, error }) => {
          state.operations[key] = { loading: false, error: payload ?? error.message };
        });
    });
  },
});

export const { setFilters, clearSelectedPatient, resetOperation } = patientsSlice.actions;
export default patientsSlice.reducer;
