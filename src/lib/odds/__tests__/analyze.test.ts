import { describe, expect, it } from "vitest";
import { analyzeGame, findValuePicks, projectedWinner } from "../analyze";
import { buildMockGames } from "../mock";
import type { RawBookmaker, RawGame } from "../types";

function book(key: string, home: number, away: number, extra: Partial<RawBookmaker> = {}): RawBookmaker {
  return {
    key,
    title: key,
    last_update: "2026-10-10T00:00:00Z",
    markets: [
      { key: "h2h", last_update: "2026-10-10T00:00:00Z", outcomes: [{ name: "Home", price: home }, { name: "Away", price: away }] },
    ],
    ...extra,
  };
}

function game(bookmakers: RawBookmaker[]): RawGame {
  return {
    id: "g1",
    sport_key: "americanfootball_nfl",
    sport_title: "NFL",
    commence_time: "2099-01-01T00:00:00Z",
    home_team: "Home",
    away_team: "Away",
    bookmakers,
  };
}

describe("analyzeGame", () => {
  it("builds a consensus and finds the best price per side", () => {
    const g = analyzeGame(game([book("a", -150, 130), book("b", -140, 120), book("c", -160, 140)]), "nfl");
    expect(g.lines).toHaveLength(1);
    const line = g.lines[0];
    expect(line.market).toBe("h2h");
    expect(line.bookCount).toBe(3);
    expect(line.fair[0] + line.fair[1]).toBeCloseTo(1, 9);
    expect(line.fair[0]).toBeGreaterThan(0.5);
    expect(line.best[0]?.book).toBe("b"); // -140 is the best home price
    expect(line.best[1]?.book).toBe("c"); // +140 is the best away price
    expect(g.homeWinProb).toBeCloseTo(line.fair[0]);
    expect(projectedWinner(g)?.team).toBe("Home");
  });

  it("weights sharp books more heavily", () => {
    const soft = [book("a", -200, 170), book("b", -200, 170)];
    const withSharp = analyzeGame(game([...soft, book("pinnacle", -120, 110)]), "nfl");
    const withSoft = analyzeGame(game([...soft, book("c", -120, 110)]), "nfl");
    // The sharp book's lower home probability pulls the consensus further down.
    expect(withSharp.homeWinProb!).toBeLessThan(withSoft.homeWinProb!);
  });

  it("groups spreads by point and totals by number", () => {
    const mk = (key: string, pt: number, tot: number): RawBookmaker => ({
      key,
      title: key,
      last_update: "x",
      markets: [
        { key: "spreads", last_update: "x", outcomes: [{ name: "Home", price: -110, point: pt }, { name: "Away", price: -110, point: -pt }] },
        { key: "totals", last_update: "x", outcomes: [{ name: "Over", price: -110, point: tot }, { name: "Under", price: -110, point: tot }] },
      ],
    });
    const g = analyzeGame(game([mk("a", -3, 44.5), mk("b", -3, 44.5), mk("c", -3.5, 45)]), "nfl");
    const spreads = g.lines.filter((l) => l.market === "spreads");
    const totals = g.lines.filter((l) => l.market === "totals");
    expect(spreads.map((l) => [l.point, l.bookCount])).toEqual([[-3, 2], [-3.5, 1]]);
    expect(totals.map((l) => [l.point, l.bookCount])).toEqual([[44.5, 2], [45, 1]]);
    expect(g.consensusSpread).toBe(-3); // the line most books hang
    expect(g.consensusTotal).toBe(44.5);
    // The away side of a -3 home spread is labelled +3.
    expect(spreads[0].best[1]?.point).toBe(3);
  });
});

describe("findValuePicks", () => {
  it("flags a stale price as value and skips thin lines", () => {
    const books = [book("a", -150, 130), book("b", -150, 130), book("pinnacle", -150, 130), book("slow", -150, 175)];
    const g = analyzeGame(game(books), "nfl");
    const picks = findValuePicks([g]);
    expect(picks).toHaveLength(1);
    expect(picks[0].side.book).toBe("slow");
    expect(picks[0].label).toBe("Away ML");
    expect(picks[0].side.ev).toBeGreaterThan(0.02);
    expect(picks[0].rationale.some((r) => r.includes("pinnacle"))).toBe(true);

    // Same line with only two books is never a pick.
    const thin = analyzeGame(game([book("a", -150, 130), book("slow", -150, 175)]), "nfl");
    expect(findValuePicks([thin])).toHaveLength(0);
  });

  it("ignores games that have already started", () => {
    const books = [book("a", -150, 130), book("b", -150, 130), book("slow", -150, 175)];
    const g = analyzeGame({ ...game(books), commence_time: "2000-01-01T00:00:00Z" }, "nfl");
    expect(findValuePicks([g], { now: new Date() })).toHaveLength(0);
  });

  it("finds something on the sample slate for both leagues", () => {
    for (const league of ["nfl", "ncaaf"] as const) {
      const games = buildMockGames(league).map((g) => analyzeGame(g, league));
      expect(games.length).toBeGreaterThan(4);
      const picks = findValuePicks(games);
      expect(picks.length).toBeGreaterThan(0);
      // Sorted best EV first
      for (let i = 1; i < picks.length; i++) expect(picks[i - 1].side.ev).toBeGreaterThanOrEqual(picks[i].side.ev);
    }
  });
});
