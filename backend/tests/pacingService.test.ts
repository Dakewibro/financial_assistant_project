import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPaceStatus, getPeriodProgressPct } from "../src/services/pacingService.js";

describe("pacingService", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-16T04:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes progress against the correct period", () => {
    expect(getPeriodProgressPct("daily")).toBeCloseTo(50, 1);
    expect(getPeriodProgressPct("weekly")).toBeCloseTo(50, 1);
    expect(getPeriodProgressPct("monthly")).toBeGreaterThan(50);
  });

  it("classifies pace relative to the active period progress", () => {
    expect(getPaceStatus(40, 50)).toBe("under");
    expect(getPaceStatus(56, 50)).toBe("slightly_fast");
    expect(getPaceStatus(65, 50)).toBe("fast");
    expect(getPaceStatus(80, 50)).toBe("over");
  });
});
