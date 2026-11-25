import { createSlice } from '@reduxjs/toolkit';

const systemTheme = () => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

/**
 * ui: stacked toast notifications ({ id, type: 'success' | 'error' | 'info', message }) and the colour theme.
 * `theme` is persisted (see store/index.js) so the choice survives a refresh.
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState: { toasts: [], theme: null },
  reducers: {
    showToast: {
      reducer: (state, { payload }) => {
        state.toasts = [...state.toasts, payload].slice(-4);
      },
      prepare: ({ type = 'success', message }) => ({ payload: { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type, message } }),
    },
    dismissToast: (state, { payload }) => {
      state.toasts = state.toasts.filter((toast) => toast.id !== payload);
    },
    toggleTheme: (state) => {
      state.theme = (state.theme ?? systemTheme()) === 'dark' ? 'light' : 'dark';
    },
  },
});

export const { showToast, dismissToast, toggleTheme } = uiSlice.actions;
export const selectTheme = (state) => state.ui.theme ?? systemTheme();
export default uiSlice.reducer;
