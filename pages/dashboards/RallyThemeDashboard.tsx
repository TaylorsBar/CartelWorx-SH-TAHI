
import React from 'react';
import { useVehicleData } from '../../hooks/useVehicleData';
import { SensorDataPoint } from '../../types';

const RallyDataBlock: React.FC<{ label: string; value: string | number; unit?: string; alert?: boolean }> = ({ label, value, unit, alert }) => (
    <div className={`relative p-2 border-2 ${alert ? 'bg-red-600 border-red-600 text-white animate-pulse' : 'bg-[#1a1a1a] border-yellow-500 text-yellow-500'} skew-x-[-12deg] shadow-lg`}>
        <div className="skew-x-[12deg]">
            <div className={`text-[10px] font-mono font-bold uppercase tracking-widest ${alert ? 'text-white' : 'text-gray-400'}`}>{label}</div>
            <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black font-mono tracking-tighter">{value}</span>
                {unit && <span className="text-xs font-bold">{unit}</span>}
            </div>
        </div>
    </div>
);

const LinearRpmBar: React.FC<{ rpm: number; max: number }> = ({ rpm, max }) => {
    const pct = Math.min(100, Math.max(0, (rpm / max) * 100));
    const isRedline = pct > 85;
    
    return (
        <div className="w-full h-16 bg-[#111] border-b-4 border-yellow-500 relative overflow-hidden flex items-end px-1 gap-1">
            {Array.from({length: 40}).map((_, i) => {
                const barPct = (i / 40) * 100;
                const active = pct >= barPct;
                let color = 'bg-yellow-500';
                if (barPct > 85) color = 'bg-red-600';
                if (active && barPct > 85) color = 'bg-red-500 animate-pulse';

                return (
                    <div 
                        key={i} 
                        className={`flex-1 transition-all duration-75 ${active ? color : 'bg-[#222]'} ${active ? 'h-full' : 'h-1/2'}`}
                        style={{ opacity: active ? 1 : 0.3 }}
                    />
                )
            })}
            <div className="absolute top-1 right-2 text-4xl font-black text-white font-mono z-10 drop-shadow-md">
                {rpm.toFixed(0)} <span className="text-sm text-yellow-500">RPM</span>
            </div>
        </div>
    );
};

const RallyThemeDashboard: React.FC = () => {
    const { latestData } = useVehicleData();
    const d: SensorDataPoint = latestData;

    return (
        <div className="flex flex-col h-full w-full bg-[#050505] text-white overflow-hidden relative font-mono">
            {/* Dirt Texture Overlay */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E")`,
            }}></div>

            {/* Top RPM Bar */}
            <div className="w-full z-10">
                <LinearRpmBar rpm={d.rpm} max={8000} />
            </div>

            {/* Main Content */}
            <div className="flex-1 p-4 grid grid-cols-3 gap-6 z-10">
                
                {/* Left Telemetry */}
                <div className="flex flex-col justify-center gap-6">
                    <RallyDataBlock label="Turbo Boost" value={d.turboBoost.toFixed(2)} unit="BAR" />
                    <RallyDataBlock label="Oil Pressure" value={d.oilPressure.toFixed(1)} unit="PSI" alert={d.oilPressure < 1.0} />
                    <RallyDataBlock label="Fuel Level" value="42" unit="L" />
                </div>

                {/* Center Gear & Speed */}
                <div className="flex flex-col items-center justify-center relative">
                    <div className="w-64 h-64 bg-yellow-500 rounded-full flex items-center justify-center border-8 border-[#111] shadow-[0_0_50px_rgba(234,179,8,0.4)]">
                        <span className="text-[10rem] font-black text-[#111] leading-none mt-[-1rem]">{d.gear}</span>
                    </div>
                    <div className="mt-6 bg-[#111] border-2 border-yellow-500 px-8 py-2 transform skew-x-[-12deg] shadow-lg">
                        <span className="text-6xl font-black text-white block transform skew-x-[12deg]">{d.speed.toFixed(0)} <span className="text-xl text-gray-400">KM/H</span></span>
                    </div>
                </div>

                {/* Right Telemetry */}
                <div className="flex flex-col justify-center gap-6">
                    <RallyDataBlock label="Coolant Temp" value={d.engineTemp.toFixed(0)} unit="°C" alert={d.engineTemp > 105} />
                    <RallyDataBlock label="Intake Temp" value={d.inletAirTemp.toFixed(0)} unit="°C" />
                    <RallyDataBlock label="Battery" value={d.batteryVoltage.toFixed(1)} unit="V" />
                </div>
            </div>

            {/* Bottom Status Strip */}
            <div className="h-12 bg-[#111] border-t-4 border-yellow-500 flex items-center justify-between px-6 z-10">
                 <div className="text-xs font-bold text-gray-400 uppercase">Stage Mode: <span className="text-yellow-500">ACTIVE</span></div>
                 <div className="flex gap-4">
                     <span className={`px-2 py-0.5 text-xs font-bold ${d.engineTemp > 100 ? 'bg-red-600 text-white animate-pulse' : 'bg-green-600 text-black'}`}>ENG</span>
                     <span className="px-2 py-0.5 bg-green-600 text-black text-xs font-bold">ABS</span>
                     <span className="px-2 py-0.5 bg-yellow-500 text-black text-xs font-bold">TC</span>
                 </div>
            </div>
        </div>
    );
};

export default RallyThemeDashboard;
