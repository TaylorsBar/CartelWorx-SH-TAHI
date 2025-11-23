
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
import { MOCK_ALERTS } from './components/Alerts';
import RacePack from './pages/RacePack';

const App: React.FC = () => {
  const { latestData, hasActiveFault } = useVehicleData();

  const activeAlerts = hasActiveFault 
    ? MOCK_ALERTS.filter(alert => alert.isFaultRelated) 
    : [];

  return (
    <AppearanceProvider>
      <HashRouter>
        {/* bg-transparent allows the global CSS carbon fiber body background to show through */}
        <div className="flex h-screen w-screen bg-transparent text-gray-200 overflow-hidden">
          <Sidebar />
          <div className="flex-1 flex flex-col overflow-hidden relative">
            {/* Main Content Area */}
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6 relative z-10 scroll-smooth custom-scrollbar">
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
            {/* Floating UI Elements */}
            <CoPilot latestVehicleData={latestData} activeAlerts={activeAlerts} />
          </div>
        </div>
      </HashRouter>
    </AppearanceProvider>
  );
};

export default App;
