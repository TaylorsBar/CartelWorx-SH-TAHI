
import React, { useState } from 'react';
import { useVehicleData } from '../hooks/useVehicleData';
import FuelMap3D from '../components/tuning/FuelMap3D';
import DynoGraph from '../components/tuning/DynoGraph';
import AITuningSidebar from '../components/tuning/AITuningSidebar';

const TuningPage: React.FC = () => {
    const { latestData } = useVehicleData();
    const [activeTab, setActiveTab] = useState<'fuel' | 'ignition' | 'boost'>('fuel');

    return (
        <div className="flex h-full w-full bg-[#050508] text-white overflow-hidden font-sans relative">
             {/* Tech Grid Background */}
             <div className="absolute inset-0 pointer-events-none opacity-5" 
                style={{ 
                    backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', 
                    backgroundSize: '20px 20px' 
                }}>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex flex-col min-w-0 z-10">
                
                {/* Professional Hardware Header */}
                <div className="h-16 border-b border-gray-800 bg-[#0f1014] flex items-center justify-between px-6 shadow-md relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-brand-cyan"></div>
                    
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <h1 className="text-xl font-display font-black tracking-tighter text-white italic">DYNO<span className="text-brand-cyan">LAB</span></h1>
                            <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">ECU Calibration Suite</span>
                        </div>
                        
                        <div className="h-8 w-px bg-gray-800"></div>

                        <div className="flex bg-black/50 rounded p-1 border border-gray-700/50 backdrop-blur-sm">
                            {(['fuel', 'ignition', 'boost'] as const).map(tab => (
                                <button 
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-6 py-1.5 rounded-[2px] text-[10px] font-bold uppercase tracking-widest transition-all ${
                                        activeTab === tab 
                                        ? 'bg-brand-cyan text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]' 
                                        : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                                    }`}
                                >
                                    {tab} Map
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Live ECU Telemetry Strip */}
                    <div className="flex items-center gap-8">
                         <div className="flex flex-col items-end">
                             <span className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">Engine Speed</span>
                             <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-mono font-bold text-white leading-none">{latestData.rpm.toFixed(0)}</span>
                                <span className="text-[10px] text-gray-500">RPM</span>
                             </div>
                         </div>
                         <div className="flex flex-col items-end">
                             <span className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">Lambda Target</span>
                             <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-mono font-bold text-brand-cyan leading-none">{(latestData.o2SensorVoltage * 2).toFixed(2)}</span>
                                <span className="text-[10px] text-brand-cyan/50">λ</span>
                             </div>
                         </div>
                         <div className="flex flex-col items-end">
                             <span className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">Load</span>
                             <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-mono font-bold text-white leading-none">{latestData.engineLoad.toFixed(1)}</span>
                                <span className="text-[10px] text-gray-500">%</span>
                             </div>
                         </div>
                    </div>
                </div>

                {/* Workspace Split */}
                <div className="flex-1 grid grid-rows-2 p-3 gap-3 overflow-hidden">
                    
                    {/* Top: 3D Visualization */}
                    <div className="relative bg-[#08090b] border border-gray-800 rounded-lg overflow-hidden flex flex-col shadow-inner group">
                        <div className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                        <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                             <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></div>
                             <span className="text-[10px] font-mono font-bold text-brand-cyan uppercase tracking-widest bg-black/40 backdrop-blur px-2 py-1 rounded border border-brand-cyan/20">
                                Volumetric Efficiency Surface
                             </span>
                        </div>
                        <div className="absolute top-3 right-3 z-10 flex gap-1">
                            <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                            <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                            <div className="w-1 h-1 bg-white/20 rounded-full"></div>
                        </div>
                        
                        <div className="flex-1 opacity-80 transition-opacity group-hover:opacity-100">
                             <FuelMap3D rpm={latestData.rpm} load={latestData.engineLoad} />
                        </div>
                    </div>

                    {/* Bottom: Dyno & Editor */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 min-h-0">
                        {/* Dyno Graph */}
                        <div className="col-span-2 bg-[#08090b] border border-gray-800 rounded-lg overflow-hidden relative flex flex-col shadow-inner">
                             <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
                                 <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest bg-black/40 backdrop-blur px-2 py-1 rounded border border-gray-700">
                                    Simulated Output
                                </span>
                            </div>
                            <div className="flex-1 p-2 opacity-90">
                                <DynoGraph rpm={latestData.rpm} />
                            </div>
                        </div>
                        
                        {/* Quick Edit Panel (Keypad Style) */}
                        <div className="col-span-1 bg-[#111] border border-gray-800 rounded-lg p-0 flex flex-col overflow-hidden shadow-lg">
                             <div className="bg-[#1a1a1a] p-3 border-b border-gray-700 flex justify-between items-center">
                                 <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cell Modifier</h3>
                                 <div className="w-2 h-2 bg-yellow-500 rounded-full shadow-[0_0_5px_rgba(234,179,8,0.5)]"></div>
                             </div>
                             
                             <div className="flex-1 p-4 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                                {/* Value Display */}
                                <div>
                                    <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">Current Value</label>
                                    <div className="bg-black border border-gray-600 rounded p-3 flex justify-between items-center shadow-inner">
                                        <span className="font-mono text-2xl text-brand-cyan tracking-wider">{Math.max(10, Math.min(99.9, 14.7 + (Math.sin(Date.now()/1000)*2))).toFixed(1)}</span>
                                        <span className="text-[10px] text-gray-500 uppercase">ms</span>
                                    </div>
                                </div>

                                {/* Keypad Controls */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button className="bg-[#222] border-b-2 border-[#333] hover:bg-[#333] hover:border-brand-cyan active:translate-y-[1px] text-white py-3 rounded text-lg font-bold transition-all shadow-md">+</button>
                                    <button className="bg-[#222] border-b-2 border-[#333] hover:bg-[#333] hover:border-brand-cyan active:translate-y-[1px] text-white py-3 rounded text-lg font-bold transition-all shadow-md">-</button>
                                </div>
                                
                                <div>
                                    <label className="text-[9px] text-gray-500 uppercase font-bold mb-1 block">Interpolation</label>
                                    <div className="grid grid-cols-2 gap-1.5">
                                        <button className="bg-[#1a1a1a] border border-gray-700 hover:border-gray-500 text-[9px] font-bold text-gray-400 py-2 rounded transition-all">LINEAR H</button>
                                        <button className="bg-[#1a1a1a] border border-gray-700 hover:border-gray-500 text-[9px] font-bold text-gray-400 py-2 rounded transition-all">LINEAR V</button>
                                        <button className="col-span-2 bg-brand-cyan/10 border border-brand-cyan text-[9px] font-bold text-brand-cyan py-2 rounded shadow-[0_0_10px_rgba(0,240,255,0.1)]">SMOOTHING ALGORITHM</button>
                                    </div>
                                </div>

                                <div className="mt-auto p-3 bg-yellow-900/10 border-l-2 border-yellow-500 rounded-r text-[10px] text-yellow-500/80 leading-tight">
                                    <strong className="block text-yellow-500 mb-0.5">AUTOTUNE ACTIVE</strong>
                                    Closed loop corrections are being applied to the base map.
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar: AI Control */}
            <div className="w-80 border-l border-gray-800 bg-[#0c0d10] hidden xl:flex flex-col z-20 shadow-2xl">
                <AITuningSidebar onApply={() => {}} />
            </div>
        </div>
    );
};

export default TuningPage;
