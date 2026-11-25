import { KeyRound, Moon, Sun, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert, Field, PageHeader, PasswordInput, Spinner } from '../components/common';
import { changePassword, logout, refreshProfile, updateProfile } from '../store/authSlice';
import { selectTheme, showToast, toggleTheme } from '../store/uiSlice';
import { formatDateTime } from '../utils/format';
import { PASSWORD_RULES, validatePasswordChange, validateProfile } from '../utils/validators';

function ProfileCard() {
  const dispatch = useDispatch();
  const { user, profileStatus } = useSelector((state) => state.auth);
  const [form, setForm] = useState({ name: user?.name ?? '', clinicName: user?.clinicName ?? '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const saving = profileStatus === 'saving';
  const dirty = form.name.trim() !== user?.name || form.clinicName.trim() !== (user?.clinicName ?? '');

  const submit = async (event) => {
    event.preventDefault();
    const found = validateProfile(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setServerError(null);
    const result = await dispatch(updateProfile({ name: form.name.trim(), clinicName: form.clinicName.trim() }));
    if (updateProfile.fulfilled.match(result)) dispatch(showToast({ message: 'Profile updated' }));
    else setServerError(result.payload);
  };

  return (
    <section className="card">
      <div className="card-head"><User size={18} /><h3>Profile</h3></div>
      <form className="card-pad stack" onSubmit={submit} noValidate>
        {serverError && <Alert>{serverError}</Alert>}
        <div className="form-grid">
          <Field label="Your name" required error={errors.name}>
            {(props) => <input {...props} className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={100} />}
          </Field>
          <Field label="Clinic / practice name" hint="Shown on invoices and receipts">
            {(props) => <input {...props} className="input" value={form.clinicName} onChange={(e) => setForm({ ...form, clinicName: e.target.value })} maxLength={120} />}
          </Field>
          <Field label="Email" hint="Your sign-in email cannot be changed">
            {(props) => <input {...props} className="input" value={user?.email ?? ''} disabled />}
          </Field>
          <Field label="Member since">
            {(props) => <input {...props} className="input" value={formatDateTime(user?.createdAt)} disabled />}
          </Field>
        </div>
        <div className="row"><button type="submit" className="btn btn-primary" disabled={saving || !dirty}>{saving && <Spinner />} Save changes</button></div>
      </form>
    </section>
  );
}

function PasswordCard() {
  const dispatch = useDispatch();
  const empty = { currentPassword: '', newPassword: '', confirmPassword: '' };
  const [form, setForm] = useState(empty);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const change = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validatePasswordChange(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setServerError(null);
    setSaving(true);
    const result = await dispatch(changePassword({ currentPassword: form.currentPassword, newPassword: form.newPassword }));
    setSaving(false);
    if (changePassword.fulfilled.match(result)) {
      setForm(empty);
      dispatch(showToast({ message: 'Password changed. Use it next time you sign in.' }));
    } else setServerError(result.payload);
  };

  return (
    <section className="card">
      <div className="card-head"><KeyRound size={18} /><h3>Password</h3></div>
      <form className="card-pad stack" onSubmit={submit} noValidate autoComplete="off">
        {serverError && <Alert>{serverError}</Alert>}
        <Field label="Current password" required error={errors.currentPassword}>
          {(props) => <PasswordInput {...props} autoComplete="current-password" value={form.currentPassword} onChange={change('currentPassword')} />}
        </Field>
        <div className="form-grid">
          <Field label="New password" required error={errors.newPassword} hint={PASSWORD_RULES.map((r) => r.label).join(' - ')}>
            {(props) => <PasswordInput {...props} autoComplete="new-password" value={form.newPassword} onChange={change('newPassword')} />}
          </Field>
          <Field label="Confirm new password" required error={errors.confirmPassword}>
            {(props) => <PasswordInput {...props} autoComplete="new-password" value={form.confirmPassword} onChange={change('confirmPassword')} />}
          </Field>
        </div>
        <div className="row"><button type="submit" className="btn btn-primary" disabled={saving}>{saving && <Spinner />} Update password</button></div>
      </form>
    </section>
  );
}

export default function SettingsPage() {
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => { dispatch(refreshProfile()); }, [dispatch]);

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your profile, security and appearance." />
      <div className="stack" style={{ maxWidth: 760 }}>
        {/* Re-mounts when the saved profile changes (e.g. after the fresh copy loads), so the form never shows stale values. */}
        <ProfileCard key={`${user?.id}|${user?.name}|${user?.clinicName ?? ''}`} />
        <PasswordCard />

        <section className="card">
          <div className="card-head"><h3>Appearance</h3></div>
          <div className="card-pad row" style={{ justifyContent: 'space-between' }}>
            <div><strong>Theme</strong><div className="muted">Currently using the {theme} theme.</div></div>
            <button type="button" className="btn btn-secondary" onClick={() => dispatch(toggleTheme())}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />} Switch to {theme === 'dark' ? 'light' : 'dark'}</button>
          </div>
        </section>

        <section className="card">
          <div className="card-head"><h3>Session</h3></div>
          <div className="card-pad row" style={{ justifyContent: 'space-between' }}>
            <div><strong>Last sign-in</strong><div className="muted">{user?.lastLoginAt ? formatDateTime(user.lastLoginAt) : 'This is your first session'}</div></div>
            <button type="button" className="btn btn-secondary" onClick={() => dispatch(logout())}>Sign out</button>
          </div>
        </section>
      </div>
    </>
  );
}
