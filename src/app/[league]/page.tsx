import { notFound } from "next/navigation";
import Link from "next/link";
import { isLeague, LEAGUES, loadLeague } from "@/lib/odds";
import { PickCard } from "@/components/PickCard";
import { SourceBanner } from "@/components/SourceBanner";

export const dynamic = "force-dynamic";

export default async function PicksPage({ params }: { params: Promise<{ league: string }> }) {
  const { league } = await params;
  if (!isLeague(league)) notFound();
  const board = await loadLeague(league);

  return (
    <>
      <h1 className="text-xl font-bold">{LEAGUES[league].label} value picks</h1>
      <p className="mb-3 text-sm text-muted">
        Sides where the best available price beats the sharp-weighted consensus by 2% EV or more.
      </p>
      <SourceBanner board={board} />

      {board.picks.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          No edges on the board right now. Lines are tight; check back closer to kickoff or browse the{" "}
          <Link href={`/${league}/board`} className="text-accent underline">
            full board
          </Link>
          .
        </div>
      ) : (
        <ul className="space-y-3">
          {board.picks.map((p, i) => (
            <li key={`${p.gameId}-${p.market}-${p.label}`}>
              <PickCard pick={p} rank={i + 1} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
