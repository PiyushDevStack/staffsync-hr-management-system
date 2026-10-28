import { useEffect, useState } from 'react';
import { FiLock, FiSave, FiUser } from 'react-icons/fi';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../../components/PageHeader';
import LoadingState from '../../components/LoadingState';
import InlineAlert from '../../components/InlineAlert';
import { signOut } from '../../app/authSlice';
import { api, payload, readableError } from '../../services/api';

const emptyContact = { phone: '', address: '', emergencyContact: { name: '', relationship: '', phone: '' } };
const emptyPassword = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ProfilePage() {
  const user = useSelector((state) => state.auth.user);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [employee, setEmployee] = useState(null);
  const [form, setForm] = useState(emptyContact);
  const [loading, setLoading] = useState(user?.role !== 'HR');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [passwordForm, setPasswordForm] = useState(emptyPassword);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordNotice, setPasswordNotice] = useState('');

  useEffect(() => {
    if (user?.role === 'HR') {
      setLoading(false);
      return undefined;
    }
    let active = true;
    api.get('/employees/me').then((response) => {
      if (!active) return;
      const record = payload(response).employee;
      setEmployee(record);
      setForm({
        phone: record.phone || '',
        address: record.address || '',
        emergencyContact: record.emergencyContact || { name: '', relationship: '', phone: '' }
      });
    }).catch((requestError) => {
      if (active) setError(readableError(requestError));
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [user?.role]);

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const response = payload(await api.patch('/employees/me', form));
      setEmployee(response.employee);
      setNotice('Profile details updated.');
    } catch (saveError) {
      setError(readableError(saveError));
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordNotice('');
    if (passwordForm.newPassword.length < 12) {
      setPasswordError('Your new password must contain at least 12 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('The new password and confirmation do not match.');
      return;
    }
    setPasswordBusy(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordNotice('Password changed. Please sign in again.');
      await dispatch(signOut());
      navigate('/login', { replace: true });
    } catch (changeError) {
      setPasswordError(readableError(changeError));
    } finally {
      setPasswordBusy(false);
    }
  };

  return <div>
    <PageHeader eyebrow="ACCOUNT SETTINGS" title="My profile" description="Manage permitted personal contact details and keep your sign-in credentials secure." />
    <InlineAlert>{error}</InlineAlert>
    {notice && <InlineAlert variant="success" onClose={() => setNotice('')}>{notice}</InlineAlert>}
    {loading ? <LoadingState /> : employee ? <div className="profile-grid mb-4">
      <section className="panel profile-summary">
        <div className="profile-avatar-large">{employee.fullName?.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
        <h2>{employee.fullName}</h2>
        <p>{employee.designation}</p>
        <div className="profile-status"><span>{employee.employeeId}</span><span>{employee.department}</span></div>
        <dl className="profile-facts">
          <div><dt>Work email</dt><dd>{user?.email}</dd></div>
          <div><dt>Role</dt><dd>{user?.role}</dd></div>
          <div><dt>Date joined</dt><dd>{employee.dateOfJoining ? new Date(employee.dateOfJoining).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</dd></div>
          <div><dt>Reporting manager</dt><dd>{employee.reportingManager?.fullName || '—'}</dd></div>
        </dl>
      </section>
      <section className="panel form-panel">
        <div className="panel-heading"><div><h2>Contact information</h2><p>Only the fields permitted for self-service are editable here.</p></div><span className="panel-icon"><FiUser /></span></div>
        <form onSubmit={saveProfile} className="form-grid">
          <div><label className="form-label" htmlFor="phone">Phone</label><input id="phone" className="form-control" value={form.phone} maxLength={30} onChange={(event) => setForm({ ...form, phone: event.target.value })} /></div>
          <div className="full-span"><label className="form-label" htmlFor="address">Address</label><textarea id="address" className="form-control" rows={2} maxLength={500} value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></div>
          <div className="full-span"><h3 className="subform-title">Emergency contact</h3></div>
          <div><label className="form-label" htmlFor="emergencyName">Name</label><input id="emergencyName" className="form-control" value={form.emergencyContact.name || ''} onChange={(event) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, name: event.target.value } })} /></div>
          <div><label className="form-label" htmlFor="relationship">Relationship</label><input id="relationship" className="form-control" value={form.emergencyContact.relationship || ''} onChange={(event) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, relationship: event.target.value } })} /></div>
          <div><label className="form-label" htmlFor="emergencyPhone">Emergency phone</label><input id="emergencyPhone" className="form-control" value={form.emergencyContact.phone || ''} onChange={(event) => setForm({ ...form, emergencyContact: { ...form.emergencyContact, phone: event.target.value } })} /></div>
          <div className="form-grid-actions"><button className="btn btn-primary rounded-pill px-4" disabled={saving}><FiSave className="me-2" />{saving ? 'Saving…' : 'Save profile'}</button></div>
        </form>
      </section>
    </div> : <section className="panel mb-4"><p className="mb-0">This HR account does not have an employee profile linked. Account security settings remain available below.</p></section>}
    <section className="panel form-panel">
      <div className="panel-heading"><div><h2>Change password</h2><p>Choose a new password with at least 12 characters. You will be signed out after it is changed.</p></div><span className="panel-icon"><FiLock /></span></div>
      <InlineAlert>{passwordError}</InlineAlert>
      {passwordNotice && <InlineAlert variant="success" onClose={() => setPasswordNotice('')}>{passwordNotice}</InlineAlert>}
      <form className="form-grid" onSubmit={savePassword}>
        <div><label className="form-label" htmlFor="currentPassword">Current password</label><input id="currentPassword" className="form-control" type="password" autoComplete="current-password" required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></div>
        <div><label className="form-label" htmlFor="newPassword">New password</label><input id="newPassword" className="form-control" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></div>
        <div><label className="form-label" htmlFor="confirmPassword">Confirm new password</label><input id="confirmPassword" className="form-control" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} /></div>
        <div className="form-grid-actions"><button className="btn btn-outline-primary rounded-pill px-4" disabled={passwordBusy}><FiLock className="me-2" />{passwordBusy ? 'Changing password…' : 'Change password'}</button></div>
      </form>
    </section>
  </div>;
}
