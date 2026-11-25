import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getErrorMessage } from '../api/client';
import { authApi } from '../api/services';

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  status: 'idle', // idle | loading | failed
  error: null,
  profileStatus: 'idle', // idle | saving
};

const guarded = (type, request) =>
  createAsyncThunk(`auth/${type}`, async (arg, { rejectWithValue }) => {
    try {
      return await request(arg);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  });

export const login = guarded('login', (credentials) => authApi.login({ email: credentials.email.trim(), password: credentials.password }));
// Send only what the API accepts (it rejects unknown fields such as the form's confirmPassword / accepted).
export const register = guarded('register', ({ name, email, password, clinicName }) =>
  authApi.register({ name: name.trim(), email: email.trim(), password, clinicName: clinicName?.trim() || undefined }),
);
export const refreshProfile = guarded('refreshProfile', () => authApi.me());
export const updateProfile = guarded('updateProfile', (payload) => authApi.updateProfile(payload));
export const changePassword = guarded('changePassword', (payload) => authApi.changePassword(payload));

const startSession = (state, { payload }) => {
  state.status = 'idle';
  state.user = payload.user;
  state.token = payload.accessToken;
  state.isAuthenticated = true;
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: () => initialState,
    clearAuthError: (state) => {
      state.error = null;
      state.status = 'idle';
    },
  },
  extraReducers: (builder) => {
    [login, register].forEach((thunk) => {
      builder
        .addCase(thunk.pending, (state) => {
          state.status = 'loading';
          state.error = null;
        })
        .addCase(thunk.fulfilled, startSession)
        .addCase(thunk.rejected, (state, { payload, error }) => {
          state.status = 'failed';
          state.error = payload ?? error.message;
        });
    });

    builder
      .addCase(refreshProfile.fulfilled, (state, { payload }) => {
        state.user = payload;
      })
      .addCase(updateProfile.pending, (state) => {
        state.profileStatus = 'saving';
      })
      .addCase(updateProfile.fulfilled, (state, { payload }) => {
        state.profileStatus = 'idle';
        state.user = payload;
      })
      .addCase(updateProfile.rejected, (state) => {
        state.profileStatus = 'idle';
      });
  },
});

export const { logout, clearAuthError } = authSlice.actions;
export default authSlice.reducer;
