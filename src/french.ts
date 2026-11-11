/**
 * Turns integers into written French.
 *
 * Uses traditional spelling (hyphens only inside numbers below 100, e.g.
 * "deux cent quatre-vingt-dix-sept"), which is what most textbooks show.
 *
 * Variants:
 *  - "fr": France (soixante-dix, quatre-vingts, quatre-vingt-dix)
 *  - "be": Belgium (septante, quatre-vingts, nonante)
 *  - "ch": Switzerland, Romandy cantons using huitante (septante, huitante, nonante)
 */
export type Variant = "fr" | "be" | "ch";

const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
  "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
  "dix-sept", "dix-huit", "dix-neuf",
];

const TENS: Record<number, string> = {
  2: "vingt", 3: "trente", 4: "quarante", 5: "cinquante", 6: "soixante",
};

/** 0–99 */
function below100(n: number, variant: Variant): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;

  // Regular tens: 20–69, plus 70/80/90 in the regional variants.
  const regular: Record<number, string> = { ...TENS };
  if (variant !== "fr") {
    regular[7] = "septante";
    regular[9] = "nonante";
  }
  if (variant === "ch") regular[8] = "huitante";

  if (regular[t]) {
    const tens = regular[t];
    if (u === 0) return tens;
    if (u === 1) return `${tens} et un`;
    return `${tens}-${UNITS[u]}`;
  }

  // France: 70–79 = soixante + 10..19
  if (t === 7) {
    if (u === 1) return "soixante et onze";
    return `soixante-${UNITS[10 + u]}`;
  }
  // 80–99 = quatre-vingt(s) + 0..19 (no "et" in 81 or 91)
  const rest = n - 80;
  if (rest === 0) return "quatre-vingts";
  return `quatre-vingt-${UNITS[rest]}`;
}

/** 0–999. `beforeMille` drops the plural -s of cents/vingts, which are invariable before "mille". */
function below1000(n: number, variant: Variant, beforeMille = false): string {
  const h = Math.floor(n / 100);
  const r = n % 100;
  let out = "";
  if (h > 0) {
    out = h === 1 ? "cent" : `${UNITS[h]} cent`;
    if (h > 1 && r === 0 && !beforeMille) out += "s";
    if (r === 0) return out;
    out += " ";
  }
  let tail = below100(r, variant);
  if (beforeMille && tail.endsWith("quatre-vingts")) tail = tail.slice(0, -1);
  return out + tail;
}

export function numberToFrench(n: number, variant: Variant = "fr"): string {
  if (!Number.isInteger(n) || n < 0 || n > 999_999_999) {
    throw new RangeError(`Unsupported number: ${n}`);
  }
  if (n === 0) return "zéro";

  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;
  const parts: string[] = [];

  if (millions > 0) {
    // "million" is a noun: it agrees, and "cents"/"vingts" before it keep their -s.
    parts.push(millions === 1 ? "un million" : `${below1000(millions, variant)} millions`);
  }
  if (thousands > 0) {
    parts.push(thousands === 1 ? "mille" : `${below1000(thousands, variant, true)} mille`);
  }
  if (rest > 0) parts.push(below1000(rest, variant));

  return parts.join(" ");
}

/** A two-digit group as said in phone numbers: "06" → "zéro six", "77" → "soixante-dix-sept". */
export function pairToFrench(pair: string, variant: Variant = "fr"): string {
  if (!/^\d\d$/.test(pair)) throw new RangeError(`Not a pair: ${pair}`);
  if (pair[0] === "0") return `zéro ${UNITS[Number(pair[1])]}`;
  return below100(Number(pair), variant);
}
