
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

    const updateSession = useCallback(() => {
        if (!session.isActive || !session.startTime) {
            if (sessionUpdateRef.current) {
                cancelAnimationFrame(sessionUpdateRef.current);
                sessionUpdateRef.current = null;
            }
            return;
        }

        setSession(prev => {
            if (!prev.isActive || !prev.startTime) return prev;

            const now = performance.now();
            const elapsedTime = now - prev.startTime;
            const newData = [...prev.data, latestData];

            let { zeroToHundredTime, quarterMileTime, quarterMileSpeed } = prev;

            // 0-100km/h check
            if (!zeroToHundredTime && latestData.speed >= 100) {
                const startData = newData.find(d => d.speed > 0);
                if (startData) {
                    zeroToHundredTime = (latestData.time - startData.time) / 1000;
                }
            }

            // 1/4 mile check
            if (!quarterMileTime && latestData.distance >= QUARTER_MILE_METERS) {
                const startData = newData[0];
                if (startData) {
                    // Find the exact point it crossed the line
                    const lastPoint = prev.data[prev.data.length - 1];
                    const fraction = (QUARTER_MILE_METERS - lastPoint.distance) / (latestData.distance - lastPoint.distance);
                    const crossingTime = lastPoint.time + (latestData.time - lastPoint.time) * fraction;
                    
                    quarterMileTime = (crossingTime - startData.time) / 1000;
                    quarterMileSpeed = latestData.speed;
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
    }, [session.isActive, session.startTime, latestData]);
    
    useEffect(() => {
        if (session.isActive) {
            sessionUpdateRef.current = requestAnimationFrame(updateSession);
        } else {
            if (sessionUpdateRef.current) {
                cancelAnimationFrame(sessionUpdateRef.current);
                sessionUpdateRef.current = null;
            }
        }
        return () => {
            if (sessionUpdateRef.current) cancelAnimationFrame(sessionUpdateRef.current);
        };
    }, [session.isActive, updateSession]);


    const startSession = () => {
        setSession({
            ...initialSessionState,
            isActive: true,
            startTime: performance.now(),
            data: [latestData], // Start with the very first data point
        });
    };

    const stopSession = () => {
        setSession(prev => ({
            ...prev,
            isActive: false,
        }));
    };

    const recordLap = () => {
        if (!session.isActive || !session.startTime) return;
        const now = performance.now();
        const lapTime = now - (session.lapTimes.reduce((acc, lap) => acc + lap.time, session.startTime!));

        setSession(prev => ({
            ...prev,
            lapTimes: [...prev.lapTimes, { lap: prev.lapTimes.length + 1, time: lapTime }],
        }));
    };

    return { session, startSession, stopSession, recordLap };
};
