import { Buffer } from 'buffer';
import type { ScaleReading } from '@/types/scale';
import { ensureBlePermissions } from './permissions';
import { getBleScanCoordinator } from './scanCoordinator';

export const SCALE_ID = 'D8:E7:2F:E1:0A:21';

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
  onReading: (r: ScaleReading) => void,
): Promise<() => Promise<void>> {
  await ensureBlePermissions();
  const { bleManager } = await import('./manager');
  return getBleScanCoordinator(bleManager).startScan({ allowDuplicates: true }, (err, d) => {
    if (err || !d || d.id !== SCALE_ID) return;
    const reading = parseScale(d.manufacturerData);
    if (reading) onReading(reading);
  });
}
