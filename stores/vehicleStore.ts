
import { create } from 'zustand';
import { SensorDataPoint, ObdConnectionState } from '../types';
import { ObdService } from '../services/ObdService';
import { GenesisEKFUltimate } from '../services/GenesisEKFUltimate';

// --- Constants ---
const UPDATE_INTERVAL_MS = 50; // 20Hz
const MAX_DATA_POINTS = 200;
const RPM_IDLE = 800;
const RPM_MAX = 8000;
const SPEED_MAX = 280;
const GEAR_RATIOS = [0, 3.6, 2.1, 1.4, 1.0, 0.8, 0.6];
const DEFAULT_LAT = -37.88;
const DEFAULT_LON = 175.55;

// --- Helper Functions ---
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

// --- Module-Level State (Physics & Services) ---
// Kept outside store to avoid complex reactivity or circular dependency issues
enum SimState { IDLE, ACCELERATING, CRUISING, BRAKING }
let currentSimState = SimState.IDLE;
let simStateTimeout = 0;
let lastUpdateTime = Date.now();

// Singletons
const ekf = new GenesisEKFUltimate();
let obdService: ObdService | null = null;
let simulationInterval: any = null;
let gpsWatchId: number | null = null;
let gpsLatest: { speed: number | null, accuracy: number, latitude: number, longitude: number } | null = null;

interface VehicleStoreState {
  data: SensorDataPoint[];
  latestData: SensorDataPoint;
  hasActiveFault: boolean;
  obdState: ObdConnectionState;
  ekfStats: {
    visionConfidence: number;
    gpsActive: boolean;
    fusionUncertainty: number;
  };

  // Actions
  startSimulation: () => void;
  stopSimulation: () => void;
  connectObd: () => Promise<void>;
  disconnectObd: () => void;
}

export const useVehicleStore = create<VehicleStoreState>((set, get) => ({
  data: generateInitialData(),
  latestData: generateInitialData()[generateInitialData().length - 1],
  hasActiveFault: false,
  obdState: ObdConnectionState.Disconnected,
  ekfStats: { visionConfidence: 0, gpsActive: false, fusionUncertainty: 0 },

  connectObd: async () => {
    if (!obdService) {
      obdService = new ObdService((status) => set({ obdState: status }));
    }
    await obdService.connect();
  },

  disconnectObd: () => {
    obdService?.disconnect();
  },

  startSimulation: () => {
    if (simulationInterval) return;

    // GPS Setup
    if ('geolocation' in navigator) {
      gpsWatchId = navigator.geolocation.watchPosition(
        (pos) => {
          gpsLatest = {
            speed: pos.coords.speed,
            accuracy: pos.coords.accuracy,
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude
          };
        },
        (err) => console.error("GPS Error:", err),
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
      );
    }

    // Simulation Loop
    simulationInterval = setInterval(() => {
      const state = get();
      const now = Date.now();
      const deltaTimeSeconds = (now - lastUpdateTime) / 1000.0;
      lastUpdateTime = now;

      const prev = state.latestData;
      let { rpm, gear } = prev;
      let newPointSource: 'sim' | 'live_obd' = 'sim';

      // --- Physics State Machine ---
      if (now > simStateTimeout) {
        const rand = Math.random();
        switch (currentSimState) {
          case SimState.IDLE:
            currentSimState = SimState.ACCELERATING;
            simStateTimeout = now + (5000 + Math.random() * 5000);
            break;
          case SimState.ACCELERATING:
            currentSimState = rand > 0.5 ? SimState.CRUISING : SimState.BRAKING;
            simStateTimeout = now + (8000 + Math.random() * 10000);
            break;
          case SimState.CRUISING:
            currentSimState = rand > 0.6 ? SimState.ACCELERATING : (rand > 0.3 ? SimState.BRAKING : SimState.CRUISING);
            simStateTimeout = now + (5000 + Math.random() * 8000);
            break;
          case SimState.BRAKING:
            currentSimState = rand > 0.3 ? SimState.IDLE : SimState.ACCELERATING;
            simStateTimeout = now + (3000 + Math.random() * 3000);
            break;
        }
      }

      // --- Physics Update ---
      let truePhysicsSpeed = 0;
      let truePhysicsAccel = 0;

      switch (currentSimState) {
        case SimState.IDLE:
          rpm += (RPM_IDLE - rpm) * 0.1;
          truePhysicsAccel = -0.5;
          if (prev.speed < 5) gear = 1;
          break;
        case SimState.ACCELERATING:
          if (rpm > 4500 && gear < 6) { gear++; rpm *= 0.6; }
          rpm += (RPM_MAX / (gear * 15)) * (1 - rpm / RPM_MAX) + Math.random() * 50;
          truePhysicsAccel = 6.0 + Math.random();
          break;
        case SimState.CRUISING:
          rpm += (2500 - rpm) * 0.05 + (Math.random() - 0.5) * 100;
          truePhysicsAccel = 0.0;
          break;
        case SimState.BRAKING:
          if (rpm < 2000 && gear > 1) { gear--; rpm *= 1.2; }
          rpm *= 0.98;
          truePhysicsAccel = -8.0;
          break;
      }

      // Calc True Physics Speed (Ground Truth for Sim)
      truePhysicsSpeed = (rpm / (GEAR_RATIOS[gear] * 300)) * (1 - (1 / gear)) * 10;
      rpm = Math.max(RPM_IDLE, Math.min(rpm, RPM_MAX));
      truePhysicsSpeed = Math.max(0, Math.min(truePhysicsSpeed, SPEED_MAX));

      // --- SENSOR FUSION ---
      ekf.predict(truePhysicsAccel, deltaTimeSeconds);

      // Fusion: OBD Speed
      if (state.obdState === ObdConnectionState.Connected && obdService) {
        // In real app, read from obdService. For sim, use noise.
        const obdNoise = (Math.random() - 0.5) * 2.0;
        ekf.fuseObdSpeed(truePhysicsSpeed + obdNoise);
        newPointSource = 'live_obd';
      } else {
        const obdNoise = (Math.random() - 0.5) * 1.5;
        ekf.fuseObdSpeed(truePhysicsSpeed + obdNoise);
        newPointSource = 'sim';
      }

      // Fusion: GPS Speed
      const timeLoop = (now / 1000) % 25;
      const isGpsOutage = timeLoop > 20;

      let gpsInputSpeed: number | null = null;
      let gpsAccuracy = 1.0;

      if (gpsLatest?.speed !== null && gpsLatest?.speed !== undefined) {
        gpsInputSpeed = gpsLatest.speed * 3.6; // m/s to km/h
        gpsAccuracy = gpsLatest.accuracy || 5;
      } else if (!isGpsOutage) {
        const gpsNoise = (Math.random() - 0.5) * 0.5;
        gpsInputSpeed = truePhysicsSpeed + gpsNoise;
        gpsAccuracy = 1.0;
      }

      if (gpsInputSpeed !== null) {
        ekf.fuseGps(gpsInputSpeed, gpsAccuracy);
      }

      // Fusion: Visual Odometry
      const visionResult = ekf.fuseVision(truePhysicsSpeed, deltaTimeSeconds);
      const fusedSpeed = ekf.getEstimatedSpeed();

      // --- State Update ---
      const speedMetersPerSecond = fusedSpeed * (1000 / 3600);
      const distanceThisFrame = speedMetersPerSecond * deltaTimeSeconds;
      const newDistance = prev.distance + distanceThisFrame;
      const isFaultActive = (now / 20000) % 1 > 0.8;

      const newPoint: SensorDataPoint = {
        time: now,
        rpm: rpm,
        speed: fusedSpeed,
        gear: gear,
        fuelUsed: prev.fuelUsed + (rpm / RPM_MAX) * 0.005,
        inletAirTemp: 25 + (fusedSpeed / SPEED_MAX) * 20,
        batteryVoltage: 13.8 + (rpm > 1000 ? 0.2 : 0) - (Math.random() * 0.1),
        engineTemp: 90 + (rpm / RPM_MAX) * 15,
        fuelTemp: 20 + (fusedSpeed / SPEED_MAX) * 10,
        turboBoost: -0.8 + (rpm / RPM_MAX) * 2.8 * (gear / 6),
        fuelPressure: 3.5 + (rpm / RPM_MAX) * 2,
        oilPressure: 1.5 + (rpm / RPM_MAX) * 5.0,
        shortTermFuelTrim: 2.0 + (Math.random() - 0.5) * 4,
        longTermFuelTrim: prev.longTermFuelTrim,
        o2SensorVoltage: 0.1 + (0.5 + Math.sin(now / 500) * 0.4),
        engineLoad: 15 + (rpm - RPM_IDLE) / (RPM_MAX - RPM_IDLE) * 85,
        distance: newDistance,
        latitude: gpsLatest?.latitude ?? prev.latitude,
        longitude: gpsLatest?.longitude ?? prev.longitude,
        source: newPointSource
      };

      const newData = [...state.data, newPoint];
      if (newData.length > MAX_DATA_POINTS) {
        newData.shift(); // Keep array size constant
      }

      set({
        data: newData,
        latestData: newPoint,
        hasActiveFault: isFaultActive,
        ekfStats: {
          visionConfidence: visionResult.confidence,
          gpsActive: gpsInputSpeed !== null,
          fusionUncertainty: ekf.getUncertainty()
        }
      });

    }, UPDATE_INTERVAL_MS);
  },

  stopSimulation: () => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      simulationInterval = null;
    }
    if (gpsWatchId && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(gpsWatchId);
    }
  }
}));
