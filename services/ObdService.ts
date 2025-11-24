
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
              // Note: Standard characteristics might vary, simplified here for commonly available characteristics
              const chars = await service.getCharacteristics();
              // simplistic heuristic: find one with notify, one with write
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
    
    // Standard initialization sequence
    await this.runCommand("AT Z");   // Reset
    await this.runCommand("AT E0");  // Echo Off
    await this.runCommand("AT L0");  // Linefeeds Off
    await this.runCommand("AT S0");  // Spaces Off
    await this.runCommand("AT H0");  // Headers Off
    await this.runCommand("AT ATS 1"); // Adaptive Timing Auto
    
    // Enhanced Protocol Selection & Verification
    // 'AT SP 0' sets the protocol to Auto, allowing the ELM327 to search.
    await this.runCommand("AT SP 0"); 
    
    // 'AT DP' (Display Protocol) is useful to confirm what the adapter detected.
    const protocol = await this.runCommand("AT DP");
    console.debug("OBD Detected Protocol:", protocol);

    // We trigger a simple PID request (0100 - Supported PIDs) to force the protocol negotiation immediately.
    // This ensures the connection is stable before the main polling loop starts.
    await this.runCommand("0100"); 
  }

  public async runCommand(cmd: string): Promise<string> {
    if (!this.writeChar || !this.device?.gatt?.connected) {
      // Don't throw if we are just disconnecting, just return empty
      return "";
    }

    while (this.isBusy) {
      await new Promise(r => setTimeout(r, 10));
    }
    this.isBusy = true;

    return new Promise<string>(async (resolve, reject) => {
      this.responseResolver = resolve;
      
      const timeout = setTimeout(() => {
        this.isBusy = false;
        this.responseResolver = null;
        resolve(""); // Resolve empty on timeout to keep loop alive
      }, 1000); 

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
      
      // ELM327 might return "41 0C 1A F2" or just "1A F2" depending on headers
      // We look for the service prefix (e.g. "410C" for RPM)
      const idx = clean.indexOf(servicePrefix);
      if (idx !== -1) {
          return clean.substring(idx + servicePrefix.length);
      }
      
      // If headers are off, we might just get the data bytes. 
      // Heuristic: Check length. RPM (010C) expects 2 bytes (4 hex chars).
      // This is risky without headers, but "AT H0" usually retains the "41 0C" part in modern adapters.
      // If we failed to find prefix, return valid data if it looks like a raw response (no "NO DATA" etc)
      if (!clean.includes("NODATA") && !clean.includes("ERROR") && !clean.includes("STOPPED")) {
           return clean; 
      }
      
      return null;
  }

  public parseRpm(response: string): number {
    // Mode 01, PID 0C. Returns 2 bytes: A, B. RPM = (256*A + B) / 4
    try {
        const data = this.extractData(response, "410C");
        if (!data || data.length < 4) return 0;
        const a = parseInt(data.substring(0, 2), 16);
        const b = parseInt(data.substring(2, 4), 16);
        return ((a * 256) + b) / 4;
    } catch { return 0; }
  }

  public parseSpeed(response: string): number {
    // Mode 01, PID 0D. Returns 1 byte: A. Speed = A km/h
    try {
        const data = this.extractData(response, "410D");
        if (!data || data.length < 2) return 0;
        return parseInt(data.substring(0, 2), 16);
    } catch { return 0; }
  }

  public parseCoolant(response: string): number {
      // Mode 01, PID 05. Returns 1 byte: A. Temp = A - 40
      try {
        const data = this.extractData(response, "4105");
        if (!data || data.length < 2) return 0;
        return parseInt(data.substring(0, 2), 16) - 40;
      } catch { return 0; }
  }

  public parseIntakeTemp(response: string): number {
      // Mode 01, PID 0F. Returns 1 byte: A. Temp = A - 40
      try {
        const data = this.extractData(response, "410F");
        if (!data || data.length < 2) return 0;
        return parseInt(data.substring(0, 2), 16) - 40;
      } catch { return 0; }
  }

  public parseMap(response: string): number {
      // Mode 01, PID 0B. Returns 1 byte: A. kPa
      try {
          const data = this.extractData(response, "410B");
          if (!data || data.length < 2) return 0;
          return parseInt(data.substring(0, 2), 16);
      } catch { return 0; }
  }

  public parseLoad(response: string): number {
      // Mode 01, PID 04. Returns 1 byte: A. Load = A * 100 / 255
      try {
          const data = this.extractData(response, "4104");
          if (!data || data.length < 2) return 0;
          return (parseInt(data.substring(0, 2), 16) * 100) / 255;
      } catch { return 0; }
  }

  public parseVoltage(response: string): number {
      // Handle AT RV (e.g., "13.4V") or PID 42 (Control module voltage)
      if (response.includes("V")) {
          return parseFloat(response.replace("V", ""));
      }
      // Mode 01, PID 42. Returns 2 bytes. (256A+B)/1000
      try {
          const data = this.extractData(response, "4142");
          if (data && data.length >= 4) {
               const a = parseInt(data.substring(0, 2), 16);
               const b = parseInt(data.substring(2, 4), 16);
               return ((a * 256) + b) / 1000;
          }
      } catch { return 0; }
      return 0;
  }
}
