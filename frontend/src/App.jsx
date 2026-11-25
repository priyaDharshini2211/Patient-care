import { lazy, Suspense } from 'react';
import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { EmptyState, FullPageLoader } from './components/common';
import { ProtectedRoute, PublicRoute } from './components/Layout';
import BillDetailsPage from './pages/BillDetailsPage';
import BillingPage from './pages/BillingPage';
import LoginPage from './pages/LoginPage';
import PatientDetailsPage from './pages/PatientDetailsPage';
import PatientsPage from './pages/PatientsPage';
import PaymentDetailsPage from './pages/PaymentDetailsPage';
import PaymentsPage from './pages/PaymentsPage';
import RegisterPage from './pages/RegisterPage';
import SettingsPage from './pages/SettingsPage';

// The dashboard pulls in the charting library, so it is loaded on demand to keep the first screen light.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

function NotFound() {
  return (
    <div className="card">
      <EmptyState title="Page not found" action={<Link to="/dashboard" className="btn btn-primary">Back to dashboard</Link>}>
        The page you are looking for does not exist or has moved.
      </EmptyState>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<FullPageLoader />}>
    <Routes>
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/patients" element={<PatientsPage />} />
        <Route path="/patients/:id" element={<PatientDetailsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/billing/:id" element={<BillDetailsPage />} />
        <Route path="/payments" element={<PaymentsPage />} />
        <Route path="/payments/:id" element={<PaymentDetailsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
    </Suspense>
  );
}
