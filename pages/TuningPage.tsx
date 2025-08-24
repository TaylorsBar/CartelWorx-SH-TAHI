
import React, { useState } from 'react';
import { useVehicleData } from '../hooks/useVehicleData';
import { TuningSuggestion } from '../types';
import { getTuningSuggestion } from '../services/geminiService';
import EngineDiagram from '../components/tuning/EngineDiagram';
import TuningSlider from '../components/tuning/TuningSlider';

const DEFAULT_TUNE = { fuelMap: 0, ignitionTiming: 0, boostPressure: 0 };

const TuningPage: React.FC = () => {
    const { latestData } = useVehicleData();
    const [mode, setMode] = useState<'sandbox' | 'live'>('sandbox');
    const [tuneParams, setTuneParams] = useState(DEFAULT_TUNE);
    const [aiSuggestion, setAiSuggestion] = useState<TuningSuggestion | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [highlightedPart, setHighlightedPart] = useState<string | null>(null);

    // AI Assistant state
    const [drivingStyle, setDrivingStyle] = useState('Aggressive Track');
    const [conditions, setConditions] = useState('Dry, Warm');

    const handleParamChange = (param: keyof typeof tuneParams, value: number) => {
        setTuneParams(prev => ({ ...prev, [param]: value }));
        
        // Highlight engine part on change
        if (param === 'fuelMap') setHighlightedPart('injectors');
        else if (param === 'ignitionTiming') setHighlightedPart('spark-plugs');
        else if (param === 'boostPressure') setHighlightedPart('turbo');
        
        // Clear highlight after a short delay
        setTimeout(() => setHighlightedPart(null), 1000);
    };

    const handleGenerateAiTune = async () => {
        setIsGenerating(true);
        setAiSuggestion(null);
        try {
            const suggestion = await getTuningSuggestion(latestData, drivingStyle, conditions);
            setAiSuggestion(suggestion);
        } catch (error) {
            console.error(error);
            // In a real app, show a toast or error message
        } finally {
            setIsGenerating(false);
        }
    };

    const loadAiSuggestion = () => {
        if (aiSuggestion) {
            setTuneParams(aiSuggestion.suggestedParams);
        }
    };

    const handleWriteToEcu = () => {
        if (mode === 'live') {
            setShowConfirmModal(true);
        }
    };
    
    const confirmWrite = () => {
        console.log("WRITING TO ECU:", tuneParams); // In a real app, this sends data to the vehicle
        setShowConfirmModal(false);
        // Add visual feedback like a success toast
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            {/* Main Tuning Panel */}
            <div className="w-full lg:w-2/3 bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg flex flex-col">
                <div className="flex justify-between items-center border-b border-brand-cyan/30 pb-2 mb-6">
                    <h1 className="text-xl font-bold text-gray-100 font-display">Tuning Suite</h1>
                    <div className="flex items-center space-x-2 bg-base-800 p-1 rounded-md">
                        <button onClick={() => setMode('sandbox')} className={`px-3 py-1 text-sm font-semibold rounded ${mode === 'sandbox' ? 'bg-brand-blue text-white' : 'text-gray-400'}`}>Sandbox Mode</button>
                        <button onClick={() => setMode('live')} className={`px-3 py-1 text-sm font-semibold rounded ${mode === 'live' ? 'bg-red-600 text-white' : 'text-gray-400'}`}>Live Mode</button>
                    </div>
                </div>
                
                <div className="flex-grow flex flex-col items-center justify-center">
                    <EngineDiagram highlightedPart={highlightedPart} />
                </div>

                <div className="space-y-4 mt-6">
                    <TuningSlider label="Fuel Map Enrichment" unit="%" value={tuneParams.fuelMap} min={-10} max={10} step={1} onChange={v => handleParamChange('fuelMap', v)} />
                    <TuningSlider label="Ignition Timing Advance" unit="°" value={tuneParams.ignitionTiming} min={-5} max={5} step={1} onChange={v => handleParamChange('ignitionTiming', v)} />
                    <TuningSlider label="Boost Pressure Increase" unit="PSI" value={tuneParams.boostPressure} min={0} max={8} step={0.1} onChange={v => handleParamChange('boostPressure', v)} />
                </div>

                <div className="flex gap-4 mt-6 pt-4 border-t border-brand-cyan/30">
                    <button onClick={() => setTuneParams(DEFAULT_TUNE)} className="flex-1 bg-base-700 text-white font-semibold py-2 rounded-md hover:bg-base-600 transition-colors">Reset to Default</button>
                    <button className="flex-1 bg-gray-500 text-white font-semibold py-2 rounded-md hover:bg-gray-400 transition-colors">Save Tune Profile</button>
                    <button onClick={handleWriteToEcu} disabled={mode !== 'live'} className="flex-1 bg-red-600 text-white font-semibold py-2 rounded-md hover:bg-red-500 transition-colors disabled:bg-red-900/50 disabled:cursor-not-allowed disabled:text-gray-400">
                        Write to ECU
                    </button>
                </div>

            </div>

            {/* AI Assistant Panel */}
            <div className="w-full lg:w-1/3 bg-black p-6 rounded-lg border border-brand-cyan/30 shadow-lg flex flex-col">
                <h2 className="text-lg font-semibold border-b border-brand-cyan/30 pb-2 mb-4 font-display">KC AI Tuning Assistant</h2>
                <div className="space-y-4 flex-grow">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Driving Style</label>
                        <select value={drivingStyle} onChange={e => setDrivingStyle(e.target.value)} className="w-full bg-base-800 border border-base-700 rounded-md px-3 py-2 text-gray-200">
                            <option>Aggressive Track</option>
                            <option>Spirited Daily</option>
                            <option>Fuel Economy</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-1">Conditions</label>
                        <select value={conditions} onChange={e => setConditions(e.target.value)} className="w-full bg-base-800 border border-base-700 rounded-md px-3 py-2 text-gray-200">
                            <option>Dry, Warm</option>
                            <option>Wet, Cool</option>
                            <option>High Altitude</option>
                        </select>
                    </div>
                    <button onClick={handleGenerateAiTune} disabled={isGenerating} className="w-full bg-brand-cyan text-black font-semibold py-2 rounded-md hover:bg-cyan-300 transition-colors shadow-glow-cyan disabled:bg-base-700 disabled:cursor-wait">
                        {isGenerating ? 'Generating...' : 'Generate AI Tune'}
                    </button>
                    
                    {aiSuggestion && (
                        <div className="mt-4 p-4 bg-base-800/50 rounded-md space-y-3 animate-fade-in">
                            <div>
                                <h4 className="font-semibold text-brand-cyan">Predicted Gains:</h4>
                                <p className="text-sm text-gray-300">{aiSuggestion.analysis.predictedGains}</p>
                            </div>
                            <div>
                                <h4 className="font-semibold text-red-400">Potential Risks:</h4>
                                <p className="text-sm text-gray-300">{aiSuggestion.analysis.potentialRisks}</p>
                            </div>
                        </div>
                    )}
                </div>
                 {aiSuggestion && (
                    <button onClick={loadAiSuggestion} className="mt-4 w-full bg-brand-blue text-white font-semibold py-2 rounded-md hover:bg-blue-600 transition-colors">Load AI Suggestion</button>
                 )}
            </div>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                 <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="w-full max-w-lg bg-base-900 rounded-lg border-2 border-red-500 shadow-lg p-6">
                        <h2 className="text-2xl font-bold font-display text-red-500">LIVE TUNE WARNING</h2>
                        <p className="mt-4 text-gray-300">You are about to write new parameters directly to the vehicle's ECU. Incorrect values can cause severe engine damage.</p>
                        <p className="mt-2 font-semibold text-yellow-400">This action should only be performed by a professional tuner on a dynamometer.</p>
                        <p className="mt-4 text-gray-300">Are you absolutely sure you want to proceed?</p>
                        <div className="flex justify-end gap-4 mt-6">
                            <button onClick={() => setShowConfirmModal(false)} className="px-6 py-2 rounded-md bg-base-700 text-white font-semibold hover:bg-base-600">Cancel</button>
                            <button onClick={confirmWrite} className="px-6 py-2 rounded-md bg-red-600 text-white font-semibold hover:bg-red-500">Confirm & Write Tune</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TuningPage;
