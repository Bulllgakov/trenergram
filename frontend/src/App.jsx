import { useEffect, useState } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { useTelegram } from './hooks/useTelegram';
import TrainerDashboard from './pages/TrainerDashboard';
import ClientDashboard from './pages/ClientDashboard';

function App() {
  const { tg, user } = useTelegram();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Expand app to full height if in Telegram
    if (tg) {
      tg.ready();
      tg.expand();
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
        <Route path="*" element={
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-telegram-hint">Страница не найдена</div>
          </div>
        } />
      </Routes>
    </div>
  );
}

export default App;