import { AlertTriangle, ArrowDownRight, ArrowUpRight, CheckCircle2, CreditCard, FilePlus2, FileText, Plus, Receipt, TrendingUp, UserPlus, Users, Wallet } from 'lucide-react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Link, useNavigate } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Avatar, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, StatusBadge } from '../components/common';
import PayButton from '../components/PayButton';
import { fetchDashboardSummary } from '../store/dashboardSlice';
import { formatCompactCurrency, formatCurrency, formatDate, formatDateTime, formatMonth, friendlyName, greeting } from '../utils/format';

const STATUS_COLORS = { Paid: 'var(--chart-1)', Pending: 'var(--chart-3)', Failed: 'var(--chart-4)', Cancelled: 'var(--chart-5)' };
const TICK = { fill: 'var(--muted)', fontSize: 12 };
const TOOLTIP = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', boxShadow: 'var(--shadow)' };

function Trend({ current, previous }) {
  if (!previous && !current) return <span>No new patients yet</span>;
  if (!previous) return <span><span className="trend-up">+{current}</span> new this month</span>;
  const diff = current - previous;
  const Icon = diff >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span>
      <span className={diff >= 0 ? 'trend-up' : 'trend-down'}><Icon size={14} style={{ verticalAlign: -2 }} />{Math.abs(Math.round((diff / previous) * 100))}%</span> vs last month ({current} new)
    </span>
  );
}

function Card({ title, children, action, className = '' }) {
  return (
    <section className={`card ${className}`}>
      <div className="card-head"><h3>{title}</h3><div className="spacer" />{action}</div>
      {children}
    </section>
  );
}

function Onboarding() {
  const steps = [
    [UserPlus, 'Add your first patient', 'Save contact details, blood group and notes.', '/patients?new=1', 'Add patient'],
    [FilePlus2, 'Create a bill', 'Itemise a service with tax and a due date.', '/billing?new=1', 'Create bill'],
    [CreditCard, 'Collect a payment', 'Patients pay online; the bill is marked paid automatically.', '/billing', 'Go to billing'],
  ];
  return (
    <section className="card card-pad">
      <h3 style={{ fontSize: 17 }}>Let&apos;s get your clinic set up</h3>
      <p className="muted" style={{ margin: '4px 0 18px' }}>Three quick steps and your dashboard will fill with insights.</p>
      <div className="grid grid-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))' }}>
        {steps.map(([Icon, title, text, to, cta], index) => (
          <div key={title} className="card card-pad" style={{ boxShadow: 'none', background: 'var(--surface-2)' }}>
            <span className="icon tone-teal" style={{ display: 'grid', placeItems: 'center', width: 38, height: 38, borderRadius: 10 }}><Icon size={19} /></span>
            <h4 style={{ margin: '12px 0 4px' }}>{index + 1}. {title}</h4>
            <p className="muted" style={{ marginBottom: 14 }}>{text}</p>
            <Link to={to} className="btn btn-secondary btn-sm">{cta}</Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function DashboardSkeleton() {
  return (
    <div className="stack" aria-busy="true" aria-label="Loading dashboard">
      <div className="grid grid-4">{[0, 1, 2, 3].map((i) => <div key={i} className="card stat"><Skeleton width="50%" /><Skeleton width="70%" height={28} /><Skeleton width="60%" /></div>)}</div>
      <div className="grid grid-3-2"><div className="card" style={{ height: 340 }} /><div className="card" style={{ height: 340 }} /></div>
    </div>
  );
}

export default function DashboardPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { summary, loading, error } = useSelector((state) => state.dashboard);
  const user = useSelector((state) => state.auth.user);

  useEffect(() => { dispatch(fetchDashboardSummary()); }, [dispatch]);

  const header = (
    <PageHeader title={`${greeting()}, ${friendlyName(user?.name)}`} subtitle={user?.clinicName ? `${user.clinicName} - here is how your practice is doing.` : 'Here is how your practice is doing.'}>
      <Link to="/patients?new=1" className="btn btn-secondary"><UserPlus size={16} /> New patient</Link>
      <Link to="/billing?new=1" className="btn btn-primary"><Plus size={16} /> New bill</Link>
    </PageHeader>
  );

  if (error && !summary) return <>{header}<div className="card"><ErrorState message={error} onRetry={() => dispatch(fetchDashboardSummary())} /></div></>;
  if (!summary) return <>{header}<DashboardSkeleton /></>;

  const { kpis, monthly, statusBreakdown, genderBreakdown, recentPatients, recentPayments, dueBills } = summary;
  const isEmpty = kpis.totalPatients === 0 && kpis.totalBills === 0;
  const chartData = monthly.map((m) => ({ ...m, label: formatMonth(m.month) }));
  const donutData = statusBreakdown.filter((s) => s.count > 0);
  const genderMax = Math.max(1, ...genderBreakdown.map((g) => g.count));

  return (
    <div className="stack" style={{ opacity: loading ? 0.85 : 1, transition: 'opacity 0.2s' }}>
      {header}

      {isEmpty && <Onboarding />}

      <div className="grid grid-4">
        <StatCard label="Patients" value={kpis.totalPatients} icon={Users} tone="blue" foot={<Trend current={kpis.newPatientsThisMonth} previous={kpis.newPatientsLastMonth} />} />
        <StatCard label="Collected" value={formatCompactCurrency(kpis.collected)} icon={Wallet} tone="green" foot={<><TrendingUp size={13} style={{ verticalAlign: -2 }} /> {kpis.collectionRate}% collection rate</>} />
        <StatCard label="Outstanding" value={formatCompactCurrency(kpis.outstanding)} icon={Receipt} tone="amber" foot={kpis.overdueCount > 0 ? <span className="trend-down">{kpis.overdueCount} overdue - {formatCurrency(kpis.overdueAmount)}</span> : 'Nothing overdue'} />
        <StatCard label="Bills" value={kpis.totalBills} icon={FileText} tone="teal" foot={`${statusBreakdown.find((s) => s.status === 'Paid')?.count ?? 0} paid`} />
      </div>

      <div className="grid grid-3-2">
        <Card title="Billed vs collected" action={<div className="legend"><span><i style={{ background: 'var(--chart-2)' }} />Billed</span><span><i style={{ background: 'var(--chart-1)' }} />Collected</span></div>}>
          <div className="chart-box">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={TICK} axisLine={false} tickLine={false} />
                <YAxis tick={TICK} axisLine={false} tickLine={false} width={56} tickFormatter={formatCompactCurrency} domain={[0, (max) => Math.max(max, 1000)]} allowDecimals={false} />
                <Tooltip cursor={{ fill: 'var(--surface-3)' }} contentStyle={TOOLTIP} formatter={(value, name) => [formatCurrency(value), name]} />
                <Bar dataKey="billed" name="Billed" fill="var(--chart-2)" radius={[5, 5, 0, 0]} maxBarSize={26} />
                <Bar dataKey="collected" name="Collected" fill="var(--chart-1)" radius={[5, 5, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Bills by status">
          {donutData.length === 0 ? (
            <EmptyState icon={FileText} title="No bills yet">Create your first bill to see the breakdown.</EmptyState>
          ) : (
            <div className="donut-wrap">
              <div style={{ width: 170, height: 170 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={donutData} dataKey="count" nameKey="status" innerRadius={52} outerRadius={80} paddingAngle={2} stroke="var(--surface)" strokeWidth={2}>
                      {donutData.map((s) => <Cell key={s.status} fill={STATUS_COLORS[s.status]} />)}
                    </Pie>
                    <Tooltip contentStyle={TOOLTIP} formatter={(value, name) => [`${value} bills`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="donut-list">
                {statusBreakdown.map((s) => (
                  <div key={s.status}><i style={{ background: STATUS_COLORS[s.status] }} />{s.status}<b>{s.count}</b><span className="muted mono" style={{ minWidth: 76, textAlign: 'right' }}>{formatCompactCurrency(s.amount)}</span></div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-3-2">
        <Card title="Needs attention" action={<Link to="/billing" className="btn btn-ghost btn-sm">View all</Link>}>
          {dueBills.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="You are all caught up">No open bills right now.</EmptyState>
          ) : (
            <ul className="list">
              {dueBills.map((bill) => (
                <li key={bill.id}>
                  <Avatar name={bill.patient.name} />
                  <div className="grow">
                    <strong>{bill.patient.name}</strong>
                    <span className="muted">{bill.invoiceNumber} - {bill.description}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong className="mono">{formatCurrency(bill.totalAmount)}</strong>
                    <span className="muted" style={{ display: 'block', fontSize: 12.5 }}>{bill.isOverdue ? <span className="trend-down"><AlertTriangle size={12} style={{ verticalAlign: -1 }} /> Due {formatDate(bill.dueDate)}</span> : bill.dueDate ? `Due ${formatDate(bill.dueDate)}` : 'No due date'}</span>
                  </div>
                  <PayButton bill={bill} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Recent payments" action={<Link to="/payments" className="btn btn-ghost btn-sm">History</Link>}>
          {recentPayments.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payments yet">Payments appear here as soon as patients pay.</EmptyState>
          ) : (
            <ul className="list">
              {recentPayments.map((payment) => (
                <li key={payment.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/payments/${payment.id}`)}>
                  <div className="grow">
                    <strong>{payment.bill.patient.name}</strong>
                    <span className="muted">{formatDateTime(payment.updatedAt)}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <strong className="mono">{formatCurrency(payment.amount)}</strong>
                    <div><StatusBadge status={payment.paymentStatus} /></div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid grid-3-2">
        <Card title="Recently added patients" action={<Link to="/patients" className="btn btn-ghost btn-sm">All patients</Link>}>
          {recentPatients.length === 0 ? (
            <EmptyState icon={Users} title="No patients yet" action={<Link to="/patients?new=1" className="btn btn-primary btn-sm">Add patient</Link>} />
          ) : (
            <ul className="list">
              {recentPatients.map((patient) => (
                <li key={patient.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/patients/${patient.id}`)}>
                  <Avatar name={patient.name} />
                  <div className="grow"><strong>{patient.name}</strong><span className="muted">{patient.email}</span></div>
                  <span className="muted">{patient.age} yrs - {patient.gender}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Patients by gender">
          <div style={{ padding: '8px 20px 22px', display: 'grid', gap: 16 }}>
            {genderBreakdown.map((g, index) => (
              <div key={g.gender}>
                <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}><span>{g.gender}</span><strong>{g.count}</strong></div>
                <div style={{ height: 8, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden' }}>
                  <div style={{ width: `${(g.count / genderMax) * 100}%`, height: '100%', background: ['var(--chart-2)', 'var(--chart-1)', 'var(--chart-3)'][index] }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
