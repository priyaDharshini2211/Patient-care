import { CalendarClock, FileText, ShieldCheck, Wallet } from 'lucide-react';
import { Logo } from './common';

const FEATURES = [
  [Wallet, 'Get paid faster', 'Send bills and collect secure online payments with Razorpay.'],
  [FileText, 'Invoices that look professional', 'Printable invoices and receipts, generated for every bill.'],
  [CalendarClock, 'Never miss a follow-up', 'Due dates and overdue tracking keep your cash flow healthy.'],
  [ShieldCheck, 'Private by design', 'Each clinic account only ever sees its own patients and bills.'],
];

/** Split-screen layout shared by the sign-in and sign-up pages. */
export default function AuthLayout({ children }) {
  return (
    <div className="auth">
      <aside className="auth-brand">
        <Logo light />
        <div>
          <h2>Run your practice, not your paperwork.</h2>
          <p>Patient records, billing and online payments in one calm, fast workspace built for clinics.</p>
          <ul className="auth-features">
            {FEATURES.map(([Icon, title, text]) => (
              <li key={title}>
                <Icon size={20} />
                <span><strong style={{ color: '#fff', display: 'block' }}>{title}</strong>{text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="auth-quote">Secure by default - passwords are hashed and sessions expire automatically.</p>
      </aside>
      <main className="auth-main">
        <div className="auth-card">
          <div className="no-print" style={{ marginBottom: 28 }}><Logo /></div>
          {children}
        </div>
      </main>
    </div>
  );
}
