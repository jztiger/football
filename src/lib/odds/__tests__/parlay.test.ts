import { describe, expect, it } from "vitest";
import { analyzeGame } from "../analyze";
import { buildMockGames } from "../mock";
import { bestParlays, candidateLegs } from "../parlay";

describe("parlay builder", () => {
  const games = buildMockGames("nfl").map((g) => analyzeGame(g, "nfl"));

  it("ranks legs by fair * decimal and never uses thin lines", () => {
    const legs = candidateLegs(games);
    expect(legs.length).toBeGreaterThan(10);
    for (let i = 1; i < legs.length; i++) expect(legs[i - 1].ratio).toBeGreaterThanOrEqual(legs[i].ratio);
    expect(legs.every((l) => l.fair <= 0.8)).toBe(true);
  });

  it("builds three-leg parlays from distinct games with multiplied odds", () => {
    const parlays = bestParlays(candidateLegs(games), 3, 5);
    expect(parlays.length).toBe(5);
    for (const p of parlays) {
      expect(p.legs).toHaveLength(3);
      expect(new Set(p.legs.map((l) => l.gameId)).size).toBe(3);
      const decimal = p.legs.reduce((d, l) => d * l.side.decimal, 1);
      expect(p.decimal).toBeCloseTo(decimal);
      expect(p.prob).toBeCloseTo(p.legs.reduce((q, l) => q * l.fair, 1));
      expect(p.ev).toBeCloseTo(p.prob * p.decimal - 1);
    }
    for (let i = 1; i < parlays.length; i++) expect(parlays[i - 1].ev).toBeGreaterThanOrEqual(parlays[i].ev);
  });

  it("prices legs at a requested book and flags proxies when the book is missing", () => {
    const atDk = candidateLegs(games, { book: "draftkings" });
    expect(atDk.length).toBeGreaterThan(10);
    expect(atDk.every((l) => l.side.book === "draftkings" && !l.proxyPrice)).toBe(true);
    const missing = candidateLegs(games, { book: "circasports" });
    expect(missing.every((l) => l.proxyPrice)).toBe(true);
  });

  it("returns nothing when there are fewer games than legs", () => {
    expect(bestParlays(candidateLegs(games.slice(0, 2)), 3)).toEqual([]);
  });
});
