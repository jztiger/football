import { formatAmerican, loadLeague, pct, type League } from "@/lib/odds";
import { bestParlays, candidateLegs } from "@/lib/odds/parlay";
import { inWindow, isWindow, kickoffEastern } from "@/lib/odds/window";

export const dynamic = "force-dynamic";

/** Plain-text summary of the board, sized for copy-and-paste from a phone. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const legs = Math.min(4, Math.max(2, Number(url.searchParams.get("legs") ?? 3) || 3));
  const book = url.searchParams.get("book") ?? undefined;
  const leagueParam = url.searchParams.get("league");
  const leagues: League[] = leagueParam === "nfl" || leagueParam === "ncaaf" ? [leagueParam] : ["nfl", "ncaaf"];

  const windowParam = url.searchParams.get("window") ?? "any";
  const window = isWindow(windowParam) ? windowParam : "any";
  const boards = await Promise.all(leagues.map((l) => loadLeague(l)));
  const now = new Date();
  const games = boards.flatMap((b) => b.games).filter((g) => inWindow(g.commenceTime, window, now));
  const candidates = candidateLegs(games, { book, now });
  const parlays = bestParlays(candidates, legs, 5);

  const out: string[] = [];
  out.push(`EdgeBoard ${now.toISOString()} source=${boards.map((b) => `${b.snapshot.league}:${b.snapshot.source}`).join(",")}`);
  for (const b of boards) if (b.liveError) out.push(`!! ${b.snapshot.league} live error: ${b.liveError}`);
  out.push(`games=${games.length} legs=${legs} book=${book ?? "best"} window=${window}`);

  out.push("", "== VALUE PICKS (>=2% EV)");
  const picks = boards.flatMap((b) => b.picks);
  if (!picks.length) out.push("(none)");
  for (const p of picks)
    out.push(`[${p.grade}] ${p.label} @ ${p.side.bookTitle} ${formatAmerican(p.side.price)} ev=${pct(p.side.ev)} fair=${pct(p.fair)} books=${p.bookCount} | ${p.matchup}`);

  out.push("", `== TOP ${legs}-LEG PARLAYS`);
  parlays.forEach((p, i) => {
    out.push(`#${i + 1} ${formatAmerican(p.american)} hits=${pct(p.prob)} ev=${pct(p.ev)}`);
    for (const l of p.legs) out.push(`   ${l.label} ${formatAmerican(l.side.price)} @${l.side.bookTitle}${l.proxyPrice ? "*" : ""} fair=${pct(l.fair)} | ${l.matchup} | ${kickoffEastern(l.commenceTime)} ET`);
  });

  out.push("", "== TOP 20 LEGS (fair x payout)");
  for (const l of candidates.slice(0, 20))
    out.push(`${l.ratio.toFixed(3)} ${l.label} ${formatAmerican(l.side.price)} @${l.side.bookTitle} fair=${pct(l.fair)} | ${l.matchup} | ${kickoffEastern(l.commenceTime)} ET`);

  out.push("", "== GAMES");
  for (const g of games) {
    const h2h = g.lines.find((l) => l.market === "h2h");
    out.push(
      `${g.league} ${kickoffEastern(g.commenceTime)} ET ${g.away} @ ${g.home} | spread ${g.consensusSpread ?? "-"} total ${g.consensusTotal ?? "-"} homeWin=${g.homeWinProb !== undefined ? pct(g.homeWinProb) : "-"} books=${g.bookCount}${h2h ? ` bestML ${formatAmerican(h2h.best[0]!.price)}/${formatAmerican(h2h.best[1]!.price)}` : ""}`,
    );
  }

  return new Response(out.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
