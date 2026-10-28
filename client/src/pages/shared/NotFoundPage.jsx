import { Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
export default function NotFoundPage(){return <div className="not-found"><div className="brand-mark">S<span>.</span></div><div className="not-found-code">404</div><h1>This page isn’t in sync.</h1><p>The page may have moved, or you may not have access to it.</p><Link to="/app/dashboard" className="btn btn-primary rounded-pill px-4"><FiArrowLeft className="me-2"/>Back to dashboard</Link></div>;}
