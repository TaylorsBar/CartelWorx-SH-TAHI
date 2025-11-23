
import React, { useState, useEffect, useRef } from 'react';
import { IntentAction, ComponentHotspot, VoiceCommandIntent } from '../types';
import { getVoiceCommandIntent, generateComponentImage } from '../services/geminiService';
import MicrophoneIcon from '../components/icons/MicrophoneIcon';
import { MOCK_LOGS } from './MaintenanceLog';

// @ts-ignore
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

const MOCK_HOTSPOTS: ComponentHotspot[] = [
    { id: 'o2-sensor', name: 'O2 Sensor', cx: '68%', cy: '75%', status: 'Failing' },
    { id: 'map-sensor', name: 'MAP Sensor', cx: '55%', cy: '30%', status: 'Warning' },
    { id: 'alternator', name: 'Alternator', cx: '32%', cy: '65%', status: 'Normal' },
    { id: 'turbo', name: 'Turbocharger', cx: '80%', cy: '50%', status: 'Normal' },
    { id: 'intake', name: 'Air Intake', cx: '35%', cy: '25%', status: 'Normal' },
    { id: 'coolant', name: 'Coolant Reservoir', cx: '15%', cy: '40%', status: 'Normal' },
    { id: 'oil-filter', name: 'Oil Filter', cx: '50%', cy: '85%', status: 'Normal' },
];

const ARAssistant: React.FC = () => {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [highlightedComponent, setHighlightedComponent] = useState<string | null>(null);
    const [assistantMessage, setAssistantMessage] = useState("Activate the microphone and ask a question, like 'Show me the failing O2 sensor.'");
    const [isRemoteSessionActive, setIsRemoteSessionActive] = useState(false);

    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
    const [imageError, setImageError] = useState<string | null>(null);

    const processCommand = async (command: string) => {
        setIsListening(false);
        setAssistantMessage("Thinking...");
        setHighlightedComponent(null); 
        const result: VoiceCommandIntent = await getVoiceCommandIntent(command);

        if (result.confidence < 0.7) {
            setAssistantMessage("I'm not quite sure what you mean. Could you try rephrasing?");
            return;
        }

        switch (result.intent) {
            case IntentAction.ShowComponent:
                if (result.component && MOCK_HOTSPOTS.find(h => h.id === result.component)) {
                    setHighlightedComponent(result.component);
                } else {
                    setAssistantMessage("I can't seem to find that component.");
                }
                break;
            case IntentAction.QueryService:
                const nextService = MOCK_LOGS.find(log => !log.verified && log.isAiRecommendation);
                if (nextService) {
                    setAssistantMessage(`Your next recommended service is: ${nextService.service} on or around ${nextService.date}.`);
                } else {
                    setAssistantMessage("Your service log is up to date. No immediate recommendations found.");
                }
                break;
            case IntentAction.HideComponent:
                setHighlightedComponent(null);
                setAssistantMessage("Highlights cleared. What's next?");
                break;
            default:
                setAssistantMessage("Sorry, I didn't understand that command. You can ask me to show a component or ask about your next service.");
        }
    };
    
    useEffect(() => {
        if (highlightedComponent) {
            const componentData = MOCK_HOTSPOTS.find(h => h.id === highlightedComponent);
            if (componentData) {
                setAssistantMessage(`Highlighting the ${componentData.name}. Status: ${componentData.status}.`);
            }
        }
    }, [highlightedComponent]);

    const handleListen = () => {
        if (!recognition) {
            setAssistantMessage("Sorry, your browser doesn't support voice commands.");
            return;
        }

        if (isListening) {
            recognition.stop();
            setIsListening(false);
        } else {
            setIsListening(true);
            setTranscript('');
            recognition.start();
        }
    };

    useEffect(() => {
        if (!recognition) return;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };
        recognition.onresult = (event: any) => {
            const currentTranscript = event.results[0][0].transcript;
            setTranscript(currentTranscript);
            processCommand(currentTranscript);
        };
    }, []);

    const handleGenerateImage = async () => {
        if (!highlightedComponent) return;

        const componentData = MOCK_HOTSPOTS.find(h => h.id === highlightedComponent);
        if (!componentData) return;
        
        setIsGeneratingImage(true);
        setGeneratedImageUrl(null);
        setImageError(null);
        setAssistantMessage(`Generating a diagram for the ${componentData.name}...`);
        
        try {
            const imageUrl = await generateComponentImage(componentData.name);
            setGeneratedImageUrl(imageUrl);
            setAssistantMessage(`Diagram for ${componentData.name} generated successfully.`);
        } catch (error) {
            console.error(error);
            const errorMessage = "Sorry, I couldn't generate the diagram. Please try again.";
            setImageError(errorMessage);
            setAssistantMessage(errorMessage);
        } finally {
            setIsGeneratingImage(false);
        }
    };

    const hotspotStatusClasses = {
        'Failing': 'fill-red-500/50 stroke-red-500',
        'Warning': 'fill-yellow-500/50 stroke-yellow-500',
        'Normal': 'fill-green-500/50 stroke-green-500',
    };
    
    const statusTextClasses = {
        'Failing': 'text-red-500',
        'Warning': 'text-yellow-500',
        'Normal': 'text-green-500',
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full p-2">
            {/* Left Column: AR Viewport */}
            <div className="w-full lg:w-2/3 bg-black rounded-lg border border-brand-cyan/30 shadow-2xl flex flex-col relative overflow-hidden group">
                {/* HUD Overlay Elements */}
                <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-brand-cyan/80 z-20"></div>
                <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-brand-cyan/80 z-20"></div>
                <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-brand-cyan/80 z-20"></div>
                <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-brand-cyan/80 z-20"></div>
                
                <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur px-3 py-1 rounded border border-brand-cyan/30 z-20">
                     <span className="text-[10px] font-mono font-bold text-brand-cyan uppercase tracking-widest">Live Camera Feed // Analysis Active</span>
                </div>

                {/* Scanline Animation */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-cyan/10 to-transparent h-[10%] w-full animate-[scan_3s_linear_infinite] pointer-events-none z-10 opacity-50"></div>
                <style>{`@keyframes scan { 0% { top: -10%; } 100% { top: 110%; } }`}</style>

                <div className="relative w-full h-full flex items-center justify-center bg-[#050505]">
                    <img src="https://storage.googleapis.com/fpl-assets/ar-engine-wireframe.svg" alt="Engine Wireframe" className="w-full h-full object-contain opacity-80" />
                    
                    <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet">
                        {MOCK_HOTSPOTS.map(hotspot => (
                            <g key={hotspot.id} className={`transition-all duration-500 ${highlightedComponent === hotspot.id || highlightedComponent === null ? 'opacity-100' : 'opacity-20'}`}>
                                {highlightedComponent === hotspot.id && (
                                    // Target Lock Reticle
                                    <g>
                                        <circle cx={hotspot.cx} cy={hotspot.cy} r="40" fill="none" stroke="white" strokeWidth="1" strokeDasharray="10 5" className="animate-[spin_4s_linear_infinite]" />
                                        <line x1={hotspot.cx} y1={hotspot.cy} x2={parseFloat(hotspot.cx) + 50} y2={parseFloat(hotspot.cy) - 50} stroke="white" strokeWidth="1" />
                                        <text x={parseFloat(hotspot.cx) + 55} y={parseFloat(hotspot.cy) - 55} fill="white" fontSize="14" fontWeight="bold" fontFamily="monospace">TARGET LOCKED</text>
                                    </g>
                                )}
                                
                                <circle 
                                    cx={hotspot.cx} 
                                    cy={hotspot.cy} 
                                    r="10" 
                                    className={`${hotspotStatusClasses[hotspot.status]} cursor-pointer hover:r-12 transition-all`}
                                    strokeWidth="2"
                                    onClick={() => setHighlightedComponent(hotspot.id)}
                                />
                                
                                <text x={hotspot.cx} y={hotspot.cy} dy="25" textAnchor="middle" className="fill-white font-mono text-[10px] uppercase font-bold drop-shadow-md bg-black/50">
                                    {hotspot.name}
                                </text>
                            </g>
                        ))}
                    </svg>
                </div>
            </div>

            {/* Right Column: Controls & Info */}
            <div className="w-full lg:w-1/3 flex flex-col gap-4">
                <div className="bg-black p-6 rounded-lg border border-gray-800 shadow-lg flex-grow flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-brand-cyan/20 to-transparent pointer-events-none"></div>
                    <h2 className="text-sm font-bold border-b border-gray-800 pb-2 mb-4 font-display uppercase tracking-widest text-white">Assistant Uplink</h2>
                    
                    <div className="flex flex-col items-center justify-center flex-grow text-center">
                        <button onClick={handleListen} className={`relative w-20 h-20 rounded-full transition-all duration-300 ${isListening ? 'bg-red-600 shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-[#1a1a1a] border border-gray-700 hover:border-brand-cyan hover:bg-[#222]'} text-white flex items-center justify-center group`}>
                            {isListening && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-20"></span>}
                            <MicrophoneIcon className={`w-8 h-8 ${isListening ? 'text-white' : 'text-brand-cyan group-hover:scale-110 transition-transform'}`} />
                        </button>
                        <p className="mt-6 text-gray-400 h-6 font-mono text-xs uppercase tracking-widest">{isListening ? 'Listening...' : (transcript ? `“${transcript}”` : 'Tap to Initiate Command')}</p>
                    </div>
                    
                    <div className="mt-4 p-4 bg-[#111] border-l-2 border-brand-cyan rounded-r text-left min-h-[60px] flex items-center">
                        <p className="text-gray-300 text-sm italic">"{assistantMessage}"</p>
                    </div>
                </div>

                {highlightedComponent && (() => {
                    const componentData = MOCK_HOTSPOTS.find(h => h.id === highlightedComponent);
                    if (!componentData) return null;
                    
                    return (
                        <div className="bg-black p-5 rounded-lg border border-gray-800 shadow-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="flex justify-between items-center mb-3 border-b border-gray-800 pb-2">
                                <h2 className="text-sm font-bold font-display uppercase tracking-widest text-white">Target Analysis</h2>
                                <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold ${statusTextClasses[componentData.status]} bg-white/5`}>{componentData.status}</span>
                            </div>
                            
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="text-gray-500">Component ID</div>
                                    <div className="text-white font-mono text-right">{componentData.id.toUpperCase()}</div>
                                    <div className="text-gray-500">Est. Lifespan</div>
                                    <div className="text-white font-mono text-right">82%</div>
                                </div>
                                <button
                                    onClick={handleGenerateImage}
                                    disabled={isGeneratingImage}
                                    className="w-full mt-2 bg-brand-cyan/10 border border-brand-cyan text-brand-cyan font-bold py-2 rounded text-xs uppercase tracking-wider hover:bg-brand-cyan hover:text-black transition-colors disabled:opacity-50 disabled:cursor-wait"
                                >
                                    {isGeneratingImage ? 'Processing Schematics...' : 'Generate Technical Diagram'}
                                </button>
                                {imageError && <p className="text-xs text-red-500 mt-2 text-center">{imageError}</p>}
                            </div>
                        </div>
                    );
                })()}

                <div className="bg-black p-5 rounded-lg border border-gray-800 shadow-lg">
                    <h2 className="text-sm font-bold border-b border-gray-800 pb-2 mb-3 font-display uppercase tracking-widest text-white">Remote Expert</h2>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-xs text-gray-500 uppercase">Uplink Status</span>
                        <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full ${isRemoteSessionActive ? 'bg-green-500 animate-pulse' : 'bg-red-900'}`}></div>
                            <span className={`text-xs font-bold ${isRemoteSessionActive ? 'text-green-500' : 'text-gray-600'}`}>
                                {isRemoteSessionActive ? 'LIVE' : 'OFFLINE'}
                            </span>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsRemoteSessionActive(prev => !prev)}
                        className={`w-full font-bold py-2 rounded text-xs uppercase tracking-wider transition-colors border ${isRemoteSessionActive ? 'bg-red-900/20 border-red-800 text-red-500 hover:bg-red-900/40' : 'bg-green-900/20 border-green-800 text-green-500 hover:bg-green-900/40'}`}
                    >
                        {isRemoteSessionActive ? 'Terminate Uplink' : 'Request Technician'}
                    </button>
                </div>
            </div>

            {generatedImageUrl && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={() => setGeneratedImageUrl(null)}>
                    <div className="w-full max-w-2xl bg-[#0a0a0a] rounded border border-brand-cyan shadow-[0_0_50px_rgba(0,240,255,0.2)] relative p-1" onClick={(e) => e.stopPropagation()}>
                        <div className="bg-[#050505] p-2 border-b border-gray-800 flex justify-between items-center mb-1">
                             <span className="text-[10px] font-mono text-brand-cyan uppercase">Schematic View // Generated by Gemini</span>
                             <button onClick={() => setGeneratedImageUrl(null)} className="text-gray-500 hover:text-white">&times;</button>
                        </div>
                        <div className="bg-black overflow-hidden relative">
                             {/* Blueprint Grid Overlay */}
                             <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
                             <img src={generatedImageUrl} alt="Generated component diagram" className="w-full h-auto object-contain max-h-[70vh]" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ARAssistant;
