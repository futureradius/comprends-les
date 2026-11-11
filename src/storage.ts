import type { Variant } from "./french";

export interface Settings {
  variant: Variant;
  rate: number;
  hardBias: number;
  voiceName?: string;
  /** Phone mode: one pair at a time, or the whole number at once. */
  phoneStyle: "step" | "whole";
}

export interface Stats {
  /** Times each pair was misheard; used to bring weak pairs back more often. */
  misses: Record<string, number>;
  attempts: number;
  perfect: number;
}

const DEFAULT_SETTINGS: Settings = { variant: "fr", rate: 0.9, hardBias: 0.4, phoneStyle: "step" };
const DEFAULT_STATS: Stats = { misses: {}, attempts: 0, perfect: 0 };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : structuredClone(fallback);
  } catch {
    return structuredClone(fallback);
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable (private mode etc.): keep going without it */
  }
}

export const loadSettings = () => load("elc.settings", DEFAULT_SETTINGS);
export const saveSettings = (s: Settings) => save("elc.settings", s);
export const loadStats = () => load("elc.stats.phone", DEFAULT_STATS);
export const saveStats = (s: Stats) => save("elc.stats.phone", s);

/** Record one attempt. Misses add weight; getting a pair right slowly removes it. */
export function recordAttempt(stats: Stats, results: { expected: string; correct: boolean }[]): Stats {
  const misses = { ...stats.misses };
  for (const r of results) {
    if (!r.correct) misses[r.expected] = (misses[r.expected] ?? 0) + 2;
    else if (misses[r.expected]) {
      misses[r.expected] -= 1;
      if (misses[r.expected] <= 0) delete misses[r.expected];
    }
  }
  return {
    misses,
    attempts: stats.attempts + 1,
    perfect: stats.perfect + (results.every((r) => r.correct) ? 1 : 0),
  };
}
