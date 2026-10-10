/**
 * Odds conversion and vig removal.
 *
 * Everything the "value" logic depends on lives here, and it is all pure so
 * it can be unit tested without touching the network.
 */

export function americanToDecimal(american: number): number {
  if (!Number.isFinite(american) || american === 0) {
    throw new Error(`Invalid American odds: ${american}`);
  }
  return american > 0 ? 1 + american / 100 : 1 + 100 / Math.abs(american);
}

export function decimalToAmerican(decimal: number): number {
  if (!Number.isFinite(decimal) || decimal <= 1) {
    throw new Error(`Invalid decimal odds: ${decimal}`);
  }
  const american = decimal >= 2 ? (decimal - 1) * 100 : -100 / (decimal - 1);
  return Math.round(american);
}

/** Vig-included implied probability from American odds. */
export function impliedProbability(american: number): number {
  return 1 / americanToDecimal(american);
}

export function probabilityToAmerican(p: number): number {
  if (p <= 0 || p >= 1) throw new Error(`Probability out of range: ${p}`);
  return decimalToAmerican(1 / p);
}

export type DevigMethod = "multiplicative" | "power";

/**
 * Remove the bookmaker's margin from a set of implied probabilities.
 *
 * - multiplicative: scale every probability by the same factor so they sum to 1.
 *   Simple, but it over-credits longshots.
 * - power: find k so that sum(p_i^k) = 1. Favorites get more of the vig
 *   removed than longshots, which matches how books actually shade lines.
 *   This is the default.
 */
export function devig(implied: number[], method: DevigMethod = "power"): number[] {
  if (implied.length < 2) throw new Error("Need at least two outcomes to devig");
  for (const p of implied) {
    if (!(p > 0 && p < 1)) throw new Error(`Implied probability out of range: ${p}`);
  }
  const overround = implied.reduce((a, b) => a + b, 0);
  if (method === "multiplicative" || Math.abs(overround - 1) < 1e-9) {
    return implied.map((p) => p / overround);
  }
  // Bisection on k: f(k) = sum p_i^k - 1 is monotonically decreasing in k.
  let lo = 0.5;
  let hi = 2;
  const f = (k: number) => implied.reduce((s, p) => s + Math.pow(p, k), 0) - 1;
  // Expand the bracket if needed (overround outside the usual 1..1.3 range).
  while (f(lo) < 0) lo /= 2;
  while (f(hi) > 0) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) lo = mid;
    else hi = mid;
  }
  const k = (lo + hi) / 2;
  const fair = implied.map((p) => Math.pow(p, k));
  const sum = fair.reduce((a, b) => a + b, 0);
  return fair.map((p) => p / sum); // tidy up any floating residue
}

/** Overround (total implied probability) for a set of American prices. */
export function overround(prices: number[]): number {
  return prices.reduce((s, p) => s + impliedProbability(p), 0);
}

/** Expected value per 1 unit staked, given a fair win probability. */
export function expectedValue(fairProb: number, american: number): number {
  return fairProb * americanToDecimal(american) - 1;
}

/** Full Kelly stake fraction. Returns 0 when there is no edge. */
export function kellyFraction(fairProb: number, american: number): number {
  const b = americanToDecimal(american) - 1;
  const q = 1 - fairProb;
  const f = (b * fairProb - q) / b;
  return f > 0 ? f : 0;
}

export function formatAmerican(american: number): string {
  return american > 0 ? `+${american}` : `${american}`;
}

export function formatPoint(point: number | undefined, market: "h2h" | "spreads" | "totals"): string {
  if (point === undefined || market === "h2h") return "";
  if (market === "totals") return `${point}`;
  return point > 0 ? `+${point}` : `${point}`;
}

export function pct(p: number, digits = 1): string {
  return `${(p * 100).toFixed(digits)}%`;
}
