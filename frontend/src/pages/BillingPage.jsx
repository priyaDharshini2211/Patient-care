import { Download, Eye, FileText, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { billsApi } from '../api/services';
import BillForm from '../components/BillForm';
import { ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, Spinner, StatusBadge, TableSkeleton } from '../components/common';
import PayButton from '../components/PayButton';
import { deleteBill, fetchBillStats, fetchBills, resetBillOperation, setBillFilters } from '../store/billsSlice';
import { showToast } from '../store/uiSlice';
import { formatCurrency, formatDate } from '../utils/format';

const TABS = [
  ['all', 'All'],
  ['Pending', 'Pending'],
  ['Paid', 'Paid'],
  ['Failed', 'Failed'],
  ['overdue', 'Overdue'],
  ['Cancelled', 'Cancelled'],
];

const SORTS = [
  ['createdAt:DESC', 'Newest first'],
  ['createdAt:ASC', 'Oldest first'],
  ['dueDate:ASC', 'Due soonest'],
  ['totalAmount:DESC', 'Highest amount'],
  ['totalAmount:ASC', 'Lowest amount'],
];

export default function BillingPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { items, total, totalPages, loading, error, filters, stats, operations } = useSelector((state) => state.bills);
  const [searchText, setSearchText] = useState(filters.search);
  const [form, setForm] = useState(null); // null | { bill?, patientId? }
  const [toDelete, setToDelete] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { dispatch(fetchBills()); }, [dispatch, filters]);
  useEffect(() => { dispatch(fetchBillStats()); }, [dispatch]);

  // Links such as /billing?new=1&patientId=4 (dashboard, patient profile) open the create dialog.
  useEffect(() => {
    if (params.get('new')) {
      setForm({ patientId: params.get('patientId') || undefined });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  useEffect(() => {
    if (searchText === filters.search) return undefined;
    const timer = setTimeout(() => dispatch(setBillFilters({ search: searchText.trim() })), 300);
    return () => clearTimeout(timer);
  }, [searchText, filters.search, dispatch]);

  const activeTab = filters.overdue === 'true' ? 'overdue' : filters.paymentStatus || 'all';
  const selectTab = (tab) => dispatch(setBillFilters({ paymentStatus: ['all', 'overdue'].includes(tab) ? '' : tab, overdue: tab === 'overdue' ? 'true' : '' }));
  const countFor = (tab) => (!stats ? null : tab === 'all' ? stats.all.count : tab === 'overdue' ? stats.overdue.count : stats.byStatus[tab].count);
  const hasFilters = Boolean(filters.search || filters.paymentStatus || filters.overdue);

  const confirmDelete = async () => {
    const result = await dispatch(deleteBill(toDelete.id));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(showToast({ message: `${toDelete.invoiceNumber} was deleted` }));
      setToDelete(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await billsApi.exportCsv({ search: filters.search, paymentStatus: filters.paymentStatus, overdue: filters.overdue, sortBy: filters.sortBy, order: filters.order });
    } catch (err) {
      dispatch(showToast({ type: 'error', message: getErrorMessage(err) }));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader title="Billing" subtitle={stats ? `${formatCurrency(stats.byStatus.Pending.amount + stats.byStatus.Failed.amount)} outstanding across ${stats.byStatus.Pending.count + stats.byStatus.Failed.count} open bills` : 'Invoices and payment status'}>
        <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={exporting || total === 0}>
          {exporting ? <Spinner /> : <Download size={16} />} Export CSV
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} /> New bill</button>
      </PageHeader>

      <section className="card">
        <div className="toolbar">
          <div className="chips" role="tablist" aria-label="Filter by status">
            {TABS.map(([tab, label]) => (
              <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={`chip ${activeTab === tab ? 'active' : ''}`} onClick={() => selectTab(tab)}>
                {label} {countFor(tab) !== null && <span className="n">{countFor(tab)}</span>}
              </button>
            ))}
          </div>
          <div className="spacer" />
          <div className="search-wrap" style={{ flex: '0 1 260px' }}>
            <Search size={16} />
            <input className="input input-icon" type="search" placeholder="Patient, service or INV-00012" value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Search bills" />
          </div>
          <select className="select" value={`${filters.sortBy}:${filters.order}`} onChange={(e) => { const [sortBy, order] = e.target.value.split(':'); dispatch(setBillFilters({ sortBy, order })); }} aria-label="Sort bills">
            {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>

        {error && items.length === 0 ? (
          <ErrorState message={error} onRetry={() => dispatch(fetchBills())} />
        ) : !loading && items.length === 0 ? (
          hasFilters ? (
            <EmptyState title="No bills match your filters" action={<button type="button" className="btn btn-secondary" onClick={() => { setSearchText(''); dispatch(setBillFilters({ search: '', paymentStatus: '', overdue: '' })); }}>Clear filters</button>}>
              Try another status or search term.
            </EmptyState>
          ) : (
            <EmptyState icon={FileText} title="No bills yet" action={<button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} /> Create your first bill</button>}>
              Bills you create appear here with their payment status.
            </EmptyState>
          )
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Invoice</th><th>Patient</th><th>Service</th><th className="right">Total</th><th>Due</th><th>Status</th><th /></tr>
              </thead>
              {loading && items.length === 0 ? (
                <TableSkeleton columns={7} />
              ) : (
                <tbody style={{ opacity: loading ? 0.6 : 1 }}>
                  {items.map((bill) => (
                    <tr key={bill.id} className="clickable" onClick={() => navigate(`/billing/${bill.id}`)}>
                      <td className="nowrap cell-main mono">{bill.invoiceNumber}</td>
                      <td><div className="cell-main">{bill.patient.name}</div><div className="cell-sub">{formatDate(bill.createdAt)}</div></td>
                      <td style={{ maxWidth: 240 }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bill.description}</div></td>
                      <td className="right mono nowrap"><strong>{formatCurrency(bill.totalAmount)}</strong></td>
                      <td className="nowrap">{bill.dueDate ? <span style={bill.isOverdue ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>{formatDate(bill.dueDate)}</span> : <span className="muted">-</span>}</td>
                      <td className="nowrap"><StatusBadge status={bill.paymentStatus} overdue={bill.isOverdue} /></td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="actions">
                          <PayButton bill={bill} />
                          <button type="button" className="icon-btn" onClick={() => navigate(`/billing/${bill.id}`)} aria-label={`View ${bill.invoiceNumber}`}><Eye size={17} /></button>
                          {bill.paymentStatus !== 'Paid' && (
                            <>
                              <button type="button" className="icon-btn" onClick={() => setForm({ bill })} aria-label={`Edit ${bill.invoiceNumber}`}><Pencil size={17} /></button>
                              <button type="button" className="icon-btn" onClick={() => setToDelete(bill)} aria-label={`Delete ${bill.invoiceNumber}`}><Trash2 size={17} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          </div>
        )}

        {total > 0 && (
          <Pagination page={filters.page} totalPages={totalPages} total={total} limit={filters.limit} onPage={(page) => dispatch(setBillFilters({ page }))} onLimit={(limit) => dispatch(setBillFilters({ limit }))} />
        )}
      </section>

      {form && <BillForm bill={form.bill} patientId={form.patientId} onClose={() => setForm(null)} />}
      {toDelete && (
        <ConfirmDialog
          title="Delete bill?"
          message={`${toDelete.invoiceNumber} for ${toDelete.patient.name} (${formatCurrency(toDelete.totalAmount)}) will be permanently removed.`}
          loading={operations.delete.loading}
          error={operations.delete.error}
          onConfirm={confirmDelete}
          onCancel={() => { dispatch(resetBillOperation('delete')); setToDelete(null); }}
        />
      )}
    </>
  );
}
