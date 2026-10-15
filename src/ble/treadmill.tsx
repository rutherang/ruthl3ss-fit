import { Buffer } from 'buffer';
import { PermissionsAndroid, Platform } from 'react-native';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';

const uuid = (s: string) => `0000${s}-0000-1000-8000-00805f9b34fb`;
const FTMS = uuid('1826');
const TREADMILL_DATA = uuid('2acd');
const CONTROL_POINT = uuid('2ad9');

export const MIN_KMH = 1.0;
export const MAX_KMH = 11.0; // raise later once you trust it

export type TreadmillData = {
  speedKmh?: number;
  distanceM?: number;
  inclinePct?: number;
  kcal?: number;
  heartRate?: number;
  elapsedS?: number;
};

export function parseTreadmillData(b64: string): TreadmillData {
  const b = Buffer.from(b64, 'base64');
  const flags = b.readUInt16LE(0);
  let o = 2;
  const out: TreadmillData = {};
  if (!(flags & 0x0001)) {
    out.speedKmh = b.readUInt16LE(o) / 100;
    o += 2;
  }
  if (flags & 0x0002) o += 2; // avg speed
  if (flags & 0x0004) {
    out.distanceM = b.readUIntLE(o, 3);
    o += 3;
  }
  if (flags & 0x0008) {
    out.inclinePct = b.readInt16LE(o) / 10;
    o += 4;
  } // incline + ramp angle
  if (flags & 0x0010) o += 4; // elevation gain
  if (flags & 0x0020) o += 1; // pace
  if (flags & 0x0040) o += 1; // avg pace
  if (flags & 0x0080) {
    out.kcal = b.readUInt16LE(o);
    o += 5;
  } // energy
  if (flags & 0x0100) {
    out.heartRate = b.readUInt8(o);
    o += 1;
  }
  if (flags & 0x0200) o += 1; // MET
  if (flags & 0x0400) {
    out.elapsedS = b.readUInt16LE(o);
    o += 2;
  }
  return out;
}

export class Treadmill {
  private device?: Device;
  private subs: Subscription[] = [];
  constructor(private manager: BleManager) {}

  async scan(onFound: (d: Device) => void) {
    if (Platform.OS === 'android') {
      const res = await PermissionsAndroid.requestMultiple(['android.permission.BLUETOOTH_SCAN', 'android.permission.BLUETOOTH_CONNECT', 'android.permission.ACCESS_FINE_LOCATION']);
      if (!Object.values(res).every((r) => r === 'granted')) throw new Error('Bluetooth permissions denied');
    }
    this.manager.startDeviceScan(null, null, (err, d) => {
      if (!err && d?.name?.startsWith('FS-')) onFound(d);
    });
    setTimeout(() => this.manager.stopDeviceScan(), 8000);
  }

  async connect(id: string, onData: (d: TreadmillData) => void, onLog: (m: string) => void, onDisconnect: () => void) {
    this.manager.stopDeviceScan();
    const d = await this.manager.connectToDevice(id);
    await d.discoverAllServicesAndCharacteristics();
    this.device = d;
    this.subs.push(d.onDisconnected(() => onDisconnect()));
    this.subs.push(
      d.monitorCharacteristicForService(FTMS, TREADMILL_DATA, (e, c) => {
        if (e || !c?.value) return;
        try {
          onData(parseTreadmillData(c.value));
        } catch {}
      }),
    );
    // control point indications = replies to our commands
    this.subs.push(
      d.monitorCharacteristicForService(FTMS, CONTROL_POINT, (e, c) => {
        if (e || !c?.value) return;
        const r = Buffer.from(c.value, 'base64');
        onLog(`reply: op 0x${r[1]?.toString(16)} result ${r[2]} (1 = ok)`);
      }),
    );
    await this.send([0x00]); // request control
  }

  private send(bytes: number[]) {
    if (!this.device) throw new Error('Not connected');
    return this.device.writeCharacteristicWithResponseForService(FTMS, CONTROL_POINT, Buffer.from(bytes).toString('base64'));
  }

  start() {
    return this.send([0x07]);
  }
  stop() {
    return this.send([0x08, 0x01]);
  }

  setSpeed(kmh: number) {
    const v = Math.round(Math.min(Math.max(kmh, MIN_KMH), MAX_KMH) * 100);
    return this.send([0x02, v & 0xff, (v >> 8) & 0xff]);
  }

  setIncline(pct: number) {
    const v = Math.round(pct * 10);
    return this.send([0x03, v & 0xff, (v >> 8) & 0xff]);
  }

  async disconnect(stopFirst = false) {
    if (stopFirst) {
      try {
        await this.stop();
      } catch {}
    }
    this.subs.forEach((s) => s.remove());
    this.subs = [];
    await this.device?.cancelConnection().catch(() => {});
  }
}
