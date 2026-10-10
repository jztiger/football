import rawBets from "@/data/bets.json";
import type { League } from "@/lib/odds";
import { gradeBet, gradeLegFromScore, summarize, type FinalScore } from "./grade";
import { getFinalScores } from "./scores";
import type { Bet, GradedBet, LegResult } from "./types";

export * from "./types";
export { gradeBet, summarize };

export function loadBets(): Bet[] {
  return rawBets as Bet[];
}

function scoreLine(leg: { team?: string }, s: FinalScore): string {
  const first = leg.team === s.home ? `${s.home} ${s.homeScore}` : `${s.away} ${s.awayScore}`;
  const second = leg.team === s.home ? `${s.away} ${s.awayScore}` : `${s.home} ${s.homeScore}`;
  return `${first}, ${second}`;
}

/** Load every bet and grade each leg from final scores, honouring manual results. */
export async function loadGradedBets(): Promise<{ bets: GradedBet[]; scoreErrors: string[] }> {
  const bets = loadBets();
  const leagues = [...new Set(bets.flatMap((b) => b.legs.map((l) => l.league)).filter((l): l is League => Boolean(l)))];
  const scoreSets = await Promise.all(leagues.map((l) => getFinalScores(l)));
  const finals = scoreSets.flatMap((s) => s.finals);
  const scoreErrors = scoreSets.map((s) => s.error).filter((e): e is string => Boolean(e));

  const graded = bets.map((bet) => {
    const results: LegResult[] = [];
    const lines: (string | undefined)[] = [];
    const finalized: (string | undefined)[] = [];
    for (const leg of bet.legs) {
      if (leg.result) {
        results.push(leg.result);
        lines.push(undefined);
        finalized.push(undefined);
        continue;
      }
      const match = finals.find((s) => (s.home === leg.team && s.away === leg.opponent) || (s.away === leg.team && s.home === leg.opponent));
      const r = match ? gradeLegFromScore(leg, match) : undefined;
      results.push(r ?? "pending");
      lines.push(match && r ? scoreLine(leg, match) : undefined);
      finalized.push(match && r ? match.lastUpdate : undefined);
    }
    return gradeBet(bet, results, lines, finalized);
  });

  graded.sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  return { bets: graded, scoreErrors };
}
