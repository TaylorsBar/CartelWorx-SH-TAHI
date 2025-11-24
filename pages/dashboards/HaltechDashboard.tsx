
import React, { useState, useEffect } from 'react';
import { useVehicleData } from '../../hooks/useVehicleData';
import { useAnimatedValue } from '../../hooks/useAnimatedValue';
import HaltechTachometer from '../../components/tachometers/HaltechTachometer';
import HaltechSideBarGauge from '../../components/gauges/HaltechSideBarGauge';

// --- Icons ---
const TurnLeftIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" className={`w-full h-full transition-colors duration-200 ${active ? 'fill-green-500 animate-pulse filter drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'fill-[#222]'}`}><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
);
const TurnRightIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" className={`w-full h-full transition-colors duration-200 ${active ? 'fill-green-500 animate-pulse filter drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'fill-[#222]'}`}><path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z"/></svg>
);
const ParkingIcon = ({ active }: { active: boolean }) => (
    <div className={`w-full h-full rounded border-2 flex items-center justify-center font-display font-bold text-xs transition-colors duration-200 ${active ? 'border-red-500 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'border-[#222] text-[#222]'}`}>P</div>
);
const HighBeamIcon = ({ active }: { active: boolean }) => (
    <svg viewBox="0 0 24 24" className={`w-full h-full transition-colors duration-200 ${active ? 'fill-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)]' : 'fill-[#222]'}`}><path d="M5.5,16.5L2,12l3.5-4.5H12V6H4A2,2,0,0,0,2,8v8a2,2,0,0,0,2,2h8v-1.5H5.5M22,12l-3.5,4.5H12V18h8a2,2,0,0,0,2-2V8a2,2,0,0,0-2-2h-8v1.5h6.5M12,14h-1v-4h1V14z"/></svg>
);

// --- Components ---

// Sequential Shift Light Array
const ShiftLights: React.FC<{ rpm: number; limit: number }> = ({ rpm, limit }) => {
    const percentage = rpm / limit;
    const isShiftNow = percentage >= 0.95;
    
    const getLedState = (index: number) => {
        if (isShiftNow) return 'bg-blue-500 animate-pulse shadow-[0_0_20px_#3b82f6] border-blue-300';
        
        let threshold = 0;
        let activeColor = '';
        let borderColor = '';
        
        if (index < 4) { // Green LEDs
            threshold = 0.50 + (index * 0.08); 
            activeColor = 'bg-green-500 shadow-[0_0_15px_#22c55e]';
            borderColor = 'border-green-400';
        } else if (index < 7) { // Yellow LEDs
            threshold = 0.82 + ((index - 4) * 0.04);
            activeColor = 'bg-yellow-400 shadow-[0_0_15px_#facc15]';
            borderColor = 'border-yellow-200';
        } else { // Red LEDs
            threshold = 0.94;
            activeColor = 'bg-red-600 shadow-[0_0_15px_#ef4444]';
            borderColor = 'border-red-400';
        }

        return percentage >= threshold ? `${activeColor} border ${borderColor}` : 'bg-[#222] border border-[#333]';
    };

    return (
        <div className="flex gap-1 justify-center w-full max-w-[500px] mb-4">
            {Array.from({ length: 10 }).map((_, index) => (
                <div key={index} className={`h-4 w-8 rounded-sm transition-colors duration-75 ${getLedState(index)}`}></div>
            ))}
        </div>
    );
};

const HaltechDashboard: React.FC = () => {
    const { latestData, hasActiveFault } = useVehicleData();
    const d = latestData;
    const [turnLeft, setTurnLeft] = useState(false);
    const [turnRight, setTurnRight] = useState(false);

    // Mock indicator logic
    useEffect(() => {
        const interval = setInterval(() => {
            if (Math.random() > 0.95) setTurnLeft(true);
            if (Math.random() > 0.95) setTurnRight(true);
            if (turnLeft) setTimeout(() => setTurnLeft(false), 3000);
            if (turnRight) setTimeout(() => setTurnRight(false), 3000);
        }, 1000);
        return () => clearInterval(interval);
    }, [turnLeft, turnRight]);

    return (
        <div className="w-full h-full bg-[#111] flex flex-col items-center justify-center relative overflow-hidden font-sans">
            {/* Background Texture */}
            <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
                backgroundImage: 'radial-gradient(circle at center, #222 0%, #000 100%)'
            }}></div>

            {/* Top Status Bar */}
            <div className="absolute top-0 w-full p-4 flex justify-between items-start z-20">
                <div className="flex gap-4">
                    <div className="w-10 h-10"><TurnLeftIcon active={turnLeft} /></div>
                    <div className="w-10 h-10"><HighBeamIcon active={false} /></div>
                </div>
                
                <ShiftLights rpm={d.rpm} limit={8000} />

                <div className="flex gap-4">
                     <div className="w-10 h-10"><ParkingIcon active={d.speed < 5} /></div>
                     <div className="w-10 h-10"><TurnRightIcon active={turnRight} /></div>
                </div>
            </div>

            {/* Main Cluster */}
            <div className="flex w-full max-w-7xl items-center justify-between px-8 z-10 relative">
                
                {/* Left Side Bars */}
                <div className="flex flex-col gap-4 h-[400px] justify-center">
                    <HaltechSideBarGauge label="COOLANT" value={d.engineTemp} min={40} max={120} unit="°C" orientation="left" />
                    <HaltechSideBarGauge label="OIL PRESS" value={d.oilPressure} min={0} max={8} unit="BAR" orientation="left" />
                </div>

                {/* Center Tach */}
                <div className="flex-1 flex justify-center items-center scale-110">
                    <HaltechTachometer rpm={d.rpm} speed={d.speed} gear={d.gear} />
                </div>

                {/* Right Side Bars */}
                <div className="flex flex-col gap-4 h-[400px] justify-center">
                    <HaltechSideBarGauge label="BOOST" value={d.turboBoost} min={-1} max={2.0} unit="BAR" orientation="right" />
                    <HaltechSideBarGauge label="AFR" value={(d.o2SensorVoltage * 2 + 9)} min={10} max={20} unit="AFR" orientation="right" />
                </div>

            </div>

            {/* Bottom Data Fields */}
            <div className="absolute bottom-6 w-full max-w-5xl grid grid-cols-4 gap-4 px-8 z-10">
                <div className="bg-[#1a1a1a] border border-[#333] p-2 rounded flex flex-col items-center">
                    <span className="text-gray-500 text-xs font-bold uppercase">Battery</span>
                    <span className="text-white font-mono text-xl">{d.batteryVoltage.toFixed(1)} V</span>
                </div>
                <div className="bg-[#1a1a1a] border border-[#333] p-2 rounded flex flex-col items-center">
                    <span className="text-gray-500 text-xs font-bold uppercase">Intake Temp</span>
                    <span className="text-white font-mono text-xl">{d.inletAirTemp.toFixed(0)} °C</span>
                </div>
                <div className="bg-[#1a1a1a] border border-[#333] p-2 rounded flex flex-col items-center">
                    <span className="text-gray-500 text-xs font-bold uppercase">Fuel Pres</span>
                    <span className="text-white font-mono text-xl">{d.fuelPressure.toFixed(1)} BAR</span>
                </div>
                <div className="bg-[#1a1a1a] border border-[#333] p-2 rounded flex flex-col items-center">
                    <span className="text-gray-500 text-xs font-bold uppercase">Fuel Level</span>
                    <span className="text-white font-mono text-xl">45 %</span>
                </div>
            </div>
            
            {/* Warning Overlay */}
            {hasActiveFault && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-red-600/20 border border-red-500 px-6 py-2 rounded animate-pulse">
                    <span className="text-red-500 font-bold uppercase tracking-widest">CHECK ENGINE</span>
                </div>
            )}
        </div>
    );
};

export default HaltechDashboard;
