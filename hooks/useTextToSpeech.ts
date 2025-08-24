import { useState, useEffect } from 'react';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = window.speechSynthesis;

  const speak = (text: string) => {
    if (isSpeaking || !text) {
      return;
    }
    
    // Cancel any ongoing speech
    synthRef.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
    };
    
    utterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance.onerror', event);
        setIsSpeaking(false);
    };

    synthRef.speak(utterance);
  };
  
  const cancel = () => {
    if (isSpeaking) {
      synthRef.cancel();
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      synthRef.cancel();
    };
  }, [synthRef]);

  return { isSpeaking, speak, cancel };
};
