
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useRaceSession } from '../hooks/useRaceSession';

const formatTime = (ms: number) => {
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, '0');
    const milliseconds = Math.floor((ms % 1000) / 10).toString().padStart(2, '0');
    return `${minutes}:${seconds}.${milliseconds}`;
};

const RacePack: React.FC = () => {
    const { session, startSession, stopSession, recordLap } = useRaceSession();
    
    return (
        <div className="h-full bg-[#111] flex flex-col font-mono text-gray-300 overflow-hidden">
            {/* Top Bar */}
            <div className="h-14 bg-[#1a1a1a] border-b border-[#333] flex items-center justify-between px-6">
                <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
                    <h1 className="text-xl font-bold text-white uppercase tracking-wider">Pit Wall Telemetry <span className="text-gray-500 text-sm ml-2">SESSION ID: 2994-A</span></h1>
                </div>
                <div className="text-xs text-gray-500">
                    GPS: <span className="text-green-500 font-bold">LOCKED</span> | DATA: <span className="text-green-500 font-bold">20Hz</span>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-12 gap-1 bg-[#000] p-1">
                {/* Left Control Column */}
                <div className="col-span-3 bg-[#151515] border border-[#222] p-4 flex flex-col gap-4">
                    <div className="bg-black border border-[#333] p-4 text-center rounded">
                        <div className="text-xs text-gray-500 uppercase tracking-widest mb-1">Session Timer</div>
                        <div className="text-5xl font-bold text-white tracking-tighter tabular-nums">{formatTime(session.elapsedTime)}</div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {!session.isActive ? (
                            <button onClick={startSession} className="col-span-2 bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded text-sm uppercase tracking-wider">
                                GREEN FLAG
                            </button>
                        ) : (
                            <button onClick={stopSession} className="col-span-2 bg-red-700 hover:bg-red-600 text-white font-bold py-3 rounded text-sm uppercase tracking-wider">
                                RED FLAG
                            </button>
                        )}
                        <button onClick={recordLap} disabled={!session.isActive} className="col-span-2 bg-[#333] hover:bg-[#444] text-white font-bold py-3 rounded text-sm uppercase tracking-wider border border-gray-600">
                            BOX / LAP
                        </button>
                    </div>

                    <div className="flex-1 bg-black border border-[#333] rounded overflow-hidden flex flex-col">
                        <div className="bg-[#222] px-3 py-2 text-xs font-bold uppercase text-gray-400 border-b border-[#333]">Lap History</div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {session.lapTimes.map((lap, i) => (
                                <div key={i} className="flex justify-between items-center text-sm font-bold p-1 hover:bg-[#1a1a1a] rounded">
                                    <span className="text-gray-500">L{lap.lap}</span>
                                    <span className={i === 0 ? "text-purple-400" : "text-white"}>{formatTime(lap.time)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center/Right Data Area */}
                <div className="col-span-9 flex flex-col gap-1">
                    {/* Top Stats Row */}
                    <div className="h-32 grid grid-cols-3 gap-1">
                        <div className="bg-[#151515] border border-[#222] p-4 flex flex-col justify-between">
                             <span className="text-xs text-gray-500 uppercase">0-100 kph</span>
                             <span className="text-4xl font-bold text-yellow-500">{session.zeroToHundredTime ? session.zeroToHundredTime.toFixed(2) : '--.--'} <span className="text-sm text-gray-600">s</span></span>
                        </div>
                        <div className="bg-[#151515] border border-[#222] p-4 flex flex-col justify-between">
                             <span className="text-xs text-gray-500 uppercase">1/4 Mile ET</span>
                             <span className="text-4xl font-bold text-yellow-500">{session.quarterMileTime ? session.quarterMileTime.toFixed(2) : '--.--'} <span className="text-sm text-gray-600">s</span></span>
                        </div>
                        <div className="bg-[#151515] border border-[#222] p-4 flex flex-col justify-between">
                             <span className="text-xs text-gray-500 uppercase">Trap Speed</span>
                             <span className="text-4xl font-bold text-yellow-500">{session.quarterMileSpeed ? session.quarterMileSpeed.toFixed(0) : '---'} <span className="text-sm text-gray-600">kph</span></span>
                        </div>
                    </div>

                    {/* Main Chart */}
                    <div className="flex-1 bg-[#151515] border border-[#222] p-2 relative">
                        <div className="absolute top-2 left-2 z-10 bg-black/50 px-2 py-1 text-[10px] text-gray-400 uppercase font-bold border border-[#333]">Velocity Trace</div>
                         <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={session.data}>
                                <CartesianGrid stroke="#222" strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="time" hide />
                                <YAxis domain={[0, 'auto']} stroke="#444" tick={{fill: '#666', fontSize: 10}} width={30} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#000', border: '1px solid #444', fontFamily: 'monospace' }}
                                    labelFormatter={() => ''}
                                />
                                <Line type="monotone" dataKey="speed" stroke="#00F0FF" strokeWidth={2} dot={false} isAnimationActive={false} />
                                <Line type="monotone" dataKey="rpm" stroke="#FF0055" strokeWidth={1} dot={false} isAnimationActive={false} yAxisId={1} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RacePack;
