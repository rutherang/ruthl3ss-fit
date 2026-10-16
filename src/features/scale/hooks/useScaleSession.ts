import { useEffect, useRef, useState } from 'react';
import type { ScaleReading } from '@/types/scale';

// Starts listening and resolves with a function that stops it.
export type ScaleListen = (
  onReading: (r: ScaleReading) => void,
) => Promise<() => void>;

type Deps = { active: boolean; listen: ScaleListen; heightCm: number };

export function useScaleSession({ active, listen, heightCm }: Deps) {
  const [live, setLive] = useState<ScaleReading | null>(null);
  const [history, setHistory] = useState<ScaleReading[]>([]);
  const [error, setError] = useState('');
  const [sawMeasuring, setSawMeasuring] = useState(false);
  const measuring = useRef(false);
  const saved = useRef(false);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stop: (() => void) | undefined;

    const onReading = (r: ScaleReading) => {
      setLive(r);
      if (!r.final) {
        measuring.current = true;
        saved.current = false;
        setSawMeasuring(true);
      } else if (measuring.current && !saved.current) {
        saved.current = true; // only a reading we watched settle counts
        setHistory((h) => [r, ...h]);
      }
    };

    listen(onReading)
      .then((s) => {
        if (cancelled) s();
        else stop = s;
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
      stop?.();
    };
  }, [active, listen]);

  const bmi = live ? live.weightKg / (heightCm / 100) ** 2 : null;
  const status = !live
    ? 'Step on the scale'
    : !live.final
      ? 'Measuring...'
      : sawMeasuring
        ? 'Final reading'
        : 'Last reading (may be old)';

  return { live, history, error, status, bmi };
}