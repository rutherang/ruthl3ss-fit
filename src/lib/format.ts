export const fmtTime = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(Math.round(seconds % 60)).padStart(2, '0')}`;

export const fmtPace = (minutesPerKm: number | null) => {
  if (minutesPerKm === null) return '--';
  const seconds = Math.round(minutesPerKm * 60);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}/km`;
};

export const fmtDateTime = (timestamp: number) => {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
};

export const round1 = (value: number) => Math.round(value * 10) / 10;
