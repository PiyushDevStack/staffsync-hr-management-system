export default function InlineAlert({ variant = 'danger', children, onClose }) {
  if (!children) return null;
  return <div className={`alert alert-${variant} d-flex align-items-center justify-content-between`} role="alert"><span>{children}</span>{onClose && <button type="button" className="btn-close ms-3" aria-label="Dismiss" onClick={onClose} />}</div>;
}
