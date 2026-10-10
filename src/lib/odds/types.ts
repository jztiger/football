/**
 * Core data shapes. The raw shapes mirror The Odds API v4 response so a
 * live fetch and the mock provider produce identical input to the engine.
 */

export type League = "nfl" | "ncaaf";

export const LEAGUES: Record<League, { sportKey: string; label: string; short: string }> = {
  nfl: { sportKey: "americanfootball_nfl", label: "NFL", short: "NFL" },
  ncaaf: { sportKey: "americanfootball_ncaaf", label: "College Football", short: "CFB" },
};

export type MarketKey = "h2h" | "spreads" | "totals";

export interface RawOutcome {
  name: string; // team name, or "Over" / "Under"
  price: number; // American odds, e.g. -110
  point?: number; // spread or total line
}

export interface RawMarket {
  key: MarketKey;
  last_update: string;
  outcomes: RawOutcome[];
}

export interface RawBookmaker {
  key: string;
  title: string;
  last_update: string;
  markets: RawMarket[];
}

export interface RawGame {
  id: string;
  sport_key: string;
  sport_title: string;
  commence_time: string; // ISO
  home_team: string;
  away_team: string;
  bookmakers: RawBookmaker[];
}

/** One priced side of a line at one book, with the engine's verdict attached. */
export interface PricedSide {
  book: string;
  bookTitle: string;
  name: string;
  point?: number;
  price: number; // American
  decimal: number;
  implied: number; // vig-included implied probability
  fairAtBook: number; // this book's own de-vigged probability for the side
  ev: number; // expected value per 1 unit staked, using consensus fair prob
  edge: number; // consensusFair - implied
  kelly: number; // full-Kelly fraction (>= 0)
}

/** A specific line (market + point) with every book's price and the consensus. */
export interface LineAnalysis {
  market: MarketKey;
  point?: number;
  sides: [string, string]; // outcome names in a stable order
  fair: [number, number]; // consensus fair probabilities, sum to 1
  bookCount: number;
  prices: PricedSide[];
  best: [PricedSide | undefined, PricedSide | undefined]; // best price per side
}

export interface GameAnalysis {
  id: string;
  league: League;
  commenceTime: string;
  home: string;
  away: string;
  lines: LineAnalysis[];
  /** Consensus moneyline win probability for the home team, if an h2h market exists. */
  homeWinProb?: number;
  /** Market-consensus spread for the home team (negative = favored), if available. */
  consensusSpread?: number;
  consensusTotal?: number;
  bookCount: number;
}

export interface ValuePick {
  gameId: string;
  league: League;
  commenceTime: string;
  matchup: string;
  market: MarketKey;
  label: string; // e.g. "Chiefs -3.5" or "Over 47.5"
  side: PricedSide;
  fair: number;
  bookCount: number;
  grade: "A" | "B" | "C";
  rationale: string[];
}

export interface Snapshot {
  league: League;
  fetchedAt: string;
  source: "live" | "mock";
  games: RawGame[];
}
