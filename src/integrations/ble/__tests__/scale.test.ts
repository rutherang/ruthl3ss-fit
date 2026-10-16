import { Buffer } from 'buffer';
import { parseScale } from '../scale';

const b64 = (hex: string) => Buffer.from(hex, 'hex').toString('base64');

describe('parseScale', () => {
  it('reads a final reading', () => {
    expect(parseScale(b64('c014189217700a0125d8e72fe10a21'))).toMatchObject({
      weightKg: 62.9,
      impedanceRaw: 6000,
      final: true,
    });
  });

  it('reads a measuring packet', () => {
    expect(parseScale(b64('c014189200000a0124d8e72fe10a21'))).toMatchObject({
      weightKg: 62.9,
      impedanceRaw: 0,
      final: false,
    });
  });

  it('reads an early, still-climbing weight', () => {
    expect(parseScale(b64('c009188800000a0124d8e72fe10a21'))?.weightKg).toBe(62.8);
  });

  it('rejects bad data', () => {
    expect(parseScale(undefined)).toBeNull();
    expect(parseScale(b64('c0'))).toBeNull();
    expect(parseScale(b64('0600' + '00'.repeat(13)))).toBeNull();
  });
});
