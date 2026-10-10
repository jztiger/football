"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

const LEAGUE_TABS = [
  { slug: "nfl", label: "NFL" },
  { slug: "ncaaf", label: "College" },
];

function currentLeague(pathname: string): string {
  const seg = pathname.split("/")[1];
  return seg === "ncaaf" ? "ncaaf" : "nfl";
}

function currentView(pathname: string): "picks" | "board" | "parlay" | "bets" | "about" {
  if (pathname.startsWith("/about")) return "about";
  if (pathname.startsWith("/bets")) return "bets";
  if (pathname.startsWith("/parlay")) return "parlay";
  if (pathname.split("/")[2] === "board") return "board";
  return "picks";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const league = currentLeague(pathname);
  const view = currentView(pathname);

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-20 border-b border-border bg-bg/90 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <Link href={`/${league}`} className="text-lg font-bold tracking-tight">
            <span className="text-accent">Edge</span>Board
          </Link>
          <nav className="flex rounded-full bg-surface p-1 text-sm">
            {LEAGUE_TABS.map((t) => {
              const active = t.slug === league && (view === "picks" || view === "board");
              const href = view === "board" ? `/${t.slug}/board` : `/${t.slug}`;
              return (
                <Link
                  key={t.slug}
                  href={href}
                  className={`rounded-full px-3 py-1 font-medium transition ${active ? "bg-accent text-bg" : "text-muted"}`}
                >
                  {t.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="flex-1 px-4 pb-24 pt-4">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 backdrop-blur"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 text-xs">
          <BottomTab href={`/${league}`} active={view === "picks"} label="Picks" icon="◆" />
          <BottomTab href={`/${league}/board`} active={view === "board"} label="Board" icon="▤" />
          <BottomTab href="/parlay" active={view === "parlay"} label="Parlay" icon="⛓" />
          <BottomTab href="/bets" active={view === "bets"} label="Bets" icon="🎟" />
          <BottomTab href="/about" active={view === "about"} label="Method" icon="?" />
        </div>
      </nav>
    </div>
  );
}

function BottomTab({ href, active, label, icon }: { href: string; active: boolean; label: string; icon: string }) {
  return (
    <Link href={href} className={`flex flex-col items-center gap-0.5 py-2.5 ${active ? "text-accent" : "text-muted"}`}>
      <span className="text-base leading-none">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}
