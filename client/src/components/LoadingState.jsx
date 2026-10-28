export default function LoadingState({ label = 'Loading StaffSync…' }) {
  return <div className="loading-state" role="status"><span className="spinner-border spinner-border-sm" aria-hidden="true" /> <span>{label}</span></div>;
}
