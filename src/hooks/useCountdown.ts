import { useState, useEffect } from 'react';

// targetMs: epoch ms of when the next action becomes available.
// If omitted, counts down to next midnight.
export const useCountdown = (targetMs?: number) => {
  const getSeconds = (ms?: number) => {
    const target = ms ?? (() => { const m = new Date(); m.setHours(24, 0, 0, 0); return m.getTime(); })();
    return Math.max(0, Math.floor((target - Date.now()) / 1000));
  };

  const [seconds, setSeconds] = useState(() => getSeconds(targetMs));

  useEffect(() => {
    setSeconds(getSeconds(targetMs));
    const interval = setInterval(() => setSeconds(getSeconds(targetMs)), 1000);
    return () => clearInterval(interval);
  }, [targetMs]);

  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
