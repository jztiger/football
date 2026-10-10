import { NextResponse } from "next/server";
import { loadGradedBets, summarize } from "@/lib/bets";

export const dynamic = "force-dynamic";

/**
 * Machine-readable bet status for the check-in routine. `recentlySettled`
 * lists legs whose game went final within `sinceMinutes` (default 20) so a
 * stateless poller can tell what is new.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const sinceMinutes = Number(url.searchParams.get("sinceMinutes") ?? 20) || 20;
  const cutoff = Date.now() - sinceMinutes * 60_000;
  const { bets, scoreErrors } = await loadGradedBets();
  const summary = summarize(bets);

  const recentlySettled = bets.flatMap((b) =>
    b.legs
      .filter((l) => l.finalizedAt && new Date(l.finalizedAt).getTime() >= cutoff)
      .map((l) => ({ ticket: b.id, leg: l.label, result: l.result, score: l.score, ticketStatus: b.status })),
  );

  const lines = bets.map(
    (b) =>
      `${b.id} ${b.status.toUpperCase()} $${b.stake} to win $${b.toWin.toFixed(2)}: ` +
      b.legs.map((l) => `${l.label} [${l.result}${l.score ? ` ${l.score}` : ""}]`).join(" | "),
  );

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    scoreErrors,
    summary,
    recentlySettled,
    allSettled: bets.every((b) => b.status !== "pending"),
    text: lines.join("\n"),
    bets: bets.map((b) => ({
      id: b.id,
      status: b.status,
      stake: b.stake,
      toWin: b.toWin,
      profit: b.profit,
      legs: b.legs.map((l) => ({ label: l.label, result: l.result, score: l.score, finalizedAt: l.finalizedAt })),
    })),
  });
}
