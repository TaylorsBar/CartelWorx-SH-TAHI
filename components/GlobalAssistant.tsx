
import React, { useState, useEffect, useRef } from 'react';
import { useAIStore } from '../stores/aiStore';
import { useVehicleTelemetry } from '../hooks/useVehicleData';
import { sendMessageToAI, generateGeminiSpeech } from '../services/geminiService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import MicrophoneIcon from './icons/MicrophoneIcon';

const NeuralOrb: React.FC<{ state: string }> = ({ state }) => {
    return (
        <div className="relative w-16 h-16 flex items-center justify-center">
            {/* Core */}
            <div className={`absolute w-8 h-8 rounded-full bg-brand-cyan transition-all duration-500 ${state === 'speaking' ? 'scale-125 animate-pulse' : 'scale-100'}`}></div>
            
            {/* Outer Rings */}
            <div className={`absolute inset-0 rounded-full border-2 border-brand-cyan/30 animate-[spin_4s_linear_infinite] ${state === 'thinking' ? 'border-brand-purple/50 duration-[1s]' : ''}`}></div>
            <div className={`absolute inset-2 rounded-full border border-brand-cyan/50 animate-[spin_3s_linear_infinite_reverse]`}></div>
            
            {/* Glow */}
            <div className={`absolute inset-[-10px] bg-brand-cyan/20 blur-xl rounded-full transition-opacity duration-500 ${state !== 'idle' ? 'opacity-100' : 'opacity-20'}`}></div>
        </div>
    );
};

const GlobalAssistant: React.FC = () => {
    const { isOpen, setIsOpen, mode, setMode, messages, addMessage, state, setState, currentContext } = useAIStore();
    const { latestData } = useVehicleTelemetry();
    const { speak, cancel } = useTextToSpeech();
    
    const [inputValue, setInputValue] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async (text: string) => {
        if (!text.trim()) return;
        
        addMessage('user', text);
        setInputValue('');
        setState('thinking');

        try {
            const response = await sendMessageToAI(text, latestData, currentContext);
            addMessage('model', response);
            setState('speaking');
            
            // Auto-speak if in voice mode or if it's a short response
            if (mode === 'voice' || response.length < 150) {
                speak(response, () => setState('idle'));
            } else {
                setState('idle');
            }
        } catch (e) {
            console.error(e);
            setState('idle');
        }
    };

    const { isListening, startListening, stopListening, transcript } = useSpeechRecognition((text) => {
        handleSend(text);
    });

    // Sync listening state
    useEffect(() => {
        if (isListening) setState('listening');
        else if (state === 'listening') setState('idle');
    }, [isListening]);

    const toggleVoice = () => {
        if (isListening) {
            stopListening();
        } else {
            setMode('voice');
            setIsOpen(true);
            startListening();
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-black/80 backdrop-blur-md border border-brand-cyan/50 shadow-[0_0_20px_rgba(0,240,255,0.3)] flex items-center justify-center z-50 group hover:scale-110 transition-all"
            >
                <div className="absolute inset-0 bg-brand-cyan/10 rounded-full animate-ping opacity-20 group-hover:opacity-40"></div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-cyan to-blue-600"></div>
            </button>
        );
    }

    return (
        <div className={`fixed z-50 transition-all duration-500 ease-out flex flex-col ${mode === 'voice' ? 'bottom-8 left-1/2 -translate-x-1/2 w-[90vw] max-w-md' : 'bottom-6 right-6 w-[400px] h-[600px]'}`}>
            
            {/* Main Panel */}
            <div className={`
                glass-panel bg-[#050505]/90 backdrop-blur-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col
                ${mode === 'voice' ? 'rounded-2xl p-6 items-center' : 'rounded-xl h-full'}
            `}>
                
                {/* Header (Chat Mode) */}
                {mode === 'chat' && (
                    <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black/40">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></div>
                            <span className="text-xs font-display font-bold text-white tracking-widest">KC // AI CORE</span>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => setMode('voice')} className="p-1 hover:text-brand-cyan text-gray-500"><MicrophoneIcon className="w-4 h-4" /></button>
                            <button onClick={() => setIsOpen(false)} className="p-1 hover:text-white text-gray-500">&times;</button>
                        </div>
                    </div>
                )}

                {/* Content Area */}
                {mode === 'voice' ? (
                    // Voice Mode UI
                    <div className="flex flex-col items-center w-full">
                        <NeuralOrb state={state} />
                        <div className="mt-6 text-center">
                            <p className="text-brand-cyan font-mono text-sm uppercase tracking-widest mb-2">{state.toUpperCase()}...</p>
                            <p className="text-white font-medium text-lg min-h-[3rem]">
                                {state === 'listening' ? transcript || "Listening..." : messages[messages.length-1]?.text}
                            </p>
                        </div>
                        <div className="mt-6 flex gap-4">
                            <button onClick={() => { stopListening(); setIsOpen(false); }} className="px-6 py-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase">Dismiss</button>
                            <button onClick={() => setMode('chat')} className="px-6 py-2 rounded-full bg-brand-cyan/20 hover:bg-brand-cyan/30 border border-brand-cyan/50 text-brand-cyan text-xs font-bold uppercase">Open Terminal</button>
                        </div>
                    </div>
                ) : (
                    // Chat Mode UI
                    <>
                        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                                    <div className={`max-w-[85%] p-3 rounded-lg text-xs leading-relaxed font-mono ${
                                        msg.role === 'user' 
                                        ? 'bg-brand-blue/20 text-white border border-brand-blue/50 rounded-br-none' 
                                        : 'bg-[#111] text-gray-300 border border-gray-700 rounded-bl-none shadow-lg'
                                    }`}>
                                        {msg.text}
                                    </div>
                                    <span className="text-[9px] text-gray-600 mt-1 uppercase">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                                </div>
                            ))}
                            {state === 'thinking' && (
                                <div className="flex items-center gap-1 pl-2">
                                    <div className="w-1 h-1 bg-brand-cyan rounded-full animate-bounce"></div>
                                    <div className="w-1 h-1 bg-brand-cyan rounded-full animate-bounce delay-75"></div>
                                    <div className="w-1 h-1 bg-brand-cyan rounded-full animate-bounce delay-150"></div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <div className="p-3 bg-black/60 border-t border-white/10">
                            <div className="relative flex items-center gap-2">
                                <input 
                                    className="flex-1 bg-[#111] border border-gray-700 rounded px-3 py-2 text-xs text-white focus:border-brand-cyan focus:outline-none"
                                    placeholder={`Message KC about ${currentContext}...`}
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSend(inputValue)}
                                />
                                <button 
                                    onClick={() => isListening ? stopListening() : startListening()}
                                    className={`p-2 rounded border ${isListening ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-black border-gray-700 text-gray-400 hover:text-white'}`}
                                >
                                    <MicrophoneIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default GlobalAssistant;
