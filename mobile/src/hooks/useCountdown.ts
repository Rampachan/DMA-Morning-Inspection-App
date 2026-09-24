import { useState, useEffect } from 'react';
import { WINDOW_OPEN_HOUR, WINDOW_OPEN_MINUTE, WINDOW_CLOSE_HOUR, WINDOW_CLOSE_MINUTE } from '../config';

export type WindowPhase = 'before_open' | 'open' | 'closed';

export interface CountdownState {
  phase: WindowPhase;
  /** Remaining seconds until window closes (only meaningful when phase === 'open'). */
  secondsRemaining: number;
  /** Human-readable HH:MM:SS string. */
  formatted: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function computeState(now: Date): CountdownState {
  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();

  const totalSecondsNow = h * 3600 + m * 60 + s;
  const openSeconds = WINDOW_OPEN_HOUR * 3600 + WINDOW_OPEN_MINUTE * 60;
  const closeSeconds = WINDOW_CLOSE_HOUR * 3600 + WINDOW_CLOSE_MINUTE * 60;

  if (totalSecondsNow < openSeconds) {
    return { phase: 'before_open', secondsRemaining: 0, formatted: '00:00:00' };
  }

  if (totalSecondsNow >= closeSeconds) {
    return { phase: 'closed', secondsRemaining: 0, formatted: '00:00:00' };
  }

  const remaining = closeSeconds - totalSecondsNow;
  const rh = Math.floor(remaining / 3600);
  const rm = Math.floor((remaining % 3600) / 60);
  const rs = remaining % 60;

  return {
    phase: 'open',
    secondsRemaining: remaining,
    formatted: `${pad(rh)}:${pad(rm)}:${pad(rs)}`,
  };
}

/** Reactive countdown that updates every second. */
export function useCountdown(): CountdownState {
  const [state, setState] = useState<CountdownState>(() => computeState(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setState(computeState(new Date()));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return state;
}
