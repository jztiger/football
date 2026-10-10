import { describe, expect, it } from "vitest";
import { inWindow } from "../window";

// Sat Oct 10 2026 17:46 UTC = 1:46pm ET
const now = new Date("2026-10-10T17:46:00Z");

describe("inWindow", () => {
  it("splits today at 6pm ET", () => {
    expect(inWindow("2026-10-10T19:30:00Z", "today-early", now)).toBe(true); // 3:30pm ET
    expect(inWindow("2026-10-10T19:30:00Z", "today-late", now)).toBe(false);
    expect(inWindow("2026-10-10T23:30:00Z", "today-late", now)).toBe(true); // 7:30pm ET
    expect(inWindow("2026-10-11T02:30:00Z", "today-late", now)).toBe(true); // 10:30pm ET Sat
    expect(inWindow("2026-10-11T02:30:00Z", "tomorrow", now)).toBe(false);
  });

  it("handles tomorrow and any", () => {
    expect(inWindow("2026-10-11T17:00:00Z", "tomorrow", now)).toBe(true); // Sun 1pm ET
    expect(inWindow("2026-10-11T17:00:00Z", "today", now)).toBe(false);
    expect(inWindow("2026-10-18T17:00:00Z", "any", now)).toBe(true);
  });
});
