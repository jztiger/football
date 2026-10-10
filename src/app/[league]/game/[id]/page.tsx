import Link from "next/link";
import { notFound } from "next/navigation";
import { isLeague, loadLeague, pct, projectedWinner } from "@/lib/odds";
import { OddsTable } from "@/components/OddsTable";
import { PickCard } from "@/components/PickCard";
import { formatKickoff } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function GamePage({ params }: { params: Promise<{ league: string; id: string }> }) {
  const { league, id } = await params;
  if (!isLeague(league)) notFound();
  const board = await loadLeague(league);
  const game = board.games.find((g) => g.id === id);
  if (!game) notFound();
  const winner = projectedWinner(game);
  const picks = board.picks.filter((p) => p.gameId === id);

  return (
    <>
      <Link href={`/${league}/board`} className="text-sm text-muted">
        ← Board
      </Link>
      <h1 className="mt-2 text-xl font-bold">
        {game.away} <span className="text-muted">@</span> {game.home}
      </h1>
      <p className="text-sm text-muted">{formatKickoff(game.commenceTime)}</p>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <Tile label="Projected winner" value={winner ? `${winner.team.split(" ").pop()} ${pct(winner.prob, 0)}` : "—"} />
        <Tile label="Market spread" value={game.consensusSpread !== undefined ? `${game.home.split(" ").pop()} ${game.consensusSpread > 0 ? "+" : ""}${game.consensusSpread}` : "—"} />
        <Tile label="Market total" value={game.consensusTotal !== undefined ? `${game.consensusTotal}` : "—"} />
      </div>

      {picks.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-2 font-semibold">Value in this game</h2>
          <ul className="space-y-3">
            {picks.map((p, i) => (
              <li key={`${p.market}-${p.label}`}>
                <PickCard pick={p} rank={i + 1} />
                <ul className="mt-2 space-y-1 px-1 text-xs text-muted">
                  {p.rationale.map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 space-y-3">
        <h2 className="font-semibold">All lines</h2>
        {game.lines.map((line) => (
          <OddsTable key={`${line.market}-${line.point ?? ""}`} line={line} />
        ))}
      </section>
    </>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-2 py-2">
      <p className="tabular truncate font-semibold">{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
    </div>
  );
}
