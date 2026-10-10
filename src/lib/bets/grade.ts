import { americanToDecimal } from "@/lib/odds";
import type { Bet, BetLeg, BetStatus, GradedBet, GradedLeg, LegResult } from "./types";

export interface FinalScore {
  home: string;
  away: string;
  homeScore: number;
  awayScore: number;
}

/** Grade a single leg from a final score. Returns undefined when the leg can't be matched. */
export function gradeLegFromScore(leg: BetLeg, score: FinalScore): LegResult | undefined {
  if (leg.market === "prop") return undefined;
  const teamIsHome = leg.team === score.home;
  const teamIsAway = leg.team === score.away;
  if (!teamIsHome && !teamIsAway) return undefined;
  const teamScore = teamIsHome ? score.homeScore : score.awayScore;
  const oppScore = teamIsHome ? score.awayScore : score.homeScore;

  if (leg.market === "h2h") {
    if (teamScore === oppScore) return "push";
    return teamScore > oppScore ? "won" : "lost";
  }
  if (leg.market === "spreads") {
    if (leg.point === undefined) return undefined;
    const margin = teamScore + leg.point - oppScore;
    if (margin === 0) return "push";
    return margin > 0 ? "won" : "lost";
  }
  if (leg.market === "totals") {
    if (leg.point === undefined || !leg.side) return undefined;
    const total = teamScore + oppScore;
    if (total === leg.point) return "push";
    const over = total > leg.point;
    return (leg.side === "Over") === over ? "won" : "lost";
  }
  return undefined;
}

export function betStatus(results: LegResult[]): BetStatus {
  if (results.some((r) => r === "lost")) return "lost";
  if (results.some((r) => r === "pending")) return "pending";
  if (results.every((r) => r === "push")) return "push";
  return "won";
}

/** Combined decimal odds of the legs that are still live (pushes drop out). */
export function liveDecimal(legs: GradedLeg[]): number {
  return legs.filter((l) => l.result !== "push").reduce((d, l) => d * americanToDecimal(l.price), 1);
}

export function gradeBet(bet: Bet, results: LegResult[], scores: (string | undefined)[] = []): GradedBet {
  const legs: GradedLeg[] = bet.legs.map((l, i) => ({ ...l, result: results[i] ?? "pending", score: scores[i] }));
  const status = betStatus(legs.map((l) => l.result));
  const decimal = liveDecimal(legs);
  const anyPush = legs.some((l) => l.result === "push");
  // Trust the printed payout while every leg is live; recompute once a push drops a leg.
  const toWin = !anyPush && bet.toWin !== undefined ? bet.toWin : round2(bet.stake * (decimal - 1));
  const profit = status === "won" ? toWin : status === "lost" ? -bet.stake : 0;

  let expectedProfit: number | undefined;
  if (bet.legs.every((l) => l.fairAtPlacement !== undefined)) {
    const p = bet.legs.reduce((acc, l) => acc * (l.fairAtPlacement as number), 1);
    const full = bet.legs.reduce((d, l) => d * americanToDecimal(l.price), 1);
    expectedProfit = round2(bet.stake * (p * full - 1));
  }

  return { ...bet, legs, status, toWin, profit, expectedProfit };
}

export function summarize(bets: GradedBet[]) {
  const settled = bets.filter((b) => b.status !== "pending");
  return {
    count: bets.length,
    staked: round2(bets.reduce((s, b) => s + b.stake, 0)),
    pendingStake: round2(bets.filter((b) => b.status === "pending").reduce((s, b) => s + b.stake, 0)),
    pendingToWin: round2(bets.filter((b) => b.status === "pending").reduce((s, b) => s + b.toWin, 0)),
    profit: round2(settled.reduce((s, b) => s + b.profit, 0)),
    record: {
      won: bets.filter((b) => b.status === "won").length,
      lost: bets.filter((b) => b.status === "lost").length,
      push: bets.filter((b) => b.status === "push").length,
    },
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
