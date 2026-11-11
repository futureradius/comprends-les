import { pairToFrench, type Variant } from "../french";

export interface PhoneExercise {
  /** Five two-digit pairs, e.g. ["06", "77", "91", "12", "34"] */
  pairs: string[];
}

export interface PhoneOptions {
  /** 0–1: how often non-leading pairs are drawn from the tricky 70–99 range. */
  hardBias: number;
  /** Extra weight per pair, e.g. from past mistakes. */
  weights?: Record<string, number>;
  random?: () => number;
}

// 01–05 landlines, 06/07 mobiles, 09 VoIP boxes.
const PREFIXES = ["01", "02", "03", "04", "05", "06", "06", "06", "07", "07", "09"];

const ALL_PAIRS = Array.from({ length: 100 }, (_, i) => String(i).padStart(2, "0"));
const HARD_PAIRS = ALL_PAIRS.filter((p) => Number(p) >= 70);

function pickWeighted(pool: string[], weights: Record<string, number>, rnd: () => number): string {
  const w = pool.map((p) => 1 + (weights[p] ?? 0));
  let r = rnd() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    r -= w[i];
    if (r < 0) return pool[i];
  }
  return pool[pool.length - 1];
}

export function generatePhone({ hardBias, weights = {}, random = Math.random }: PhoneOptions): PhoneExercise {
  const pairs = [PREFIXES[Math.floor(random() * PREFIXES.length)]];
  while (pairs.length < 5) {
    const pool = random() < hardBias ? HARD_PAIRS : ALL_PAIRS;
    pairs.push(pickWeighted(pool, weights, random));
  }
  return { pairs };
}

/** Text for the speech engine; commas give natural pauses between pairs. */
export function phoneSpeech(ex: PhoneExercise, variant: Variant): string {
  return ex.pairs.map((p) => pairToFrench(p, variant)).join(", ");
}

export function displayPhone(ex: PhoneExercise): string {
  return ex.pairs.join(" ");
}

export interface PairResult {
  expected: string;
  given: string;
  correct: boolean;
}

/** Compare the learner's answer pair by pair, ignoring spaces, dots and dashes. */
export function checkPhone(ex: PhoneExercise, answer: string): PairResult[] {
  const digits = answer.replace(/\D/g, "");
  return ex.pairs.map((expected, i) => {
    const given = digits.slice(i * 2, i * 2 + 2);
    return { expected, given, correct: given === expected };
  });
}
