import type { PhoneExercise } from "./phone";

/**
 * Step-by-step phone dictation: one pair at a time, and you only move on
 * once you've typed the pair correctly. After `maxTries` misses the answer
 * is revealed, but you still have to type it to continue.
 */
export interface StepState {
  ex: PhoneExercise;
  index: number;
  /** Misses on the current pair. */
  misses: number;
  /** Per pair: did you get it on the first try? Filled as you go. */
  firstTry: boolean[];
  revealed: boolean;
  done: boolean;
}

export type StepOutcome = "correct" | "wrong" | "reveal" | "done";

export const MAX_TRIES = 2;

export function startStep(ex: PhoneExercise): StepState {
  return { ex, index: 0, misses: 0, firstTry: [], revealed: false, done: false };
}

export function currentPair(s: StepState): string {
  return s.ex.pairs[s.index];
}

/** Returns the new state and what happened, without mutating the input. */
export function submitStep(s: StepState, answer: string): [StepState, StepOutcome] {
  if (s.done) return [s, "done"];
  const expected = currentPair(s);

  if (answer.replace(/\D/g, "") === expected) {
    const firstTry = [...s.firstTry, s.misses === 0];
    const index = s.index + 1;
    const done = index >= s.ex.pairs.length;
    return [{ ...s, index, misses: 0, firstTry, revealed: false, done }, done ? "done" : "correct"];
  }

  const misses = s.misses + 1;
  const revealed = misses >= MAX_TRIES;
  return [{ ...s, misses, revealed }, revealed ? "reveal" : "wrong"];
}
