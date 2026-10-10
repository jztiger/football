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

/** Games that kicked off more than this long ago drop off the board. */
const STALE_GAME_MS = 4 * 60 * 60 * 1000;

export async function loadLeague(league: League): Promise<LeagueBoard> {
  const result = await getSnapshot(league);
  const now = new Date();
  const cutoff = now.getTime() - STALE_GAME_MS;
  const games = result.snapshot.games
    .filter((g) => new Date(g.commence_time).getTime() >= cutoff)
    .map((g) => analyzeGame(g, league))
    .sort((a, b) => a.commenceTime.localeCompare(b.commenceTime));
  const picks = findValuePicks(games, { now });
  return { ...result, games, picks };
}
