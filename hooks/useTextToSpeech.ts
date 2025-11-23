
import { useState, useEffect, useRef, useCallback } from 'react';
import { generateGeminiSpeech } from '../services/geminiService';

export const useTextToSpeech = () => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    // Initialize AudioContext on mount, but it might start suspended
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
        audioContextRef.current = new AudioContext();
    }
    
    return () => {
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
    };
  }, []);

  const speak = useCallback(async (text: string, onEnd?: () => void) => {
    if (!text) return;

    try {
        setIsSpeaking(true);

        // Resume context if suspended (browser autoplay policy)
        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        // Generate audio from Gemini
        const audioBufferData = await generateGeminiSpeech(text);
        
        if (!audioBufferData || !audioContextRef.current) {
            console.error("Failed to generate audio or no audio context.");
            setIsSpeaking(false);
            if (onEnd) onEnd();
            return;
        }

        // Decode audio data
        const audioBuffer = await audioContextRef.current.decodeAudioData(audioBufferData);

        // Stop previous source if playing
        if (sourceRef.current) {
            try { sourceRef.current.stop(); } catch (e) {}
        }

        // Create new source
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        
        source.onended = () => {
            setIsSpeaking(false);
            if (onEnd) onEnd();
        };

        sourceRef.current = source;
        source.start();

    } catch (error) {
        console.error("Error in TTS playback:", error);
        setIsSpeaking(false);
        if (onEnd) onEnd();
    }
  }, []);
  
  const cancel = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch (e) {}
      sourceRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  return { isSpeaking, speak, cancel };
};
