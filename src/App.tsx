import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useStore } from './store/useStore';
import { useAuth } from './hooks/useAuth';
import { useGroups } from './hooks/useGroups';
import { LoginPage } from './components/auth/LoginPage';
import { Dashboard } from './components/dashboard/Dashboard';
import { GroupPage } from './components/groups/GroupPage';
import { ToastContainer } from './components/ui/Toast';
import { FullPageLoader } from './components/ui/LoadingSpinner';
import { ConfirmDialog } from './components/ui/ConfirmDialog';

function AppRoutes() {
  const { user } = useStore();
  useAuth();
  useGroups();

  if (!user) return <LoginPage />;

  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/group/:groupId" element={<GroupPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, () => setAuthChecked(true));
    return unsub;
  }, []);

  if (!authChecked) return <FullPageLoader />;

  return (
    <BrowserRouter basename="/mslawia">
      <AppRoutes />
      <ToastContainer />
      <ConfirmDialog />
    </BrowserRouter>
  );
}
