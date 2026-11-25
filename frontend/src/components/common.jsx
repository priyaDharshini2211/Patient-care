import { AlertCircle, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Eye, EyeOff, HeartPulse, Info, Loader2, SearchX, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { dismissToast } from '../store/uiSlice';
import { avatarColor, initials } from '../utils/format';

export function Logo({ light = false }) {
  return (
    <span className="brand-mark" style={light ? { color: '#fff' } : undefined}>
      <span className="brand-logo"><HeartPulse size={20} /></span>
      CareDesk
    </span>
  );
}

export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="spin" aria-hidden="true" />;
}

export function FullPageLoader() {
  return (
    <div className="center-screen" role="status" aria-label="Loading">
      <div className="loader" />
    </div>
  );
}

export function Skeleton({ width = '100%', height = 14 }) {
  return <span className="skeleton" style={{ width, height }} aria-hidden="true" />;
}

/** Placeholder rows shown while a table loads (better than a spinner: the layout does not jump). */
export function TableSkeleton({ columns = 5, rows = 6 }) {
  return (
    <tbody>
      {Array.from({ length: rows }, (_, row) => (
        <tr key={row}>
          {Array.from({ length: columns }, (_, col) => (
            <td key={col}><Skeleton width={col === 0 ? '70%' : '55%'} /></td>
          ))}
        </tr>
      ))}
    </tbody>
  );
}

export function EmptyState({ icon: Icon = SearchX, title, children, action }) {
  return (
    <div className="state">
      <div className="art"><Icon size={26} /></div>
      <h3>{title}</h3>
      {children && <p style={{ maxWidth: 380 }}>{children}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="state" role="alert">
      <div className="art" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}><AlertTriangle size={26} /></div>
      <h3>Something went wrong</h3>
      <p>{message}</p>
      {onRetry && <button type="button" className="btn btn-secondary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

export function Alert({ type = 'error', children }) {
  const Icon = type === 'success' ? CheckCircle2 : type === 'info' ? Info : AlertCircle;
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} style={{ flex: 'none', marginTop: 1 }} />
      <div>{children}</div>
    </div>
  );
}

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="spacer" />
      <div className="row">{children}</div>
    </div>
  );
}

export function Avatar({ name, size }) {
  return (
    <span className={`avatar ${size === 'lg' ? 'avatar-lg' : ''}`} style={{ background: avatarColor(name) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

const STATUS_CLASS = { Paid: 'paid', Pending: 'pending', Failed: 'failed', Cancelled: 'cancelled' };

export function StatusBadge({ status, overdue = false }) {
  if (overdue) return <span className="badge badge-overdue">Overdue</span>;
  return <span className={`badge badge-${STATUS_CLASS[status] ?? 'neutral'}`}>{status}</span>;
}

/** Labelled form control. `children` is the control; it receives the generated id automatically. */
export function Field({ label, error, hint, required, children, className = '' }) {
  const id = useId();
  const control = typeof children === 'function' ? children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? `${id}-err` : undefined }) : children;
  return (
    <div className={`field ${error ? 'invalid' : ''} ${className}`}>
      {label && <label htmlFor={id}>{label}{required && <span className="req"> *</span>}</label>}
      {control}
      {error ? <span id={`${id}-err`} className="field-error" role="alert">{error}</span> : hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

export function PasswordInput({ value, onChange, show: controlledShow, ...props }) {
  const [shown, setShown] = useState(false);
  const show = controlledShow ?? shown;
  return (
    <div className="input-wrap">
      <input className="input" type={show ? 'text' : 'password'} value={value} onChange={onChange} {...props} />
      <button type="button" className="icon-btn" onClick={() => setShown((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'} tabIndex={-1}>
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function Modal({ title, onClose, children, footer, size, busy = false }) {
  const ref = useRef(null);
  const titleId = useId();

  const closeRef = useRef(onClose);
  const busyRef = useRef(busy);
  closeRef.current = onClose;
  busyRef.current = busy;

  // Runs once per open: focus the first field, lock page scroll, close on Escape, restore focus afterwards.
  useEffect(() => {
    const previous = document.activeElement;
    const onKey = (event) => {
      if (event.key === 'Escape' && !busyRef.current) closeRef.current();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector('input, select, textarea, button.btn-primary, button.btn-danger')?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previous?.focus?.();
    };
  }, []);

  return (
    <div className="overlay" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div className={`modal ${size ?? ''}`} role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref}>
        <div className="modal-head">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} disabled={busy} aria-label="Close"><X size={18} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmLabel = 'Delete', loading, error, onConfirm, onCancel, danger = true }) {
  return (
    <Modal
      title={title}
      size="sm"
      busy={loading}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={loading}>Cancel</button>
          <button type="button" className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {loading && <Spinner />} {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ color: 'var(--text-2)' }}>{message}</p>
      {error && <div style={{ marginTop: 14 }}><Alert>{error}</Alert></div>}
    </Modal>
  );
}

export function Pagination({ page, totalPages, total, limit, onPage, onLimit }) {
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);
  return (
    <div className="pagination">
      <span>Showing {from}-{to} of {total}</span>
      <div className="spacer" />
      {onLimit && (
        <select className="select" style={{ width: 'auto', height: 32 }} value={limit} onChange={(e) => onLimit(Number(e.target.value))} aria-label="Rows per page">
          {[10, 25, 50].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
      )}
      <button type="button" className="icon-btn" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
      <span style={{ color: 'var(--text)', fontWeight: 600 }}>{page} / {totalPages}</span>
      <button type="button" className="icon-btn" disabled={page >= totalPages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone = 'teal', foot }) {
  return (
    <div className="card stat">
      <div className="top">
        <span>{label}</span>
        <span className={`icon tone-${tone}`}><Icon size={18} /></span>
      </div>
      <div className="value mono">{value}</div>
      {foot && <div className="foot">{foot}</div>}
    </div>
  );
}

function ToastItem({ toast }) {
  const dispatch = useDispatch();
  useEffect(() => {
    const timer = setTimeout(() => dispatch(dismissToast(toast.id)), toast.type === 'error' ? 7000 : 4200);
    return () => clearTimeout(timer);
  }, [dispatch, toast.id, toast.type]);

  const Icon = toast.type === 'error' ? AlertCircle : toast.type === 'info' ? Info : CheckCircle2;
  return (
    <div className={`toast ${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
      <Icon size={18} className="lead" />
      <span className="msg">{toast.message}</span>
      <button type="button" className="icon-btn" style={{ width: 24, height: 24 }} onClick={() => dispatch(dismissToast(toast.id))} aria-label="Dismiss"><X size={14} /></button>
    </div>
  );
}

export function Toasts() {
  const toasts = useSelector((state) => state.ui.toasts);
  return <div className="toasts" aria-live="polite">{toasts.map((toast) => <ToastItem key={toast.id} toast={toast} />)}</div>;
}
