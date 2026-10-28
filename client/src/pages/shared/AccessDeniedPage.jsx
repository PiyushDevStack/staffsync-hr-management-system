import { Link } from 'react-router-dom';
import { FiArrowLeft, FiShield } from 'react-icons/fi';
export default function AccessDeniedPage() {
  return <main className="not-found"><div className="brand-lockup"><div className="brand-mark">S<span>.</span></div><strong>StaffSync</strong></div><div className="not-found-code"><FiShield size={58} /></div><h1>Access restricted</h1><p>Your account does not have permission to open this page.</p><Link className="btn btn-primary rounded-pill" to="/app/dashboard"><FiArrowLeft className="me-2" />Return to your dashboard</Link></main>;
}
