import { ArrowLeft, Droplet, Mail, MapPin, Pencil, Phone, Plus, StickyNote, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { billsApi } from '../api/services';
import { getErrorMessage } from '../api/client';
import { Avatar, ConfirmDialog, EmptyState, ErrorState, Skeleton, StatCard, StatusBadge } from '../components/common';
import PatientForm from '../components/PatientForm';
import PayButton from '../components/PayButton';
import { clearSelectedPatient, deletePatient, fetchPatientById, resetOperation } from '../store/patientsSlice';
import { showToast } from '../store/uiSlice';
import { formatCurrency, formatDate } from '../utils/format';
import { CheckCircle2, FileText, Receipt, Wallet } from 'lucide-react';

export default function PatientDetailsPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { selected: patient, selectedLoading, selectedError, operations } = useSelector((state) => state.patients);
  const paymentBusy = useSelector((state) => state.payments.status);
  const [bills, setBills] = useState({ items: [], loading: true, error: null });
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    dispatch(fetchPatientById(id));
    return () => { dispatch(clearSelectedPatient()); };
  }, [dispatch, id]);

  // Reload the billing history on mount and whenever a payment finishes (status returns to a terminal state).
  useEffect(() => {
    let active = true;
    billsApi
      .list({ patientId: id, limit: 100, sortBy: 'createdAt', order: 'DESC' })
      .then((data) => active && setBills({ items: data.items, loading: false, error: null }))
      .catch((err) => active && setBills({ items: [], loading: false, error: getErrorMessage(err) }));
    if (['succeeded', 'failed', 'cancelled'].includes(paymentBusy)) dispatch(fetchPatientById(id));
    return () => { active = false; };
  }, [id, paymentBusy, dispatch]);

  const remove = async () => {
    const result = await dispatch(deletePatient(patient.id));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(showToast({ message: `${patient.name} was deleted` }));
      navigate('/patients');
    }
  };

  if (selectedError) return <div className="card"><ErrorState message={selectedError} onRetry={() => dispatch(fetchPatientById(id))} /></div>;
  if (selectedLoading || !patient) {
    return <div className="stack"><Skeleton width={220} height={28} /><div className="card card-pad" style={{ height: 160 }} /><div className="grid grid-4">{[0, 1, 2, 3].map((i) => <div key={i} className="card" style={{ height: 110 }} />)}</div></div>;
  }

  const { billing } = patient;
  const contact = [[Mail, patient.email], [Phone, patient.phone], [MapPin, patient.address]];

  return (
    <div className="stack">
      <div className="row">
        <Link to="/patients" className="btn btn-ghost btn-sm"><ArrowLeft size={16} /> Patients</Link>
      </div>

      <section className="card card-pad">
        <div className="profile-head">
          <Avatar name={patient.name} size="lg" />
          <div style={{ flex: 1, minWidth: 220 }}>
            <h1 style={{ fontSize: 24, letterSpacing: '-0.02em' }}>{patient.name}</h1>
            <div className="row" style={{ marginTop: 6 }}>
              <span className="badge badge-neutral badge-plain">{patient.age} years</span>
              <span className="badge badge-neutral badge-plain">{patient.gender}</span>
              {patient.bloodGroup && <span className="badge badge-info badge-plain"><Droplet size={12} /> {patient.bloodGroup}</span>}
              <span className="muted">Patient since {formatDate(patient.createdAt)}</span>
            </div>
          </div>
          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={() => setEditing(true)}><Pencil size={16} /> Edit</button>
            <Link to={`/billing?new=1&patientId=${patient.id}`} className="btn btn-primary"><Plus size={16} /> New bill</Link>
            <button type="button" className="icon-btn" onClick={() => setConfirming(true)} aria-label="Delete patient"><Trash2 size={18} /></button>
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          {contact.map(([Icon, value]) => <div key={value} className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}><Icon size={16} className="muted" style={{ marginTop: 3, flex: 'none' }} /><span style={{ overflowWrap: 'anywhere' }}>{value}</span></div>)}
        </div>
        {patient.notes && (
          <div className="alert alert-warning" style={{ marginTop: 16 }}><StickyNote size={18} style={{ flex: 'none', marginTop: 1 }} /><div><strong>Clinical notes</strong><div>{patient.notes}</div></div></div>
        )}
      </section>

      <div className="grid grid-4">
        <StatCard label="Total billed" value={formatCurrency(billing.totalBilled)} icon={Receipt} tone="blue" foot={`${billing.billsCount} ${billing.billsCount === 1 ? 'bill' : 'bills'}`} />
        <StatCard label="Paid" value={formatCurrency(billing.totalPaid)} icon={Wallet} tone="green" />
        <StatCard label="Outstanding" value={formatCurrency(billing.outstanding)} icon={FileText} tone={billing.outstanding > 0 ? 'amber' : 'teal'} foot={billing.outstanding > 0 ? 'Awaiting payment' : 'All settled'} />
        <StatCard label="Last billed" value={billing.lastBillAt ? formatDate(billing.lastBillAt) : '-'} icon={CheckCircle2} tone="teal" />
      </div>

      <section className="card">
        <div className="card-head"><h3>Billing history</h3></div>
        {bills.error ? (
          <ErrorState message={bills.error} />
        ) : !bills.loading && bills.items.length === 0 ? (
          <EmptyState icon={FileText} title="No bills for this patient" action={<Link to={`/billing?new=1&patientId=${patient.id}`} className="btn btn-primary btn-sm"><Plus size={15} /> Create bill</Link>} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Invoice</th><th>Service</th><th>Date</th><th>Due</th><th className="right">Total</th><th>Status</th><th /></tr></thead>
              <tbody>
                {bills.items.map((bill) => (
                  <tr key={bill.id} className="clickable" onClick={() => navigate(`/billing/${bill.id}`)}>
                    <td className="mono cell-main nowrap">{bill.invoiceNumber}</td>
                    <td>{bill.description}</td>
                    <td className="nowrap muted">{formatDate(bill.createdAt)}</td>
                    <td className="nowrap">{bill.dueDate ? formatDate(bill.dueDate) : <span className="muted">-</span>}</td>
                    <td className="right mono nowrap"><strong>{formatCurrency(bill.totalAmount)}</strong></td>
                    <td><StatusBadge status={bill.paymentStatus} overdue={bill.isOverdue} /></td>
                    <td onClick={(e) => e.stopPropagation()}><div className="actions"><PayButton bill={bill} /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && <PatientForm patient={patient} onClose={() => setEditing(false)} onSaved={() => dispatch(fetchPatientById(id))} />}
      {confirming && (
        <ConfirmDialog
          title="Delete patient?"
          message={`${patient.name} will be permanently removed. Patients with bills cannot be deleted - delete or settle their bills first.`}
          loading={operations.delete.loading}
          error={operations.delete.error}
          onConfirm={remove}
          onCancel={() => { dispatch(resetOperation('delete')); setConfirming(false); }}
        />
      )}
    </div>
  );
}
