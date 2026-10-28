import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { FiActivity, FiBell, FiBookOpen, FiCalendar, FiChevronDown, FiGrid, FiLogOut, FiMenu, FiRadio, FiSettings, FiUsers, FiX, FiUser, FiClipboard } from 'react-icons/fi';
import { signOut } from '../app/authSlice';
import { api, payload } from '../services/api';

const navFor = (role) => {
  const links = [{ to: '/app/dashboard', label: 'Overview', icon: FiGrid }];
  if (role === 'HR' || role === 'MANAGER') links.push({ to: '/app/employees', label: role === 'HR' ? 'Employees' : 'My team', icon: FiUsers });
  links.push({ to: '/app/attendance', label: 'Attendance', icon: FiActivity });
  links.push({ to: '/app/leaves', label: role === 'HR' || role === 'MANAGER' ? 'Leave approvals' : 'My leave', icon: FiCalendar });
  links.push({ to: '/app/announcements', label: 'Announcements', icon: FiRadio });
  links.push({ to: '/app/training', label: 'Learning & training', icon: FiBookOpen });
  links.push({ to: '/app/notifications', label: 'Notifications', icon: FiBell });
  links.push({ to: '/app/profile', label: 'My profile', icon: FiUser });
  return links;
};
export default function MainLayout() {
  const [navOpen, setNavOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch(); const navigate = useNavigate();
  useEffect(() => { let active = true; api.get('/notifications?unread=true&limit=1').then((r) => { if (active) setUnread(payload(r).unreadCount || 0); }).catch(() => {}); return () => { active = false; }; }, []);
  const logout = async () => { await dispatch(signOut()); navigate('/login', { replace: true }); };
  return <div className="app-shell">
    {navOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setNavOpen(false)} />}
    <aside className={`sidebar ${navOpen ? 'sidebar-open' : ''}`}>
      <div className="brand-lockup"><div className="brand-mark">S<span>.</span></div><div><strong>StaffSync</strong><small>PEOPLE OPERATIONS</small></div><button className="mobile-close" aria-label="Close menu" onClick={() => setNavOpen(false)}><FiX /></button></div>
      <div className="workspace-pill"><span className="pulse-dot" /> Demo workspace <FiChevronDown size={13} /></div>
      <div className="nav-caption">WORKSPACE</div>
      <nav className="side-nav">{navFor(user?.role).map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} onClick={() => setNavOpen(false)} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`}><Icon size={18} /><span>{label}</span>{label === 'Notifications' && unread > 0 && <span className="nav-count">{unread > 9 ? '9+' : unread}</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><FiClipboard /></div><strong>Need a hand?</strong><p>Keep your people operations running smoothly.</p><span>StaffSync workspace</span></div><button className="side-link side-logout" onClick={logout}><FiLogOut size={18} /><span>Sign out</span></button></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setNavOpen(true)}><FiMenu /></button><div className="breadcrumbs"><span>Workspace</span><span className="crumb-separator">/</span><strong>People & operations</strong></div><div className="topbar-right"><NavLink to="/app/notifications" className="topbar-icon" aria-label="Notifications"><FiBell size={19} />{unread > 0 && <span className="notification-dot" />}</NavLink><div className="topbar-divider" /><div className="profile-wrap"><button className="profile-trigger" onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}><span className="avatar">{user?.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || 'SS'}</span><span className="profile-copy"><strong>{user?.name || 'StaffSync user'}</strong><small>{user?.role === 'HR' ? 'HR Administrator' : user?.role === 'MANAGER' ? 'People Manager' : 'Employee'}</small></span><FiChevronDown size={15} /></button>{profileOpen && <div className="profile-menu"><button onClick={() => { setProfileOpen(false); navigate('/app/profile'); }}><FiSettings /> Account profile</button><button onClick={logout}><FiLogOut /> Sign out</button></div>}</div></div></header>
      <main className="page-content"><Outlet /></main>
      <footer className="app-footer"><span>© {new Date().getFullYear()} StaffSync</span><span>People first. Work made simpler.</span></footer>
    </div>
  </div>;
}
