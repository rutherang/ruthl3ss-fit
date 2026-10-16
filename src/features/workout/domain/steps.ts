// Step length as a fraction of height, by speed (km/h).
// Rough walking-to-running averages; tune later per profile.
const TABLE: [number, number][] = [
  [2, 0.3],
  [3, 0.34],
  [4, 0.39],
  [5, 0.42],
  [6, 0.46],
  [7, 0.5],
  [8, 0.54],
  [10, 0.6],
  [12, 0.66],
  [15, 0.78],
  [18, 0.86],
];

export function stepLengthM(kmh: number, heightCm: number): number {
  const v = Math.min(Math.max(kmh, TABLE[0][0]), TABLE[TABLE.length - 1][0]);
  for (let i = 1; i < TABLE.length; i++) {
    if (v <= TABLE[i][0]) {
      const [v0, r0] = TABLE[i - 1];
      const [v1, r1] = TABLE[i];
      return (heightCm / 100) * (r0 + ((v - v0) / (v1 - v0)) * (r1 - r0));
    }
  }
  return (heightCm / 100) * TABLE[TABLE.length - 1][1];
}
