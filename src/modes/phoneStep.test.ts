import { describe, expect, it } from "vitest";
import { currentPair, startStep, submitStep } from "./phoneStep";

const ex = { pairs: ["06", "77", "91", "12", "34"] };

describe("step-by-step phone mode", () => {
  it("moves to the next pair only when the answer is right", () => {
    let s = startStep(ex);
    let out;
    [s, out] = submitStep(s, "06");
    expect(out).toBe("correct");
    expect(currentPair(s)).toBe("77");

    [s, out] = submitStep(s, "67");
    expect(out).toBe("wrong");
    expect(currentPair(s)).toBe("77");
  });

  it("reveals after two misses but still requires the right answer", () => {
    let s = startStep(ex);
    let out;
    [s, out] = submitStep(s, "16");
    [s, out] = submitStep(s, "60");
    expect(out).toBe("reveal");
    expect(s.revealed).toBe(true);
    [s, out] = submitStep(s, "99");
    expect(out).toBe("reveal");
    expect(currentPair(s)).toBe("06");
    [s, out] = submitStep(s, "06");
    expect(out).toBe("correct");
    expect(s.revealed).toBe(false);
  });

  it("tracks first-try success and finishes after five pairs", () => {
    let s = startStep(ex);
    let out;
    [s] = submitStep(s, "06");
    [s] = submitStep(s, "67");
    [s] = submitStep(s, "77");
    [s] = submitStep(s, "91");
    [s] = submitStep(s, "12");
    [s, out] = submitStep(s, "34");
    expect(out).toBe("done");
    expect(s.done).toBe(true);
    expect(s.firstTry).toEqual([true, false, true, true, true]);
  });
});
