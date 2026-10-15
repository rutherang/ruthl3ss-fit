import { Buffer } from 'buffer';
import { parseStatus, parseTreadmillData } from '../treadmill';

// Same layout your treadmill sends: flags 0x058c =
// speed, distance, incline, energy, heart rate, elapsed time.
function packet(o: {
  kmh: number;
  m: number;
  incline: number;
  kcal: number;
  hr: number;
  s: number;
}) {
  const b = Buffer.alloc(19);
  b.writeUInt16LE(0x058c, 0);
  b.writeUInt16LE(Math.round(o.kmh * 100), 2);
  b.writeUIntLE(o.m, 4, 3);
  b.writeInt16LE(Math.round(o.incline * 10), 7);
  b.writeInt16LE(0, 9); // ramp angle
  b.writeUInt16LE(o.kcal, 11);
  b.writeUInt16LE(0xffff, 13); // kcal per hour: not available
  b.writeUInt8(0xff, 15); // kcal per minute: not available
  b.writeUInt8(o.hr, 16);
  b.writeUInt16LE(o.s, 17);
  return b.toString('base64');
}

describe('parseTreadmillData', () => {
  it('reads every field at the right offset', () => {
    const d = parseTreadmillData(
      packet({ kmh: 5.5, m: 1234, incline: 1.5, kcal: 42, hr: 120, s: 300 }),
    );
    expect(d).toMatchObject({
      speedKmh: 5.5,
      distanceM: 1234,
      inclinePct: 1.5,
      kcal: 42,
      heartRate: 120,
      elapsedS: 300,
    });
  });

  it('reads an idle treadmill', () => {
    const d = parseTreadmillData(
      packet({ kmh: 0, m: 0, incline: 0, kcal: 0, hr: 0, s: 0 }),
    );
    expect(d.speedKmh).toBe(0);
    expect(d.elapsedS).toBe(0);
  });
});

describe('parseStatus', () => {
  it.each([
    [[0x04], 'started'],
    [[0x02, 0x01], 'stopped'],
    [[0x02, 0x02], 'paused'],
    [[0x03], 'safety-key'],
    [[0x05, 0x00, 0x01], 'other'],
  ])('%j -> %s', (bytes, expected) => {
    expect(parseStatus(Buffer.from(bytes))).toBe(expected);
  });
});
