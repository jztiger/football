import { analyzeGame, findValuePicks } from "./analyze";
import { getSnapshot, type ProviderResult } from "./provider";
import type { GameAnalysis, League, ValuePick } from "./types";

export * from "./types";
export * from "./math";
export * from "./analyze";
export { getSnapshot, OddsFetchError } from "./provider";

export interface LeagueBoard extends ProviderResult {
  games: GameAnalysis[];
  picks: ValuePick[];
}

export function isLeague(value: string): value is League {
  return value === "nfl" || value === "ncaaf";
}

export async function loadLeague(league: League): Promise<LeagueBoard> {
  const result = await getSnapshot(league);
  const games = result.snapshot.games
    .map((g) => analyzeGame(g, league))
    .sort((a, b) => a.commenceTime.localeCompare(b.commenceTime));
  const picks = findValuePicks(games, { now: new Date() });
  return { ...result, games, picks };
}
