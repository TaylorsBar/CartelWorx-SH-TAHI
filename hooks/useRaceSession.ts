
import { useState, useEffect, useRef, useCallback } from 'react';
import { useVehicleData } from './useVehicleData';
import { SensorDataPoint, LapTime, RaceSession } from '../types';

const QUARTER_MILE_METERS = 402.336;

const initialSessionState: RaceSession = {
    isActive: false,
    startTime: null,
    elapsedTime: 0,
    data: [],
    lapTimes: [],
    zeroToHundredTime: null,
    quarterMileTime: null,
    quarterMileSpeed: null,
};

export const useRaceSession = () => {
    const { latestData } = useVehicleData();
    const [session, setSession] = useState<RaceSession>(initialSessionState);
    const sessionUpdateRef = useRef<number | null>(null);
    
    // Use a ref to access the latest data inside the rAF loop without triggering effect re-runs
    const latestDataRef = useRef(latestData);

    useEffect(() => {
        latestDataRef.current = latestData;
    }, [latestData]);

    const updateSession = useCallback(() => {
        // Check refs directly for exit conditions
        // We can't rely on state variables in closure if we want stability, 
        // but since we setSession inside, we get the fresh state via the setter callback.
        // However, for the rAF check, we rely on the closure being somewhat fresh or the cancellation logic.
        // Actually, best practice for rAF loops in React is to not depend on changing scope if possible.
        
        // We use the functional update pattern to access the *current* session state
        // without needing it in the dependency array.
        setSession(prev => {
            if (!prev.isActive || !prev.startTime) return prev;

            const currentData = latestDataRef.current;
            const now = performance.now();
            const elapsedTime = now - prev.startTime;
            const newData = [...prev.data, currentData];

            let { zeroToHundredTime, quarterMileTime, quarterMileSpeed } = prev;

            // 0-100km/h check
            if (!zeroToHundredTime && currentData.speed >= 100) {
                const startData = newData.find(d => d.speed > 0);
                if (startData) {
                    zeroToHundredTime = (currentData.time - startData.time) / 1000;
                }
            }

            // 1/4 mile check
            if (!quarterMileTime && currentData.distance >= QUARTER_MILE_METERS) {
                const startData = newData[0];
                if (startData) {
                    // Find the exact point it crossed the line
                    const lastPoint = prev.data[prev.data.length - 1];
                    const fraction = (QUARTER_MILE_METERS - lastPoint.distance) / (currentData.distance - lastPoint.distance);
                    const crossingTime = lastPoint.time + (currentData.time - lastPoint.time) * fraction;
                    
                    quarterMileTime = (crossingTime - startData.time) / 1000;
                    quarterMileSpeed = currentData.speed;
                }
            }

            return {
                ...prev,
                elapsedTime,
                data: newData,
                zeroToHundredTime,
                quarterMileTime,
                quarterMileSpeed,
            };
        });

        sessionUpdateRef.current = requestAnimationFrame(updateSession);
    }, []); // No dependencies! stable callback.
    
    useEffect(() => {
        if (session.isActive) {
            if (!sessionUpdateRef.current) {
                sessionUpdateRef.current = requestAnimationFrame(updateSession);
            }
        } else {
            if (sessionUpdateRef.current) {
                cancelAnimationFrame(sessionUpdateRef.current);
                sessionUpdateRef.current = null;
            }
        }
        return () => {
            if (sessionUpdateRef.current) cancelAnimationFrame(sessionUpdateRef.current);
            sessionUpdateRef.current = null;
        };
    }, [session.isActive, updateSession]);


    const startSession = () => {
        setSession({
            ...initialSessionState,
            isActive: true,
            startTime: performance.now(),
            data: [latestDataRef.current], // Start with the very first data point
        });
    };

    const stopSession = () => {
        setSession(prev => ({
            ...prev,
            isActive: false,
        }));
    };

    const recordLap = () => {
        setSession(prev => {
            if (!prev.isActive || !prev.startTime) return prev;
            const now = performance.now();
            const lapTime = now - (prev.lapTimes.reduce((acc, lap) => acc + lap.time, prev.startTime!) + prev.startTime!); // logic fix for lap time accum

            // Simplified Lap Logic for stability: Just take diff from last lap end or start
            // Actually, simplified:
            // lapTime = current elapsed - sum(previous laps)
            const totalPrevTime = prev.lapTimes.reduce((acc, l) => acc + l.time, 0);
            const currentLapTime = prev.elapsedTime - totalPrevTime;

            return {
                ...prev,
                lapTimes: [...prev.lapTimes, { lap: prev.lapTimes.length + 1, time: currentLapTime }],
            };
        });
    };

    return { session, startSession, stopSession, recordLap };
};
