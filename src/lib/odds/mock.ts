import type { League, RawBookmaker, RawGame } from "./types";
import { LEAGUES } from "./types";
import { probabilityToAmerican } from "./math";

/** Small deterministic PRNG so the sample slate is stable between reloads. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const BOOKS: { key: string; title: string; vig: number; noise: number }[] = [
  { key: "pinnacle", title: "Pinnacle", vig: 0.025, noise: 0.004 },
  { key: "draftkings", title: "DraftKings", vig: 0.045, noise: 0.012 },
  { key: "fanduel", title: "FanDuel", vig: 0.045, noise: 0.012 },
  { key: "betmgm", title: "BetMGM", vig: 0.047, noise: 0.015 },
  { key: "williamhill_us", title: "Caesars", vig: 0.047, noise: 0.015 },
  { key: "bovada", title: "Bovada", vig: 0.05, noise: 0.02 },
  { key: "betrivers", title: "BetRivers", vig: 0.047, noise: 0.018 },
];

interface Slate {
  home: string;
  away: string;
  homeSpread: number; // negative = home favored
  total: number;
  daysOut: number;
  hour: number; // UTC hour
  /** Optional deliberate stale line at one book to demonstrate a value spot. */
  stale?: { book: string; market: "h2h" | "spreads" | "totals"; shift: number };
}

const NFL: Slate[] = [
  { home: "Kansas City Chiefs", away: "Denver Broncos", homeSpread: -6.5, total: 44.5, daysOut: 2, hour: 20, stale: { book: "bovada", market: "spreads", shift: 1 } },
  { home: "Philadelphia Eagles", away: "Dallas Cowboys", homeSpread: -3, total: 47.5, daysOut: 2, hour: 17 },
  { home: "Buffalo Bills", away: "Miami Dolphins", homeSpread: -4.5, total: 50.5, daysOut: 2, hour: 17, stale: { book: "betrivers", market: "h2h", shift: 0.05 } },
  { home: "San Francisco 49ers", away: "Seattle Seahawks", homeSpread: -2.5, total: 45.5, daysOut: 2, hour: 20 },
  { home: "Detroit Lions", away: "Green Bay Packers", homeSpread: -1.5, total: 51, daysOut: 3, hour: 0, stale: { book: "betmgm", market: "totals", shift: 1.5 } },
  { home: "Baltimore Ravens", away: "Cincinnati Bengals", homeSpread: -3.5, total: 49, daysOut: 4, hour: 0 },
];

const NCAAF: Slate[] = [
  { home: "Georgia Bulldogs", away: "Tennessee Volunteers", homeSpread: -7.5, total: 52.5, daysOut: 1, hour: 19, stale: { book: "bovada", market: "spreads", shift: 1.5 } },
  { home: "Ohio State Buckeyes", away: "Penn State Nittany Lions", homeSpread: -6, total: 48.5, daysOut: 1, hour: 16 },
  { home: "Texas Longhorns", away: "Oklahoma Sooners", homeSpread: -10.5, total: 55, daysOut: 1, hour: 16, stale: { book: "betrivers", market: "totals", shift: -2 } },
  { home: "Oregon Ducks", away: "Washington Huskies", homeSpread: -9, total: 58.5, daysOut: 1, hour: 23 },
  { home: "Alabama Crimson Tide", away: "LSU Tigers", homeSpread: -4.5, total: 56.5, daysOut: 1, hour: 23, stale: { book: "williamhill_us", market: "h2h", shift: 0.06 } },
  { home: "Michigan Wolverines", away: "Wisconsin Badgers", homeSpread: -13.5, total: 43.5, daysOut: 1, hour: 19 },
  { home: "Notre Dame Fighting Irish", away: "USC Trojans", homeSpread: -3, total: 60.5, daysOut: 1, hour: 23 },
  { home: "Clemson Tigers", away: "Florida State Seminoles", homeSpread: -2.5, total: 49.5, daysOut: 1, hour: 19 },
];

/** Rough NFL/CFB conversion: ~3% win probability per point of spread near pick'em, flattening out. */
function spreadToHomeWinProb(homeSpread: number): number {
  const z = -homeSpread / 13.5; // ~13.5 point sd of margin
  return 1 / (1 + Math.exp(-1.7 * z));
}

function twoWay(p: number, vig: number): [number, number] {
  // Split the margin between both sides, proportional to probability (power-ish shading).
  const q = 1 - p;
  const scale = 1 + vig;
  return [p * scale, q * scale];
}

function clamp(p: number, lo = 0.03, hi = 0.97) {
  return Math.min(hi, Math.max(lo, p));
}

function round(n: number, step = 0.5) {
  return Math.round(n / step) * step;
}

export function buildMockGames(league: League, now = new Date()): RawGame[] {
  const slates = league === "nfl" ? NFL : NCAAF;
  const rand = mulberry32(league === "nfl" ? 20261010 : 20261011);
  const { sportKey, label } = LEAGUES[league];

  return slates.map((s, idx) => {
    const start = new Date(now);
    start.setUTCDate(start.getUTCDate() + s.daysOut);
    start.setUTCHours(s.hour, 0, 0, 0);
    const trueHomeProb = spreadToHomeWinProb(s.homeSpread);

    const bookmakers: RawBookmaker[] = BOOKS.map((b) => {
      const noise = () => (rand() - 0.5) * 2 * b.noise;
      const lastUpdate = new Date(now.getTime() - Math.floor(rand() * 3600_000)).toISOString();
      const stale = s.stale?.book === b.key ? s.stale : undefined;

      // Moneyline
      const pHome = clamp(trueHomeProb + noise() + (stale?.market === "h2h" ? -stale.shift : 0));
      const [mlH, mlA] = twoWay(pHome, b.vig);

      // Spread: books occasionally hang a half point different from the market.
      let homeSpread = s.homeSpread;
      if (rand() < 0.25) homeSpread += rand() < 0.5 ? 0.5 : -0.5;
      // A stale book keeps the old juice after the market has moved.
      const spreadDiff = homeSpread - s.homeSpread + (stale?.market === "spreads" ? stale.shift : 0);
      const pCover = clamp(0.5 - spreadDiff * 0.028 + noise());
      const [spH, spA] = twoWay(pCover, b.vig);

      // Totals
      let total = s.total;
      if (rand() < 0.25) total += rand() < 0.5 ? 0.5 : -0.5;
      const totalDiff = total - s.total + (stale?.market === "totals" ? stale.shift : 0);
      const pOver = clamp(0.5 - totalDiff * 0.03 + noise());
      const [ovr, und] = twoWay(pOver, b.vig);

      return {
        key: b.key,
        title: b.title,
        last_update: lastUpdate,
        markets: [
          {
            key: "h2h",
            last_update: lastUpdate,
            outcomes: [
              { name: s.home, price: probabilityToAmerican(clamp(mlH)) },
              { name: s.away, price: probabilityToAmerican(clamp(mlA)) },
            ],
          },
          {
            key: "spreads",
            last_update: lastUpdate,
            outcomes: [
              { name: s.home, price: probabilityToAmerican(clamp(spH)), point: round(homeSpread) },
              { name: s.away, price: probabilityToAmerican(clamp(spA)), point: -round(homeSpread) },
            ],
          },
          {
            key: "totals",
            last_update: lastUpdate,
            outcomes: [
              { name: "Over", price: probabilityToAmerican(clamp(ovr)), point: round(total) },
              { name: "Under", price: probabilityToAmerican(clamp(und)), point: round(total) },
            ],
          },
        ],
      };
    });

    return {
      id: `${league}-mock-${idx + 1}`,
      sport_key: sportKey,
      sport_title: label,
      commence_time: start.toISOString(),
      home_team: s.home,
      away_team: s.away,
      bookmakers,
    };
  });
}
