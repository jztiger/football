import {
  americanToDecimal,
  devig,
  expectedValue,
  formatAmerican,
  formatPoint,
  impliedProbability,
  kellyFraction,
  pct,
} from "./math";
import type {
  GameAnalysis,
  League,
  LineAnalysis,
  MarketKey,
  PricedSide,
  RawBookmaker,
  RawGame,
  ValuePick,
} from "./types";

/**
 * How much each bookmaker's de-vigged line counts toward the consensus.
 * Sharp, low-margin books that take big action are the best estimate of
 * "true" probability; recreational books trail them.
 */
export const BOOK_WEIGHTS: Record<string, number> = {
  pinnacle: 3,
  circasports: 2.5,
  betfair_ex_us: 2,
  betfair_ex_eu: 2,
  betfair_ex_uk: 2,
  betonlineag: 1.5,
  bookmaker: 1.5,
  lowvig: 1.5,
};
const DEFAULT_WEIGHT = 1;
export const SHARP_BOOKS = new Set(["pinnacle", "circasports", "betonlineag", "bookmaker"]);

export interface AnalyzeOptions {
  /** Lines priced by fewer books than this are shown but never become picks. */
  minBooks?: number;
  /** Minimum EV (per unit staked) for a side to become a pick. 0.02 = +2%. */
  minEv?: number;
  /** Only consider games starting after this time. */
  now?: Date;
}

const DEFAULTS: Required<AnalyzeOptions> = {
  minBooks: 3,
  minEv: 0.02,
  now: new Date(0),
};

interface BookLine {
  book: RawBookmaker;
  prices: [number, number]; // American price for side 0 and side 1
}

/** Collapse every book's two-way market into keyed lines: market|point -> per-book prices. */
function collectLines(game: RawGame): Map<string, { market: MarketKey; point?: number; sides: [string, string]; books: BookLine[] }> {
  const lines = new Map<string, { market: MarketKey; point?: number; sides: [string, string]; books: BookLine[] }>();

  for (const book of game.bookmakers) {
    for (const market of book.markets) {
      if (market.key === "h2h") {
        const home = market.outcomes.find((o) => o.name === game.home_team);
        const away = market.outcomes.find((o) => o.name === game.away_team);
        if (!home || !away) continue;
        push(lines, "h2h", undefined, [game.home_team, game.away_team], book, [home.price, away.price]);
      } else if (market.key === "spreads") {
        const home = market.outcomes.find((o) => o.name === game.home_team && o.point !== undefined);
        const away = market.outcomes.find((o) => o.name === game.away_team && o.point !== undefined);
        if (!home || !away || home.point === undefined || away.point === undefined) continue;
        if (Math.abs(home.point + away.point) > 1e-9) continue; // malformed pair
        push(lines, "spreads", home.point, [game.home_team, game.away_team], book, [home.price, away.price]);
      } else if (market.key === "totals") {
        const over = market.outcomes.find((o) => o.name === "Over" && o.point !== undefined);
        const under = market.outcomes.find((o) => o.name === "Under" && o.point !== undefined);
        if (!over || !under || over.point !== under.point) continue;
        push(lines, "totals", over.point, ["Over", "Under"], book, [over.price, under.price]);
      }
    }
  }
  return lines;
}

function push(
  lines: Map<string, { market: MarketKey; point?: number; sides: [string, string]; books: BookLine[] }>,
  market: MarketKey,
  point: number | undefined,
  sides: [string, string],
  book: RawBookmaker,
  prices: [number, number],
) {
  const key = `${market}|${point ?? ""}`;
  const entry = lines.get(key) ?? { market, point, sides, books: [] };
  entry.books.push({ book, prices });
  lines.set(key, entry);
}

export function analyzeLine(
  market: MarketKey,
  point: number | undefined,
  sides: [string, string],
  books: BookLine[],
): LineAnalysis {
  // Per-book de-vigged probabilities, then a weighted consensus.
  let weightSum = 0;
  let fairSum = 0;
  const perBook: { bl: BookLine; fair: [number, number] }[] = [];
  for (const bl of books) {
    const implied = bl.prices.map(impliedProbability);
    const [f0, f1] = devig(implied);
    const w = BOOK_WEIGHTS[bl.book.key] ?? DEFAULT_WEIGHT;
    weightSum += w;
    fairSum += w * f0;
    perBook.push({ bl, fair: [f0, f1] });
  }
  const fair0 = fairSum / weightSum;
  const fair: [number, number] = [fair0, 1 - fair0];

  const prices: PricedSide[] = [];
  for (const { bl, fair: bookFair } of perBook) {
    for (const i of [0, 1] as const) {
      const price = bl.prices[i];
      prices.push({
        book: bl.book.key,
        bookTitle: bl.book.title,
        name: sides[i],
        point: point === undefined ? undefined : i === 0 ? point : market === "spreads" ? -point : point,
        price,
        decimal: americanToDecimal(price),
        implied: impliedProbability(price),
        fairAtBook: bookFair[i],
        ev: expectedValue(fair[i], price),
        edge: fair[i] - impliedProbability(price),
        kelly: kellyFraction(fair[i], price),
      });
    }
  }

  const bestFor = (name: string) =>
    prices.filter((p) => p.name === name).sort((a, b) => b.decimal - a.decimal)[0];

  return {
    market,
    point,
    sides,
    fair,
    bookCount: books.length,
    prices,
    best: [bestFor(sides[0]), bestFor(sides[1])],
  };
}

export function analyzeGame(game: RawGame, league: League): GameAnalysis {
  const collected = collectLines(game);
  const lines = [...collected.values()]
    .map((l) => analyzeLine(l.market, l.point, l.sides, l.books))
    .sort((a, b) => {
      const order: Record<MarketKey, number> = { h2h: 0, spreads: 1, totals: 2 };
      if (order[a.market] !== order[b.market]) return order[a.market] - order[b.market];
      if (a.bookCount !== b.bookCount) return b.bookCount - a.bookCount;
      return (a.point ?? 0) - (b.point ?? 0);
    });

  const h2h = lines.find((l) => l.market === "h2h");
  const mainSpread = lines.find((l) => l.market === "spreads");
  const mainTotal = lines.find((l) => l.market === "totals");

  return {
    id: game.id,
    league,
    commenceTime: game.commence_time,
    home: game.home_team,
    away: game.away_team,
    lines,
    homeWinProb: h2h?.fair[0],
    consensusSpread: mainSpread?.point,
    consensusTotal: mainTotal?.point,
    bookCount: game.bookmakers.length,
  };
}

function gradePick(ev: number, bookCount: number, hasSharp: boolean): ValuePick["grade"] {
  const score = ev * 100 + (bookCount >= 6 ? 1 : 0) + (hasSharp ? 1 : 0);
  if (score >= 6) return "A";
  if (score >= 4) return "B";
  return "C";
}

export function labelFor(side: PricedSide, market: MarketKey): string {
  if (market === "h2h") return `${side.name} ML`;
  if (market === "totals") return `${side.name} ${side.point}`;
  return `${side.name} ${formatPoint(side.point, market)}`;
}

export function findValuePicks(games: GameAnalysis[], opts: AnalyzeOptions = {}): ValuePick[] {
  const { minBooks, minEv, now } = { ...DEFAULTS, ...opts };
  const picks: ValuePick[] = [];

  for (const game of games) {
    if (new Date(game.commenceTime) < now) continue;
    for (const line of game.lines) {
      if (line.bookCount < minBooks) continue;
      for (const i of [0, 1] as const) {
        const best = line.best[i];
        if (!best || best.ev < minEv) continue;
        const fair = line.fair[i];
        const sharp = line.prices.filter((p) => p.name === best.name && SHARP_BOOKS.has(p.book));
        const rationale = [
          `Consensus fair win probability ${pct(fair)} across ${line.bookCount} books (de-vigged, sharp-weighted).`,
          `${best.bookTitle} is offering ${formatAmerican(best.price)}, an implied ${pct(best.implied)}. That is a ${pct(best.edge)} gap in your favor.`,
        ];
        if (sharp.length) {
          const s = sharp[0];
          rationale.push(`Sharp reference (${s.bookTitle}) prices this side at ${formatAmerican(s.price)}.`);
        }
        rationale.push(`Suggested stake: ${pct(best.kelly / 4)} of bankroll (quarter Kelly).`);

        picks.push({
          gameId: game.id,
          league: game.league,
          commenceTime: game.commenceTime,
          matchup: `${game.away} @ ${game.home}`,
          market: line.market,
          label: labelFor(best, line.market),
          side: best,
          fair,
          bookCount: line.bookCount,
          grade: gradePick(best.ev, line.bookCount, sharp.length > 0),
          rationale,
        });
      }
    }
  }

  return picks.sort((a, b) => b.side.ev - a.side.ev);
}

/** The engine's straight-up winner for a game, from the consensus moneyline. */
export function projectedWinner(game: GameAnalysis): { team: string; prob: number } | undefined {
  if (game.homeWinProb === undefined) return undefined;
  return game.homeWinProb >= 0.5
    ? { team: game.home, prob: game.homeWinProb }
    : { team: game.away, prob: 1 - game.homeWinProb };
}
