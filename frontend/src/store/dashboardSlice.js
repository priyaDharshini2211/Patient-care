import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getErrorMessage } from '../api/client';
import { dashboardApi } from '../api/services';
import { logout } from './authSlice';

export const fetchDashboardSummary = createAsyncThunk('dashboard/fetchSummary', async (_, { rejectWithValue }) => {
  try {
    return await dashboardApi.getSummary();
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

const initialState = { summary: null, loading: false, error: null };

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  extraReducers: (builder) => {
    builder
      .addCase(logout, () => initialState)
      .addCase(fetchDashboardSummary.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardSummary.fulfilled, (state, { payload }) => {
        state.loading = false;
        state.summary = payload;
      })
      .addCase(fetchDashboardSummary.rejected, (state, { payload, error }) => {
        state.loading = false;
        state.error = payload ?? error.message;
      });
  },
});

export default dashboardSlice.reducer;
