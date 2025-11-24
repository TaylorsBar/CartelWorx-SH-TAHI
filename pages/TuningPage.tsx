
import React, { useState, useMemo } from 'react';
import { useVehicleStore } from '../stores/vehicleStore';
import TuningSurface3D from '../components/dashboard/TuningSurface3D';
import DynoGraph from '../components/tuning/DynoGraph';
import AITuningSidebar from '../components/tuning/AITuningSidebar';
import MapEditorGrid from '../components/tuning/MapEditorGrid';

const TuningPage: React.FC = () => {
    const latestData = useVehicleStore(state => state.latestData);
    const tuning = useVehicleStore(state => state.tuning);
    const updateMapCell = useVehicleStore(state => state.updateMapCell);
    const smoothMap = useVehicleStore(state => state.smoothMap);
    
    const [activeTable, setActiveTable] = useState<'ve' | 'ign'>('ve');

    // Generate Headers
    const xAxis = useMemo(() => Array.from({length: 16}, (_, i) => i * (8000/15)), []);
    const yAxis = useMemo(() => Array.from({length: 16}, (_, i) => i * (100/15)), []);

    // Active Data source
    const currentMapData = activeTable === 've' ? tuning.veTable : tuning.ignitionTable;

    return (
        <div className="flex h-full w-full bg-surface-dark text-white overflow-hidden font-sans relative">
             {/* Grid Background */}
             <div className="absolute inset-0 pointer-events-none opacity-10 bg-mesh"></div>

            {/* --- WORKSPACE HEADER --- */}
            <div className="h-16 bg-surface-panel border-b border-surface-border flex items-center justify-between px-6 z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-display font-bold tracking-wider text-white">DYNO<span className="text-brand-cyan">LAB</span></h1>
                    <div className="h-6 w-px bg-surface-border mx-2"></div>
                    
                    {/* Map Selector */}
                    <div className="flex bg-black rounded p-1 border border-surface-border">
                        <button 
                            onClick={() => setActiveTable('ve')}
                            className={`px-6 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${activeTable === 've' ? 'bg-brand-cyan text-black shadow-[0_0_10px_rgba(0,240,255,0.4)]' : 'text-gray-500 hover:text-white'}`}
                        >
                            VE Fuel
                        </button>
                        <button 
                            onClick={() => setActiveTable('ign')}
                            className={`px-6 py-1.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${activeTable === 'ign' ? 'bg-brand-purple text-white shadow-[0_0_10px_rgba(180,50,200,0.4)]' : 'text-gray-500 hover:text-white'}`}
                        >
                            Ignition
                        </button>
                    </div>
                </div>

                {/* Live Strip */}
                <div className="flex items-center gap-8">
                     <div className="text-right">
                         <span className="text-[9px] text-gray-500 uppercase font-bold block">RPM</span>
                         <span className="text-xl font-mono text-white">{latestData.rpm.toFixed(0)}</span>
                     </div>
                     <div className="text-right">
                         <span className="text-[9px] text-gray-500 uppercase font-bold block">MAP</span>
                         <span className="text-xl font-mono text-brand-cyan">{(latestData.turboBoost + 1).toFixed(2)} <span className="text-xs text-gray-600">BAR</span></span>
                     </div>
                     <div className="text-right">
                         <span className="text-[9px] text-gray-500 uppercase font-bold block">LAMBDA</span>
                         <span className="text-xl font-mono text-green-400">{(latestData.o2SensorVoltage * 2).toFixed(2)}</span>
                     </div>
                </div>
            </div>

            {/* --- MAIN CONTENT --- */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* CENTER: Visualization & Editors */}
                <div className="flex-1 flex flex-col p-3 gap-3 overflow-hidden min-w-0">
                    
                    {/* TOP PANE: 3D Surface */}
                    <div className="flex-[2] bg-surface-panel border border-surface-border rounded-lg relative overflow-hidden group min-h-[300px]">
                        <div className="absolute top-3 left-4 z-10 pointer-events-none">
                            <h3 className="text-xs font-display font-bold text-gray-400 uppercase tracking-widest">3D Map Visualizer</h3>
                            <p className="text-[10px] text-gray-600 font-mono">Table: {activeTable === 've' ? 'Main_Fuel_VE_1' : 'Ignition_Adv_1'}</p>
                        </div>
                        
                        <TuningSurface3D 
                            data={currentMapData} 
                            rpm={latestData.rpm} 
                            load={latestData.engineLoad} 
                        />
                    </div>

                    {/* BOTTOM PANE: Grid & Tools */}
                    <div className="flex-1 flex gap-3 min-h-[300px]">
                        
                        {/* Editor Grid */}
                        <div className="flex-1 flex flex-col bg-surface-panel border border-surface-border rounded-lg overflow-hidden relative">
                             <div className="bg-[#1a1a1a] px-3 py-1 border-b border-surface-border flex justify-between items-center">
                                 <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Map Table Editor</span>
                                 <div className="flex gap-2">
                                     <button onClick={() => smoothMap(activeTable)} className="text-[9px] bg-[#333] px-2 py-0.5 rounded text-white hover:bg-brand-cyan hover:text-black transition-colors">SMOOTH</button>
                                     <button className="text-[9px] bg-[#333] px-2 py-0.5 rounded text-white hover:bg-brand-cyan hover:text-black transition-colors">INTERP</button>
                                 </div>
                             </div>
                             <div className="flex-1 relative">
                                <MapEditorGrid 
                                    data={currentMapData}
                                    xAxis={xAxis}
                                    yAxis={yAxis}
                                    liveRpm={latestData.rpm}
                                    liveLoad={latestData.engineLoad}
                                    onCellChange={(r, c, val) => updateMapCell(activeTable, r, c, val)}
                                />
                             </div>
                        </div>

                        {/* Dyno Graph (Mini) */}
                        <div className="w-1/3 bg-surface-panel border border-surface-border rounded-lg overflow-hidden relative p-2 hidden lg:block">
                            <div className="absolute top-2 left-3 z-10">
                                <span className="text-[9px] font-bold text-brand-red uppercase tracking-widest">Output Est.</span>
                            </div>
                            <DynoGraph rpm={latestData.rpm} />
                        </div>
                    </div>
                </div>

                {/* RIGHT SIDEBAR: AI Tuning Assistant */}
                <div className="w-80 border-l border-surface-border bg-surface-panel z-10 shadow-2xl hidden xl:flex flex-col">
                    <AITuningSidebar onApply={() => {}} />
                </div>

            </div>
        </div>
    );
};

export default TuningPage;
