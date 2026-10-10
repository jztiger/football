import type { LineAnalysis } from "@/lib/odds";
import { formatAmerican, formatPoint, pct, SHARP_BOOKS } from "@/lib/odds";

export function OddsTable({ line }: { line: LineAnalysis }) {
  const books = [...new Set(line.prices.map((p) => p.book))];
  const bySide = (book: string, i: 0 | 1) => line.prices.find((p) => p.book === book && p.name === line.sides[i]);
  const title =
    line.market === "h2h"
      ? "Moneyline"
      : line.market === "spreads"
        ? `Spread ${formatPoint(line.point, "spreads")}`
        : `Total ${line.point}`;

  return (
    <section className="rounded-xl border border-border bg-surface">
      <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <h3 className="font-semibold">{title}</h3>
        <span className="text-xs text-muted">{line.bookCount} books{line.bookCount < 3 ? " · too thin to grade" : ""}</span>
      </header>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 px-4 py-2 text-xs text-muted">
        <span>Consensus fair</span>
        <span className="tabular text-right">{pct(line.fair[0])}</span>
        <span className="tabular text-right">{pct(line.fair[1])}</span>
        <span className="col-span-3 mt-1 grid grid-cols-subgrid border-t border-border pt-2 font-medium text-text">
          <span>Book</span>
          <span className="text-right">{line.sides[0]}</span>
          <span className="text-right">{line.sides[1]}</span>
        </span>
      </div>
      <ul className="divide-y divide-border">
        {books.map((book) => {
          const a = bySide(book, 0);
          const b = bySide(book, 1);
          return (
            <li key={book} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-2 text-sm">
              <span className="truncate">
                {a?.bookTitle ?? book}
                {SHARP_BOOKS.has(book) && <span className="ml-1 rounded bg-surface-2 px-1 text-[10px] text-muted">sharp</span>}
              </span>
              <Price side={a} best={line.best[0]?.book === book} />
              <Price side={b} best={line.best[1]?.book === book} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Price({ side, best }: { side?: LineAnalysis["prices"][number]; best: boolean }) {
  if (!side) return <span className="text-right text-muted">—</span>;
  const good = side.ev >= 0.02;
  return (
    <span className={`tabular text-right ${best ? "font-bold" : ""} ${good ? "text-accent" : ""}`}>
      {formatAmerican(side.price)}
      <span className={`ml-1 text-[10px] ${side.ev >= 0 ? "text-accent" : "text-muted"}`}>{side.ev >= 0 ? "+" : ""}{(side.ev * 100).toFixed(1)}</span>
    </span>
  );
}
