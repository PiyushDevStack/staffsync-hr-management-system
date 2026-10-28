export default function StatCard({ label, value, detail, icon: Icon, tone = 'blue' }) {
  return <div className={`stat-card stat-${tone}`}><div className="stat-icon">{Icon && <Icon size={19} />}</div><div className="stat-label">{label}</div><div className="stat-value">{value ?? '—'}</div>{detail && <div className="stat-detail">{detail}</div>}</div>;
}
