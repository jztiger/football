import { americanToDecimal, decimalToAmerican, expectedValue } from "./math";
import { labelFor } from "./analyze";
import type { GameAnalysis, League, MarketKey, PricedSide } from "./types";

export interface ParlayLeg {
  gameId: string;
  league: League;
  matchup: string;
  commenceTime: string;
  market: MarketKey;
  label: string;
  side: PricedSide;
  fair: number;
  /** fair * decimal: >1 means +EV. Parlay EV is the product of these. */
  ratio: number;
  /** True when the price came from a different book than the one requested. */
  proxyPrice: boolean;
}

export interface Parlay {
  legs: ParlayLeg[];
  /** Combined fair probability of every leg hitting (legs treated as independent). */
  prob: number;
  decimal: number;
  american: number;
  ev: number;
}

export interface ParlayOptions {
  /** Bookmaker key whose prices to use. Falls back to the best available price when the book has no price. */
  book?: string;
  minBooks?: number;
  now?: Date;
  /** Only consider moneyline legs with a fair probability at or below this (keeps huge favorites out). */
  maxFair?: number;
  /** Keep this many legs per game before combining. */
  legsPerGame?: number;
}

const DEFAULTS = { minBooks: 3, maxFair: 0.8, legsPerGame: 2 };

/** Every bettable side on the board, priced at the chosen book, ranked by fair * decimal. */
export function candidateLegs(games: GameAnalysis[], opts: ParlayOptions = {}): ParlayLeg[] {
  const { book, minBooks, maxFair, now } = { ...DEFAULTS, ...opts };
  // If the requested book is in the feed at all, only use lines it actually hangs:
  // a proxy price on a different number would mislead someone standing at that window.
  const bookInFeed = Boolean(book) && games.some((g) => g.lines.some((l) => l.prices.some((p) => p.book === book)));
  const legs: ParlayLeg[] = [];
  for (const game of games) {
    if (now && new Date(game.commenceTime) < now) continue;
    for (const line of game.lines) {
      if (line.bookCount < minBooks) continue;
      for (const i of [0, 1] as const) {
        const name = line.sides[i];
        const atBook = book ? line.prices.find((p) => p.book === book && p.name === name) : undefined;
        if (bookInFeed && !atBook) continue;
        const side = atBook ?? line.best[i];
        if (!side) continue;
        const fair = line.fair[i];
        if (fair > maxFair) continue;
        legs.push({
          gameId: game.id,
          league: game.league,
          matchup: `${game.away} @ ${game.home}`,
          commenceTime: game.commenceTime,
          market: line.market,
          label: labelFor(side, line.market),
          side,
          fair,
          ratio: fair * side.decimal,
          proxyPrice: Boolean(book) && !atBook,
        });
      }
    }
  }
  return legs.sort((a, b) => b.ratio - a.ratio);
}

function scoreParlay(legs: ParlayLeg[]): Parlay {
  const prob = legs.reduce((p, l) => p * l.fair, 1);
  const decimal = legs.reduce((d, l) => d * l.side.decimal, 1);
  return {
    legs,
    prob,
    decimal,
    american: decimalToAmerican(decimal),
    ev: prob * decimal - 1,
  };
}

/**
 * Best parlays of `size` legs, one leg per game (same-game legs are correlated
 * and most books, Circa included, will not take them in a standard parlay).
 * Ranked by EV, which for independent legs is the product of each leg's
 * fair * decimal, minus one.
 */
export function bestParlays(legs: ParlayLeg[], size = 3, limit = 5, legsPerGame = DEFAULTS.legsPerGame): Parlay[] {
  // Keep the top few legs per game so the combination space stays small.
  const perGame = new Map<string, ParlayLeg[]>();
  for (const leg of legs) {
    const list = perGame.get(leg.gameId) ?? [];
    if (list.length < legsPerGame) list.push(leg);
    perGame.set(leg.gameId, list);
  }
  const groups = [...perGame.values()].sort((a, b) => b[0].ratio - a[0].ratio).slice(0, 14);
  if (groups.length < size) return [];

  const results: Parlay[] = [];
  const chosen: ParlayLeg[] = [];
  const walk = (start: number) => {
    if (chosen.length === size) {
      results.push(scoreParlay([...chosen]));
      return;
    }
    for (let g = start; g < groups.length; g++) {
      if (groups.length - g < size - chosen.length) break;
      for (const leg of groups[g]) {
        chosen.push(leg);
        walk(g + 1);
        chosen.pop();
      }
    }
  };
  walk(0);
  return results.sort((a, b) => b.ev - a.ev).slice(0, limit);
}

export function parlayFromAmerican(prices: number[], fairs: number[]): Parlay["ev"] {
  const prob = fairs.reduce((p, f) => p * f, 1);
  const decimal = prices.reduce((d, a) => d * americanToDecimal(a), 1);
  return prob * decimal - 1;
}

export { expectedValue };
