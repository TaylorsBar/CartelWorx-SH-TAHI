import React from 'react';
import { useVehicleData } from '../../hooks/useVehicleData';
import { SensorDataPoint } from '../../types';
import EdelbrockGauge from '../../components/gauges/EdelbrockGauge';
import BarMeter from '../../components/gauges/BarMeter';
import DigitalDisplay from '../../components/gauges/DigitalDisplay';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';

const StatusLight: React.FC<{label: string, active: boolean}> = ({label, active}) => (
     <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full border border-gray-800 ${active ? 'bg-green-500 shadow-[0_0_5px_#38A169]' : 'bg-green-800'}`}></div>
        <span className="text-sm font-bold text-gray-300">{label}</span>
    </div>
)

const ClassicThemeDashboard: React.FC = () => {
  const { latestData } = useVehicleData();
  const d: SensorDataPoint = latestData;
  const animatedAFR = useAnimatedValue(14.7 - (d.shortTermFuelTrim / 10)); // Simulate AFR

  return (
    <div className="flex flex-col h-full w-full p-2 md:p-4 theme-background gap-4">
      {/* Header */}
      <header className="flex items-center justify-between p-2 rounded-t-lg" style={{ background: 'var(--theme-panel-bg)'}}>
        <div className="flex items-center gap-4">
          <div className="bg-black/50 p-2 rounded-md">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </div>
          <h1 className="text-xl font-bold font-display text-white">EFI-DASHBOARD CH1</h1>
        </div>
        {/* Header Icons can go here */}
      </header>
      
      {/* Main Content */}
      <main className="flex-grow grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Left and Middle Columns */}
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
            <div className="bg-black/50 p-4 rounded-lg flex flex-col justify-around gap-4 border border-gray-700/50">
                <DigitalDisplay label="Throttle" value={d.engineLoad.toFixed(0)} unit="%" />
                <BarMeter label="Actual AFR" value={animatedAFR} target={13.4} />
                <BarMeter label="AFR SP" value={13.4} target={13.4} />
            </div>
            <div className="grid grid-rows-2 gap-4">
              <EdelbrockGauge label="Water Temp" value={d.engineTemp} unit="°C" min={40} max={120} />
              <EdelbrockGauge label="Boost" value={d.turboBoost * 14.5} unit="PSI" min={-15} max={15} />
            </div>
        </div>

        {/* Right Column */}
        <div className="flex items-center justify-center bg-black/50 p-4 rounded-lg border border-gray-700/50">
            <EdelbrockGauge label="RPM" value={d.rpm} unit="" min={0} max={8000} size="large" />
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between p-2 rounded-b-lg bg-black/50 border-t border-gray-700/50">
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-[var(--theme-accent-primary)] text-white font-bold rounded-md">CH 1</button>
            <button className="px-4 py-2 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600">CH 2</button>
            <button className="px-4 py-2 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600">CH 3</button>
            <button className="px-4 py-2 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-600">CH 4</button>
          </div>
          <div className="flex items-center gap-4">
            <StatusLight label="Closed Loop" active={true} />
            <StatusLight label="O2 Learn" active={true} />
          </div>
      </footer>
    </div>
  );
};

export default ClassicThemeDashboard;