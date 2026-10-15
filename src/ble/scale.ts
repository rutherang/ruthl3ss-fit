import { Buffer } from 'buffer';
import { BleManager } from 'react-native-ble-plx';
import { ensureBlePermissions } from './permissions';

export const SCALE_ID = 'D8:E7:2F:E1:0A:21';

export type ScaleReading = {
  weightKg: number;
  impedanceRaw: number;
  final: boolean;
  at: number;
};

export function parseScale(b64?: string | null): ScaleReading | null {
  if (!b64) return null;
  const b = Buffer.from(b64, 'base64');
  if (b.length !== 15 || b[0] !== 0xc0) return null;
  return {
    weightKg: b.readUInt16BE(2) / 100,
    impedanceRaw: b.readUInt16BE(4),
    final: (b[8] & 1) === 1,
    at: Date.now(),
  };
}

export async function startScaleListener(
  manager: BleManager,
  onReading: (r: ScaleReading) => void,
) {
  await ensureBlePermissions();
  manager.startDeviceScan(null, { allowDuplicates: true }, (err, d) => {
    if (err || !d || d.id !== SCALE_ID) return;
    const r = parseScale(d.manufacturerData);
    if (r) onReading(r);
  });
}
