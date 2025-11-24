
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
      gForceX: 0,
      gForceY: 0,
      latitude: DEFAULT_LAT,
      longitude: DEFAULT_LON,
      source: 'sim'
    });
  }
  return data;
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
    lastUpdate: 0
};

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

  startSimulation: () => void;
  stopSimulation: () => void;
  connectObd: () => Promise<void>;
  disconnectObd: () => void;
}

// Independent Polling Loop
const startObdPolling = async () => {
    isObdPolling = true;
    while (isObdPolling && obdService) {
        try {
            // Priority 1: High frequency
            const rpmRaw = await obdService.runCommand("010C");
            const speedRaw = await obdService.runCommand("010D");
            const mapRaw = await obdService.runCommand("010B"); // For boost

            if (rpmRaw) obdCache.rpm = obdService.parseRpm(rpmRaw);
            if (speedRaw) obdCache.speed = obdService.parseSpeed(speedRaw);
            if (mapRaw) obdCache.map = obdService.parseMap(mapRaw);

            // Priority 2: Medium frequency (every other loop logic could go here, but sequential is fine for now)
            const tempRaw = await obdService.runCommand("0105");
            if (tempRaw) obdCache.coolant = obdService.parseCoolant(tempRaw);
            
            const intakeRaw = await obdService.runCommand("010F");
            if (intakeRaw) obdCache.intake = obdService.parseIntakeTemp(intakeRaw);

            const loadRaw = await obdService.runCommand("0104");
            if (loadRaw) obdCache.load = obdService.parseLoad(loadRaw);

            // Priority 3: Low frequency
            if (Math.random() > 0.8) {
                const voltRaw = await obdService.runCommand("AT RV");
                if (voltRaw) obdCache.voltage = obdService.parseVoltage(voltRaw);
            }

            obdCache.lastUpdate = Date.now();
            
            // Small throttle to prevent flooding if the adapter is super fast, 
            // though usually runCommand await is the bottleneck.
            await new Promise(r => setTimeout(r, 10));

        } catch (e) {
            console.warn("OBD Poll Error", e);
            await new Promise(r => setTimeout(r, 500)); // Backoff on error
        }
    }
};

export const useVehicleStore = create<VehicleStoreState>((set, get) => ({
  data: generateInitialData(),
  latestData: generateInitialData()[generateInitialData().length - 1],
  hasActiveFault: false,
  obdState: ObdConnectionState.Disconnected,
  ekfStats: { visionConfidence: 0, gpsActive: false, fusionUncertainty: 0 },

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
    // Start polling once connected
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
          (err) => {
             // Log once but don't spam; GPS just won't update
             if (err.code === 1) console.warn("GPS Permission Denied: Using dead-reckoning fallback.");
             else console.warn("GPS Error:", err.message);
          },
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
        );
      } catch (e) {
        console.warn("Geolocation API access failed:", e);
      }
    }

    simulationInterval = setInterval(() => {
      const state = get();
      const now = Date.now();
      const deltaTimeSeconds = (now - lastUpdateTime) / 1000.0;
      lastUpdateTime = now;

      const prev = state.latestData;
      
      // Determine if we have fresh real data
      const isObdFresh = state.obdState === ObdConnectionState.Connected && (now - obdCache.lastUpdate < 2000);
      let newPointSource: 'sim' | 'live_obd' = isObdFresh ? 'live_obd' : 'sim';

      // --- Physics / Sim Fallback ---
      // We still run the sim logic to provide smooth fallbacks or fill missing data (like G-force)
      let { rpm, gear } = prev;
      
      if (!isObdFresh) {
          // ... (Sim Logic) ...
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
          // Use Real OBD RPM
          rpm = obdCache.rpm;
          // Simple Gear Estimation based on Speed/RPM ratio could be added here
      }

      // --- 6-DOF EKF Update ---
      
      // 1. Prepare Inputs
      let inputSpeed = 0;
      let accelEst = 0; 

      if (isObdFresh) {
          inputSpeed = obdCache.speed;
          accelEst = (obdCache.speed - prev.speed) / deltaTimeSeconds / 3.6; // m/s^2 approx
          ekf.fuseObdSpeed(inputSpeed * 1000 / 3600); // convert km/h to m/s
      } else {
          const simSpeed = (rpm / (GEAR_RATIOS[gear] * 300)) * (1 - (1 / gear)) * 10;
          inputSpeed = Math.max(0, Math.min(simSpeed, SPEED_MAX));
          ekf.fuseObdSpeed(inputSpeed * 1000 / 3600);
      }

      // 2. Synthesize IMU Data for Prediction Step
      // Body Frame Accelerations (approximate from G-forces)
      // gForceY is longitudinal (accel/brake), gForceX is lateral (cornering)
      let gx = (Math.random() - 0.5) * 0.1; // Lateral G
      let gy = accelEst / 9.81; // Longitudinal G
      if (currentSimState === SimState.CORNERING) {
          gx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);
      }
      
      const ax = gy * 9.81; // m/s^2 Forward
      const ay = gx * 9.81; // m/s^2 Right
      const az = 0 + (Math.random() - 0.5) * 0.2; // Vertical (road noise)

      // Angular Rates (rad/s)
      // Yaw rate ~ Lateral Accel / Velocity
      const velocityMs = Math.max(1, prev.speed / 3.6);
      const r = ay / velocityMs; // Yaw rate
      
      // Pitch rate ~ change in Longitudinal Accel (Dive/Squat)
      // Simple damped spring model for pitch
      const q = (gy - prev.gForceY) * 2.0; 
      
      // Roll rate ~ change in Lateral Accel
      const p = (gx - prev.gForceX) * 1.5;

      // 3. EKF Predict Step
      ekf.predict([ax, ay, az], [p, q, r], deltaTimeSeconds);

      // 4. GPS Fusion
      if (gpsLatest?.speed !== null && gpsLatest?.speed !== undefined) {
        ekf.fuseGps(gpsLatest.speed, gpsLatest.accuracy);
      }

      // 5. Get Fused Output
      const fusedSpeedMs = ekf.getEstimatedSpeed();
      const fusedSpeedKph = fusedSpeedMs * 3.6;
      
      const distanceThisFrame = fusedSpeedMs * deltaTimeSeconds;

      // --- Coordinate Simulation (Fix for Static GPS) ---
      let currentLat = prev.latitude;
      let currentLon = prev.longitude;

      if (gpsLatest) {
          currentLat = gpsLatest.latitude;
          currentLon = gpsLatest.longitude;
      } else if (fusedSpeedKph > 0) {
          // Simulate movement if we have speed but no GPS signal
          // Moving roughly North East for demonstration
          // 1 degree latitude is approx 111km
          const distKm = (fusedSpeedKph * (deltaTimeSeconds / 3600)); 
          const dLat = distKm / 111;
          const dLon = distKm / (111 * Math.cos(currentLat * (Math.PI / 180)));
          
          currentLat += dLat * 0.707;
          currentLon += dLon * 0.707;
      }
      
      // --- Construct Data Point ---
      const newPoint: SensorDataPoint = {
        time: now,
        rpm: rpm,
        speed: fusedSpeedKph,
        gear: gear,
        fuelUsed: prev.fuelUsed + (rpm / RPM_MAX) * 0.005,
        inletAirTemp: isObdFresh ? obdCache.intake : (25 + (fusedSpeedKph / SPEED_MAX) * 20),
        batteryVoltage: isObdFresh && obdCache.voltage > 5 ? obdCache.voltage : 13.8,
        engineTemp: isObdFresh ? obdCache.coolant : (90 + (rpm / RPM_MAX) * 15),
        fuelTemp: 20 + (fusedSpeedKph / SPEED_MAX) * 10,
        // Calculate boost from MAP if available (MAP - 100kPa approx for sea level) -> Bar
        turboBoost: isObdFresh ? (obdCache.map - 100) / 100 : (-0.8 + (rpm / RPM_MAX) * 2.8 * (gear / 6)),
        fuelPressure: 3.5 + (rpm / RPM_MAX) * 2,
        oilPressure: 1.5 + (rpm / RPM_MAX) * 5.0,
        shortTermFuelTrim: 2.0 + (Math.random() - 0.5) * 4,
        longTermFuelTrim: prev.longTermFuelTrim,
        o2SensorVoltage: 0.1 + (0.5 + Math.sin(now / 500) * 0.4),
        engineLoad: isObdFresh ? obdCache.load : (15 + (rpm - RPM_IDLE) / (RPM_MAX - RPM_IDLE) * 85),
        distance: prev.distance + distanceThisFrame,
        gForceX: gx,
        gForceY: gy,
        latitude: currentLat,
        longitude: currentLon,
        source: newPointSource
      };

      const newData = [...state.data, newPoint];
      if (newData.length > MAX_DATA_POINTS) {
        newData.shift();
      }

      set({
        data: newData,
        latestData: newPoint,
        hasActiveFault: false,
        ekfStats: {
          visionConfidence: 0, 
          gpsActive: gpsLatest !== null,
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
