# EdgeBoard

A mobile-first web app that pulls NFL and college football odds from every major US book, removes the vig, builds a
sharp-weighted consensus, and surfaces the sides where a book's price beats that consensus (positive expected value).

## Quick start

```bash
cp .env.example .env.local   # add ODDS_API_KEY to use live odds; leave blank for the sample slate
npm install
npm run dev                  # http://localhost:3000
```

```bash
npm test        # engine unit tests (vitest)
npm run typecheck
npm run build
```

Live odds come from [The Odds API](https://the-odds-api.com). The free tier is 500 requests a month; fetches are cached
for `ODDS_CACHE_SECONDS` (default 10 minutes) and each league is one request, so that covers a full season of casual use.

## Layout

```
src/lib/odds/
  types.ts     Raw API shapes (shared by live + mock) and analyzed shapes
  math.ts      American/decimal conversion, implied probability, de-vig (power + multiplicative), EV, Kelly
  analyze.ts   Consensus per line, best price per side, value picks, projected winner
  mock.ts      Deterministic sample slate with a few deliberately stale prices
  provider.ts  Live fetch with cache + quota headers, mock fallback
  index.ts     loadLeague(): one call that returns games + picks
src/app/
  [league]/            Value picks (default view)
  [league]/board/      Full board with best price per side
  [league]/game/[id]/  Every book, every line, consensus and rationale
  api/odds/[league]/   JSON for the same data
  about/               Methodology
```

## How a pick is chosen

1. Every book's two-way market (ML, spread at a given point, total at a given number) is de-vigged with the power method.
2. The fair probabilities are averaged with sharp books weighted ~3x (`BOOK_WEIGHTS` in `analyze.ts`).
3. Each book's price is scored: `EV = fair * decimal - 1`.
4. The best price per side becomes a pick when EV >= 2% and at least 3 books price the line.
5. Picks are graded A/B/C from EV, book count and whether a sharp book confirms the side, and show a quarter-Kelly stake.

The projected winner of each game is simply the side with the higher consensus moneyline probability.

## Roadmap

- [ ] Line-movement tracking: persist snapshots (SQLite/Postgres) and show opening vs. current, steam moves and reverse line movement.
- [ ] Push chart for key numbers so a -3 can be graded against a -3.5 market.
- [ ] Independent power-rating model (Elo / margin-based) blended with the market consensus to find edges the market has not priced.
- [ ] Context signals: injuries, weather, rest days, travel.
- [ ] Bet tracker with closing-line-value (CLV) grading, the honest measure of whether picks are good.
- [ ] Alerts (web push) when a new A-grade edge appears.
- [ ] Player props and alternate lines.

## Deploy in three minutes (Vercel)

1. Go to https://vercel.com/new and import `jztiger/football`.
2. Under Environment Variables add `ODDS_API_KEY` with your key from the-odds-api.com.
3. Deploy. Open the URL on your phone and use "Add to Home Screen" for the app-style install.

Never commit the key: it belongs in `.env.local` locally and in Vercel's environment settings in production.
