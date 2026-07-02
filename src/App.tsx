import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { useAuthListener, useGroupsListener } from './hooks/useListeners';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { GroupPage } from './components/groups/GroupPage';
import { JoinPage } from './components/groups/JoinPage';
import { ToastContainer } from './components/ui/Toast';
import { FullPageLoader } from './components/ui/LoadingSpinner';
import { ConfirmDialog } from './components/ui/ConfirmDialog';
import { OfflineBanner } from './components/ui/OfflineBanner';
import { InstallPrompt } from './components/ui/InstallPrompt';

function AppRoutes() {
  const user = useStore(s => s.user);
  useGroupsListener();

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/group/:groupId" element={<GroupPage />} />
      <Route path="/join/:code" element={<JoinPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const authReady = useAuthListener();

  if (!authReady) return <FullPageLoader />;

  return (
    <BrowserRouter basename="/mslawia">
      <OfflineBanner />
      <AppRoutes />
      <ToastContainer />
      <ConfirmDialog />
      <InstallPrompt />
    </BrowserRouter>
  );
}
