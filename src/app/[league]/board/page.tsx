import { notFound } from "next/navigation";
import { isLeague, LEAGUES, loadLeague } from "@/lib/odds";
import { GameCard } from "@/components/GameCard";
import { SourceBanner } from "@/components/SourceBanner";

export const dynamic = "force-dynamic";

export default async function BoardPage({ params }: { params: Promise<{ league: string }> }) {
  const { league } = await params;
  if (!isLeague(league)) notFound();
  const board = await loadLeague(league);

  return (
    <>
      <h1 className="text-xl font-bold">{LEAGUES[league].label} board</h1>
      <p className="mb-3 text-sm text-muted">Best price per side across every book, plus the projected winner.</p>
      <SourceBanner board={board} />
      {board.games.length === 0 ? (
        <p className="text-sm text-muted">No upcoming games returned for this league.</p>
      ) : (
        <ul className="space-y-3">
          {board.games.map((g) => (
            <li key={g.id}>
              <GameCard game={g} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
