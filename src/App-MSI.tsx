import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import SignIn from './SignIn';
import SignUp from './Signup';
import Dashboard from './Dashboard/dashboard_main';
import Appointments from './Dashboard/appointments';
import Records from './Dashboard/medical_records';
import Prescriptions from './Dashboard/prescriptions';
import ShareAccessPage from './Dashboard/sharing';
import HealthSummary from './Dashboard/health_summary_ai';
import Profile from './Dashboard/profile';
import DoctorAuth from './DoctorAuth';
import DoctorDashboard from './DoctorDashboard';
import { DoctorPatientSessionProvider } from './doctor-session/DoctorPatientSessionContext';

const hasSessionToken = () =>
  Boolean(localStorage.getItem('token') || sessionStorage.getItem('token'));

const ProtectedRoute = () => {
  if (!hasSessionToken()) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

const hasDoctorToken = () => Boolean(localStorage.getItem("doctor_token"));

const DoctorProtectedRoute = () => {
  if (!hasDoctorToken()) {
    return <Navigate to="/doctor/auth" replace />;
  }
  return <Outlet />;
};

const PublicOnlyRoute = () => {
  if (hasSessionToken()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

function App() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/medical_records" element={<Records />} />
        <Route path="/prescriptions" element={<Prescriptions />} />
        <Route path="/sharing" element={<ShareAccessPage />} />
        <Route path="/health_summary" element={<HealthSummary />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="/doctor/auth" element={<DoctorAuth />} />
      <Route element={<DoctorProtectedRoute />}>
        <Route
          path="/doctor/dashboard"
          element={
            <DoctorPatientSessionProvider>
              <DoctorDashboard />
            </DoctorPatientSessionProvider>
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
