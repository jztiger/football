/** Kickoff windows, in US Eastern time since that is how football slates are quoted. */
export type Window = "any" | "today-early" | "today-late" | "today" | "tomorrow";

export const WINDOWS: { key: Window; label: string }[] = [
  { key: "any", label: "Any time" },
  { key: "today-early", label: "Today, before 6pm ET" },
  { key: "today-late", label: "Tonight, 6pm ET on" },
  { key: "today", label: "All today" },
  { key: "tomorrow", label: "Tomorrow" },
];

export function isWindow(value: string | undefined): value is Window {
  return WINDOWS.some((w) => w.key === value);
}

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "America/New_York",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "numeric",
  hour12: false,
});

function eastern(d: Date): { day: string; hour: number } {
  const parts = Object.fromEntries(fmt.formatToParts(d).map((p) => [p.type, p.value]));
  return { day: `${parts.year}-${parts.month}-${parts.day}`, hour: Number(parts.hour) % 24 };
}

export function inWindow(iso: string, window: Window, now = new Date()): boolean {
  if (window === "any") return true;
  const kick = new Date(iso);
  const k = eastern(kick);
  const today = eastern(now).day;
  if (window === "tomorrow") {
    const t = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return k.day === eastern(t).day;
  }
  if (k.day !== today) return false;
  if (window === "today") return true;
  return window === "today-early" ? k.hour < 18 : k.hour >= 18;
}

export function kickoffEastern(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/New_York",
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}
