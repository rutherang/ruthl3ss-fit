export const fmtTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

export const fmtPace = (minutesPerKm: number | null) => {
  if (minutesPerKm === null) return '--';
  const seconds = Math.round(minutesPerKm * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}/km`;
};
