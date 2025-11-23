
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { interpretHandsFreeCommand } from '../services/geminiService';
import { SensorDataPoint, DiagnosticAlert } from '../types';
import MicrophoneIcon from './icons/MicrophoneIcon';

enum CoPilotState {
  Idle,
  Listening,
  Thinking,
  Speaking,
}

interface CoPilotProps {
  latestVehicleData: SensorDataPoint;
  activeAlerts: DiagnosticAlert[];
}

const CoPilot: React.FC<CoPilotProps> = ({ latestVehicleData, activeAlerts }) => {
  const [state, setState] = useState<CoPilotState>(CoPilotState.Idle);
  const [userTranscript, setUserTranscript] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [handsFreeMode, setHandsFreeMode] = useState(false); // New: Keeps listening loop active

  const navigate = useNavigate();
  const location = useLocation();
  const { speak, isSpeaking, cancel } = useTextToSpeech();

  // Handle the action returned by Gemini 3 Pro
  const handleAiAction = useCallback((actionData: { action: string, payload?: string, textToSpeak: string }) => {
    setAiResponse(actionData.textToSpeak);
    setState(CoPilotState.Speaking);

    // Execute Navigation if requested
    if (actionData.action === 'NAVIGATE' && actionData.payload) {
        console.log(`Co-Pilot navigating to: ${actionData.payload}`);
        navigate(actionData.payload);
    }

    // Speak the response, then restart listening if in hands-free mode
    speak(actionData.textToSpeak, () => {
        if (handsFreeMode) {
             // Small delay to prevent picking up its own echo or system noise
             setTimeout(() => {
                setState(CoPilotState.Listening);
                // Trigger listening externally/implicitly via the effect below
             }, 500);
        } else {
            setState(CoPilotState.Idle);
        }
    });
  }, [navigate, speak, handsFreeMode]);

  const processCommand = useCallback(async (command: string) => {
    if (!command.trim()) {
        if (handsFreeMode) {
            // Nothing heard, keep listening
             setState(CoPilotState.Listening);
        } else {
             setState(CoPilotState.Idle);
        }
        return;
    }

    setUserTranscript(command);
    setState(CoPilotState.Thinking);
    setAiResponse('');
    
    // Use the Thinking Model (Gemini 3 Pro)
    const result = await interpretHandsFreeCommand(
        command, 
        location.pathname, 
        latestVehicleData, 
        activeAlerts
    );
    
    handleAiAction({
        action: result.action,
        payload: result.payload,
        textToSpeak: result.textToSpeak
    });

  }, [latestVehicleData, activeAlerts, location.pathname, handleAiAction, handsFreeMode]);

  const { isListening, transcript, startListening, stopListening, hasSupport } = useSpeechRecognition(processCommand);

  // Sync internal state with hook state
  useEffect(() => {
    if (isListening) {
        setState(CoPilotState.Listening);
    } else if (state === CoPilotState.Listening && !isListening) {
         // Hook stopped listening (silence timeout), but we process what we have
         // processCommand is called by hook onResult.
         // If no result, we might need to manual restart if handsFree is on
    }
  }, [isListening, state]);
  
  // Hands-free loop manager
  useEffect(() => {
      if (handsFreeMode && state === CoPilotState.Listening && !isListening && !isSpeaking) {
          startListening();
      }
  }, [handsFreeMode, state, isListening, isSpeaking, startListening]);

  const toggleCoPilot = () => {
    if (!hasSupport) {
        setIsOpen(true);
        setState(CoPilotState.Idle);
        setAiResponse("Sorry, browser not supported.");
        return;
    }
      
    if (state === CoPilotState.Idle) {
      setIsOpen(true);
      setHandsFreeMode(true); // Activate loop
      startListening();
    } else {
      // Stop everything
      setHandsFreeMode(false);
      stopListening();
      cancel(); 
      setState(CoPilotState.Idle);
      setIsOpen(false);
    }
  };

  const getStatusText = () => {
    switch (state) {
      case CoPilotState.Listening:
        return 'Listening...';
      case CoPilotState.Thinking:
        return `Thinking...`;
      case CoPilotState.Speaking:
        return 'Speaking...';
      default:
        return 'Co-Pilot Ready';
    }
  };

  const fabColor = state === CoPilotState.Listening ? 'bg-red-600' : (state === CoPilotState.Thinking ? 'bg-purple-600' : 'bg-brand-cyan');
  const ringColor = state === CoPilotState.Listening ? 'ring-red-600' : (state === CoPilotState.Thinking ? 'ring-purple-600' : 'ring-brand-cyan');

  return (
    <>
      <button
        onClick={toggleCoPilot}
        className={`fixed bottom-6 right-6 w-16 h-16 rounded-full text-black flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-all duration-300 z-50 ${fabColor} hover:scale-105`}
        aria-label="Activate AI Co-Pilot"
      >
        {state === CoPilotState.Idle && <MicrophoneIcon className="w-8 h-8" />}
        {state === CoPilotState.Listening && <div className="w-8 h-8 rounded-full bg-white animate-pulse" />}
        {state === CoPilotState.Thinking && <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />}
        {state === CoPilotState.Speaking && (
            <div className="flex gap-1 items-center justify-center h-4">
                <div className="w-1 h-3 bg-white animate-[bounce_1s_infinite]"></div>
                <div className="w-1 h-5 bg-white animate-[bounce_1s_infinite_0.1s]"></div>
                <div className="w-1 h-3 bg-white animate-[bounce_1s_infinite_0.2s]"></div>
            </div>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center" onClick={() => toggleCoPilot()}>
          <div className="w-full max-w-md text-center p-6" onClick={(e) => e.stopPropagation()}>
            <div className={`relative inline-block p-4 border-4 ${ringColor} rounded-full mb-8 transition-colors duration-500`}>
              <div className={`w-32 h-32 rounded-full ${fabColor} flex items-center justify-center transition-colors duration-500 shadow-[0_0_50px_rgba(0,0,0,0.5)]`}>
                 {state === CoPilotState.Thinking ? (
                     <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                 ) : (
                     <MicrophoneIcon className="w-16 h-16 text-black"/>
                 )}
              </div>
              {state === CoPilotState.Listening && <div className={`absolute inset-0 rounded-full ring-4 ${ringColor} animate-ping opacity-50`}></div>}
            </div>

            <h2 className="text-2xl font-display font-bold text-white mb-2">{getStatusText()}</h2>
            {userTranscript && <p className="text-gray-400 italic mb-4">"{userTranscript}"</p>}
            
            <div className="min-h-[80px] flex items-center justify-center">
                 <p className="text-xl text-brand-cyan font-medium leading-relaxed drop-shadow-lg">{aiResponse}</p>
            </div>
            
            <p className="text-xs text-gray-500 mt-8 uppercase tracking-widest">
                {handsFreeMode ? 'Hands-Free Mode Active • Tap to Stop' : 'Tap mic to speak'}
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default CoPilot;
