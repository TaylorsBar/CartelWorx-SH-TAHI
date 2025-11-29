
import { create } from 'zustand';
import { SensorDataPoint, ObdConnectionState, DynoRun, DynoPoint } from '../types';
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
// Robust number sanitizer
const s = (val: any, fallback: number = 0): number => {
    if (typeof val === 'number' && !Number.isNaN(val) && Number.isFinite(val)) return val;
    return fallback;
};

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
            const rpmNorm = rpm / 8000;
            const loadNorm = load / 100;
            let ve = 40 + (loadNorm * 20); 
            ve += Math.sin(rpmNorm * Math.PI) * 40; 
            ve += (Math.random() * 2 - 1);
            row.push(s(Math.max(0, Math.min(120, ve))));
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
    map: 0, 
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
    veTable: number[][]; 
    ignitionTable: number[][];
    boostTarget: number;
    globalFuelTrim: number;
}

interface DynoState {
    isRunning: boolean;
    currentRunData: DynoPoint[];
    runs: DynoRun[];
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
  tuning: TuningState;
  dyno: DynoState;

  startSimulation: () => void;
  stopSimulation: () => void;
  connectObd: () => Promise<void>;
  disconnectObd: () => void;
  processVisionFrame: (imageData: ImageData) => VisualOdometryResult;
  updateMapCell: (table: 've' | 'ign', row: number, col: number, value: number) => void;
  smoothMap: (table: 've' | 'ign') => void;
  startDynoRun: () => void;
  stopDynoRun: () => void;
  toggleDynoRunVisibility: (id: string) => void;
  deleteDynoRun: (id: string) => void;
}

// Independent Polling Loop
const startObdPolling = async () => {
    isObdPolling = true;
    let loopCount = 0;

    while (isObdPolling && obdService) {
        try {
            const rpmRaw = await obdService.runCommand("010C");
            const speedRaw = await obdService.runCommand("010D");
            const mapRaw = await obdService.runCommand("010B"); 
            const throttleRaw = await obdService.runCommand("0111");

            if (rpmRaw) { const v = obdService.parseRpm(rpmRaw); if(Number.isFinite(v)) obdCache.rpm = v; }
            if (speedRaw) { const v = obdService.parseSpeed(speedRaw); if(Number.isFinite(v)) obdCache.speed = v; }
            if (mapRaw) { const v = obdService.parseMap(mapRaw); if(Number.isFinite(v)) obdCache.map = v; }
            if (throttleRaw) { const v = obdService.parseThrottlePos(throttleRaw); if(Number.isFinite(v)) obdCache.throttle = v; }

            if (loopCount % 5 === 0) {
                const tempRaw = await obdService.runCommand("0105");
                if (tempRaw) { const v = obdService.parseCoolant(tempRaw); if(Number.isFinite(v)) obdCache.coolant = v; }
                
                const intakeRaw = await obdService.runCommand("010F");
                if (intakeRaw) { const v = obdService.parseIntakeTemp(intakeRaw); if(Number.isFinite(v)) obdCache.intake = v; }

                const timingRaw = await obdService.runCommand("010E");
                if (timingRaw) { const v = obdService.parseTimingAdvance(timingRaw); if(Number.isFinite(v)) obdCache.timing = v; }

                const mafRaw = await obdService.runCommand("0110");
                if (mafRaw) { const v = obdService.parseMaf(mafRaw); if(Number.isFinite(v)) obdCache.maf = v; }

                const lambdaRaw = await obdService.runCommand("0144");
                if (lambdaRaw) { const v = obdService.parseLambda(lambdaRaw); if(Number.isFinite(v)) obdCache.lambda = v; }
                
                const loadRaw = await obdService.runCommand("0104");
                if (loadRaw) { const v = obdService.parseLoad(loadRaw); if(Number.isFinite(v)) obdCache.load = v; }
            }

            if (loopCount % 20 === 0) {
                const voltRaw = await obdService.runCommand("AT RV");
                if (voltRaw) { const v = obdService.parseVoltage(voltRaw); if(Number.isFinite(v)) obdCache.voltage = v; }

                const fuelLvlRaw = await obdService.runCommand("012F");
                if (fuelLvlRaw) { const v = obdService.parseFuelLevel(fuelLvlRaw); if(Number.isFinite(v)) obdCache.fuelLevel = v; }

                const baroRaw = await obdService.runCommand("0133");
                if (baroRaw) { const v = obdService.parseBarometricPressure(baroRaw); if(Number.isFinite(v)) obdCache.baro = v; }

                const ambRaw = await obdService.runCommand("0146");
                if (ambRaw) { const v = obdService.parseAmbientTemp(ambRaw); if(Number.isFinite(v)) obdCache.ambient = v; }
                
                const railRaw = await obdService.runCommand("0123");
                if (railRaw) { const v = obdService.parseFuelRailPressure(railRaw); if(Number.isFinite(v)) obdCache.fuelRail = v; }
            }

            obdCache.lastUpdate = Date.now();
            loopCount++;
            if (loopCount > 1000) loopCount = 0;

            await new Promise(r => setTimeout(r, 10));

        } catch (e) {
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
  
  dyno: {
      isRunning: false,
      currentRunData: [],
      runs: [],
  },

  processVisionFrame: (imageData: ImageData) => {
      const now = Date.now();
      let dt = (now - lastVisionUpdate) / 1000;
      if (dt <= 0 || dt > 1.0) dt = 0.05; 
      lastVisionUpdate = now;

      const result = ekf.processCameraFrame(imageData, dt);
      
      set(state => ({
          ekfStats: { ...state.ekfStats, visionConfidence: s(result.confidence) }
      }));

      return result;
  },

  updateMapCell: (table, row, col, value) => {
      set(state => {
          const newMap = table === 've' ? [...state.tuning.veTable] : [...state.tuning.ignitionTable];
          newMap[row] = [...newMap[row]]; 
          newMap[row][col] = s(value);
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
               let sum = val;
               let count = 1;
               if (r>0) { sum += map[r-1][c]; count++; }
               if (r<15) { sum += map[r+1][c]; count++; }
               if (c>0) { sum += map[r][c-1]; count++; }
               if (c<15) { sum += map[r][c+1]; count++; }
               return s(sum / count);
           }));
           return {
               tuning: {
                   ...state.tuning,
                   [table === 've' ? 'veTable' : 'ignitionTable']: newMap
               }
           }
      });
  },
  
  startDynoRun: () => {
      set(state => ({
          dyno: { ...state.dyno, isRunning: true, currentRunData: [] }
      }));
  },
  
  stopDynoRun: () => {
      set(state => {
          if (!state.dyno.isRunning) return state;
          
          const newRun: DynoRun = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              name: `Run ${state.dyno.runs.length + 1}`,
              data: state.dyno.currentRunData,
              peakPower: Math.max(...state.dyno.currentRunData.map(p => p.power), 0),
              peakTorque: Math.max(...state.dyno.currentRunData.map(p => p.torque), 0),
              color: `hsl(${Math.random() * 360}, 70%, 50%)`,
              isVisible: true
          };
          
          return {
              dyno: {
                  ...state.dyno,
                  isRunning: false,
                  runs: [...state.dyno.runs, newRun],
                  currentRunData: []
              }
          };
      });
  },
  
  toggleDynoRunVisibility: (id) => {
      set(state => ({
          dyno: {
              ...state.dyno,
              runs: state.dyno.runs.map(r => r.id === id ? { ...r, isVisible: !r.isVisible } : r)
          }
      }));
  },
  
  deleteDynoRun: (id) => {
      set(state => ({
          dyno: {
              ...state.dyno,
              runs: state.dyno.runs.filter(r => r.id !== id)
          }
      }));
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
            if (pos && pos.coords) {
                gpsLatest = {
                  speed: pos.coords.speed ?? 0, // Handle null speed from browser
                  accuracy: pos.coords.accuracy,
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude
                };
            }
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
      if (deltaTimeSeconds <= 0 || isNaN(deltaTimeSeconds)) deltaTimeSeconds = 0.05; 
      lastUpdateTime = now;
      const prev = state.latestData;
      
      const isObdFresh = state.obdState === ObdConnectionState.Connected && (now - obdCache.lastUpdate < 5000);
      let newPointSource: 'sim' | 'live_obd' = isObdFresh ? 'live_obd' : 'sim';

      let { rpm, gear } = prev;
      
      if (state.dyno.isRunning) {
          gear = 4; 
          const sweepRate = 1000; 
          rpm += sweepRate * deltaTimeSeconds;
          
          if (rpm >= RPM_MAX) {
              state.stopDynoRun();
              rpm = 2000; 
          } else {
              const rpmNorm = s(rpm) / 7000;
              const torqueCurve = (Math.sin(rpmNorm * Math.PI) + 0.5) * 300;
              const boostFactor = 1 + (Math.max(0, prev.turboBoost) * 0.5);
              const currentTorque = s(torqueCurve * boostFactor * (0.95 + Math.random()*0.1));
              const currentPowerHP = s((currentTorque * 0.737 * rpm) / 5252);

              const dynoPoint: DynoPoint = {
                  rpm: s(rpm),
                  torque: currentTorque,
                  power: currentPowerHP,
                  afr: 12.5 - (s(rpm)/8000),
                  boost: s(prev.turboBoost)
              };
              
              state.dyno.currentRunData.push(dynoPoint);
          }
      } else if (!isObdFresh) {
          // Simulation Logic
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

      let inputSpeed = 0;
      let accelEst = 0; 
      if (isObdFresh) {
          inputSpeed = obdCache.speed;
          accelEst = (obdCache.speed - prev.speed) / deltaTimeSeconds / 3.6; 
          ekf.fuseObdSpeed(inputSpeed * 1000 / 3600); 
      } else {
          const safeGear = gear < 1 ? 1 : gear;
          const safeRatio = GEAR_RATIOS[safeGear] || 1;
          const simSpeed = (rpm / (safeRatio * 300)) * (1 - (1 / safeGear)) * 10;
          inputSpeed = Math.max(0, Math.min(simSpeed, SPEED_MAX));
          ekf.fuseObdSpeed(inputSpeed * 1000 / 3600);
      }
      
      if (!isFinite(accelEst)) accelEst = 0;

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

      ekf.predict([s(ax), s(ay), s(az)], [s(p), s(q), s(r)], deltaTimeSeconds);
      
      if (Date.now() - lastVisionUpdate > 500) {
          ekf.fuseVision(s(inputSpeed), deltaTimeSeconds);
      }

      if (gpsLatest) {
        ekf.fuseGps(gpsLatest.speed ?? 0, gpsLatest.accuracy);
      }

      const fusedSpeedMs = ekf.getEstimatedSpeed();
      const fusedSpeedKph = fusedSpeedMs * 3.6;
      const distanceThisFrame = fusedSpeedMs * deltaTimeSeconds;

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

      const rpmIndex = Math.min(15, Math.floor(rpm / (8000/15)));
      let throttle = 15;
      if (currentSimState === SimState.ACCELERATING) throttle = 80;
      if (currentSimState === SimState.CRUISING) throttle = 30;
      if (state.dyno.isRunning) throttle = 100;

      const loadIndex = Math.min(15, Math.floor(throttle / (100/15)));
      const safeVeTable = state.tuning.veTable || generateBaseMap();
      const safeRow = safeVeTable[loadIndex] || safeVeTable[0];
      const veValue = safeRow[rpmIndex] || 0;
      const simulatedLoad = throttle; 

      const calcMaf = (rpm / RPM_MAX) * 250;
      const calcTiming = 10 + (rpm/RPM_MAX) * 35;
      const calcFuelRail = 3500 + (rpm/RPM_MAX) * 15000; 
      const calcLambda = state.dyno.isRunning ? (12.5/14.7) : (0.95 + (Math.random() * 0.1));

      const newPoint: SensorDataPoint = {
        time: now,
        rpm: s(rpm),
        speed: s(fusedSpeedKph),
        gear: s(gear),
        fuelUsed: s(prev.fuelUsed + (rpm / RPM_MAX) * (veValue/100) * 0.005), 
        inletAirTemp: s(isObdFresh ? obdCache.intake : (25 + (fusedSpeedKph / SPEED_MAX) * 20)),
        batteryVoltage: s(isObdFresh && obdCache.voltage > 5 ? obdCache.voltage : 13.8),
        engineTemp: s(isObdFresh ? obdCache.coolant : (90 + (rpm / RPM_MAX) * 15)),
        fuelTemp: s(20 + (fusedSpeedKph / SPEED_MAX) * 10),
        turboBoost: s(isObdFresh ? (obdCache.map - 100) / 100 : (-0.8 + (rpm / RPM_MAX) * (state.tuning.boostTarget/14.7) * (gear / 6))),
        fuelPressure: s(3.5 + (rpm / RPM_MAX) * 2),
        oilPressure: s(1.5 + (rpm / RPM_MAX) * 5.0),
        shortTermFuelTrim: s(2.0 + (Math.random() - 0.5) * 4),
        longTermFuelTrim: s(prev.longTermFuelTrim),
        o2SensorVoltage: s(0.1 + (0.5 + Math.sin(now / 500) * 0.4)),
        engineLoad: s(isObdFresh ? obdCache.load : simulatedLoad),
        distance: s(prev.distance + distanceThisFrame),
        gForceX: s(gx),
        gForceY: s(gy),
        latitude: s(currentLat),
        longitude: s(currentLon),
        source: newPointSource,
        
        maf: s(isObdFresh ? obdCache.maf : calcMaf),
        timingAdvance: s(isObdFresh ? obdCache.timing : calcTiming),
        throttlePos: s(isObdFresh ? obdCache.throttle : simulatedLoad),
        fuelLevel: s(isObdFresh && obdCache.fuelLevel > 0 ? obdCache.fuelLevel : Math.max(0, (prev.fuelLevel || 75) - 0.0005)),
        barometricPressure: s(isObdFresh && obdCache.baro > 0 ? obdCache.baro : 101.3),
        ambientTemp: s(isObdFresh && obdCache.ambient > 0 ? obdCache.ambient : 22),
        fuelRailPressure: s(isObdFresh && obdCache.fuelRail > 0 ? obdCache.fuelRail : calcFuelRail),
        lambda: s(isObdFresh && obdCache.lambda > 0 ? obdCache.lambda : calcLambda)
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
          ...state.ekfStats,
          gpsActive: gpsLatest !== null,
          fusionUncertainty: s(ekf.getUncertainty())
        },
        dyno: {
            ...state.dyno,
            currentRunData: state.dyno.isRunning ? [...state.dyno.currentRunData] : state.dyno.currentRunData
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
