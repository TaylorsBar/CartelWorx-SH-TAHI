
import React from 'react';
import { useVehicleData } from '../../hooks/useVehicleData';
import AutometerTach from '../../components/tachometers/AutometerTach';

const DigitalReadout: React.FC<{ label: string; value: string | number; unit: string; color?: string }> = ({ label, value, unit, color = 'text-white' }) => (
    <div className="bg-black/80 border border-gray-700 rounded-md p-3 flex flex-col items-center min-w-[100px] shadow-lg backdrop-blur-sm">
        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1">{label}</span>
        <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-mono font-bold ${color} tracking-tighter leading-none`}>{value}</span>
            <span className="text-[10px] text-gray-500 font-bold">{unit}</span>
        </div>
    </div>
);

const ModernThemeDashboard: React.FC = () => {
    const { latestData } = useVehicleData();
    const d = latestData;

    return (
        <div className="w-full h-full bg-[#0a0a0a] relative overflow-hidden flex flex-col items-center justify-center">
            {/* Carbon Fiber Background */}
            <div className="absolute inset-0 z-0 opacity-30" style={{
                backgroundImage: `
                    linear-gradient(27deg, #151515 5px, transparent 5px) 0 5px,
                    linear-gradient(207deg, #151515 5px, transparent 5px) 10px 0px,
                    linear-gradient(27deg, #222 5px, transparent 5px) 0px 10px,
                    linear-gradient(207deg, #222 5px, transparent 5px) 10px 5px,
                    linear-gradient(90deg, #1b1b1b 10px, transparent 10px)
                `,
                backgroundSize: '20px 20px',
                backgroundColor: '#131313'
            }}></div>
            
            {/* Vignette */}
            <div className="absolute inset-0 z-0 bg-radial-gradient from-transparent to-black opacity-80 pointer-events-none"></div>

            {/* Main Instrument Cluster Container */}
            <div className="relative z-10 flex items-center justify-center gap-12 scale-90 md:scale-100">
                
                {/* Left Telemetry Stack */}
                <div className="flex flex-col gap-6 transform -translate-y-4">
                    <DigitalReadout label="Boost" value={d.turboBoost.toFixed(1)} unit="PSI" color="text-cyan-400" />
                    <DigitalReadout label="A/F Ratio" value={(d.o2SensorVoltage * 2 + 9).toFixed(1)} unit=":1" color="text-yellow-400" />
                    <DigitalReadout label="Intake" value={d.inletAirTemp.toFixed(0)} unit="°C" />
                </div>

                {/* Centerpiece: The Monster Tach */}
                <div className="relative">
                    {/* Glow behind the tach */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-cyan-900/20 rounded-full blur-3xl pointer-events-none"></div>
                    
                    <AutometerTach 
                        rpm={d.rpm} 
                        shiftPoint={7500} 
                        redline={8500} 
                        maxRpm={10000} 
                        size={500} 
                    />

                    {/* Speedometer overlay at bottom of tach */}
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 translate-y-8 bg-black/90 border-t-2 border-cyan-500/50 px-8 py-2 rounded-xl flex flex-col items-center shadow-2xl">
                         <span className="text-6xl font-display font-black text-white tracking-tighter italic" style={{ textShadow: '0 0 10px rgba(0,255,255,0.5)' }}>
                            {d.speed.toFixed(0)}
                        </span>
                        <span className="text-[10px] text-cyan-500 font-bold uppercase tracking-[0.3em] -mt-1">KM/H</span>
                    </div>

                    {/* Gear Indicator */}
                    <div className="absolute top-10 right-10 bg-black border-2 border-gray-700 rounded-lg w-16 h-16 flex items-center justify-center shadow-xl transform rotate-6">
                        <span className="font-display font-bold text-5xl text-yellow-500">
                            {d.gear === 0 ? 'N' : d.gear}
                        </span>
                    </div>
                </div>

                {/* Right Telemetry Stack */}
                <div className="flex flex-col gap-6 transform -translate-y-4">
                    <DigitalReadout label="Oil Press" value={d.oilPressure.toFixed(1)} unit="BAR" color="text-red-400" />
                    <DigitalReadout label="Water" value={d.engineTemp.toFixed(0)} unit="°C" color={d.engineTemp > 100 ? "text-red-500 animate-pulse" : "text-white"} />
                    <DigitalReadout label="Volts" value={d.batteryVoltage.toFixed(1)} unit="V" />
                </div>
            </div>

            {/* Bottom Status Bar */}
            <div className="absolute bottom-8 w-full max-w-4xl flex justify-between items-center px-8 py-3 bg-black/60 border border-white/10 rounded-full backdrop-blur-md z-10">
                 <div className="flex items-center gap-4">
                     <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Map Switch</div>
                     <div className="px-3 py-1 bg-cyan-900/30 border border-cyan-500/30 rounded text-cyan-400 text-xs font-bold">RACE (E85)</div>
                 </div>
                 <div className="flex items-center gap-4">
                     <span className={`text-xs font-bold ${d.engineTemp > 90 ? 'text-green-500' : 'text-yellow-500'}`}>
                         {d.engineTemp > 90 ? 'OPERATING TEMP' : 'WARMING UP'}
                     </span>
                     <div className={`w-2 h-2 rounded-full ${d.engineTemp > 90 ? 'bg-green-500 shadow-[0_0_5px_#22c55e]' : 'bg-yellow-500 animate-pulse'}`}></div>
                 </div>
            </div>
        </div>
    );
};

export default ModernThemeDashboard;
