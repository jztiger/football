export default function AboutPage() {
  return (
    <article className="prose-sm space-y-4 text-sm leading-relaxed">
      <h1 className="text-xl font-bold">How the picks are made</h1>
      <p>
        EdgeBoard does not try to out-predict the market with a secret model. It finds the places where one sportsbook
        disagrees with the market as a whole, because that disagreement is the most reliable source of value a bettor has.
      </p>
      <Step n={1} title="Pull every book's price">
        Moneylines, spreads and totals for every NFL and college game from every available US book, refreshed on a
        cache window so the free API quota lasts.
      </Step>
      <Step n={2} title="Remove the vig">
        Each book's two-way market is converted to probabilities and the margin is stripped with the power method, which
        takes more juice off favorites than longshots, matching how books actually shade lines.
      </Step>
      <Step n={3} title="Build a sharp-weighted consensus">
        Fair probabilities are averaged across books, with low-margin books like Pinnacle and Circa counted roughly
        three times as much as recreational books. That consensus is the engine's estimate of the true probability.
      </Step>
      <Step n={4} title="Price every side against it">
        Expected value is the consensus probability times the book's decimal payout, minus one. Sides with at least
        +2% EV across three or more books become picks, graded A to C by edge size, book count and sharp confirmation.
      </Step>
      <Step n={5} title="Size the bet">
        Each pick shows a quarter-Kelly stake. Full Kelly is too aggressive for noisy edges; a quarter keeps variance sane.
      </Step>
      <p className="text-muted">
        Caveats: a line hung at a different number than the market (−3 against a −3.5 consensus) is not graded, because
        pricing half points needs a push chart. Lines priced by fewer than three books are shown but never picked. Nothing
        here is financial advice.
      </p>
    </article>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-border bg-surface p-4">
      <h2 className="font-semibold">
        <span className="mr-2 text-accent">{n}</span>
        {title}
      </h2>
      <p className="mt-1 text-muted">{children}</p>
    </section>
  );
}
