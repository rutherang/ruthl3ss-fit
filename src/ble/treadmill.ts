import { Buffer } from 'buffer';
import { BleManager, Device, Subscription } from 'react-native-ble-plx';
import type { TreadmillData } from '@/types/treadmill';
import { ensureBlePermissions } from './permissions';

const uuid = (s: string) => `0000${s}-0000-1000-8000-00805f9b34fb`;
const FTMS = uuid('1826');
const TREADMILL_DATA = uuid('2acd');
const CONTROL_POINT = uuid('2ad9');

export const MIN_KMH = 1.0;
export const MAX_KMH = 11.0; // raise later once you trust it

export function parseTreadmillData(b64: string): TreadmillData {
  const b = Buffer.from(b64, 'base64');

  // The first 2 bytes are a "flags" bitmask. Each bit says whether an
  // optional field follows. Fields always appear in the same order, so
  // we walk through the packet with `o` (offset) and skip absent fields.
  const flags = b.readUInt16LE(0);
  let o = 2;
  const out: TreadmillData = { flags, hex: b.toString('hex') };

  // Bit 0 is inverted: speed is present when the bit is 0.
  // 2 bytes, in units of 0.01 km/h.
  if (!(flags & 0x0001)) {
    out.speedKmh = b.readUInt16LE(o) / 100;
    o += 2;
  }

  // Bit 1: average speed (2 bytes). Skipped; we can calculate it ourselves.
  if (flags & 0x0002) o += 2;

  // Bit 2: total distance, 3 bytes, in metres.
  if (flags & 0x0004) {
    out.distanceM = b.readUIntLE(o, 3);
    o += 3;
  }

  // Bit 3: incline (2 bytes, units of 0.1%) followed by the ramp angle
  // (2 bytes, which we skip).
  if (flags & 0x0008) {
    out.inclinePct = b.readInt16LE(o) / 10;
    o += 4;
  }

  // Bit 4: elevation gain, positive and negative (2 + 2 bytes). Skipped.
  if (flags & 0x0010) o += 4;

  // Bit 5: instantaneous pace (1 byte). Skipped.
  if (flags & 0x0020) o += 1;

  // Bit 6: average pace (1 byte). Skipped.
  if (flags & 0x0040) o += 1;

  // Bit 7: energy. 5 bytes: total kcal (2), kcal per hour (2),
  // kcal per minute (1). We keep only the total.
  // A value of 0xFFFF would mean "not available".
  if (flags & 0x0080) {
    out.kcal = b.readUInt16LE(o);
    o += 5;
  }

  // Bit 8: heart rate, 1 byte, in bpm.
  if (flags & 0x0100) {
    out.heartRate = b.readUInt8(o);
    o += 1;
  }

  // Bit 9: metabolic equivalent (MET), 1 byte. Skipped.
  if (flags & 0x0200) o += 1;

  // Bit 10: elapsed time, 2 bytes, in seconds.
  if (flags & 0x0400) {
    out.elapsedS = b.readUInt16LE(o);
    o += 2;
  }

  // Bit 11: remaining time, 2 bytes, in seconds (timed programs only).
  if (flags & 0x0800) {
    out.remainingS = b.readUInt16LE(o);
    o += 2;
  }

  // Bit 12: force on belt (2 bytes, newtons) followed by power output
  // (2 bytes, watts). We skip the force and keep the power.
  if (flags & 0x1000) {
    out.powerW = b.readInt16LE(o + 2);
    o += 4;
  }

  return out;
}

export type TreadmillEvent = 'started' | 'paused' | 'stopped' | 'safety-key' | 'other';

export function parseStatus(b: Buffer): TreadmillEvent {
  switch (b[0]) {
    case 0x04:
      return 'started';
    case 0x02:
      return b[1] === 0x02 ? 'paused' : 'stopped';
    case 0x03:
      return 'safety-key';
    default:
      return 'other';
  }
}

export class Treadmill {
  private device?: Device;
  private subs: Subscription[] = [];
  private onDisconnectCb?: () => void;
  constructor(private manager: BleManager) {}

  async scan(onFound: (d: Device) => void, onLog: (m: string) => void) {
    onLog('Preparing treadmill scan');
    await ensureBlePermissions(onLog);
    onLog(`Bluetooth adapter state: ${await this.manager.state()}`);

    const seen = new Set<string>();
    let foundCount = 0;
    let scanErrorLogged = false;
    onLog('BLE scan started; scanning for 8 seconds');
    this.manager.startDeviceScan(null, null, (err, d) => {
      if (err) {
        if (!scanErrorLogged) {
          scanErrorLogged = true;
          onLog(`BLE scan error (${err.errorCode}): ${err.message}`);
        }
        return;
      }
      if (!d || seen.has(d.id)) return;

      seen.add(d.id);
      const matches = d.name?.startsWith('FS-') ?? false;
      onLog(
        `BLE device: id=${d.id}, name="${d.name ?? '<unnamed>'}", RSSI=${d.rssi ?? 'unknown'}, services=${d.serviceUUIDs?.join(', ') ?? 'none'}, treadmill match=${matches}`,
      );
      if (matches) {
        foundCount++;
        onFound(d);
      }
    });
    setTimeout(() => {
      this.manager.stopDeviceScan();
      onLog(`BLE scan stopped; ${seen.size} unique device(s), ${foundCount} treadmill match(es)`);
    }, 8000);
  }

  async connect(
    id: string,
    onData: (d: TreadmillData) => void,
    onLog: (m: string) => void,
    onDisconnect: () => void,
    onStatus: (e: TreadmillEvent) => void = () => {},
  ) {
    let parseErrorShown = false;
    this.manager.stopDeviceScan();
    const d = await this.manager.connectToDevice(id);
    await d.discoverAllServicesAndCharacteristics();
    this.device = d;
    this.onDisconnectCb = onDisconnect;
    this.subs.push(d.onDisconnected(() => this.fireDisconnect()));
    this.subs.push(
      d.monitorCharacteristicForService(FTMS, TREADMILL_DATA, (e, c) => {
        if (e || !c?.value) return;
        try {
          onData(parseTreadmillData(c.value));
        } catch (err: any) {
          if (!parseErrorShown) {
            parseErrorShown = true;
            onLog(`parse error: ${err.message}`);
          }
        }
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

    try {
      for (const ch of ['2ada', '2ad3']) {
        this.subs.push(
          d.monitorCharacteristicForService(FTMS, uuid(ch), (e, c) => {
            if (e || !c?.value) return;
            const buf = Buffer.from(c.value, 'base64');
            onLog(`${ch}: ${buf.toString('hex')}`);
            if (ch === '2ada') onStatus(parseStatus(buf));
          }),
        );
      }
      this.readInfo(onLog).catch(() => {});
    } catch (err: any) {
      onLog(`extra info unavailable: ${err.message}`);
    }
  }

  private send(bytes: number[]) {
    if (!this.device) throw new Error('Not connected');
    return this.device.writeCharacteristicWithResponseForService(
      FTMS,
      CONTROL_POINT,
      Buffer.from(bytes).toString('base64'),
    );
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
    this.device = undefined;
    this.fireDisconnect();
  }

  async readInfo(onLog: (m: string) => void) {
    const read = async (service: string, ch: string) => {
      try {
        const c = await this.device!.readCharacteristicForService(uuid(service), uuid(ch));
        return c.value ? Buffer.from(c.value, 'base64') : null;
      } catch {
        return null;
      }
    };
    for (const [ch, label] of [
      ['2a29', 'manufacturer'],
      ['2a24', 'model'],
      ['2a26', 'firmware'],
    ]) {
      const b = await read('180a', ch);
      if (b) onLog(`${label}: ${b.toString('utf8')}`);
    }
    const f = await read('1826', '2acc');
    if (f) onLog(`feature: ${f.toString('hex')}`);
    const s = await read('1826', '2ad4');
    if (s)
      onLog(
        `speed range km/h: ${s.readUInt16LE(0) / 100} to ` +
          `${s.readUInt16LE(2) / 100}, step ${s.readUInt16LE(4) / 100}`,
      );
    const i = await read('1826', '2ad5');
    if (i)
      onLog(
        `incline range %: ${i.readInt16LE(0) / 10} to ` +
          `${i.readInt16LE(2) / 10}, step ${i.readUInt16LE(4) / 10}`,
      );
  }

  private fireDisconnect() {
    const cb = this.onDisconnectCb;
    this.onDisconnectCb = undefined; // make sure it only fires once
    cb?.();
  }
}
