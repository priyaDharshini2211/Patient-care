import { ArrowLeft, CheckCircle2, Printer, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useParams } from 'react-router-dom';
import { ErrorState, Logo, Skeleton, StatusBadge } from '../components/common';
import { clearSelectedPayment, fetchPaymentById } from '../store/paymentsSlice';
import { formatCurrency, formatDateTime } from '../utils/format';

const invoiceNumber = (id) => `INV-${String(id).padStart(5, '0')}`;

/** Printable payment receipt (for paid payments) or attempt details (pending / failed / cancelled). */
export default function PaymentDetailsPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { selected: payment, selectedLoading, selectedError } = useSelector((state) => state.payments);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => {
    dispatch(fetchPaymentById(id));
    return () => { dispatch(clearSelectedPayment()); };
  }, [dispatch, id]);

  if (selectedError) return <div className="card"><ErrorState message={selectedError} onRetry={() => dispatch(fetchPaymentById(id))} /></div>;
  if (selectedLoading || !payment) return <div className="card invoice"><Skeleton width={200} height={28} /><div style={{ height: 260 }} /></div>;

  const paid = payment.paymentStatus === 'Paid';
  const rows = [
    ['Receipt for', invoiceNumber(payment.billId)],
    ['Patient', `${payment.bill.patient.name} (${payment.bill.patient.email})`],
    ['Service', payment.bill.description],
    ['Payment ID', payment.razorpayPaymentId ?? '-'],
    ['Order ID', payment.razorpayOrderId],
    [paid ? 'Paid on' : 'Last updated', formatDateTime(payment.updatedAt)],
    ['Attempted', formatDateTime(payment.createdAt)],
  ];

  return (
    <div className="stack">
      <div className="row no-print">
        <Link to="/payments" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /> Payments</Link>
        <div className="spacer" />
        <Link to={`/billing/${payment.billId}`} className="btn btn-secondary">View invoice</Link>
        {paid && <button type="button" className="btn btn-primary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>}
      </div>

      <article className="card invoice">
        <header className="invoice-head">
          <div>
            <Logo />
            <p className="muted" style={{ marginTop: 8 }}>{user?.clinicName || user?.name}<br />{user?.email}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2>{paid ? 'RECEIPT' : 'PAYMENT'}</h2>
            <p className="mono" style={{ fontWeight: 600 }}>#{String(payment.id).padStart(5, '0')}</p>
            <div style={{ marginTop: 8 }}><StatusBadge status={payment.paymentStatus} /></div>
          </div>
        </header>

        <div style={{ textAlign: 'center', padding: '30px 0 22px' }}>
          {paid ? <CheckCircle2 size={44} style={{ color: 'var(--success)' }} /> : <XCircle size={44} style={{ color: payment.paymentStatus === 'Failed' ? 'var(--danger)' : 'var(--muted)' }} />}
          <div className="muted" style={{ marginTop: 8 }}>{paid ? 'Amount received' : 'Amount attempted'}</div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 700, letterSpacing: '-0.02em' }}>{formatCurrency(payment.amount)}</div>
        </div>

        <dl className="kv" style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          {rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
        </dl>
        {payment.failureReason && <p style={{ marginTop: 20, color: 'var(--danger)' }}>Reason: {payment.failureReason}</p>}
        {paid && <p className="muted" style={{ marginTop: 26, textAlign: 'center' }}>Thank you for your payment.</p>}
      </article>
    </div>
  );
}
