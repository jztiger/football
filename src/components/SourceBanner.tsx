import type { LeagueBoard } from "@/lib/odds";
import { formatRelative } from "@/lib/format";

export function SourceBanner({ board }: { board: LeagueBoard }) {
  const { snapshot, liveError, quota } = board;
  if (snapshot.source === "live") {
    return (
      <p className="mb-3 text-xs text-muted">
        Live odds · updated {formatRelative(snapshot.fetchedAt)}
        {quota?.remaining ? ` · ${quota.remaining} API calls left this month` : ""}
      </p>
    );
  }
  return (
    <div className={`mb-3 rounded-lg border px-3 py-2 text-xs ${liveError ? "border-danger/50 bg-danger/10 text-danger" : "border-warn/40 bg-warn/10 text-warn"}`}>
      {liveError ? (
        <>
          <strong>Live odds fetch failed.</strong> Showing the sample slate instead. {liveError}
        </>
      ) : (
        <>
          <strong>Sample data.</strong> Set <code>ODDS_API_KEY</code> to pull the real board.
        </>
      )}
    </div>
  );
}
