import { buildMockGames } from "./mock";
import type { League, RawGame, Snapshot } from "./types";
import { LEAGUES } from "./types";

const API_BASE = "https://api.the-odds-api.com/v4";

export class OddsFetchError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "OddsFetchError";
  }
}

export interface ProviderResult {
  snapshot: Snapshot;
  /** Set when a live fetch was attempted and failed; the snapshot is then mock data. */
  liveError?: string;
  quota?: { remaining?: string; used?: string };
}

function cacheSeconds(): number {
  const n = Number(process.env.ODDS_CACHE_SECONDS ?? 600);
  return Number.isFinite(n) && n >= 0 ? n : 600;
}

async function fetchLive(league: League): Promise<{ games: RawGame[]; quota: ProviderResult["quota"] }> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) throw new OddsFetchError("ODDS_API_KEY is not set");
  const regions = process.env.ODDS_REGIONS ?? "us";
  const url = new URL(`${API_BASE}/sports/${LEAGUES[league].sportKey}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", regions);
  url.searchParams.set("markets", "h2h,spreads,totals");
  url.searchParams.set("oddsFormat", "american");
  url.searchParams.set("dateFormat", "iso");

  const res = await fetch(url, { next: { revalidate: cacheSeconds() } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new OddsFetchError(`Odds API ${res.status}: ${body.slice(0, 200)}`, res.status);
  }
  const games = (await res.json()) as RawGame[];
  return {
    games,
    quota: {
      remaining: res.headers.get("x-requests-remaining") ?? undefined,
      used: res.headers.get("x-requests-used") ?? undefined,
    },
  };
}

/**
 * Load the current slate for a league. Uses The Odds API when a key is
 * configured, and falls back to the built-in sample slate otherwise. A failed
 * live fetch also falls back, but reports the error so the UI can say so.
 */
export async function getSnapshot(league: League): Promise<ProviderResult> {
  const fetchedAt = new Date().toISOString();
  if (process.env.ODDS_API_KEY) {
    try {
      const { games, quota } = await fetchLive(league);
      return { snapshot: { league, fetchedAt, source: "live", games }, quota };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        snapshot: { league, fetchedAt, source: "mock", games: buildMockGames(league) },
        liveError: message,
      };
    }
  }
  return { snapshot: { league, fetchedAt, source: "mock", games: buildMockGames(league) } };
}
