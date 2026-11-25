import { ArrowDown, ArrowUp, Download, Eye, Pencil, Plus, Search, Trash2, Users } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getErrorMessage } from '../api/client';
import { patientsApi } from '../api/services';
import { Avatar, ConfirmDialog, EmptyState, ErrorState, PageHeader, Pagination, Spinner, TableSkeleton } from '../components/common';
import PatientForm from '../components/PatientForm';
import { deletePatient, fetchPatients, resetOperation, setFilters } from '../store/patientsSlice';
import { showToast } from '../store/uiSlice';
import { formatCurrency, formatDate } from '../utils/format';

const SORTS = [
  ['createdAt', 'Registered'],
  ['name', 'Name'],
  ['age', 'Age'],
];

export default function PatientsPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { items, total, totalPages, loading, error, filters, operations } = useSelector((state) => state.patients);
  const [searchText, setSearchText] = useState(filters.search);
  const [form, setForm] = useState(null); // null | { patient? }
  const [toDelete, setToDelete] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => { dispatch(fetchPatients()); }, [dispatch, filters]);

  // Dashboard "New patient" links to /patients?new=1.
  useEffect(() => {
    if (params.get('new')) {
      setForm({});
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  // Debounce the search box so we do not hit the API on every keystroke.
  useEffect(() => {
    if (searchText === filters.search) return undefined;
    const timer = setTimeout(() => dispatch(setFilters({ search: searchText.trim() })), 300);
    return () => clearTimeout(timer);
  }, [searchText, filters.search, dispatch]);

  const sortBy = (field) => dispatch(setFilters({ sortBy: field, order: filters.sortBy === field && filters.order === 'ASC' ? 'DESC' : 'ASC' }));
  const SortIcon = filters.order === 'ASC' ? ArrowUp : ArrowDown;
  const hasFilters = Boolean(filters.search || filters.gender);

  const confirmDelete = async () => {
    const result = await dispatch(deletePatient(toDelete.id));
    if (result.meta.requestStatus === 'fulfilled') {
      dispatch(showToast({ message: `${toDelete.name} was deleted` }));
      setToDelete(null);
    }
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      await patientsApi.exportCsv({ search: filters.search, gender: filters.gender, sortBy: filters.sortBy, order: filters.order });
    } catch (err) {
      dispatch(showToast({ type: 'error', message: getErrorMessage(err) }));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader title="Patients" subtitle={`${total} ${total === 1 ? 'patient' : 'patients'}${hasFilters ? ' match your filters' : ' in your practice'}`}>
        <button type="button" className="btn btn-secondary" onClick={exportCsv} disabled={exporting || total === 0}>
          {exporting ? <Spinner /> : <Download size={16} />} Export CSV
        </button>
        <button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} /> New patient</button>
      </PageHeader>

      <section className="card">
        <div className="toolbar">
          <div className="search-wrap">
            <Search size={16} />
            <input className="input input-icon" type="search" placeholder="Search name, email or phone" value={searchText} onChange={(e) => setSearchText(e.target.value)} aria-label="Search patients" />
          </div>
          <select className="select" value={filters.gender} onChange={(e) => dispatch(setFilters({ gender: e.target.value }))} aria-label="Filter by gender">
            <option value="">All genders</option>
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
          {hasFilters && <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setSearchText(''); dispatch(setFilters({ search: '', gender: '' })); }}>Clear filters</button>}
        </div>

        {error && items.length === 0 ? (
          <ErrorState message={error} onRetry={() => dispatch(fetchPatients())} />
        ) : !loading && items.length === 0 ? (
          hasFilters ? (
            <EmptyState title="No patients match your search">Try a different name, email or phone number.</EmptyState>
          ) : (
            <EmptyState icon={Users} title="No patients yet" action={<button type="button" className="btn btn-primary" onClick={() => setForm({})}><Plus size={16} /> Add your first patient</button>}>
              Add patients to start billing and tracking payments.
            </EmptyState>
          )
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[['name', 'Patient'], ['age', 'Age / gender']].map(([field, label]) => (
                    <th key={field} className="sortable" onClick={() => sortBy(field)} aria-sort={filters.sortBy === field ? (filters.order === 'ASC' ? 'ascending' : 'descending') : 'none'}>
                      {label} {filters.sortBy === field && <SortIcon size={12} style={{ verticalAlign: -1 }} />}
                    </th>
                  ))}
                  <th>Contact</th>
                  <th>Blood</th>
                  <th className="right">Outstanding</th>
                  <th className="sortable" onClick={() => sortBy('createdAt')}>Registered {filters.sortBy === 'createdAt' && <SortIcon size={12} style={{ verticalAlign: -1 }} />}</th>
                  <th />
                </tr>
              </thead>
              {loading && items.length === 0 ? (
                <TableSkeleton columns={7} />
              ) : (
                <tbody style={{ opacity: loading ? 0.6 : 1 }}>
                  {items.map((patient) => (
                    <tr key={patient.id} className="clickable" onClick={() => navigate(`/patients/${patient.id}`)}>
                      <td>
                        <div className="person"><Avatar name={patient.name} /><div><div className="cell-main">{patient.name}</div><div className="cell-sub">{patient.email}</div></div></div>
                      </td>
                      <td className="nowrap">{patient.age} - {patient.gender}</td>
                      <td className="nowrap">{patient.phone}</td>
                      <td>{patient.bloodGroup ? <span className="badge badge-info badge-plain">{patient.bloodGroup}</span> : <span className="muted">-</span>}</td>
                      <td className="right mono nowrap">
                        {patient.billing.outstanding > 0 ? <strong style={{ color: 'var(--warning)' }}>{formatCurrency(patient.billing.outstanding)}</strong> : <span className="muted">{patient.billing.billsCount ? 'Settled' : '-'}</span>}
                      </td>
                      <td className="nowrap muted">{formatDate(patient.createdAt)}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="actions">
                          <button type="button" className="icon-btn" onClick={() => navigate(`/patients/${patient.id}`)} aria-label={`View ${patient.name}`}><Eye size={17} /></button>
                          <button type="button" className="icon-btn" onClick={() => setForm({ patient })} aria-label={`Edit ${patient.name}`}><Pencil size={17} /></button>
                          <button type="button" className="icon-btn" onClick={() => setToDelete(patient)} aria-label={`Delete ${patient.name}`}><Trash2 size={17} /></button>
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
          <Pagination page={filters.page} totalPages={totalPages} total={total} limit={filters.limit} onPage={(page) => dispatch(setFilters({ page }))} onLimit={(limit) => dispatch(setFilters({ limit }))} />
        )}
      </section>

      {form && <PatientForm patient={form.patient} onClose={() => setForm(null)} />}
      {toDelete && (
        <ConfirmDialog
          title="Delete patient?"
          message={`${toDelete.name} will be permanently removed. Patients with bills cannot be deleted.`}
          loading={operations.delete.loading}
          error={operations.delete.error}
          onConfirm={confirmDelete}
          onCancel={() => { dispatch(resetOperation('delete')); setToDelete(null); }}
        />
      )}
    </>
  );
}
