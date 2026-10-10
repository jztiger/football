import Link from "next/link";
import type { GameAnalysis } from "@/lib/odds";
import { formatAmerican, formatPoint, pct, projectedWinner } from "@/lib/odds";
import { formatKickoff, shortTeam } from "@/lib/format";

export function GameCard({ game }: { game: GameAnalysis }) {
  const winner = projectedWinner(game);
  const h2h = game.lines.find((l) => l.market === "h2h");
  const spread = game.lines.find((l) => l.market === "spreads");
  const total = game.lines.find((l) => l.market === "totals");
  const bestEv = Math.max(0, ...game.lines.filter((l) => l.bookCount >= 3).flatMap((l) => l.best.map((b) => b?.ev ?? 0)));

  return (
    <Link href={`/${game.league}/game/${game.id}`} className="block rounded-xl border border-border bg-surface p-4 active:bg-surface-2">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>{formatKickoff(game.commenceTime)}</span>
        {bestEv >= 0.02 && <span className="rounded-md bg-accent-dim px-2 py-0.5 font-semibold text-accent">+{pct(bestEv)} value</span>}
      </div>

      <div className="mt-2 grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 gap-y-1.5 text-sm">
        <span className="text-[11px] text-muted"> </span>
        <span className="text-[11px] text-muted">ML</span>
        <span className="text-[11px] text-muted">Spread</span>
        <span className="text-[11px] text-muted">Total</span>

        <TeamRow name={game.away} isWinner={winner?.team === game.away} />
        <Cell>{h2h ? `${formatAmerican(h2h.best[1]!.price)}` : "—"}</Cell>
        <Cell>{spread ? `${formatPoint(spread.best[1]!.point, "spreads")} ${formatAmerican(spread.best[1]!.price)}` : "—"}</Cell>
        <Cell>{total ? `O ${total.point} ${formatAmerican(total.best[0]!.price)}` : "—"}</Cell>

        <TeamRow name={game.home} isWinner={winner?.team === game.home} />
        <Cell>{h2h ? `${formatAmerican(h2h.best[0]!.price)}` : "—"}</Cell>
        <Cell>{spread ? `${formatPoint(spread.best[0]!.point, "spreads")} ${formatAmerican(spread.best[0]!.price)}` : "—"}</Cell>
        <Cell>{total ? `U ${total.point} ${formatAmerican(total.best[1]!.price)}` : "—"}</Cell>
      </div>

      {winner && (
        <p className="mt-2 text-xs text-muted">
          Projected: <span className="font-medium text-text">{shortTeam(winner.team)}</span> {pct(winner.prob)} · best prices across {game.bookCount} books
        </p>
      )}
    </Link>
  );
}

function TeamRow({ name, isWinner }: { name: string; isWinner: boolean }) {
  return (
    <span className={`text-[13px] leading-tight font-medium ${isWinner ? "text-text" : "text-muted"}`}>
      {isWinner && <span className="mr-1 text-accent">●</span>}
      {name}
    </span>
  );
}

function Cell({ children }: { children: React.ReactNode }) {
  return <span className="tabular whitespace-nowrap text-right text-xs">{children}</span>;
}
