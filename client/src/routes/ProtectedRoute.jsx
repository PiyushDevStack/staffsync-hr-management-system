import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingState from '../components/LoadingState';
export default function ProtectedRoute({ children, roles }) {
  const { user, ready } = useSelector((state) => state.auth);
  const location = useLocation();
  if (!ready) return <LoadingState label="Checking your secure session…" />;
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />;
  return children || <Outlet />;
}
