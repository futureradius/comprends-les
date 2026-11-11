import { describe, expect, it } from "vitest";
import { numberToFrench as fr, pairToFrench } from "./french";

describe("numberToFrench (France)", () => {
  it.each([
    [0, "zéro"], [1, "un"], [16, "seize"], [17, "dix-sept"], [20, "vingt"],
    [21, "vingt et un"], [22, "vingt-deux"], [31, "trente et un"], [61, "soixante et un"],
    [70, "soixante-dix"], [71, "soixante et onze"], [72, "soixante-douze"], [79, "soixante-dix-neuf"],
    [80, "quatre-vingts"], [81, "quatre-vingt-un"], [89, "quatre-vingt-neuf"],
    [90, "quatre-vingt-dix"], [91, "quatre-vingt-onze"], [97, "quatre-vingt-dix-sept"], [99, "quatre-vingt-dix-neuf"],
    [100, "cent"], [101, "cent un"], [180, "cent quatre-vingts"], [200, "deux cents"], [201, "deux cent un"],
    [999, "neuf cent quatre-vingt-dix-neuf"],
    [1000, "mille"], [1001, "mille un"], [1980, "mille neuf cent quatre-vingts"], [2000, "deux mille"],
    [80_000, "quatre-vingt mille"], [200_000, "deux cent mille"], [280_000, "deux cent quatre-vingt mille"],
    [1_000_000, "un million"], [2_000_000, "deux millions"], [200_000_000, "deux cents millions"],
    [1_234_567, "un million deux cent trente-quatre mille cinq cent soixante-sept"],
  ])("%i → %s", (n, words) => {
    expect(fr(n)).toBe(words);
  });

  it("rejects unsupported input", () => {
    expect(() => fr(-1)).toThrow();
    expect(() => fr(1.5)).toThrow();
    expect(() => fr(1_000_000_000)).toThrow();
  });
});

describe("numberToFrench (Belgium / Switzerland)", () => {
  it.each([
    [70, "septante"], [71, "septante et un"], [77, "septante-sept"],
    [80, "quatre-vingts"], [81, "quatre-vingt-un"], [90, "nonante"], [91, "nonante et un"], [99, "nonante-neuf"],
  ])("be: %i → %s", (n, words) => {
    expect(fr(n, "be")).toBe(words);
  });

  it.each([[80, "huitante"], [81, "huitante et un"], [88, "huitante-huit"]])("ch: %i → %s", (n, words) => {
    expect(fr(n, "ch")).toBe(words);
  });
});

describe("pairToFrench", () => {
  it.each([
    ["00", "zéro zéro"], ["06", "zéro six"], ["10", "dix"], ["71", "soixante et onze"], ["80", "quatre-vingts"],
  ])("%s → %s", (pair, words) => {
    expect(pairToFrench(pair)).toBe(words);
  });
});
