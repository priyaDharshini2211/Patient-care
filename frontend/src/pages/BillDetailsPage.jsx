import { ArrowLeft, Pencil, Printer, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import BillForm from '../components/BillForm';
import { Alert, ConfirmDialog, ErrorState, Logo, Skeleton, StatusBadge } from '../components/common';
import PayButton from '../components/PayButton';
import { clearSelectedBill, deleteBill, fetchBillById, resetBillOperation } from '../store/billsSlice';
import { showToast } from '../store/uiSlice';
import { formatCurrency, formatDate, formatDateTime } from '../utils/format';

export default function BillDetailsPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selected: bill, selectedLoading, selectedError, operations } = useSelector((state) => state.bills);
  const user = useSelector((state) => state.auth.user);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    dispatch(fetchBillById(id));
    return () => { dispatch(clearSelectedBill()); };
  }, [dispatch, id]);

  const remove = async () => {
    const result = await dispatch(deleteBill(bill.id));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(showToast({ message: `${bill.invoiceNumber} was deleted` }));
      navigate('/billing');
    }
  };

  if (selectedError) return <div className="card"><ErrorState message={selectedError} onRetry={() => dispatch(fetchBillById(id))} /></div>;
  if (selectedLoading || !bill) return <div className="card invoice"><Skeleton width={200} height={28} /><div style={{ height: 300 }} /></div>;

  const editable = bill.paymentStatus !== 'Paid';
  const paidPayment = bill.payments.find((p) => p.paymentStatus === 'Paid');

  return (
    <div className="stack">
      <div className="row no-print">
        <Link to="/billing" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /> Billing</Link>
        <div className="spacer" />
        <PayButton bill={bill} small={false} />
        <button type="button" className="btn btn-secondary" onClick={() => window.print()}><Printer size={16} /> Print / PDF</button>
        {editable && <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}><Pencil size={16} /> Edit</button>}
        {editable && <button type="button" className="icon-btn" onClick={() => setConfirming(true)} aria-label="Delete bill"><Trash2 size={18} /></button>}
      </div>

      {bill.isOverdue && <div className="no-print"><Alert type="warning">This bill was due on {formatDate(bill.dueDate)} and is still unpaid.</Alert></div>}

      <article className="card invoice">
        <header className="invoice-head">
          <div>
            <Logo />
            <p className="muted" style={{ marginTop: 8 }}>{user?.clinicName || user?.name}<br />{user?.email}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <h2>INVOICE</h2>
            <p className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{bill.invoiceNumber}</p>
            <div style={{ marginTop: 8 }}><StatusBadge status={bill.paymentStatus} overdue={bill.isOverdue} /></div>
          </div>
        </header>

        <div className="invoice-meta">
          <div><div className="label muted">Billed to</div><strong>{bill.patient.name}</strong><div className="muted">{bill.patient.email}<br />{bill.patient.phone}</div></div>
          <div><div className="label muted">Issued</div><strong>{formatDate(bill.createdAt)}</strong></div>
          <div><div className="label muted">Due</div><strong style={bill.isOverdue ? { color: 'var(--danger)' } : undefined}>{bill.dueDate ? formatDate(bill.dueDate) : 'On receipt'}</strong></div>
        </div>

        <table className="invoice-table">
          <thead><tr><th>Description</th><th className="right">Amount</th></tr></thead>
          <tbody><tr><td>{bill.description}</td><td className="right mono">{formatCurrency(bill.amount)}</td></tr></tbody>
        </table>
        <div className="totals mono">
          <div><span>Subtotal</span><span>{formatCurrency(bill.amount)}</span></div>
          <div><span>Tax</span><span>{formatCurrency(bill.tax)}</span></div>
          <div className="grand"><span>Total</span><span>{formatCurrency(bill.totalAmount)}</span></div>
        </div>
        {paidPayment && (
          <p className="muted" style={{ marginTop: 22, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            Paid in full on {formatDateTime(paidPayment.updatedAt)} - payment ref <span className="mono">{paidPayment.razorpayPaymentId}</span>.
          </p>
        )}
      </article>

      <section className="card no-print">
        <div className="card-head"><h3>Payment activity</h3></div>
        {bill.payments.length === 0 ? (
          <p className="muted" style={{ padding: 20 }}>No payment attempts yet.</p>
        ) : (
          <ul className="timeline" style={{ padding: '20px 24px 4px' }}>
            {bill.payments.map((payment) => (
              <li key={payment.id} className={payment.paymentStatus.toLowerCase()}>
                <div className="row"><StatusBadge status={payment.paymentStatus} /><strong className="mono">{formatCurrency(payment.amount)}</strong><span className="muted">{formatDateTime(payment.updatedAt)}</span></div>
                {payment.failureReason && <div className="muted" style={{ marginTop: 4 }}>{payment.failureReason}</div>}
                <div style={{ marginTop: 4 }}><Link to={`/payments/${payment.id}`}>{payment.paymentStatus === 'Paid' ? 'View receipt' : 'View details'}</Link></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {editing && <BillForm bill={bill} onClose={() => { setEditing(false); dispatch(fetchBillById(id)); }} />}
      {confirming && (
        <ConfirmDialog
          title="Delete bill?"
          message={`${bill.invoiceNumber} (${formatCurrency(bill.totalAmount)}) and its payment attempts will be permanently removed.`}
          loading={operations.delete.loading}
          error={operations.delete.error}
          onConfirm={remove}
          onCancel={() => { dispatch(resetBillOperation('delete')); setConfirming(false); }}
        />
      )}
    </div>
  );
}
