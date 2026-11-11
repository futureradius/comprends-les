import { describe, expect, it } from "vitest";
import { checkPhone, generatePhone, phoneSpeech } from "./phone";

describe("phone mode", () => {
  it("generates five pairs starting with a valid French prefix", () => {
    for (let i = 0; i < 200; i++) {
      const { pairs } = generatePhone({ hardBias: 0.5 });
      expect(pairs).toHaveLength(5);
      expect(pairs.every((p) => /^\d\d$/.test(p))).toBe(true);
      expect(["01", "02", "03", "04", "05", "06", "07", "09"]).toContain(pairs[0]);
    }
  });

  it("hardBias 1 only draws 70–99 after the prefix", () => {
    for (let i = 0; i < 100; i++) {
      const { pairs } = generatePhone({ hardBias: 1 });
      expect(pairs.slice(1).every((p) => Number(p) >= 70)).toBe(true);
    }
  });

  it("speaks the number in pairs", () => {
    expect(phoneSpeech({ pairs: ["06", "77", "91", "12", "80"] }, "fr")).toBe(
      "zéro six, soixante-dix-sept, quatre-vingt-onze, douze, quatre-vingts",
    );
    expect(phoneSpeech({ pairs: ["06", "77", "91", "12", "80"] }, "be")).toBe(
      "zéro six, septante-sept, nonante et un, douze, quatre-vingts",
    );
  });

  it("checks answers pair by pair, ignoring separators", () => {
    const res = checkPhone({ pairs: ["06", "77", "91", "12", "34"] }, "06.77-97 12 3");
    expect(res.map((r) => r.correct)).toEqual([true, true, false, true, false]);
    expect(res[2].given).toBe("97");
  });
});
