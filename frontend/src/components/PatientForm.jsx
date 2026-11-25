import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createPatient, resetOperation, updatePatient } from '../store/patientsSlice';
import { showToast } from '../store/uiSlice';
import { BLOOD_GROUPS, GENDERS } from '../utils/format';
import { validatePatient } from '../utils/validators';
import { Alert, Field, Modal, Spinner } from './common';

const EMPTY = { name: '', age: '', gender: '', bloodGroup: '', phone: '', email: '', address: '', notes: '' };

/** Create / edit dialog for a patient. `patient` present = edit mode. */
export default function PatientForm({ patient, onClose, onSaved }) {
  const dispatch = useDispatch();
  const editing = Boolean(patient);
  const operation = useSelector((state) => state.patients.operations[editing ? 'update' : 'create']);
  const [form, setForm] = useState(() =>
    patient
      ? { name: patient.name, age: String(patient.age), gender: patient.gender, bloodGroup: patient.bloodGroup ?? '', phone: patient.phone, email: patient.email, address: patient.address, notes: patient.notes ?? '' }
      : EMPTY,
  );
  const [errors, setErrors] = useState({});

  const change = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const close = () => {
    dispatch(resetOperation(editing ? 'update' : 'create'));
    onClose();
  };

  const submit = async (event) => {
    event.preventDefault();
    const found = validatePatient(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    const payload = {
      name: form.name.trim(),
      age: Number(form.age),
      gender: form.gender,
      bloodGroup: form.bloodGroup || null,
      phone: form.phone.trim(),
      email: form.email.trim().toLowerCase(),
      address: form.address.trim(),
      notes: form.notes.trim() || null,
    };
    const result = await dispatch(editing ? updatePatient({ id: patient.id, ...payload }) : createPatient(payload));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(showToast({ message: editing ? 'Patient updated' : `${payload.name} added to your patients` }));
      onSaved?.(result.payload);
      close();
    }
  };

  return (
    <Modal
      title={editing ? 'Edit patient' : 'New patient'}
      onClose={close}
      busy={operation.loading}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={close} disabled={operation.loading}>Cancel</button>
          <button type="submit" form="patient-form" className="btn btn-primary" disabled={operation.loading}>
            {operation.loading && <Spinner />} {editing ? 'Save changes' : 'Add patient'}
          </button>
        </>
      }
    >
      <form id="patient-form" className="stack" onSubmit={submit} noValidate>
        {operation.error && <Alert>{operation.error}</Alert>}
        <div className="form-grid">
          <Field label="Full name" required error={errors.name} className="full">
            {(props) => <input {...props} className="input" value={form.name} onChange={change('name')} placeholder="Asha Verma" maxLength={100} />}
          </Field>
          <Field label="Age" required error={errors.age}>
            {(props) => <input {...props} className="input" type="number" min="0" max="150" value={form.age} onChange={change('age')} placeholder="34" />}
          </Field>
          <Field label="Gender" required error={errors.gender}>
            {(props) => (
              <select {...props} className="select" value={form.gender} onChange={change('gender')}>
                <option value="">Select gender</option>
                {GENDERS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
          </Field>
          <Field label="Phone" required error={errors.phone}>
            {(props) => <input {...props} className="input" type="tel" value={form.phone} onChange={change('phone')} placeholder="+91 98765 43210" />}
          </Field>
          <Field label="Blood group">
            {(props) => (
              <select {...props} className="select" value={form.bloodGroup} onChange={change('bloodGroup')}>
                <option value="">Not recorded</option>
                {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
          </Field>
          <Field label="Email" required error={errors.email} className="full">
            {(props) => <input {...props} className="input" type="email" value={form.email} onChange={change('email')} placeholder="asha@example.com" />}
          </Field>
          <Field label="Address" required error={errors.address} className="full">
            {(props) => <input {...props} className="input" value={form.address} onChange={change('address')} placeholder="12 MG Road, Bengaluru" />}
          </Field>
          <Field label="Clinical notes" hint="Allergies, conditions, preferences (optional)" className="full">
            {(props) => <textarea {...props} className="textarea" value={form.notes} onChange={change('notes')} maxLength={1000} placeholder="Allergic to penicillin" />}
          </Field>
        </div>
      </form>
    </Modal>
  );
}
