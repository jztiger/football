import { NextResponse } from "next/server";
import { isLeague, loadLeague } from "@/lib/odds";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ league: string }> }) {
  const { league } = await params;
  if (!isLeague(league)) {
    return NextResponse.json({ error: "league must be nfl or ncaaf" }, { status: 404 });
  }
  const board = await loadLeague(league);
  return NextResponse.json({
    league,
    source: board.snapshot.source,
    fetchedAt: board.snapshot.fetchedAt,
    liveError: board.liveError,
    picks: board.picks,
    games: board.games,
  });
}
