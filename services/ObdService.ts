
import { ObdConnectionState } from "../types";

// Service UUIDs
const OBD_SERVICE_UUID_CUSTOM = "0000fff0-0000-1000-8000-00805f9b34fb"; // Veepeak, etc.
const OBD_SERVICE_UUID_STANDARD = "000018f0-0000-1000-8000-00805f9b34fb"; // Standard

// Characteristic UUIDs (Custom)
const OBD_CHAR_WRITE_CUSTOM = "0000fff2-0000-1000-8000-00805f9b34fb";
const OBD_CHAR_NOTIFY_CUSTOM = "0000fff1-0000-1000-8000-00805f9b34fb";

// Characteristic UUIDs (Standard)
const OBD_CHAR_WRITE_STANDARD = "00002af1-0000-1000-8000-00805f9b34fb"; // or similar, vary by implementation
const OBD_CHAR_NOTIFY_STANDARD = "00002af0-0000-1000-8000-00805f9b34fb"; 

// Define Web Bluetooth types locally
type BluetoothDevice = any;
type BluetoothRemoteGATTServer = any;
type BluetoothRemoteGATTCharacteristic = any;

export class ObdService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeChar: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyChar: BluetoothRemoteGATTCharacteristic | null = null;
  
  private responseResolver: ((value: string) => void) | null = null;
  private currentResponse: string = "";
  private isBusy: boolean = false;

  constructor(private onStatusChange: (status: ObdConnectionState) => void) {}

  public async connect(): Promise<void> {
    // @ts-ignore
    if (!navigator.bluetooth) {
      console.error("Web Bluetooth API not supported.");
      this.onStatusChange(ObdConnectionState.Error);
      return;
    }

    try {
      this.onStatusChange(ObdConnectionState.Connecting);

      // 1. Request Device - Scan for both standard and custom UUIDs
      // @ts-ignore
      this.device = await navigator.bluetooth.requestDevice({
        filters: [
            { services: [OBD_SERVICE_UUID_CUSTOM] },
            { services: [OBD_SERVICE_UUID_STANDARD] }
        ],
        optionalServices: [OBD_SERVICE_UUID_CUSTOM, OBD_SERVICE_UUID_STANDARD]
      });

      this.device!.addEventListener('gattserverdisconnected', this.handleDisconnect);

      // 2. Connect GATT
      this.server = await this.device!.gatt!.connect();

      // 3. Get Service & Characteristics
      let service = null;
      try {
          service = await this.server!.getPrimaryService(OBD_SERVICE_UUID_CUSTOM);
          this.writeChar = await service.getCharacteristic(OBD_CHAR_WRITE_CUSTOM);
          this.notifyChar = await service.getCharacteristic(OBD_CHAR_NOTIFY_CUSTOM);
      } catch (e) {
          console.log("Custom service not found, trying standard...");
          try {
              service = await this.server!.getPrimaryService(OBD_SERVICE_UUID_STANDARD);
              const chars = await service.getCharacteristics();
              this.notifyChar = chars.find((c: any) => c.properties.notify);
              this.writeChar = chars.find((c: any) => c.properties.write || c.properties.writeWithoutResponse);
          } catch (standardErr) {
              throw new Error("Could not find a supported OBDII service.");
          }
      }

      if (!this.writeChar || !this.notifyChar) {
          throw new Error("Characteristics missing.");
      }

      // 4. Start Notifications
      await this.notifyChar.startNotifications();
      this.notifyChar.addEventListener('characteristicvaluechanged', this.handleNotification);

      // 5. Initialize ELM327
      await this.initializeElm327();

      this.onStatusChange(ObdConnectionState.Connected);
    } catch (error) {
      console.error("OBD Connection failed", error);
      this.onStatusChange(ObdConnectionState.Error);
      this.disconnect();
    }
  }

  public disconnect = () => {
    if (this.device) {
      if (this.device.gatt?.connected) {
        this.device.gatt.disconnect();
      }
      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnect);
    }
    this.device = null;
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.onStatusChange(ObdConnectionState.Disconnected);
  };

  private handleDisconnect = () => {
    console.log("OBD Device disconnected unexpectedly.");
    this.onStatusChange(ObdConnectionState.Disconnected);
  };

  private handleNotification = (event: Event) => {
    // @ts-ignore
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;

    const decoder = new TextDecoder('utf-8');
    const chunk = decoder.decode(target.value);
    
    this.currentResponse += chunk;

    if (this.currentResponse.includes('>')) {
      const fullResponse = this.currentResponse.replace('>', '').trim();
      this.currentResponse = "";
      
      if (this.responseResolver) {
        this.responseResolver(fullResponse);
        this.responseResolver = null;
      }
    }
  };

  private async initializeElm327() {
    this.onStatusChange(ObdConnectionState.Initializing);
    
    // Robust Initialization Sequence
    // 1. Reset
    await this.runCommand("AT Z"); 
    await new Promise(r => setTimeout(r, 800)); // Longer wait for reset

    // 2. Configuration
    const initCommands = [
        "AT E0",   // Echo Off
        "AT L0",   // Linefeeds Off
        "AT S0",   // Spaces Off
        "AT H0",   // Headers Off (Simplifies parsing)
        "AT AT 1", // Adaptive Timing Auto
    ];

    for (const cmd of initCommands) {
        await this.runCommand(cmd);
        await new Promise(r => setTimeout(r, 50));
    }
    
    // 3. Protocol Setup
    // Try to set protocol to Auto
    await this.runCommand("AT SP 0"); 
    
    // Attempt to set preferred protocol if requested (AT FR is often non-standard, but added as requested)
    // Some firmwares use AT TP or just rely on SP. We send it, if it fails (returns ?) it's fine.
    await this.runCommand("AT FR"); 

    // 4. Connection Verification
    // Send a dummy PID request to force protocol search/negotiation
    const testResponse = await this.runCommand("0100");
    
    // 5. Diagnostic Logging
    const protocol = await this.runCommand("AT DP"); // Display Protocol
    console.log(`OBD Init Complete. Protocol: ${protocol}. Test Resp: ${testResponse}`);
  }

  public async runCommand(cmd: string): Promise<string> {
    if (!this.writeChar || !this.device?.gatt?.connected) {
      return "";
    }

    while (this.isBusy) {
      await new Promise(r => setTimeout(r, 10));
    }
    this.isBusy = true;

    return new Promise<string>(async (resolve, reject) => {
      this.responseResolver = resolve;
      
      // Timeout to prevent hanging on lost packets
      const timeout = setTimeout(() => {
        this.isBusy = false;
        this.responseResolver = null;
        // Resolve empty to keep the app alive, rather than crashing the loop
        resolve(""); 
      }, 1500); 

      try {
        const encoder = new TextEncoder();
        await this.writeChar!.writeValue(encoder.encode(cmd + "\r"));
      } catch (e) {
        clearTimeout(timeout);
        this.isBusy = false;
        reject(e);
      }

      const originalResolve = this.responseResolver;
      this.responseResolver = (val: string) => {
        clearTimeout(timeout);
        this.isBusy = false;
        originalResolve!(val);
      }
    });
  }

  // --- Data Parsers ---

  private extractData(response: string, servicePrefix: string): string | null {
      // Remove spaces, nulls, and carets
      const clean = response.replace(/[\s\0>]/g, '');
      
      // If NO DATA, SEARCHING, or ERROR, return null immediately
      if (clean.includes("NODATA") || clean.includes("SEARCH") || clean.includes("ERROR") || clean.includes("STOPPED")) {
          return null;
      }

      // Check for Service Prefix (e.g. "410C")
      const idx = clean.indexOf(servicePrefix);
      if (idx !== -1) {
          return clean.substring(idx + servicePrefix.length);
      }
      
      // Heuristic for raw data without headers (AT H0)
      // If the response is hex and looks like valid data
      if (/^[0-9A-Fa-f]+$/.test(clean)) {
           return clean; 
      }
      
      return null;
  }

  public parseRpm(response: string): number {
    try {
        const data = this.extractData(response, "410C");
        if (!data || data.length < 4) return 0;
        const a = parseInt(data.substring(0, 2), 16);
        const b = parseInt(data.substring(2, 4), 16);
        const val = ((a * 256) + b) / 4;
        return isNaN(val) ? 0 : val;
    } catch { return 0; }
  }

  public parseSpeed(response: string): number {
    try {
        const data = this.extractData(response, "410D");
        if (!data || data.length < 2) return 0;
        const val = parseInt(data.substring(0, 2), 16);
        return isNaN(val) ? 0 : val;
    } catch { return 0; }
  }

  public parseCoolant(response: string): number {
      try {
        const data = this.extractData(response, "4105");
        if (!data || data.length < 2) return 0;
        const val = parseInt(data.substring(0, 2), 16) - 40;
        return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }

  public parseIntakeTemp(response: string): number {
      try {
        const data = this.extractData(response, "410F");
        if (!data || data.length < 2) return 0;
        const val = parseInt(data.substring(0, 2), 16) - 40;
        return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }

  public parseMap(response: string): number {
      try {
          const data = this.extractData(response, "410B");
          if (!data || data.length < 2) return 0;
          const val = parseInt(data.substring(0, 2), 16);
          return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }

  public parseLoad(response: string): number {
      try {
          const data = this.extractData(response, "4104");
          if (!data || data.length < 2) return 0;
          const val = (parseInt(data.substring(0, 2), 16) * 100) / 255;
          return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }

  public parseVoltage(response: string): number {
      if (response.includes("V")) {
          const val = parseFloat(response.replace("V", ""));
          return isNaN(val) ? 0 : val;
      }
      try {
          const data = this.extractData(response, "4142");
          if (data && data.length >= 4) {
               const a = parseInt(data.substring(0, 2), 16);
               const b = parseInt(data.substring(2, 4), 16);
               const val = ((a * 256) + b) / 1000;
               return isNaN(val) ? 0 : val;
          }
      } catch { return 0; }
      return 0;
  }

  public parseTimingAdvance(response: string): number {
      try {
          const data = this.extractData(response, "410E");
          if (!data || data.length < 2) return 0;
          const val = (parseInt(data.substring(0, 2), 16) - 128) / 2;
          return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }

  public parseMaf(response: string): number {
      try {
          const data = this.extractData(response, "4110");
          if (!data || data.length < 4) return 0;
          const a = parseInt(data.substring(0, 2), 16);
          const b = parseInt(data.substring(2, 4), 16);
          const val = ((256 * a) + b) / 100;
          return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }

  public parseThrottlePos(response: string): number {
      try {
          const data = this.extractData(response, "4111");
          if (!data || data.length < 2) return 0;
          const val = (parseInt(data.substring(0, 2), 16) * 100) / 255;
          return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }

  public parseFuelRailPressure(response: string): number {
      try {
          const data = this.extractData(response, "4123");
          if (!data || data.length < 4) return 0;
          const a = parseInt(data.substring(0, 2), 16);
          const b = parseInt(data.substring(2, 4), 16);
          const val = ((256 * a) + b) * 10;
          return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }

  public parseFuelLevel(response: string): number {
      try {
          const data = this.extractData(response, "412F");
          if (!data || data.length < 2) return 0;
          const val = (parseInt(data.substring(0, 2), 16) * 100) / 255;
          return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }

  public parseBarometricPressure(response: string): number {
      try {
          const data = this.extractData(response, "4133");
          if (!data || data.length < 2) return 0;
          const val = parseInt(data.substring(0, 2), 16);
          return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }

  public parseLambda(response: string): number {
      try {
          const data = this.extractData(response, "4144");
          if (!data || data.length < 4) return 0;
          const a = parseInt(data.substring(0, 2), 16);
          const b = parseInt(data.substring(2, 4), 16);
          const val = ((256 * a) + b) / 32768;
          return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }

  public parseAmbientTemp(response: string): number {
      try {
          const data = this.extractData(response, "4146");
          if (!data || data.length < 2) return 0;
          const val = parseInt(data.substring(0, 2), 16) - 40;
          return isNaN(val) ? 0 : val;
      } catch { return 0; }
  }
}
