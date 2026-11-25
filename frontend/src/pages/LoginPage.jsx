import { LogIn } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { Alert, Field, PasswordInput, Spinner } from '../components/common';
import { clearAuthError, login } from '../store/authSlice';
import { validateLogin } from '../utils/validators';

export default function LoginPage() {
  const dispatch = useDispatch();
  const { status, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const loading = status === 'loading';

  useEffect(() => () => { dispatch(clearAuthError()); }, [dispatch]);

  const change = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = (event) => {
    event.preventDefault();
    const found = validateLogin(form);
    setErrors(found);
    if (Object.keys(found).length === 0) dispatch(login(form));
  };

  return (
    <AuthLayout>
      <h1>Welcome back</h1>
      <p className="sub">Sign in to your clinic workspace.</p>

      <form className="stack" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <Field label="Email" error={errors.email}>
          {(props) => <input {...props} className="input" type="email" autoComplete="email" placeholder="you@clinic.com" value={form.email} onChange={change('email')} autoFocus />}
        </Field>
        <Field label="Password" error={errors.password}>
          {(props) => <PasswordInput {...props} autoComplete="current-password" placeholder="Your password" value={form.password} onChange={change('password')} />}
        </Field>
        <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ height: 42 }}>
          {loading ? <Spinner /> : <LogIn size={17} />} {loading ? 'Signing in...' : 'Sign in'}
        </button>
        {import.meta.env.DEV && (
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setForm({ email: 'admin@example.com', password: 'Admin@123' })}>
            Fill demo account (development only)
          </button>
        )}
      </form>

      <p className="auth-foot">New to CareDesk? <Link to="/register"><strong>Create an account</strong></Link></p>
    </AuthLayout>
  );
}
