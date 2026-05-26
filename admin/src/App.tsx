import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { PageLoader } from './components/Loader';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Deposits from './pages/Deposits';
import Withdrawals from './pages/Withdrawals';
import Packages from './pages/Packages';
import Investments from './pages/Investments';
import Settings from './pages/Settings';
import LiveSpins from './pages/LiveSpins';
import NotificationsPage from './pages/Notifications';
import AppVersions from './pages/AppVersions';

function Guard({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();
  if (state === 'loading')    return <PageLoader />;
  if (state !== 'authorized') return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  const { state, user } = useAuth();
  const email = user?.email ?? null;

  const loginRedirect =
    state === 'loading'    ? <PageLoader /> :
    state === 'authorized' ? <Navigate to="/" replace /> :
    <Login />;

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={loginRedirect} />

        <Route path="/"            element={<Guard><Dashboard   adminEmail={email} /></Guard>} />
        <Route path="/users"       element={<Guard><Users        adminEmail={email} /></Guard>} />
        <Route path="/deposits"    element={<Guard><Deposits     adminEmail={email} /></Guard>} />
        <Route path="/withdrawals" element={<Guard><Withdrawals  adminEmail={email} /></Guard>} />
        <Route path="/packages"    element={<Guard><Packages     adminEmail={email} /></Guard>} />
        <Route path="/investments" element={<Guard><Investments  adminEmail={email} /></Guard>} />
        <Route path="/settings"    element={<Guard><Settings     adminEmail={email} /></Guard>} />
        <Route path="/live-spins"      element={<Guard><LiveSpins         adminEmail={email} /></Guard>} />
        <Route path="/notifications"   element={<Guard><NotificationsPage adminEmail={email} /></Guard>} />
        <Route path="/app-versions"    element={<Guard><AppVersions       adminEmail={email} /></Guard>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
