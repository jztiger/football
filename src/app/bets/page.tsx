import { loadGradedBets, summarize, type GradedBet, type LegResult } from "@/lib/bets";
import { formatAmerican, pct } from "@/lib/odds";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  won: "bg-accent text-bg",
  lost: "bg-danger/20 text-danger",
  push: "bg-surface-2 text-muted",
  pending: "bg-warn/15 text-warn",
};

const LEG_MARK: Record<LegResult, string> = { won: "✓", lost: "✗", push: "–", pending: "·" };

function money(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}

export default async function BetsPage() {
  const { bets, scoreErrors } = await loadGradedBets();
  const s = summarize(bets);
  const hasKey = Boolean(process.env.ODDS_API_KEY);

  return (
    <>
      <h1 className="text-xl font-bold">Bet tracker</h1>
      <p className="mb-3 text-sm text-muted">Legs grade themselves from final scores. Props need a manual result.</p>

      {!hasKey && (
        <div className="mb-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          <strong>No API key.</strong> Auto-grading is off until <code>ODDS_API_KEY</code> is set.
        </div>
      )}
      {hasKey && scoreErrors.length > 0 && (
        <div className="mb-3 rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-xs text-danger">
          Score fetch failed: {scoreErrors.join("; ")}
        </div>
      )}

      <div className="mb-4 grid grid-cols-3 gap-2 text-center text-sm">
        <Tile label="Record" value={`${s.record.won}-${s.record.lost}${s.record.push ? `-${s.record.push}` : ""}`} />
        <Tile label="Settled P&L" value={money(s.profit)} tone={s.profit > 0 ? "good" : s.profit < 0 ? "bad" : undefined} />
        <Tile label="Pending to win" value={money(s.pendingToWin)} sub={`${money(s.pendingStake)} at risk`} />
      </div>

      <ul className="space-y-3">
        {bets.map((b) => (
          <li key={b.id}>
            <BetCard bet={b} />
          </li>
        ))}
      </ul>

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Add tickets in <code>src/data/bets.json</code>. Each leg needs the full team names from the odds feed so it can be matched to
        a final. Set <code>result</code> on a leg to override auto-grading. Expected profit uses the consensus fair probability at
        placement, so over time it shows whether the tickets were priced well regardless of how they landed.
      </p>
    </>
  );
}

function BetCard({ bet }: { bet: GradedBet }) {
  const kind = bet.legs.length > 1 ? `${bet.legs.length}-team parlay` : bet.legs[0].market === "prop" ? "Prop" : "Straight";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted">
            {bet.book} · {kind} · {new Date(bet.placedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles" })}
          </p>
          <p className="tabular mt-0.5 text-lg font-semibold">
            {money(bet.stake)} <span className="text-muted">to win</span> {money(bet.toWin)}
          </p>
        </div>
        <span className={`rounded-md px-2 py-0.5 text-xs font-bold uppercase ${STATUS_STYLE[bet.status]}`}>{bet.status}</span>
      </div>

      <ul className="mt-3 divide-y divide-border">
        {bet.legs.map((leg, i) => (
          <li key={i} className="flex items-start gap-3 py-2 text-sm">
            <span className={`mt-0.5 w-4 shrink-0 text-center font-bold ${leg.result === "won" ? "text-accent" : leg.result === "lost" ? "text-danger" : "text-muted"}`}>
              {LEG_MARK[leg.result]}
            </span>
            <div className="min-w-0 flex-1">
              <p className={leg.result === "lost" ? "text-muted line-through" : ""}>{leg.label}</p>
              <p className="text-[11px] text-muted">
                {leg.score ?? (leg.result === "pending" ? "pending" : leg.result)}
                {leg.fairAtPlacement !== undefined ? ` · fair ${pct(leg.fairAtPlacement)} at ${formatAmerican(leg.price)}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex items-center justify-between text-xs text-muted">
        <span>#{bet.id}</span>
        {bet.status !== "pending" ? (
          <span className={bet.profit >= 0 ? "text-accent" : "text-danger"}>{bet.profit >= 0 ? "+" : ""}{money(bet.profit)}</span>
        ) : bet.expectedProfit !== undefined ? (
          <span>expected {bet.expectedProfit >= 0 ? "+" : ""}{money(bet.expectedProfit)}</span>
        ) : null}
      </div>
      {bet.notes && <p className="mt-2 text-[11px] text-warn">{bet.notes}</p>}
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-2 py-2">
      <p className={`tabular font-semibold ${tone === "good" ? "text-accent" : tone === "bad" ? "text-danger" : ""}`}>{value}</p>
      <p className="text-[11px] text-muted">{label}</p>
      {sub && <p className="text-[10px] text-muted">{sub}</p>}
    </div>
  );
}
