import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { fetchCurrentUser } from './app/authSlice';
import ProtectedRoute from './routes/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import LandingPage from './pages/shared/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/shared/DashboardPage';
import EmployeesPage from './pages/shared/EmployeesPage';
import AttendancePage from './pages/shared/AttendancePage';
import LeavesPage from './pages/shared/LeavesPage';
import AnnouncementsPage from './pages/shared/AnnouncementsPage';
import TrainingPage from './pages/shared/TrainingPage';
import NotificationsPage from './pages/shared/NotificationsPage';
import ProfilePage from './pages/shared/ProfilePage';
import NotFoundPage from './pages/shared/NotFoundPage';
import AccessDeniedPage from './pages/shared/AccessDeniedPage';
function AppRoutes(){
 const dispatch=useDispatch();useEffect(()=>{dispatch(fetchCurrentUser());},[dispatch]);
 return <Routes><Route path="/" element={<LandingPage/>}/><Route path="/login" element={<LoginPage/>}/><Route path="/app" element={<ProtectedRoute><MainLayout/></ProtectedRoute>}><Route index element={<Navigate to="dashboard" replace/>}/><Route path="dashboard" element={<DashboardPage/>}/><Route path="employees" element={<ProtectedRoute roles={['HR','MANAGER']}><EmployeesPage/></ProtectedRoute>}/><Route path="attendance" element={<AttendancePage/>}/><Route path="leaves" element={<LeavesPage/>}/><Route path="announcements" element={<AnnouncementsPage/>}/><Route path="training" element={<TrainingPage/>}/><Route path="notifications" element={<NotificationsPage/>}/><Route path="profile" element={<ProfilePage/>}/></Route><Route path="/unauthorized" element={<AccessDeniedPage/>}/><Route path="*" element={<NotFoundPage/>}/></Routes>;
}
export default function App(){return <BrowserRouter><AppRoutes/></BrowserRouter>;}
