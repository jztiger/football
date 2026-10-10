import { describe, expect, it } from "vitest";
import {
  americanToDecimal,
  decimalToAmerican,
  devig,
  expectedValue,
  impliedProbability,
  kellyFraction,
  overround,
  probabilityToAmerican,
} from "../math";

describe("odds conversion", () => {
  it("converts American to decimal", () => {
    expect(americanToDecimal(100)).toBeCloseTo(2);
    expect(americanToDecimal(-110)).toBeCloseTo(1.9091, 4);
    expect(americanToDecimal(+250)).toBeCloseTo(3.5);
    expect(americanToDecimal(-400)).toBeCloseTo(1.25);
  });

  it("round-trips decimal to American", () => {
    for (const a of [-1000, -400, -110, -105, 100, 120, 250, 900]) {
      expect(decimalToAmerican(americanToDecimal(a))).toBe(a);
    }
  });

  it("computes implied probability", () => {
    expect(impliedProbability(-110)).toBeCloseTo(0.5238, 4);
    expect(impliedProbability(100)).toBeCloseTo(0.5);
    expect(impliedProbability(200)).toBeCloseTo(1 / 3);
  });

  it("maps probability back to American odds", () => {
    expect(probabilityToAmerican(0.5)).toBe(100);
    expect(probabilityToAmerican(0.8)).toBe(-400);
    expect(probabilityToAmerican(0.2)).toBe(400);
    expect(() => probabilityToAmerican(0)).toThrow();
  });

  it("rejects invalid odds", () => {
    expect(() => americanToDecimal(0)).toThrow();
    expect(() => decimalToAmerican(1)).toThrow();
  });
});

describe("devig", () => {
  it("returns 50/50 for symmetric -110 lines under both methods", () => {
    const implied = [impliedProbability(-110), impliedProbability(-110)];
    expect(devig(implied, "multiplicative")).toEqual([expect.closeTo(0.5, 9), expect.closeTo(0.5, 9)]);
    expect(devig(implied, "power")).toEqual([expect.closeTo(0.5, 9), expect.closeTo(0.5, 9)]);
  });

  it("always sums to one", () => {
    const cases = [
      [-300, 240],
      [-150, 130],
      [-110, -110],
      [-800, 550],
    ];
    for (const prices of cases) {
      const implied = prices.map(impliedProbability);
      for (const method of ["multiplicative", "power"] as const) {
        const fair = devig(implied, method);
        expect(fair.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
        expect(fair.every((p) => p > 0 && p < 1)).toBe(true);
      }
    }
  });

  it("power method takes more vig off the favorite than the multiplicative method", () => {
    const implied = [impliedProbability(-400), impliedProbability(+300)];
    const mult = devig(implied, "multiplicative");
    const power = devig(implied, "power");
    // The favorite's fair probability should be higher under power devig.
    expect(power[0]).toBeGreaterThan(mult[0]);
    expect(power[1]).toBeLessThan(mult[1]);
  });

  it("is a no-op on a fair book", () => {
    expect(devig([0.4, 0.6])).toEqual([expect.closeTo(0.4, 9), expect.closeTo(0.6, 9)]);
  });

  it("rejects bad input", () => {
    expect(() => devig([0.5])).toThrow();
    expect(() => devig([0, 1])).toThrow();
  });
});

describe("value math", () => {
  it("reports the overround of a standard line", () => {
    expect(overround([-110, -110])).toBeCloseTo(1.0476, 4);
  });

  it("computes EV and Kelly", () => {
    // Fair 55% at even money: EV = 0.55*2 - 1 = +10%, Kelly = (1*0.55-0.45)/1 = 10%
    expect(expectedValue(0.55, 100)).toBeCloseTo(0.1);
    expect(kellyFraction(0.55, 100)).toBeCloseTo(0.1);
    // No edge
    expect(expectedValue(0.5, -110)).toBeLessThan(0);
    expect(kellyFraction(0.5, -110)).toBe(0);
  });
});
