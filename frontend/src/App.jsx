import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import TrainerDashboard from './pages/TrainerDashboard';
import ClientDashboard from './pages/ClientDashboard';

function App() {
  const { tg, user } = useTelegram();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Expand app to full height
    tg.ready();
    tg.expand();

    // Get user role from URL or backend
    const path = window.location.pathname;
    if (path.includes('/trainer/')) {
      setUserRole('trainer');
    } else if (path.includes('/client/')) {
      setUserRole('client');
    }
    
    setLoading(false);
  }, [tg]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-telegram-hint">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path="/trainer/:id" element={<TrainerDashboard />} />
        <Route path="/client/:id" element={<ClientDashboard />} />
      </Routes>
    </div>
  );
}

export default App;