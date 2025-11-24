
import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import MobileNavBar from './components/MobileNavBar';
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
import { useVehicleTelemetry, useVehicleConnection } from './hooks/useVehicleData';
import { MOCK_ALERTS } from './components/Alerts';
import RacePack from './pages/RacePack';

const MainLayout: React.FC = () => {
  const location = useLocation();
  
  // Separate hooks for performance: Telemetry updates frequently, Connection does not.
  const { latestData, hasActiveFault } = useVehicleTelemetry();
  const { startSimulation } = useVehicleConnection();

  // Explicitly manage simulation lifecycle at the app root
  useEffect(() => {
    startSimulation();
  }, [startSimulation]);

  const activeAlerts = hasActiveFault 
    ? MOCK_ALERTS.filter(alert => alert.isFaultRelated) 
    : [];

  // Routes that require full-screen edge-to-edge layout
  const isFullScreenRoute = [
    '/', 
    '/race-pack', 
    '/ar-assistant', 
    '/tuning',
    '/ai-engine'
  ].includes(location.pathname);

  return (
    <div className="flex h-screen w-screen bg-transparent text-gray-200 overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Main Content Area */}
        <main className={`flex-1 overflow-x-hidden overflow-y-auto relative z-10 scroll-smooth custom-scrollbar ${isFullScreenRoute ? 'p-0 pb-20 md:pb-0' : 'p-4 md:p-6 pb-24 md:pb-6'}`}>
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
        <MobileNavBar />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppearanceProvider>
      <HashRouter>
        <MainLayout />
      </HashRouter>
    </AppearanceProvider>
  );
};

export default App;
