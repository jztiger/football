import Link from "next/link";
import { formatAmerican, loadLeague, pct, type League } from "@/lib/odds";
import { bestParlays, candidateLegs, type Parlay } from "@/lib/odds/parlay";
import { formatKickoff } from "@/lib/format";

export const dynamic = "force-dynamic";

const LEG_OPTIONS = [2, 3, 4];
const LEAGUE_OPTIONS: { key: "all" | League; label: string }[] = [
  { key: "all", label: "All" },
  { key: "nfl", label: "NFL" },
  { key: "ncaaf", label: "College" },
];

type Search = { book?: string; legs?: string; league?: string };

export default async function ParlayPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const legs = LEG_OPTIONS.includes(Number(sp.legs)) ? Number(sp.legs) : 3;
  const leagueFilter = sp.league === "nfl" || sp.league === "ncaaf" ? sp.league : "all";
  const book = sp.book && sp.book !== "best" ? sp.book : undefined;

  const boards = await Promise.all(
    (["nfl", "ncaaf"] as const).filter((l) => leagueFilter === "all" || l === leagueFilter).map((l) => loadLeague(l)),
  );
  const games = boards.flatMap((b) => b.games);
  const sample = boards.some((b) => b.snapshot.source === "mock");

  const books = new Map<string, string>();
  for (const g of games) for (const l of g.lines) for (const p of l.prices) books.set(p.book, p.bookTitle);
  const bookList = [...books.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const bookInFeed = book ? books.has(book) : false;

  const now = new Date();
  const candidates = candidateLegs(games, { book, now });
  const parlays = bestParlays(candidates, legs, 5);

  const href = (patch: Partial<Search>) => {
    const q = new URLSearchParams({ book: book ?? "best", legs: String(legs), league: leagueFilter, ...patch });
    return `/parlay?${q.toString()}`;
  };

  return (
    <>
      <h1 className="text-xl font-bold">Parlay builder</h1>
      <p className="mb-3 text-sm text-muted">
        Best {legs}-leg combinations by expected value, one leg per game, priced at the book you pick.
      </p>
      {sample && (
        <div className="mb-3 rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
          <strong>Sample data.</strong> Set <code>ODDS_API_KEY</code> to build from live prices.
        </div>
      )}

      <div className="mb-4 space-y-2">
        <Chips label="Legs" items={LEG_OPTIONS.map((n) => ({ key: String(n), label: String(n), active: n === legs, href: href({ legs: String(n) }) }))} />
        <Chips label="Games" items={LEAGUE_OPTIONS.map((o) => ({ key: o.key, label: o.label, active: o.key === leagueFilter, href: href({ league: o.key }) }))} />
        <Chips
          label="Book"
          items={[
            { key: "best", label: "Best price", active: !book, href: href({ book: "best" }) },
            ...bookList.map(([k, t]) => ({ key: k, label: t, active: k === book, href: href({ book: k }) })),
            ...(book && !bookInFeed ? [{ key: book, label: book, active: true, href: href({ book }) }] : []),
          ]}
        />
      </div>

      {book && !bookInFeed && (
        <p className="mb-3 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
          <span className="font-medium text-text">{book}</span> is not in the odds feed, so legs are priced at the best available
          book. Treat those prices as a target: compare against the counter and skip any leg where the number or juice is worse.
        </p>
      )}

      {parlays.length === 0 ? (
        <p className="rounded-xl border border-border bg-surface p-6 text-center text-sm text-muted">
          Not enough upcoming games with three or more books to build a {legs}-leg parlay.
        </p>
      ) : (
        <ol className="space-y-3">
          {parlays.map((p, i) => (
            <li key={i}>
              <ParlayCard parlay={p} rank={i + 1} />
            </li>
          ))}
        </ol>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-muted">
        Legs are ranked by fair probability times payout, so a parlay's EV is the product of its legs. When no leg on the board is
        +EV on its own, every parlay is -EV; the top result is then the one that gives away the least. Huge favorites (fair
        probability above 80%) are excluded because they add almost no payout for the risk.
      </p>
    </>
  );
}

function Chips({ label, items }: { label: string; items: { key: string; label: string; active: boolean; href: string }[] }) {
  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      <span className="w-12 shrink-0 text-xs text-muted">{label}</span>
      <div className="flex gap-1.5">
        {items.map((it) => (
          <Link
            key={it.key}
            href={it.href}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium ${it.active ? "bg-accent text-bg" : "bg-surface text-muted"}`}
          >
            {it.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function ParlayCard({ parlay, rank }: { parlay: Parlay; rank: number }) {
  const evColor = parlay.ev >= 0 ? "text-accent" : "text-warn";
  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted">#{rank}</p>
          <p className="tabular text-2xl font-bold">{formatAmerican(parlay.american)}</p>
          <p className="text-xs text-muted">pays {parlay.decimal.toFixed(2)}x · hits {pct(parlay.prob)} of the time</p>
        </div>
        <div className="text-right">
          <p className={`tabular text-xl font-bold ${evColor}`}>
            {parlay.ev >= 0 ? "+" : ""}
            {pct(parlay.ev)}
          </p>
          <p className="text-[11px] text-muted">EV</p>
        </div>
      </div>
      <ul className="mt-3 divide-y divide-border">
        {parlay.legs.map((leg) => (
          <li key={`${leg.gameId}-${leg.label}`} className="py-2">
            <div className="flex items-center justify-between gap-3">
              <Link href={`/${leg.league}/game/${leg.gameId}`} className="min-w-0">
                <p className="truncate font-medium">{leg.label}</p>
                <p className="truncate text-xs text-muted">{leg.matchup}</p>
              </Link>
              <div className="shrink-0 text-right">
                <p className="tabular font-semibold">{formatAmerican(leg.side.price)}</p>
                <p className="text-[11px] text-muted">
                  {leg.side.bookTitle}
                  {leg.proxyPrice ? "*" : ""} · fair {pct(leg.fair)}
                </p>
              </div>
            </div>
            <p className="mt-0.5 text-[11px] text-muted">{formatKickoff(leg.commenceTime)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
