import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import SignIn from './SignIn';
import SignUp from './Signup';
import Dashboard from './Dashboard/dashboard_main';
import Appointments from './Dashboard/appointments';
import Records from './Dashboard/medical_records';
import ShareAccessPage from './Dashboard/sharing';
import HealthSummary from './Dashboard/health_summary_ai';
import Profile from './Dashboard/profile';

const hasSessionToken = () =>
  Boolean(localStorage.getItem('token') || sessionStorage.getItem('token'));

const ProtectedRoute = () => {
  if (!hasSessionToken()) {
    return <Navigate to="/" replace />;
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
        <Route path="/sharing" element={<ShareAccessPage />} />
        <Route path="/health_summary" element={<HealthSummary />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
