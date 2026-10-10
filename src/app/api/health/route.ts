import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Deployment diagnostics. Never returns the key itself. */
export function GET() {
  const key = process.env.ODDS_API_KEY ?? "";
  const suspiciousNames = Object.keys(process.env).filter(
    (k) => k !== "ODDS_API_KEY" && k.trim().toUpperCase().replace(/[^A-Z_]/g, "") === "ODDS_API_KEY",
  );
  return NextResponse.json({
    oddsApiKeyConfigured: key.trim().length > 0,
    oddsApiKeyLength: key.trim().length,
    similarlyNamedVars: suspiciousNames,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    gitBranch: process.env.VERCEL_GIT_COMMIT_REF ?? null,
    cacheSeconds: process.env.ODDS_CACHE_SECONDS ?? "600 (default)",
    regions: process.env.ODDS_REGIONS ?? "us (default)",
  });
}
