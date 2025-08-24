
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Diagnostics from './pages/Diagnostics';
import MaintenanceLog from './pages/MaintenanceLog';
import TuningPage from './pages/TuningPage';
import AIEngine from './pages/AIEngine';
import Security from './pages/Security';
import ARAssistant from './pages/ARAssistant';
import Hedera from './pages/Hedera';
import Appearance from './pages/Appearance';
import Accessories from './pages/Accessories';
import { AppearanceProvider } from './contexts/AppearanceContext';
import CoPilot from './components/CoPilot';
import { useVehicleData } from './hooks/useVehicleData';
import { MOCK_ALERTS } from './components/Alerts'; // Mock alerts for context
import RacePack from './pages/RacePack';

const App: React.FC = () => {
  const { latestData, hasActiveFault } = useVehicleData();

  // Filter alerts based on the active fault state from the simulation
  const activeAlerts = hasActiveFault 
    ? MOCK_ALERTS.filter(alert => alert.isFaultRelated) 
    : [];

  return (
    <AppearanceProvider>
      <HashRouter>
        <div className="flex h-screen bg-black text-gray-200">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden relative">
            <main className="flex-1 overflow-x-hidden overflow-y-auto theme-background p-4 md:p-6">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/diagnostics" element={<Diagnostics />} />
                <Route path="/logbook" element={<MaintenanceLog />} />
                <Route path="/tuning" element={<TuningPage />} />
                <Route path="/ai-engine" element={<AIEngine />} />
                <Route path="/ar-assistant" element={<ARAssistant />} />
                <Route path="/security" element={<Security />} />
                <Route path="/hedera" element={<Hedera />} />
                <Route path="/race-pack" element={<RacePack />} />
                <Route path="/accessories" element={<Accessories />} />
                <Route path="/appearance" element={<Appearance />} />
              </Routes>
            </main>
            <CoPilot latestVehicleData={latestData} activeAlerts={activeAlerts} />
          </div>
        </div>
      </HashRouter>
    </AppearanceProvider>
  );
};

export default App;