const currencyFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const compactFormatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', notation: 'compact', maximumFractionDigits: 1 });

export const formatCurrency = (value) => currencyFormatter.format(Number(value) || 0);
export const formatCompactCurrency = (value) => compactFormatter.format(Number(value) || 0);

export const formatDate = (iso) =>
  iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const formatDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '-';

/** '2026-11' -> 'Nov' (or 'Nov 26' with year). */
export const formatMonth = (yyyyMm, withYear = false) =>
  new Date(`${yyyyMm}-01T00:00:00`).toLocaleDateString('en-US', { month: 'short', ...(withYear && { year: '2-digit' }) });

export const initials = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('') || '?';

const AVATAR_COLORS = ['#0f766e', '#4f46e5', '#b45309', '#be123c', '#0369a1', '#7c3aed', '#15803d', '#c2410c'];
/** A stable colour per name so the same person always gets the same avatar. */
export const avatarColor = (name = '') => AVATAR_COLORS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLORS.length];

const TITLES = new Set(['dr', 'dr.', 'mr', 'mr.', 'mrs', 'mrs.', 'ms', 'ms.', 'prof', 'prof.']);
/** "Dr. Meera Nair" -> "Dr. Meera", "Asha Verma" -> "Asha" (a bare title is not a friendly name). */
export const friendlyName = (name = '') => {
  const parts = name.trim().split(/\s+/);
  return TITLES.has(parts[0]?.toLowerCase()) && parts[1] ? `${parts[0]} ${parts[1]}` : parts[0] || 'there';
};

export const greeting = (date = new Date()) => {
  const hour = date.getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};

export const todayPlus = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const GENDERS = ['Male', 'Female', 'Other'];
export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
export const PAYMENT_STATUSES = ['Pending', 'Paid', 'Failed', 'Cancelled'];
