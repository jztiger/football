import { describe, expect, it } from "vitest";
import { betStatus, gradeBet, gradeLegFromScore, summarize } from "../grade";
import type { Bet } from "../types";

const score = { home: "Navy Midshipmen", away: "Tulsa Golden Hurricane", homeScore: 24, awayScore: 23 };

describe("gradeLegFromScore", () => {
  it("grades spreads with pushes", () => {
    const leg = { label: "Tulsa +3", market: "spreads" as const, team: "Tulsa Golden Hurricane", point: 3, price: -105 };
    expect(gradeLegFromScore(leg, score)).toBe("won"); // lost by 1, +3 covers
    expect(gradeLegFromScore(leg, { ...score, homeScore: 26 })).toBe("push");
    expect(gradeLegFromScore(leg, { ...score, homeScore: 27 })).toBe("lost");
  });

  it("grades moneylines and totals", () => {
    expect(gradeLegFromScore({ label: "Navy ML", market: "h2h", team: "Navy Midshipmen", price: -150 }, score)).toBe("won");
    expect(gradeLegFromScore({ label: "Tulsa ML", market: "h2h", team: "Tulsa Golden Hurricane", price: 130 }, score)).toBe("lost");
    const over = { label: "Over 48", market: "totals" as const, team: "Navy Midshipmen", point: 48, side: "Over" as const, price: -110 };
    expect(gradeLegFromScore(over, score)).toBe("lost"); // 47
    expect(gradeLegFromScore({ ...over, point: 47 }, score)).toBe("push");
    expect(gradeLegFromScore({ ...over, side: "Under" }, score)).toBe("won");
  });

  it("returns undefined for props and unmatched teams", () => {
    expect(gradeLegFromScore({ label: "x", market: "prop", price: -160 }, score)).toBeUndefined();
    expect(gradeLegFromScore({ label: "x", market: "h2h", team: "Army Black Knights", price: 100 }, score)).toBeUndefined();
  });
});

describe("gradeBet", () => {
  const parlay: Bet = {
    id: "T1",
    book: "Circa",
    placedAt: "2026-10-10T17:57:24Z",
    stake: 40,
    toWin: 129.1,
    legs: [
      { label: "Kansas St -135", market: "h2h", price: -135, fairAtPlacement: 0.553 },
      { label: "Oregon -410", market: "h2h", price: -410, fairAtPlacement: 0.792 },
      { label: "Tulsa +3 -105", market: "spreads", price: -105, point: 3, fairAtPlacement: 0.512 },
    ],
  };

  it("matches the ticket's printed payout", () => {
    const g = gradeBet(parlay, ["pending", "pending", "pending"]);
    expect(g.status).toBe("pending");
    expect(g.toWin).toBeCloseTo(129.1, 1);
    expect(g.profit).toBe(0);
    expect(g.expectedProfit).toBeCloseTo(-2.05, 1);
  });

  it("drops pushed legs from the payout and settles", () => {
    const g = gradeBet(parlay, ["won", "won", "push"]);
    expect(g.status).toBe("won");
    expect(g.toWin).toBeCloseTo(40 * (1.7407 * 1.2439 - 1), 1);
    expect(g.profit).toBe(g.toWin);
    expect(gradeBet(parlay, ["won", "lost", "pending"]).status).toBe("lost");
    expect(gradeBet(parlay, ["won", "lost", "pending"]).profit).toBe(-40);
  });

  it("summarizes a slate", () => {
    const s = summarize([gradeBet(parlay, ["won", "won", "won"]), gradeBet({ ...parlay, id: "T2" }, ["lost", "won", "won"]), gradeBet({ ...parlay, id: "T3" }, ["pending", "pending", "pending"])]);
    expect(s.count).toBe(3);
    expect(s.staked).toBe(120);
    expect(s.pendingStake).toBe(40);
    expect(s.profit).toBeCloseTo(129.1 - 40, 1);
    expect(s.record).toEqual({ won: 1, lost: 1, push: 0 });
    expect(betStatus(["push", "push"])).toBe("push");
  });
});
