import Link from "next/link";
import type { ValuePick } from "@/lib/odds";
import { formatAmerican, pct } from "@/lib/odds";
import { formatKickoff } from "@/lib/format";

const GRADE_STYLE: Record<ValuePick["grade"], string> = {
  A: "bg-accent text-bg",
  B: "bg-accent-dim text-accent",
  C: "bg-surface-2 text-muted",
};

const MARKET_LABEL = { h2h: "Moneyline", spreads: "Spread", totals: "Total" } as const;

export function PickCard({ pick, rank }: { pick: ValuePick; rank: number }) {
  return (
    <Link
      href={`/${pick.league}/game/${pick.gameId}`}
      className="block rounded-xl border border-border bg-surface p-4 active:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted">
            #{rank} · {MARKET_LABEL[pick.market]} · {pick.matchup}
          </p>
          <p className="mt-1 truncate text-lg font-semibold">{pick.label}</p>
          <p className="text-sm text-muted">
            {pick.side.bookTitle} <span className="tabular font-medium text-text">{formatAmerican(pick.side.price)}</span>
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${GRADE_STYLE[pick.grade]}`}>{pick.grade}</span>
          <span className="tabular text-xl font-bold text-accent">+{pct(pick.side.ev)}</span>
          <span className="text-[11px] text-muted">EV</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="Fair" value={pct(pick.fair)} />
        <Stat label="Implied" value={pct(pick.side.implied)} />
        <Stat label="¼ Kelly" value={pct(pick.side.kelly / 4)} />
      </div>
      <p className="mt-3 text-[11px] text-muted">
        {formatKickoff(pick.commenceTime)} · {pick.bookCount} books
      </p>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2 py-1.5">
      <p className="tabular font-semibold">{value}</p>
      <p className="text-muted">{label}</p>
    </div>
  );
}
