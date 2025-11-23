
import { ObdConnectionState } from "../types";

// Standard BLE Service UUIDs for OBDII Adapters (Veepeak, etc.)
// Many BLE OBD dongles use a custom service UUID.
const OBD_SERVICE_UUID = "0000fff0-0000-1000-8000-00805f9b34fb";
const OBD_CHAR_WRITE_UUID = "0000fff2-0000-1000-8000-00805f9b34fb";
const OBD_CHAR_NOTIFY_UUID = "0000fff1-0000-1000-8000-00805f9b34fb";

// Define Web Bluetooth types locally since they might be missing in the environment
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
    // @ts-ignore - Navigator.bluetooth is experimental
    if (!navigator.bluetooth) {
      console.error("Web Bluetooth API not supported.");
      this.onStatusChange(ObdConnectionState.Error);
      return;
    }

    try {
      this.onStatusChange(ObdConnectionState.Connecting);

      // 1. Request Device
      // @ts-ignore
      this.device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [OBD_SERVICE_UUID] }],
        // Note: Some devices might not advertise the service UUID directly.
        // If filtering fails, you might need acceptAllDevices: true and optionalServices.
        optionalServices: [OBD_SERVICE_UUID] 
      });

      this.device!.addEventListener('gattserverdisconnected', this.handleDisconnect);

      // 2. Connect GATT
      this.server = await this.device!.gatt!.connect();

      // 3. Get Service & Characteristics
      const service = await this.server!.getPrimaryService(OBD_SERVICE_UUID);
      this.writeChar = await service.getCharacteristic(OBD_CHAR_WRITE_UUID);
      this.notifyChar = await service.getCharacteristic(OBD_CHAR_NOTIFY_UUID);

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

  /**
   * Handles incoming data chunks from BLE notification.
   * ELM327 might split responses across multiple packets.
   * We buffer until we see the prompt character '>'.
   */
  private handleNotification = (event: Event) => {
    // @ts-ignore
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    if (!target.value) return;

    const decoder = new TextDecoder('utf-8');
    const chunk = decoder.decode(target.value);
    
    this.currentResponse += chunk;

    if (this.currentResponse.includes('>')) {
      // Response complete
      const fullResponse = this.currentResponse.replace('>', '').trim();
      this.currentResponse = "";
      
      if (this.responseResolver) {
        this.responseResolver(fullResponse);
        this.responseResolver = null;
      }
    }
  };

  /**
   * "Handshake" with the ELM327 chip.
   * Mirrors the Kotlin ObdManager.initializeElm327 logic.
   */
  private async initializeElm327() {
    this.onStatusChange(ObdConnectionState.Initializing);
    await this.runCommand("AT Z");   // Reset
    await this.runCommand("AT E0");  // Echo Off
    await this.runCommand("AT L0");  // Linefeeds Off
    await this.runCommand("AT S0");  // Spaces Off (Optimization for parsing speed)
    await this.runCommand("AT H0");  // Headers Off
    await this.runCommand("AT SP 0"); // Auto-detect Protocol
  }

  /**
   * Sends a command and awaits the response.
   * Uses a simple lock (isBusy) to prevent command overlapping.
   */
  public async runCommand(cmd: string): Promise<string> {
    if (!this.writeChar || !this.device?.gatt?.connected) {
      throw new Error("OBD Disconnected");
    }

    // Simple mutex to prevent overlapping commands
    while (this.isBusy) {
      await new Promise(r => setTimeout(r, 10));
    }
    this.isBusy = true;

    return new Promise<string>(async (resolve, reject) => {
      this.responseResolver = resolve;
      
      // Timeout safety
      const timeout = setTimeout(() => {
        this.isBusy = false;
        this.responseResolver = null;
        reject(new Error(`Command ${cmd} timed out`));
      }, 2000); // 2s timeout

      try {
        const encoder = new TextEncoder();
        // Append carriage return
        await this.writeChar!.writeValue(encoder.encode(cmd + "\r"));
      } catch (e) {
        clearTimeout(timeout);
        this.isBusy = false;
        reject(e);
      }

      // The promise resolves in handleNotification when '>' is received
      const originalResolve = this.responseResolver;
      this.responseResolver = (val: string) => {
        clearTimeout(timeout);
        this.isBusy = false;
        originalResolve!(val);
      }
    });
  }

  // --- Parsers (Mirrored from Kotlin implementation) ---

  public parseRpm(response: string): number {
    // Response ex: "410C1AF2" -> 0x1AF2 / 4
    try {
        const clean = response.replace(/\s/g, '');
        if (!clean.includes("410C")) return 0;
        const data = clean.split("410C")[1]; // Get everything after the mode/pid
        if (!data || data.length < 4) return 0;
        
        const a = parseInt(data.substring(0, 2), 16);
        const b = parseInt(data.substring(2, 4), 16);
        return ((a * 256) + b) / 4;
    } catch (e) { return 0; }
  }

  public parseSpeed(response: string): number {
    // Response ex: "410D32" -> 0x32 km/h
    try {
        const clean = response.replace(/\s/g, '');
        if (!clean.includes("410D")) return 0;
        const data = clean.split("410D")[1];
        if (!data || data.length < 2) return 0;

        return parseInt(data.substring(0, 2), 16);
    } catch (e) { return 0; }
  }

  public parseThrottle(response: string): number {
    // Response ex: "41117F" -> 0x7F * 100 / 255
    try {
        const clean = response.replace(/\s/g, '');
        if (!clean.includes("4111")) return 0;
        const data = clean.split("4111")[1];
        if (!data || data.length < 2) return 0;

        const a = parseInt(data.substring(0, 2), 16);
        return (a * 100) / 255;
    } catch (e) { return 0; }
  }
  
  public parseCoolant(response: string): number {
      // 41 05 xx -> A - 40
      try {
        const clean = response.replace(/\s/g, '');
        if (!clean.includes("4105")) return 0;
        const data = clean.split("4105")[1];
        const a = parseInt(data.substring(0, 2), 16);
        return a - 40;
      } catch (e) { return 0; }
  }
}
