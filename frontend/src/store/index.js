import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { attachInterceptors } from '../api/client';
import authReducer, { logout } from './authSlice';
import billsReducer from './billsSlice';
import dashboardReducer from './dashboardSlice';
import patientsReducer from './patientsSlice';
import paymentsReducer from './paymentsSlice';
import uiReducer from './uiSlice';

// Only the login session and the theme survive a page refresh; all other data is re-fetched from the API.
const persistedAuthReducer = persistReducer(
  { key: 'auth', storage, whitelist: ['user', 'token', 'isAuthenticated'] },
  authReducer,
);

const persistedUiReducer = persistReducer({ key: 'ui', storage, whitelist: ['theme'] }, uiReducer);

const rootReducer = combineReducers({
  auth: persistedAuthReducer,
  patients: patientsReducer,
  bills: billsReducer,
  payments: paymentsReducer,
  dashboard: dashboardReducer,
  ui: persistedUiReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: { ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER] },
    }),
});

export const persistor = persistStore(store);

attachInterceptors({
  getToken: () => store.getState().auth.token,
  onUnauthorized: () => store.dispatch(logout()),
});
