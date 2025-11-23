import { useState, useEffect, useRef, useCallback } from 'react';
import { SensorDataPoint, ObdConnectionState } from '../types';
import { ObdService } from '../services/ObdService';
import { GenesisEKFUltimate } from '../services/GenesisEKFUltimate';

enum VehicleState {
  IDLE,
  ACCELERATING,
  CRUISING,
  BRAKING,
}

const UPDATE_INTERVAL_MS = 50; // 20Hz Update Rate
const MAX_DATA_POINTS = 200; 
const RPM_IDLE = 800;
const RPM_MAX = 8000;
const SPEED_MAX = 280;
const GEAR_RATIOS = [0, 3.6, 2.1, 1.4, 1.0, 0.8, 0.6];
const DEFAULT_LAT = -37.88; // Karapiro, NZ
const DEFAULT_LON = 175.55;

const generateInitialData = (): SensorDataPoint[] => {
  const data: SensorDataPoint[] = [];
  const now = Date.now();
  for (let i = MAX_DATA_POINTS; i > 0; i--) {
    data.push({
      time: now - i * UPDATE_INTERVAL_MS,
      rpm: RPM_IDLE,
      speed: 0,
      gear: 1,
      fuelUsed: 19.4,
      inletAirTemp: 25.0,
      batteryVoltage: 12.7,
      engineTemp: 90.0,
      fuelTemp: 20.0,
      turboBoost: -0.8,
      fuelPressure: 3.5,
      oilPressure: 1.5,
      shortTermFuelTrim: 0,
      longTermFuelTrim: 1.5,
      o2SensorVoltage: 0.45,
      engineLoad: 15,
      distance: 0,
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
      source: 'sim'
    });
  }
  return data;
};

let obdServiceInstance: ObdService | null = null;

export const useVehicleData = () => {
  const [data, setData] = useState<SensorDataPoint[]>(generateInitialData);
  const [hasActiveFault, setHasActiveFault] = useState(false);
  const [obdState, setObdState] = useState<ObdConnectionState>(ObdConnectionState.Disconnected);
  
  // EKF & Sensor State
  const ekf = useRef<GenesisEKFUltimate>(new GenesisEKFUltimate());
  const [ekfStats, setEkfStats] = useState({ visionConfidence: 0, gpsActive: false, fusionUncertainty: 0 });

  const vehicleState = useRef<VehicleState>(VehicleState.IDLE);
  const stateTimeout = useRef<number>(0);
  const lastUpdate = useRef<number>(Date.now());
  
  // Real GPS state
  const [gpsData, setGpsData] = useState<{latitude: number; longitude: number; speed: number | null; accuracy: number} | null>(null);

  if (!obdServiceInstance) {
      obdServiceInstance = new ObdService((state) => {
          setObdState(state);
      });
  }

  const connectObd = useCallback(async () => {
      if (obdServiceInstance) {
          await obdServiceInstance.connect();
      }
  }, []);

  const disconnectObd = useCallback(() => {
      if (obdServiceInstance) {
          obdServiceInstance.disconnect();
      }
  }, []);

  useEffect(() => {
    let watcherId: number | null = null;
    if ('geolocation' in navigator) {
      watcherId = navigator.geolocation.watchPosition(
        (position) => {
          setGpsData({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            speed: position.coords.speed,
            accuracy: position.coords.accuracy
          });
        },
        (error) => { console.error(error); },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    }

    const interval = setInterval(async () => {
      const now = Date.now();
      const deltaTimeSeconds = (now - lastUpdate.current) / 1000.0;
      lastUpdate.current = now;

      let newPoint: Partial<SensorDataPoint> = {};
      
      // We calculate a "True Physics State" first, then generate noisy sensor readings from it
      // In a real app, "True Physics State" doesn't exist, we only have the noisy sensors.
      
      let truePhysicsSpeed = 0;
      let truePhysicsAccel = 0;
      
      const prev = data[data.length - 1];
      let { rpm, gear, latitude, longitude } = prev;

      // --- SIMULATION PHYSICS ENGINE ---
      // Determine state machine transitions
      if (now > stateTimeout.current) {
          const rand = Math.random();
          switch (vehicleState.current) {
            case VehicleState.IDLE:
              vehicleState.current = VehicleState.ACCELERATING;
              stateTimeout.current = now + (5000 + Math.random() * 5000);
              break;
            case VehicleState.ACCELERATING:
              vehicleState.current = rand > 0.5 ? VehicleState.CRUISING : VehicleState.BRAKING;
              stateTimeout.current = now + (8000 + Math.random() * 10000);
              break;
            case VehicleState.CRUISING:
              vehicleState.current = rand > 0.6 ? VehicleState.ACCELERATING : (rand > 0.3 ? VehicleState.BRAKING : VehicleState.CRUISING);
              stateTimeout.current = now + (5000 + Math.random() * 8000);
              break;
            case VehicleState.BRAKING:
              vehicleState.current = rand > 0.3 ? VehicleState.IDLE : VehicleState.ACCELERATING;
              stateTimeout.current = now + (3000 + Math.random() * 3000);
              break;
          }
      }

      // Physics Updates
      switch (vehicleState.current) {
          case VehicleState.IDLE:
            rpm += (RPM_IDLE - rpm) * 0.1;
            truePhysicsAccel = -0.5;
            if (prev.speed < 5) gear = 1;
            break;
          case VehicleState.ACCELERATING:
            if (rpm > 4500 && gear < 6) { gear++; rpm *= 0.6; }
            rpm += (RPM_MAX / (gear * 15)) * (1 - rpm/RPM_MAX) + Math.random() * 50;
            truePhysicsAccel = 6.0 + Math.random(); 
            break;
          case VehicleState.CRUISING:
            rpm += (2500 - rpm) * 0.05 + (Math.random() - 0.5) * 100;
            truePhysicsAccel = 0.0;
            break;
          case VehicleState.BRAKING:
            if (rpm < 2000 && gear > 1) { gear--; rpm *= 1.2; }
            rpm *= 0.98;
            truePhysicsAccel = -8.0;
            break;
      }
      
      // Calculate "True" Speed from RPM/Gear ratio (simulating mechanical linkage)
      // This is our 'Ground Truth' for the simulation
      truePhysicsSpeed = (rpm / (GEAR_RATIOS[gear] * 300)) * (1 - (1/gear)) * 10;
      rpm = Math.max(RPM_IDLE, Math.min(rpm, RPM_MAX));
      truePhysicsSpeed = Math.max(0, Math.min(truePhysicsSpeed, SPEED_MAX));
      
      // --- GENESIS SENSOR FUSION ---

      // 1. Predict Step (Process Model)
      // We assume we know acceleration from an IMU (simulated here)
      ekf.current.predict(truePhysicsAccel, deltaTimeSeconds);

      // 2. Fusion: OBD-II Speed
      // Simulate OBD Speed (True speed + random noise/wheel slip)
      if (obdState === ObdConnectionState.Connected && obdServiceInstance) {
           // ... (In real mode, we'd read from the device) ...
           // For this simulation, we'll pretend OBD is noisy truth
           const obdNoise = (Math.random() - 0.5) * 2.0; 
           ekf.current.fuseObdSpeed(truePhysicsSpeed + obdNoise);
           newPoint.source = 'live_obd';
      } else {
           // Simulating OBD data availability in 'Sim' mode
           const obdNoise = (Math.random() - 0.5) * 1.5;
           ekf.current.fuseObdSpeed(truePhysicsSpeed + obdNoise);
           newPoint.source = 'sim';
      }

      // 3. Fusion: GPS Speed
      // Simulate a GPS Outage: Signal is lost every 20 seconds for 5 seconds (tunnel/canyon)
      const timeLoop = (now / 1000) % 25;
      const isGpsOutage = timeLoop > 20; 
      
      // Use Real GPS if available, otherwise Sim GPS
      let gpsInputSpeed: number | null = null;
      let gpsAccuracy = 1.0;

      if (gpsData?.speed !== null && gpsData?.speed !== undefined) {
         // Real GPS
         gpsInputSpeed = gpsData.speed * 3.6; // m/s to km/h
         gpsAccuracy = gpsData.accuracy || 5;
      } else if (!isGpsOutage) {
         // Sim GPS (True speed + random noise)
         const gpsNoise = (Math.random() - 0.5) * 0.5; 
         gpsInputSpeed = truePhysicsSpeed + gpsNoise;
         gpsAccuracy = 1.0;
      }

      if (gpsInputSpeed !== null) {
          ekf.current.fuseGps(gpsInputSpeed, gpsAccuracy);
      }

      // 4. Fusion: Visual Odometry (VisionGroundTruth)
      // The module calculates confidence internally. We simulate the camera 
      // seeing the "True" world.
      const visionResult = ekf.current.fuseVision(truePhysicsSpeed, deltaTimeSeconds);

      // --- OUTPUT ---
      const fusedSpeed = ekf.current.getEstimatedSpeed();
      
      // Update UI Stats for the EKF display
      setEkfStats({
          visionConfidence: visionResult.confidence,
          gpsActive: gpsInputSpeed !== null,
          fusionUncertainty: ekf.current.getUncertainty()
      });

      setData(prevData => {
        const prev = prevData[prevData.length - 1];
        
        const mergedRpm = rpm; // In sim, RPM is direct
        const mergedGear = gear;
        
        const speedMetersPerSecond = fusedSpeed * (1000 / 3600);
        const distanceThisFrame = speedMetersPerSecond * deltaTimeSeconds;
        const newDistance = prev.distance + distanceThisFrame;

        const isFaultActive = (now / 20000) % 1 > 0.8; // Occasional fault
        setHasActiveFault(isFaultActive);
        
        const fullPoint: SensorDataPoint = {
          time: now,
          rpm: mergedRpm,
          speed: fusedSpeed, // Result of Sensor Fusion
          gear: mergedGear,
          fuelUsed: prev.fuelUsed + (mergedRpm / RPM_MAX) * 0.005,
          inletAirTemp: newPoint.inletAirTemp ?? (25 + (fusedSpeed / SPEED_MAX) * 20),
          batteryVoltage: 13.8 + (mergedRpm > 1000 ? 0.2 : 0) - (Math.random() * 0.1),
          engineTemp: newPoint.engineTemp ?? (90 + (mergedRpm / RPM_MAX) * 15),
          fuelTemp: 20 + (fusedSpeed / SPEED_MAX) * 10,
          turboBoost: -0.8 + (mergedRpm / RPM_MAX) * 2.8 * (mergedGear / 6),
          fuelPressure: 3.5 + (mergedRpm / RPM_MAX) * 2,
          oilPressure: 1.5 + (mergedRpm / RPM_MAX) * 5.0,
          shortTermFuelTrim: 2.0 + (Math.random() - 0.5) * 4,
          longTermFuelTrim: prev.longTermFuelTrim,
          o2SensorVoltage: 0.1 + (0.5 + Math.sin(now / 500) * 0.4),
          engineLoad: newPoint.engineLoad ?? (15 + (mergedRpm - RPM_IDLE) / (RPM_MAX - RPM_IDLE) * 85),
          distance: newDistance,
          latitude: newPoint.latitude ?? prev.latitude,
          longitude: newPoint.longitude ?? prev.longitude,
          source: newPoint.source
        };

        const updatedData = [...prevData, fullPoint];
        if (updatedData.length > MAX_DATA_POINTS) {
          return updatedData.slice(updatedData.length - MAX_DATA_POINTS);
        }
        return updatedData;
      });
    }, UPDATE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      if (watcherId && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watcherId);
      }
    };
  }, [obdState, gpsData, connectObd]);

  return { 
      data, 
      latestData: data[data.length - 1], 
      hasActiveFault, 
      obdState, 
      ekfStats, // Expose EKF internal stats for UI
      connectObd, 
      disconnectObd 
  };
};
