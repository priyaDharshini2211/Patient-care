import { Check, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { Alert, Field, PasswordInput, Spinner } from '../components/common';
import { clearAuthError, register } from '../store/authSlice';
import { showToast } from '../store/uiSlice';
import { friendlyName } from '../utils/format';
import { PASSWORD_RULES, passwordStrength, validateRegister } from '../utils/validators';

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong'];

export default function RegisterPage() {
  const dispatch = useDispatch();
  const { status, error } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ name: '', clinicName: '', email: '', password: '', confirmPassword: '', accepted: false });
  const [errors, setErrors] = useState({});
  const loading = status === 'loading';
  const strength = passwordStrength(form.password);

  useEffect(() => () => { dispatch(clearAuthError()); }, [dispatch]);

  const change = (field) => (event) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validateRegister(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const result = await dispatch(register(form));
    if (register.fulfilled.match(result)) {
      dispatch(showToast({ message: `Welcome to CareDesk, ${friendlyName(result.payload.user.name)}! Your workspace is ready.` }));
    }
  };

  return (
    <AuthLayout>
      <h1>Create your account</h1>
      <p className="sub">Start managing patients and payments in minutes.</p>

      <form className="stack" onSubmit={submit} noValidate>
        {error && <Alert>{error}</Alert>}
        <div className="form-grid">
          <Field label="Your name" required error={errors.name} className="full">
            {(props) => <input {...props} className="input" autoComplete="name" placeholder="Dr. Meera Nair" value={form.name} onChange={change('name')} autoFocus />}
          </Field>
          <Field label="Clinic or practice name" hint="Optional - shown on invoices" className="full">
            {(props) => <input {...props} className="input" autoComplete="organization" placeholder="Nair Family Clinic" value={form.clinicName} onChange={change('clinicName')} />}
          </Field>
          <Field label="Work email" required error={errors.email} className="full">
            {(props) => <input {...props} className="input" type="email" autoComplete="email" placeholder="you@clinic.com" value={form.email} onChange={change('email')} />}
          </Field>
        </div>

        <Field label="Password" required error={errors.password}>
          {(props) => <PasswordInput {...props} autoComplete="new-password" placeholder="Create a password" value={form.password} onChange={change('password')} />}
        </Field>
        {form.password && (
          <div style={{ marginTop: -6 }}>
            <div className="strength" data-level={strength} aria-hidden="true"><i /><i /><i /><i /></div>
            <div className="row" style={{ marginTop: 6, justifyContent: 'space-between' }}>
              <span className="field-hint">Password strength: <strong>{STRENGTH_LABELS[strength] || 'Too short'}</strong></span>
            </div>
            <ul className="rules">
              {PASSWORD_RULES.map((rule) => (
                <li key={rule.id} className={rule.test(form.password) ? 'ok' : ''}><Check size={14} /> {rule.label}</li>
              ))}
            </ul>
          </div>
        )}

        <Field label="Confirm password" required error={errors.confirmPassword}>
          {(props) => <PasswordInput {...props} autoComplete="new-password" placeholder="Repeat the password" value={form.confirmPassword} onChange={change('confirmPassword')} />}
        </Field>

        <div className={`field ${errors.accepted ? 'invalid' : ''}`}>
          <label className="checkbox">
            <input type="checkbox" checked={form.accepted} onChange={change('accepted')} />
            <span>I agree to the Terms of Service and Privacy Policy, and I will only store patient data I am permitted to hold.</span>
          </label>
          {errors.accepted && <span className="field-error" role="alert">{errors.accepted}</span>}
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ height: 42 }}>
          {loading ? <Spinner /> : <UserPlus size={17} />} {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="auth-foot">Already have an account? <Link to="/login"><strong>Sign in</strong></Link></p>
    </AuthLayout>
  );
}
