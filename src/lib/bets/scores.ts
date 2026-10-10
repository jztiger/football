import type { League } from "@/lib/odds";
import { LEAGUES } from "@/lib/odds";
import type { FinalScore } from "./grade";

interface RawScore {
  id: string;
  commence_time: string;
  completed: boolean;
  home_team: string;
  away_team: string;
  scores: { name: string; score: string }[] | null;
}

/**
 * Final scores from The Odds API (2 credits per call, cached 5 minutes).
 * Returns only completed games. Empty when no key is set or the call fails.
 */
export async function getFinalScores(league: League, daysFrom = 3): Promise<{ finals: FinalScore[]; error?: string }> {
  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) return { finals: [], error: "ODDS_API_KEY is not set" };
  const url = new URL(`https://api.the-odds-api.com/v4/sports/${LEAGUES[league].sportKey}/scores`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("daysFrom", String(Math.min(3, Math.max(1, daysFrom))));
  url.searchParams.set("dateFormat", "iso");
  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) return { finals: [], error: `scores API ${res.status}` };
    const raw = (await res.json()) as RawScore[];
    const finals: FinalScore[] = [];
    for (const g of raw) {
      if (!g.completed || !g.scores) continue;
      const home = g.scores.find((s) => s.name === g.home_team);
      const away = g.scores.find((s) => s.name === g.away_team);
      if (!home || !away) continue;
      finals.push({ home: g.home_team, away: g.away_team, homeScore: Number(home.score), awayScore: Number(away.score) });
    }
    return { finals };
  } catch (err) {
    return { finals: [], error: err instanceof Error ? err.message : String(err) };
  }
}
