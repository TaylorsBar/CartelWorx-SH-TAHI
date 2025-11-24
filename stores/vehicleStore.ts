
import { create } from 'zustand';
import { SensorDataPoint, ObdConnectionState } from '../types';
import { ObdService } from '../services/ObdService';
import { GenesisEKFUltimate } from '../services/GenesisEKFUltimate';
import { VisualOdometryResult } from '../services/VisionGroundTruth';

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
      gForceX: 0,
      gForceY: 0,
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
      source: 'sim',
      maf: 3.5,
      timingAdvance: 10,
      throttlePos: 15,
      fuelLevel: 75,
      barometricPressure: 101.3,
      ambientTemp: 22,
      fuelRailPressure: 3500,
      lambda: 1.0
    });
  }
  return data;
};

// Generate a default 16x16 VE Table
const generateBaseMap = (): number[][] => {
    const map: number[][] = [];
    for (let loadIdx = 0; loadIdx < 16; loadIdx++) {
        const row: number[] = [];
        const load = loadIdx * (100/15);
        for (let rpmIdx = 0; rpmIdx < 16; rpmIdx++) {
            const rpm = rpmIdx * (8000/15);
            // Procedural VE shape
            const rpmNorm = rpm / 8000;
            const loadNorm = load / 100;
            let ve = 40 + (loadNorm * 20); // Base load increases VE
            ve += Math.sin(rpmNorm * Math.PI) * 40; // Peak torque curve
            ve += (Math.random() * 2 - 1); // Slight noise/roughness
            row.push(Math.max(0, Math.min(120, ve)));
        }
        map.push(row);
    }
    return map;
};

// --- Module-Level State (Physics & Services) ---
enum SimState { IDLE, ACCELERATING, CRUISING, BRAKING, CORNERING }
let currentSimState = SimState.IDLE;
let simStateTimeout = 0;
let lastUpdateTime = Date.now();

// Singletons
const ekf = new GenesisEKFUltimate();
let obdService: ObdService | null = null;
let simulationInterval: any = null;
let gpsWatchId: number | null = null;
let gpsLatest: { speed: number | null, accuracy: number, latitude: number, longitude: number } | null = null;

// Real-time OBD Data Cache
let isObdPolling = false;
let obdCache = {
    rpm: 0,
    speed: 0,
    coolant: 0,
    intake: 0,
    load: 0,
    map: 0, // kPa
    voltage: 0,
    maf: 0,
    timing: 0,
    throttle: 0,
    fuelLevel: 0,
    baro: 0,
    ambient: 0,
    fuelRail: 0,
    lambda: 0,
    lastUpdate: 0
};

interface TuningState {
    veTable: number[][]; // 16x16
    ignitionTable: number[][]; // 16x16 (placeholder for now)
    boostTarget: number; // psi
    globalFuelTrim: number; // %
}

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
  
  // Tuning State
  tuning: TuningState;

  // Actions
  startSimulation: () => void;
  stopSimulation: () => void;
  connectObd: () => Promise<void>;
  disconnectObd: () => void;
  
  // CV Action
  processVisionFrame: (imageData: ImageData) => VisualOdometryResult;
  
  // Tuning Actions
  updateMapCell: (table: 've' | 'ign', row: number, col: number, value: number) => void;
  smoothMap: (table: 've' | 'ign') => void;
}

// Independent Polling Loop with Weighted Strategy
const startObdPolling = async () => {
    isObdPolling = true;
    let loopCount = 0;

    while (isObdPolling && obdService) {
        try {
            // --- High Frequency (Every Loop) ---
            const rpmRaw = await obdService.runCommand("010C");
            const speedRaw = await obdService.runCommand("010D");
            const mapRaw = await obdService.runCommand("010B"); 
            const throttleRaw = await obdService.runCommand("0111"); // Throttle Pos

            if (rpmRaw) obdCache.rpm = obdService.parseRpm(rpmRaw);
            if (speedRaw) obdCache.speed = obdService.parseSpeed(speedRaw);
            if (mapRaw) obdCache.map = obdService.parseMap(mapRaw);
            if (throttleRaw) obdCache.throttle = obdService.parseThrottlePos(throttleRaw);

            // --- Medium Frequency (Every 5 Loops) ---
            if (loopCount % 5 === 0) {
                const tempRaw = await obdService.runCommand("0105");
                if (tempRaw) obdCache.coolant = obdService.parseCoolant(tempRaw);
                
                const intakeRaw = await obdService.runCommand("010F");
                if (intakeRaw) obdCache.intake = obdService.parseIntakeTemp(intakeRaw);

                const timingRaw = await obdService.runCommand("010E");
                if (timingRaw) obdCache.timing = obdService.parseTimingAdvance(timingRaw);

                const mafRaw = await obdService.runCommand("0110");
                if (mafRaw) obdCache.maf = obdService.parseMaf(mafRaw);

                const lambdaRaw = await obdService.runCommand("0144");
                if (lambdaRaw) obdCache.lambda = obdService.parseLambda(lambdaRaw);
                
                // Fallback load if throttle isn't enough
                const loadRaw = await obdService.runCommand("0104");
                if (loadRaw) obdCache.load = obdService.parseLoad(loadRaw);
            }

            // --- Low Frequency (Every 20 Loops) ---
            if (loopCount % 20 === 0) {
                const voltRaw = await obdService.runCommand("AT RV");
                if (voltRaw) obdCache.voltage = obdService.parseVoltage(voltRaw);

                const fuelLvlRaw = await obdService.runCommand("012F");
                if (fuelLvlRaw) obdCache.fuelLevel = obdService.parseFuelLevel(fuelLvlRaw);

                const baroRaw = await obdService.runCommand("0133");
                if (baroRaw) obdCache.baro = obdService.parseBarometricPressure(baroRaw);

                const ambRaw = await obdService.runCommand("0146");
                if (ambRaw) obdCache.ambient = obdService.parseAmbientTemp(ambRaw);
                
                const railRaw = await obdService.runCommand("0123");
                if (railRaw) obdCache.fuelRail = obdService.parseFuelRailPressure(railRaw);
            }

            obdCache.lastUpdate = Date.now();
            loopCount++;
            if (loopCount > 1000) loopCount = 0;

            await new Promise(r => setTimeout(r, 10));

        } catch (e) {
            console.warn("OBD Poll Error", e);
            await new Promise(r => setTimeout(r, 500));
        }
    }
};

// Timestamp of last visual frame processing
let lastVisionUpdate = 0;

export const useVehicleStore = create<VehicleStoreState>((set, get) => ({
  data: generateInitialData(),
  latestData: generateInitialData()[generateInitialData().length - 1],
  hasActiveFault: false,
  obdState: ObdConnectionState.Disconnected,
  ekfStats: { visionConfidence: 0, gpsActive: false, fusionUncertainty: 0 },
  
  tuning: {
      veTable: generateBaseMap(),
      ignitionTable: generateBaseMap(), 
      boostTarget: 18.0,
      globalFuelTrim: 0,
  },

  processVisionFrame: (imageData: ImageData) => {
      const now = Date.now();
      let dt = (now - lastVisionUpdate) / 1000;
      if (dt <= 0 || dt > 1.0) dt = 0.05; // fallback
      lastVisionUpdate = now;

      // Feed into EKF
      const result = ekf.processCameraFrame(imageData, dt);
      
      // Update store with confidence stats immediately (optional, but good for UI)
      set(state => ({
          ekfStats: { ...state.ekfStats, visionConfidence: result.confidence }
      }));

      return result;
  },

  updateMapCell: (table, row, col, value) => {
      set(state => {
          const newMap = table === 've' ? [...state.tuning.veTable] : [...state.tuning.ignitionTable];
          newMap[row] = [...newMap[row]]; // Copy row
          newMap[row][col] = value;
          return {
              tuning: {
                  ...state.tuning,
                  [table === 've' ? 'veTable' : 'ignitionTable']: newMap
              }
          };
      });
  },

  smoothMap: (table) => {
      set(state => {
           const map = table === 've' ? state.tuning.veTable : state.tuning.ignitionTable;
           const newMap = map.map((row, r) => row.map((val, c) => {
               // Simple 3x3 kernel average
               let sum = val;
               let count = 1;
               if (r>0) { sum += map[r-1][c]; count++; }
               if (r<15) { sum += map[r+1][c]; count++; }
               if (c>0) { sum += map[r][c-1]; count++; }
               if (c<15) { sum += map[r][c+1]; count++; }
               return sum / count;
           }));
           return {
               tuning: {
                   ...state.tuning,
                   [table === 've' ? 'veTable' : 'ignitionTable']: newMap
               }
           }
      });
  },

  connectObd: async () => {
    if (!obdService) {
      obdService = new ObdService((status) => {
          set({ obdState: status });
          if (status === ObdConnectionState.Disconnected) {
              isObdPolling = false;
          }
      });
    }
    await obdService.connect();
    startObdPolling();
  },

  disconnectObd: () => {
    isObdPolling = false;
    obdService?.disconnect();
  },

  startSimulation: () => {
    if (simulationInterval) return;

    if ('geolocation' in navigator && !gpsWatchId) {
      try {
        gpsWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            gpsLatest = {
              speed: pos.coords.speed,
              accuracy: pos.coords.accuracy,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude
            };
          },
          (err) => { if (err.code === 1) console.warn("GPS Permission Denied"); },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
        );
      } catch (e) { console.warn("Geolocation API access failed:", e); }
    }

    simulationInterval = setInterval(() => {
      const state = get();
      const now = Date.now();
      let deltaTimeSeconds = (now - lastUpdateTime) / 1000.0;
      if (deltaTimeSeconds <= 0 || isNaN(deltaTimeSeconds)) deltaTimeSeconds = 0.001; // Prevent div by zero
      lastUpdateTime = now;
      const prev = state.latestData;
      
      const isObdFresh = state.obdState === ObdConnectionState.Connected && (now - obdCache.lastUpdate < 2000);
      let newPointSource: 'sim' | 'live_obd' = isObdFresh ? 'live_obd' : 'sim';

      let { rpm, gear } = prev;
      
      if (!isObdFresh) {
          // --- Simulation State Machine ---
          if (now > simStateTimeout) {
            const rand = Math.random();
            switch (currentSimState) {
              case SimState.IDLE:
                currentSimState = SimState.ACCELERATING;
                simStateTimeout = now + (5000 + Math.random() * 5000);
                break;
              case SimState.ACCELERATING:
                currentSimState = rand > 0.4 ? SimState.CRUISING : (rand > 0.2 ? SimState.BRAKING : SimState.CORNERING);
                simStateTimeout = now + (8000 + Math.random() * 10000);
                break;
              case SimState.CRUISING:
                currentSimState = rand > 0.6 ? SimState.ACCELERATING : (rand > 0.3 ? SimState.BRAKING : SimState.CORNERING);
                simStateTimeout = now + (5000 + Math.random() * 8000);
                break;
              case SimState.BRAKING:
                currentSimState = rand > 0.5 ? SimState.CORNERING : SimState.ACCELERATING;
                simStateTimeout = now + (3000 + Math.random() * 3000);
                break;
              case SimState.CORNERING:
                currentSimState = SimState.ACCELERATING;
                simStateTimeout = now + (4000 + Math.random() * 4000);
                break;
            }
          }

          switch (currentSimState) {
            case SimState.IDLE:
              rpm += (RPM_IDLE - rpm) * 0.1;
              if (prev.speed < 5) gear = 1;
              break;
            case SimState.ACCELERATING:
              if (rpm > 4500 && gear < 6) { gear++; rpm *= 0.6; }
              rpm += (RPM_MAX / (gear * 15)) * (1 - rpm / RPM_MAX) + Math.random() * 50;
              break;
            case SimState.CRUISING:
              rpm += (2500 - rpm) * 0.05 + (Math.random() - 0.5) * 100;
              break;
            case SimState.BRAKING:
              if (rpm < 2000 && gear > 1) { gear--; rpm *= 1.2; }
              rpm *= 0.98;
              break;
            case SimState.CORNERING:
                rpm += (Math.random() - 0.5) * 50;
                break;
          }
          rpm = Math.max(RPM_IDLE, Math.min(rpm, RPM_MAX));
      } else {
          rpm = obdCache.rpm;
      }

      // --- EKF & Physics ---
      let inputSpeed = 0;
      let accelEst = 0; 
      if (isObdFresh) {
          inputSpeed = obdCache.speed;
          accelEst = (obdCache.speed - prev.speed) / deltaTimeSeconds / 3.6; 
          ekf.fuseObdSpeed(inputSpeed * 1000 / 3600); 
      } else {
          const simSpeed = (rpm / (GEAR_RATIOS[gear] * 300)) * (1 - (1 / gear)) * 10;
          inputSpeed = Math.max(0, Math.min(simSpeed, SPEED_MAX));
          ekf.fuseObdSpeed(inputSpeed * 1000 / 3600);
      }
      
      // Force finite acceleration for physics
      if (!isFinite(accelEst)) accelEst = 0;

      // Generate simulated IMU data
      let gx = (Math.random() - 0.5) * 0.1;
      let gy = accelEst / 9.81;
      if (currentSimState === SimState.CORNERING) gx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);
      
      const ax = gy * 9.81;
      const ay = gx * 9.81;
      const az = 0 + (Math.random() - 0.5) * 0.2;

      const velocityMs = Math.max(1, prev.speed / 3.6);
      const r = ay / velocityMs;
      const q = (gy - prev.gForceY) * 2.0; 
      const p = (gx - prev.gForceX) * 1.5;

      // 1. Prediction Step (IMU)
      ekf.predict([ax, ay, az], [p, q, r], deltaTimeSeconds);
      
      // 2. Vision Fusion Step (Only in Sim Mode here)
      if (Date.now() - lastVisionUpdate > 500) {
          ekf.fuseVision(inputSpeed, deltaTimeSeconds);
      }

      // 3. GPS Fusion Step
      if (gpsLatest?.speed !== null && gpsLatest?.speed !== undefined) {
        ekf.fuseGps(gpsLatest.speed, gpsLatest.accuracy);
      }

      const fusedSpeedMs = ekf.getEstimatedSpeed();
      const fusedSpeedKph = fusedSpeedMs * 3.6;
      const distanceThisFrame = fusedSpeedMs * deltaTimeSeconds;

      // Update position
      let currentLat = prev.latitude;
      let currentLon = prev.longitude;
      if (gpsLatest) {
          currentLat = gpsLatest.latitude;
          currentLon = gpsLatest.longitude;
      } else if (fusedSpeedKph > 0) {
          const distKm = (fusedSpeedKph * (deltaTimeSeconds / 3600)); 
          const dLat = distKm / 111;
          const dLon = distKm / (111 * Math.cos(currentLat * (Math.PI / 180)));
          currentLat += dLat * 0.707;
          currentLon += dLon * 0.707;
      }

      // --- Map Lookup for Engine Load/Performance ---
      const rpmIndex = Math.min(15, Math.floor(rpm / (8000/15)));
      let throttle = 15;
      if (currentSimState === SimState.ACCELERATING) throttle = 80;
      if (currentSimState === SimState.CRUISING) throttle = 30;
      const loadIndex = Math.min(15, Math.floor(throttle / (100/15)));
      
      const veValue = state.tuning.veTable[loadIndex][rpmIndex];
      const simulatedLoad = throttle; 

      // --- Calculations for Extended Data ---
      const calcMaf = (rpm / RPM_MAX) * 250;
      const calcTiming = 10 + (rpm/RPM_MAX) * 35;
      const calcFuelRail = 3500 + (rpm/RPM_MAX) * 15000; // kPa
      const calcLambda = 0.95 + (Math.random() * 0.1);

      const newPoint: SensorDataPoint = {
        time: now,
        rpm: rpm,
        speed: fusedSpeedKph,
        gear: gear,
        fuelUsed: prev.fuelUsed + (rpm / RPM_MAX) * (veValue/100) * 0.005, 
        inletAirTemp: isObdFresh ? obdCache.intake : (25 + (fusedSpeedKph / SPEED_MAX) * 20),
        batteryVoltage: isObdFresh && obdCache.voltage > 5 ? obdCache.voltage : 13.8,
        engineTemp: isObdFresh ? obdCache.coolant : (90 + (rpm / RPM_MAX) * 15),
        fuelTemp: 20 + (fusedSpeedKph / SPEED_MAX) * 10,
        turboBoost: isObdFresh ? (obdCache.map - 100) / 100 : (-0.8 + (rpm / RPM_MAX) * (state.tuning.boostTarget/14.7) * (gear / 6)),
        fuelPressure: 3.5 + (rpm / RPM_MAX) * 2,
        oilPressure: 1.5 + (rpm / RPM_MAX) * 5.0,
        shortTermFuelTrim: 2.0 + (Math.random() - 0.5) * 4,
        longTermFuelTrim: prev.longTermFuelTrim,
        o2SensorVoltage: 0.1 + (0.5 + Math.sin(now / 500) * 0.4),
        engineLoad: isObdFresh ? obdCache.load : simulatedLoad,
        distance: prev.distance + distanceThisFrame,
        gForceX: gx,
        gForceY: gy,
        latitude: currentLat,
        longitude: currentLon,
        source: newPointSource,
        
        // Expanded Data Fields (Use Cache or Simulation)
        maf: isObdFresh ? obdCache.maf : calcMaf,
        timingAdvance: isObdFresh ? obdCache.timing : calcTiming,
        throttlePos: isObdFresh ? obdCache.throttle : simulatedLoad,
        fuelLevel: isObdFresh && obdCache.fuelLevel > 0 ? obdCache.fuelLevel : Math.max(0, (prev.fuelLevel || 75) - 0.0005),
        barometricPressure: isObdFresh && obdCache.baro > 0 ? obdCache.baro : 101.3,
        ambientTemp: isObdFresh && obdCache.ambient > 0 ? obdCache.ambient : 22,
        fuelRailPressure: isObdFresh && obdCache.fuelRail > 0 ? obdCache.fuelRail : calcFuelRail,
        lambda: isObdFresh && obdCache.lambda > 0 ? obdCache.lambda : calcLambda
      };

      const newData = [...state.data, newPoint];
      if (newData.length > MAX_DATA_POINTS) {
        newData.shift();
      }

      set(state => ({
        data: newData,
        latestData: newPoint,
        hasActiveFault: false,
        ekfStats: {
          ...state.ekfStats, // preserve vision confidence if updated elsewhere
          gpsActive: gpsLatest !== null,
          fusionUncertainty: ekf.getUncertainty()
        }
      }));

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
