import dayjs from "dayjs";
import isoWeek from "dayjs/plugin/isoWeek.js";
import type { Period } from "../types.js";

dayjs.extend(isoWeek);

export type PaceStatus = "on_track" | "slightly_fast" | "fast" | "over" | "under";

function dayProgressFraction(now: dayjs.Dayjs): number {
  const elapsedSeconds = now.diff(now.startOf("day"), "second", true);
  return Math.min(1, Math.max(0, elapsedSeconds / (24 * 60 * 60)));
}

export function getPeriodProgressPct(period: Period, now = dayjs()): number {
  const progressToday = dayProgressFraction(now);

  if (period === "daily") {
    return Number((progressToday * 100).toFixed(2));
  }

  if (period === "weekly") {
    const dayOffset = now.isoWeekday() - 1;
    return Number(((((dayOffset + progressToday) / 7) * 100)).toFixed(2));
  }

  const daysInMonth = now.daysInMonth();
  const dayOffset = now.date() - 1;
  return Number(((((dayOffset + progressToday) / daysInMonth) * 100)).toFixed(2));
}

export function getPaceStatus(usedPct: number, progressPct: number): PaceStatus {
  const delta = usedPct - progressPct;
  return delta > 25 ? "over" : delta > 10 ? "fast" : delta > 4 ? "slightly_fast" : delta < -8 ? "under" : "on_track";
}
