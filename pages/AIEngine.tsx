
import React, { useState } from 'react';
import RiskTimeline from '../components/RiskTimeline';
import { useVehicleData } from '../hooks/useVehicleData';
import { getPredictiveAnalysis } from '../services/geminiService';
import { MOCK_LOGS } from './MaintenanceLog'; // Use mock logs for context
import { TimelineEvent } from '../types';

const AIEngine: React.FC = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>([]);
    const [error, setError] = useState<string | null>(null);

    const { latestData } = useVehicleData();

    const handleConnect = () => {
        setIsConnecting(true);
        setError(null);
        // Simulate connection delay
        setTimeout(() => {
            setIsConnecting(false);
            setIsConnected(true);
        }, 1500);
    };

    const handleAnalyze = async () => {
        if (!isConnected || !latestData) return;
        setIsAnalyzing(true);
        setError(null);
        setTimelineEvents([]);

        try {
            const result = await getPredictiveAnalysis(latestData, MOCK_LOGS);
            if (result.error) {
                setError(result.error);
                setTimelineEvents([]);
            } else {
                setTimelineEvents(result.timelineEvents || []);
            }
        } catch (e) {
            setError("An unexpected error occurred during analysis.");
            setTimelineEvents([]);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-100 font-display">Predictive AI Engine</h1>
                <p className="text-gray-400 mt-1">Leveraging real-time data to forecast vehicle health.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Connection & Control Panel */}
                <div className="lg:col-span-1 bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg space-y-4">
                    <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 font-display">Data Sources</h2>
                    
                    {/* OBD-II Connection */}
                    <div className="flex items-center justify-between p-3 bg-base-800/50 rounded-md">
                        <div className="flex items-center">
                             <svg className="w-6 h-6 mr-3 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             <span className="font-semibold">Live OBD-II Data</span>
                        </div>
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    </div>
                    
                    {/* Maintenance Log */}
                     <div className="flex items-center justify-between p-3 bg-base-800/50 rounded-md">
                        <div className="flex items-center">
                             <svg className="w-6 h-6 mr-3 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                             <span className="font-semibold">Maintenance Log</span>
                        </div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>

                    {/* Driver Profile */}
                    <div className="flex items-center justify-between p-3 bg-base-800/50 rounded-md">
                        <div className="flex items-center">
                            <svg className="w-6 h-6 mr-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <span className="text-gray-500">Driver Profile</span>
                        </div>
                         <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                    </div>
                    
                    {!isConnected ? (
                        <button onClick={handleConnect} disabled={isConnecting} className="w-full bg-brand-blue text-white font-semibold py-3 rounded-md hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-brand-blue shadow-glow-blue disabled:bg-base-700 disabled:cursor-not-allowed">
                            {isConnecting ? 'Connecting...' : 'Connect to Vehicle'}
                        </button>
                    ) : (
                         <button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full bg-brand-cyan text-black font-semibold py-3 rounded-md hover:bg-cyan-300 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-brand-cyan shadow-glow-cyan disabled:bg-base-700 disabled:cursor-not-allowed">
                            {isAnalyzing ? 'Analyzing...' : 'Run Predictive Analysis'}
                        </button>
                    )}
                </div>

                {/* Risk Timeline */}
                <div className="lg:col-span-2 bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg min-h-[300px]">
                    <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 mb-6 font-display">Risk Timeline</h2>
                    {isAnalyzing && (
                        <div className="flex justify-center items-center h-48">
                            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4 animate-spin border-t-brand-cyan"></div>
                        </div>
                    )}
                    {error && <div className="text-red-500 text-center p-4 bg-red-900/20 rounded-md">{error}</div>}
                    {!isAnalyzing && !error && (
                        <RiskTimeline events={timelineEvents} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AIEngine;
