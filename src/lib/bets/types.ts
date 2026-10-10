import type { League } from "@/lib/odds";

export type LegMarket = "h2h" | "spreads" | "totals" | "prop";
export type LegResult = "won" | "lost" | "push" | "pending";
export type BetStatus = "won" | "lost" | "push" | "pending";

export interface BetLeg {
  label: string; // what the ticket says, e.g. "Tulsa +3 -105"
  market: LegMarket;
  league?: League;
  /** Full feed names so the leg can be matched to a final score. */
  team?: string;
  opponent?: string;
  /** Spread for the team (negative = laying points) or the total number. */
  point?: number;
  /** "Over" / "Under" for totals. */
  side?: "Over" | "Under";
  price: number; // American
  /** Consensus fair probability when the bet was placed, for EV tracking. */
  fairAtPlacement?: number;
  /** Manual override; auto-grading fills this in from scores when absent. */
  result?: LegResult;
}

export interface Bet {
  id: string; // ticket number
  book: string;
  placedAt: string; // ISO
  stake: number;
  legs: BetLeg[];
  /** What the ticket printed as "To Win", used to sanity-check the odds math. */
  toWin?: number;
  notes?: string;
}

export interface GradedLeg extends BetLeg {
  result: LegResult;
  score?: string; // "Tulsa 24, Navy 21" when graded from a final
}

export interface GradedBet extends Omit<Bet, "legs"> {
  legs: GradedLeg[];
  status: BetStatus;
  /** Potential profit on a win, with pushed legs removed. */
  toWin: number;
  /** Realized profit (negative = loss). Zero while pending. */
  profit: number;
  /** Expected profit at placement from the fair probabilities, when every leg has one. */
  expectedProfit?: number;
}
