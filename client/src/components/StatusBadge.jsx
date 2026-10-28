const styles = {
  ACTIVE: 'success', PRESENT: 'success', APPROVED: 'success', COMPLETED: 'success', PUBLISHED: 'success', OPEN: 'success',
  PENDING: 'warning', INCOMPLETE: 'warning', IN_PROGRESS: 'info', DRAFT: 'secondary', ENROLLED: 'info', ATTENDED: 'info',
  REJECTED: 'danger', INACTIVE: 'secondary', TERMINATED: 'secondary', CANCELLED: 'secondary', ABSENT: 'danger', LATE: 'warning', ARCHIVED: 'secondary', WITHDRAWN: 'secondary'
};
export default function StatusBadge({ status }) {
  const normalized = String(status || 'UNKNOWN').toUpperCase();
  return <span className={`status-badge status-${styles[normalized] || 'secondary'}`}>{normalized.replaceAll('_', ' ')}</span>;
}
