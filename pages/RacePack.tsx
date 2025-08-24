
import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
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
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-100 font-display">Race Pack</h1>
                <p className="text-gray-400 mt-1">High-precision performance timing and data logging.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Controls & Live Data */}
                <div className="lg:col-span-1 bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg space-y-4">
                    <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 font-display">Session Control</h2>
                    <div className="text-center bg-base-800/50 rounded-md p-4">
                        <p className="text-sm text-gray-400">Elapsed Time</p>
                        <p className="font-mono text-5xl text-brand-cyan tracking-wider">{formatTime(session.elapsedTime)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {!session.isActive ? (
                            <button onClick={startSession} className="col-span-2 bg-green-600 text-white font-semibold py-3 rounded-md hover:bg-green-500 transition-colors">
                                Start Session
                            </button>
                        ) : (
                            <button onClick={stopSession} className="col-span-2 bg-red-600 text-white font-semibold py-3 rounded-md hover:bg-red-500 transition-colors">
                                Stop Session
                            </button>
                        )}
                        <button onClick={recordLap} disabled={!session.isActive} className="col-span-2 bg-brand-blue text-white font-semibold py-3 rounded-md hover:bg-blue-500 transition-colors disabled:bg-base-700 disabled:cursor-not-allowed">
                            Record Lap
                        </button>
                    </div>
                </div>

                {/* Performance Metrics */}
                <div className="lg:col-span-2 bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg space-y-4">
                    <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 font-display">Performance Metrics</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                        <div className="bg-base-800/50 p-4 rounded-md">
                            <p className="text-sm text-gray-400">0-100 km/h</p>
                            <p className="font-mono text-4xl text-white">{session.zeroToHundredTime ? `${session.zeroToHundredTime.toFixed(2)}s` : '--'}</p>
                        </div>
                        <div className="bg-base-800/50 p-4 rounded-md">
                            <p className="text-sm text-gray-400">1/4 Mile Time</p>
                            <p className="font-mono text-4xl text-white">{session.quarterMileTime ? `${session.quarterMileTime.toFixed(2)}s` : '--'}</p>
                        </div>
                        <div className="bg-base-800/50 p-4 rounded-md">
                            <p className="text-sm text-gray-400">1/4 Mile Speed</p>
                            <p className="font-mono text-4xl text-white">{session.quarterMileSpeed ? `${session.quarterMileSpeed.toFixed(0)} km/h` : '--'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                 {/* Lap Times */}
                <div className="lg:col-span-1 bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg">
                     <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 mb-4 font-display">Lap Times</h2>
                     <div className="space-y-2 h-64 overflow-y-auto">
                        {session.lapTimes.length > 0 ? (
                            session.lapTimes.map(lap => (
                                <div key={lap.lap} className="flex justify-between items-center bg-base-800/50 p-2 rounded-md font-mono">
                                    <span className="text-gray-400">Lap {lap.lap}</span>
                                    <span className="text-white text-lg">{formatTime(lap.time)}</span>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-gray-500 pt-10">No laps recorded.</div>
                        )}
                     </div>
                </div>
                {/* Speed Chart */}
                <div className="lg:col-span-2 bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg h-96">
                    <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 mb-4 font-display">Session Speed Chart</h2>
                     <ResponsiveContainer width="100%" height="85%">
                        <LineChart data={session.data}>
                            <XAxis dataKey="time" tick={false} />
                            <YAxis domain={[0, 'dataMax + 20']} stroke="#7F7F98" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#0A0A0F', border: '1px solid #00FFFF' }}
                                labelFormatter={(label) => `Time: ${((label - session.data[0]?.time) / 1000).toFixed(2)}s`}
                            />
                            <Line type="monotone" dataKey="speed" stroke="#00FFFF" strokeWidth={2} dot={false} name="Speed (km/h)" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default RacePack;