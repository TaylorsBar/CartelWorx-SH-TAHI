import React, { useState, useCallback, useEffect } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { getCoPilotResponse } from '../services/geminiService';
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

  const { speak, isSpeaking, cancel } = useTextToSpeech();

  const handleAiResponse = useCallback((response: string) => {
    setAiResponse(response);
    setState(CoPilotState.Speaking);
    speak(response);
  }, [speak]);

  const processCommand = useCallback(async (command: string) => {
    setUserTranscript(command);
    setState(CoPilotState.Thinking);
    setAiResponse('');
    const response = await getCoPilotResponse(command, latestVehicleData, activeAlerts);
    handleAiResponse(response);
  }, [latestVehicleData, activeAlerts, handleAiResponse]);

  const { isListening, transcript, startListening, stopListening, hasSupport } = useSpeechRecognition(processCommand);

  useEffect(() => {
    if (isListening) {
        setState(CoPilotState.Listening);
    } else if (state === CoPilotState.Listening) {
        // This handles cases where listening stops without a result (e.g., timeout)
        if (!transcript) {
            setState(CoPilotState.Idle);
        }
    }
  }, [isListening, state, transcript]);
  
  useEffect(() => {
    if (!isSpeaking && state === CoPilotState.Speaking) {
      setState(CoPilotState.Idle);
    }
  }, [isSpeaking, state]);
  
  const handleFabClick = () => {
    if (!hasSupport) {
        setIsOpen(true);
        setState(CoPilotState.Idle);
        setAiResponse("Sorry, your browser doesn't support the voice commands needed for the Co-Pilot feature.");
        return;
    }
      
    if (state === CoPilotState.Idle) {
      setIsOpen(true);
      startListening();
    } else {
      // Allow interrupting any state
      stopListening();
      cancel(); // Stop speaking
      setState(CoPilotState.Idle);
      setIsOpen(false);
    }
  };

  const getStatusText = () => {
    switch (state) {
      case CoPilotState.Listening:
        return 'Listening...';
      case CoPilotState.Thinking:
        return `Processing: "${userTranscript}"`;
      case CoPilotState.Speaking:
        return 'KC is responding...';
      default:
        return 'AI Co-Pilot is standing by.';
    }
  };

  const fabColor = state === CoPilotState.Listening ? 'bg-red-500' : 'bg-brand-cyan';
  const ringColor = state === CoPilotState.Listening ? 'ring-red-500' : 'ring-brand-cyan';

  return (
    <>
      <button
        onClick={handleFabClick}
        className={`fixed bottom-6 right-6 w-16 h-16 rounded-full text-black flex items-center justify-center shadow-lg transition-colors duration-300 z-50 ${fabColor} hover:opacity-90`}
        aria-label="Activate AI Co-Pilot"
      >
        {state === CoPilotState.Idle && <MicrophoneIcon className="w-8 h-8" />}
        {state === CoPilotState.Listening && <div className="w-8 h-8 rounded-full bg-white animate-pulse" />}
        {state === CoPilotState.Thinking && <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />}
        {state === CoPilotState.Speaking && (
            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"></path>
            </svg>
        )}

      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40 flex items-center justify-center" onClick={() => setIsOpen(false)}>
          <div className="w-full max-w-md text-center" onClick={(e) => e.stopPropagation()}>
            <div className={`relative inline-block p-4 border-2 ${ringColor} rounded-full mb-6`}>
              <div className={`w-24 h-24 rounded-full ${fabColor} flex items-center justify-center`}>
                 <MicrophoneIcon className="w-12 h-12 text-black"/>
              </div>
              {state === CoPilotState.Listening && <div className={`absolute inset-0 rounded-full ring-4 ${ringColor} animate-ping`}></div>}
            </div>

            <p className="text-lg text-gray-400 mb-2">{getStatusText()}</p>
            <p className="text-xl text-white min-h-[56px] px-4">{aiResponse}</p>
          </div>
        </div>
      )}
    </>
  );
};

export default CoPilot;
