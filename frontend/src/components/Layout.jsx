import { CreditCard, FileText, LayoutDashboard, LogOut, Menu, Moon, Settings, Sun, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { logout } from '../store/authSlice';
import { fetchBillStats } from '../store/billsSlice';
import { selectTheme, toggleTheme } from '../store/uiSlice';
import { Avatar, Logo, Toasts } from './common';
import { Link } from 'react-router-dom';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/billing', label: 'Billing', icon: FileText, badge: true },
  { to: '/payments', label: 'Payments', icon: CreditCard },
];

const TITLES = [
  ['/dashboard', 'Dashboard'],
  ['/patients', 'Patients'],
  ['/billing', 'Billing'],
  ['/payments', 'Payments'],
  ['/settings', 'Settings'],
];

function UserMenu({ user }) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div className="menu" ref={ref}>
      <button type="button" className="icon-btn" style={{ width: 38, height: 38 }} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Account menu">
        <Avatar name={user.name} />
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          <div style={{ padding: '8px 10px' }}>
            <strong style={{ display: 'block' }}>{user.name}</strong>
            <span className="muted" style={{ fontSize: 12.5 }}>{user.email}</span>
          </div>
          <hr />
          <Link to="/settings" role="menuitem" onClick={() => setOpen(false)}><Settings size={16} /> Settings</Link>
          <button type="button" role="menuitem" onClick={() => dispatch(logout())}><LogOut size={16} /> Sign out</button>
        </div>
      )}
    </div>
  );
}

/** Authenticated shell: sidebar navigation (drawer on mobile), top bar, theme toggle, toasts. */
export function AppShell() {
  const dispatch = useDispatch();
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const theme = useSelector(selectTheme);
  const overdue = useSelector((state) => state.bills.stats?.overdue.count ?? 0);
  const [open, setOpen] = useState(false);

  useEffect(() => { dispatch(fetchBillStats()); }, [dispatch]);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);

  const title = TITLES.find(([prefix]) => location.pathname.startsWith(prefix))?.[1] ?? 'CareDesk';

  return (
    <div className="shell">
      <div className={`scrim ${open ? 'show' : ''}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="Primary">
        <Logo light />
        <nav className="nav">
          <div className="nav-label">Workspace</div>
          {NAV.map(({ to, label, icon: Icon, badge }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'active' : '')}>
              <Icon size={18} /> {label}
              {badge && overdue > 0 && <span className="count" title={`${overdue} overdue bills`}>{overdue}</span>}
            </NavLink>
          ))}
          <div className="nav-label">Account</div>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'active' : '')}><Settings size={18} /> Settings</NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="user-chip">
            <Avatar name={user?.name} />
            <div className="who">
              <strong>{user?.name}</strong>
              <span>{user?.clinicName || user?.email}</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button type="button" className="icon-btn menu-btn" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu size={20} /></button>
          <strong style={{ fontSize: 15 }}>{title}</strong>
          <span className="crumb">{user?.clinicName}</span>
          <div className="spacer" />
          <button type="button" className="icon-btn" onClick={() => dispatch(toggleTheme())} aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}>
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {user && <UserMenu user={user} />}
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
      <Toasts />
    </div>
  );
}

/** Renders the shell only for signed-in users; everyone else is sent to the login page. */
export function ProtectedRoute() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <AppShell />;
}

/** Login / register are for signed-out users; signed-in users go straight to the app. */
export function PublicRoute({ children }) {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const theme = useSelector(selectTheme);
  const location = useLocation();
  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  if (isAuthenticated) return <Navigate to={location.state?.from ?? '/dashboard'} replace />;
  return (
    <>
      {children}
      <Toasts />
    </>
  );
}
