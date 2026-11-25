import { CreditCard, ReceiptText } from 'lucide-react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { EmptyState, ErrorState, PageHeader, Pagination, StatusBadge, TableSkeleton } from '../components/common';
import { fetchPaymentHistory, setPaymentFilters } from '../store/paymentsSlice';
import { formatCurrency, formatDateTime } from '../utils/format';

const TABS = [['', 'All'], ['Paid', 'Paid'], ['Pending', 'Pending'], ['Failed', 'Failed'], ['Cancelled', 'Cancelled']];
const invoiceNumber = (id) => `INV-${String(id).padStart(5, '0')}`;

export default function PaymentsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { history, historyTotal, historyTotalPages, historyFilters, historyLoading, historyError } = useSelector((state) => state.payments);

  useEffect(() => { dispatch(fetchPaymentHistory()); }, [dispatch, historyFilters]);

  return (
    <>
      <PageHeader title="Payments" subtitle="Every payment attempt, with receipts for the ones that succeeded." />

      <section className="card">
        <div className="toolbar">
          <div className="chips" role="tablist" aria-label="Filter by status">
            {TABS.map(([status, label]) => (
              <button key={label} type="button" role="tab" aria-selected={historyFilters.status === status} className={`chip ${historyFilters.status === status ? 'active' : ''}`} onClick={() => dispatch(setPaymentFilters({ status }))}>{label}</button>
            ))}
          </div>
        </div>

        {historyError && history.length === 0 ? (
          <ErrorState message={historyError} onRetry={() => dispatch(fetchPaymentHistory())} />
        ) : !historyLoading && history.length === 0 ? (
          <EmptyState icon={CreditCard} title={historyFilters.status ? `No ${historyFilters.status.toLowerCase()} payments` : 'No payments yet'}>
            {historyFilters.status ? 'Try another status.' : <>Payments appear here when a bill is paid. Start from <Link to="/billing">Billing</Link>.</>}
          </EmptyState>
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Patient</th><th>Invoice</th><th>Reference</th><th className="right">Amount</th><th>Status</th><th /></tr></thead>
              {historyLoading && history.length === 0 ? (
                <TableSkeleton columns={7} />
              ) : (
                <tbody style={{ opacity: historyLoading ? 0.6 : 1 }}>
                  {history.map((payment) => (
                    <tr key={payment.id} className="clickable" onClick={() => navigate(`/payments/${payment.id}`)}>
                      <td className="nowrap">{formatDateTime(payment.updatedAt)}</td>
                      <td><div className="cell-main">{payment.bill.patient.name}</div></td>
                      <td className="mono nowrap"><Link to={`/billing/${payment.billId}`} onClick={(e) => e.stopPropagation()}>{invoiceNumber(payment.billId)}</Link></td>
                      <td className="mono muted nowrap">{payment.razorpayPaymentId ?? payment.razorpayOrderId}</td>
                      <td className="right mono nowrap"><strong>{formatCurrency(payment.amount)}</strong></td>
                      <td><StatusBadge status={payment.paymentStatus} /></td>
                      <td className="right"><span className="btn btn-ghost btn-sm"><ReceiptText size={15} /> {payment.paymentStatus === 'Paid' ? 'Receipt' : 'Details'}</span></td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}

        {historyTotal > 0 && (
          <Pagination page={historyFilters.page} totalPages={historyTotalPages} total={historyTotal} limit={historyFilters.limit} onPage={(page) => dispatch(setPaymentFilters({ page }))} onLimit={(limit) => dispatch(setPaymentFilters({ limit }))} />
        )}
      </section>
    </>
  );
}
