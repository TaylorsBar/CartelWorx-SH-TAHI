
import React, { useState } from 'react';
import { useVehicleData } from '../hooks/useVehicleData';
import FuelMap3D from '../components/tuning/FuelMap3D';
import DynoGraph from '../components/tuning/DynoGraph';
import AITuningSidebar from '../components/tuning/AITuningSidebar';

const TuningPage: React.FC = () => {
    const { latestData } = useVehicleData();
    const [activeTab, setActiveTab] = useState<'fuel' | 'ignition' | 'boost'>('fuel');

    return (
        <div className="flex h-full w-full bg-[#050508] text-white overflow-hidden font-sans">
            {/* Main Workspace */}
            <div className="flex-1 flex flex-col min-w-0">
                
                {/* Professional Toolbar */}
                <div className="h-14 border-b border-gray-800 flex items-center px-4 md:px-6 gap-4 bg-[#0f1014] shadow-sm z-10">
                    <div className="flex bg-black rounded-lg p-1 border border-gray-700">
                        <button 
                            onClick={() => setActiveTab('fuel')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider transition-all ${activeTab === 'fuel' ? 'bg-brand-cyan text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]' : 'text-gray-400 hover:text-white'}`}
                        >
                            VE MAP
                        </button>
                        <button 
                            onClick={() => setActiveTab('ignition')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider transition-all ${activeTab === 'ignition' ? 'bg-brand-red text-white shadow-[0_0_15px_rgba(255,51,51,0.3)]' : 'text-gray-400 hover:text-white'}`}
                        >
                            IGNITION
                        </button>
                         <button 
                            onClick={() => setActiveTab('boost')}
                            className={`px-4 py-1.5 rounded-md text-xs font-bold tracking-wider transition-all ${activeTab === 'boost' ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.3)]' : 'text-gray-400 hover:text-white'}`}
                        >
                            BOOST
                        </button>
                    </div>
                    
                    <div className="h-6 w-px bg-gray-800 mx-2"></div>

                    <div className="flex items-center gap-6 text-[10px] font-mono text-gray-500">
                         <div className="flex flex-col">
                             <span className="uppercase tracking-widest text-gray-600">Engine Speed</span>
                             <span className="text-white text-lg leading-none">{latestData.rpm.toFixed(0)} <span className="text-xs text-gray-500">RPM</span></span>
                         </div>
                         <div className="flex flex-col">
                             <span className="uppercase tracking-widest text-gray-600">Calc. Load</span>
                             <span className="text-white text-lg leading-none">{latestData.engineLoad.toFixed(1)} <span className="text-xs text-gray-500">%</span></span>
                         </div>
                         <div className="flex flex-col">
                             <span className="uppercase tracking-widest text-gray-600">Target Lambda</span>
                             <span className="text-brand-cyan text-lg leading-none">{(latestData.o2SensorVoltage * 2).toFixed(2)} <span className="text-xs text-gray-500">λ</span></span>
                         </div>
                    </div>
                </div>

                {/* Workspace Split */}
                <div className="flex-1 grid grid-rows-2 p-2 gap-2 overflow-hidden">
                    
                    {/* Top: 3D Visualization */}
                    <div className="relative bg-[#0a0c10] border border-gray-800/60 rounded-lg overflow-hidden flex flex-col">
                        <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-sm px-2 py-1 rounded border border-gray-700 text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                            3D Volumetric Efficiency Surface
                        </div>
                        <div className="flex-1">
                             <FuelMap3D rpm={latestData.rpm} load={latestData.engineLoad} />
                        </div>
                    </div>

                    {/* Bottom: Dyno & Editor */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 min-h-0">
                        {/* Dyno Graph */}
                        <div className="col-span-2 bg-[#0a0c10] border border-gray-800/60 rounded-lg overflow-hidden relative flex flex-col">
                             <div className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-sm px-2 py-1 rounded border border-gray-700 text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest">
                                Estimated Power / Torque
                            </div>
                            <div className="flex-1 p-2">
                                <DynoGraph rpm={latestData.rpm} />
                            </div>
                        </div>
                        
                        {/* Quick Edit Panel */}
                        <div className="col-span-1 bg-[#0a0c10] border border-gray-800/60 rounded-lg p-4 overflow-y-auto custom-scrollbar">
                             <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider border-b border-gray-800 pb-2">Active Cell Modifier</h3>
                             <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2">Cell Value</label>
                                    <div className="flex gap-2">
                                        <div className="flex-1 bg-black border border-gray-700 rounded p-2 text-brand-cyan font-mono text-xl text-center">
                                            {Math.max(10, Math.min(99.9, 14.7 + (Math.sin(Date.now()/1000)*2))).toFixed(1)}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                            <button className="px-3 py-1 bg-gray-800 border border-gray-600 rounded hover:bg-gray-700 hover:border-gray-500 text-white transition-colors">+</button>
                                            <button className="px-3 py-1 bg-gray-800 border border-gray-600 rounded hover:bg-gray-700 hover:border-gray-500 text-white transition-colors">-</button>
                                        </div>
                                    </div>
                                </div>
                                
                                <div>
                                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block mb-2">Interpolation Mode</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button className="bg-gray-800 border border-gray-700 p-2 rounded text-[10px] font-bold text-gray-300 hover:bg-brand-cyan hover:text-black hover:border-brand-cyan transition-all">HORIZONTAL</button>
                                        <button className="bg-gray-800 border border-gray-700 p-2 rounded text-[10px] font-bold text-gray-300 hover:bg-brand-cyan hover:text-black hover:border-brand-cyan transition-all">VERTICAL</button>
                                        <button className="bg-brand-cyan/20 border border-brand-cyan p-2 rounded text-[10px] font-bold text-brand-cyan shadow-[0_0_10px_rgba(0,240,255,0.2)]">BILINEAR</button>
                                        <button className="bg-gray-800 border border-gray-700 p-2 rounded text-[10px] font-bold text-gray-300 hover:bg-brand-cyan hover:text-black hover:border-brand-cyan transition-all">SMOOTH</button>
                                    </div>
                                </div>

                                <div className="p-3 bg-yellow-900/10 border border-yellow-700/30 rounded">
                                    <div className="text-[10px] text-yellow-500 font-bold mb-1">WARNING</div>
                                    <p className="text-[10px] text-gray-400">Autotune is active. Manual changes may be overwritten.</p>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Sidebar: AI Control */}
            <div className="w-80 border-l border-gray-800 bg-[#0f1014] hidden xl:block">
                <AITuningSidebar onApply={() => {}} />
            </div>
        </div>
    );
};

export default TuningPage;
