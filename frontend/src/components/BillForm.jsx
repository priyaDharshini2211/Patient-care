import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createBill, fetchPatientOptions, resetBillOperation, updateBill } from '../store/billsSlice';
import { showToast } from '../store/uiSlice';
import { formatCurrency, todayPlus } from '../utils/format';
import { validateBill } from '../utils/validators';
import { Alert, Field, Modal, Spinner } from './common';

const SERVICES = ['General consultation', 'Follow-up visit', 'Blood test panel', 'Chest X-Ray', 'ECG', 'Vaccination', 'Dental cleaning', 'Physiotherapy session', 'MRI scan', 'Eye examination'];
const TAX_RATES = [0, 5, 12, 18];

/** Create / edit dialog for a bill. `bill` present = edit mode; `patientId` pre-selects the patient when creating. */
export default function BillForm({ bill, patientId, onClose }) {
  const dispatch = useDispatch();
  const editing = Boolean(bill);
  const operation = useSelector((state) => state.bills.operations[editing ? 'update' : 'create']);
  const patients = useSelector((state) => state.bills.patientOptions);
  const [form, setForm] = useState(() =>
    bill
      ? { patientId: String(bill.patientId), description: bill.description, amount: String(bill.amount), tax: String(bill.tax), dueDate: bill.dueDate ?? '', paymentStatus: bill.paymentStatus }
      : { patientId: patientId ? String(patientId) : '', description: '', amount: '', tax: '0', dueDate: todayPlus(15), paymentStatus: 'Pending' },
  );
  const [errors, setErrors] = useState({});

  useEffect(() => { dispatch(fetchPatientOptions()); }, [dispatch]);

  const change = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const amount = Number(form.amount) || 0;
  const tax = Number(form.tax) || 0;
  const applyTaxRate = (rate) => setForm((current) => ({ ...current, tax: String(Math.round(((Number(current.amount) || 0) * rate)) / 100) }));

  const close = () => {
    dispatch(resetBillOperation(editing ? 'update' : 'create'));
    onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validateBill(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      patientId: Number(form.patientId),
      description: form.description.trim(),
      amount: Number(form.amount),
      tax: form.tax === '' ? 0 : Number(form.tax),
      dueDate: form.dueDate || null,
      ...(editing && { paymentStatus: form.paymentStatus }),
    };
    const result = await dispatch(editing ? updateBill({ id: bill.id, ...payload }) : createBill(payload));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(showToast({ message: editing ? 'Bill updated' : `Bill ${result.payload.invoiceNumber} created` }));
      close();
    }
  };

  return (
    <Modal
      title={editing ? `Edit ${bill.invoiceNumber}` : 'New bill'}
      onClose={close}
      busy={operation.loading}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={close} disabled={operation.loading}>Cancel</button>
          <button type="submit" form="bill-form" className="btn btn-primary" disabled={operation.loading}>
            {operation.loading && <Spinner />} {editing ? 'Save changes' : 'Create bill'}
          </button>
        </>
      }
    >
      <form id="bill-form" className="stack" onSubmit={submit} noValidate>
        {operation.error && <Alert>{operation.error}</Alert>}
        <div className="form-grid">
          <Field label="Patient" required error={errors.patientId} className="full">
            {(props) => (
              <select {...props} className="select" value={form.patientId} onChange={change('patientId')}>
                <option value="">Select a patient</option>
                {patients.map((p) => <option key={p.id} value={p.id}>{p.name} - {p.email}</option>)}
              </select>
            )}
          </Field>
          <Field label="Service / description" required error={errors.description} className="full">
            {(props) => (
              <>
                <input {...props} className="input" list="service-suggestions" value={form.description} onChange={change('description')} placeholder="General consultation" maxLength={500} />
                <datalist id="service-suggestions">{SERVICES.map((s) => <option key={s} value={s} />)}</datalist>
              </>
            )}
          </Field>
          <Field label="Amount (INR)" required error={errors.amount}>
            {(props) => <input {...props} className="input" type="number" min="0" step="0.01" value={form.amount} onChange={change('amount')} placeholder="500" />}
          </Field>
          <Field label="Tax (INR)" error={errors.tax} hint={
            <span className="row" style={{ gap: 6 }}>Quick:{TAX_RATES.map((rate) => <button key={rate} type="button" className="chip" style={{ height: 24, padding: '0 8px', fontSize: 12 }} onClick={() => applyTaxRate(rate)}>{rate}%</button>)}</span>
          }>
            {(props) => <input {...props} className="input" type="number" min="0" step="0.01" value={form.tax} onChange={change('tax')} placeholder="0" />}
          </Field>
          <Field label="Due date" hint="Open bills past this date are flagged as overdue">
            {(props) => <input {...props} className="input" type="date" value={form.dueDate} onChange={change('dueDate')} />}
          </Field>
          {editing ? (
            <Field label="Status" hint="Paid / Failed are set automatically by payments">
              {(props) => (
                <select {...props} className="select" value={form.paymentStatus} onChange={change('paymentStatus')}>
                  {['Pending', 'Failed', 'Cancelled'].map((s) => <option key={s} value={s} disabled={s === 'Failed' && bill.paymentStatus !== 'Failed'}>{s}</option>)}
                </select>
              )}
            </Field>
          ) : <div />}
          <div className="full card card-pad" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Subtotal</span><span className="mono">{formatCurrency(amount)}</span></div>
            <div className="row" style={{ justifyContent: 'space-between' }}><span className="muted">Tax</span><span className="mono">{formatCurrency(tax)}</span></div>
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 6, paddingTop: 8, borderTop: '1px solid var(--border)' }}><strong>Total payable</strong><strong className="mono" style={{ fontSize: 18 }}>{formatCurrency(amount + tax)}</strong></div>
          </div>
        </div>
      </form>
    </Modal>
  );
}
