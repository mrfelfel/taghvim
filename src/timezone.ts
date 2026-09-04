import { DateTime, IANAZone } from "luxon";
import type { TemporalValue } from "./types.js";

const WEEKDAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

/**
 * Check if a timezone string is valid.
 */
export function isValidTimezone(tz: string): boolean {
  return IANAZone.isValidZone(tz);
}

/**
 * Get all known IANA timezone names.
 */
export function listTimezones(): string[] {
  try {
    const fn = (Intl as unknown as { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf;
    return fn ? fn("timeZone") : [];
  } catch {
    return [];
  }
}

function formatOffset(minutes: number): string {
  const sign = minutes >= 0 ? "+" : "-";
  const abs = Math.abs(minutes);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Get comprehensive timezone information.
 */
export function getTimezoneInfo(
  timezone: string,
  referenceTime?: string
): {
  timezone: string;
  isDST: boolean;
  abbreviation: string;
  utcOffset: string;
  hasDST: boolean;
  nextTransition: string | null;
  previousTransition: string | null;
  nextTransitionOffset: number | null;
  previousTransitionOffset: number | null;
} {
  if (!isValidTimezone(timezone)) {
    throw new Error(`Invalid timezone: ${timezone}`);
  }

  const now = referenceTime
    ? DateTime.fromISO(referenceTime, { zone: timezone })
    : DateTime.now().setZone(timezone);

  if (!now.isValid) {
    throw new Error(`Cannot resolve time in timezone: ${timezone}`);
  }

  const isDST = now.isInDST;
  const abbreviation = now.zoneName ?? "UTC";

  const hasDST = checkHasDST(timezone);

  const nextTrans = findNextTransition(timezone, now);
  const prevTrans = findPreviousTransition(timezone, now);

  return {
    timezone,
    isDST,
    abbreviation,
    utcOffset: formatOffset(now.offset),
    hasDST,
    nextTransition: nextTrans?.toISO() ?? null,
    previousTransition: prevTrans?.toISO() ?? null,
    nextTransitionOffset: nextTrans ? nextTrans.setZone(timezone).offset : null,
    previousTransitionOffset: prevTrans ? prevTrans.setZone(timezone).offset : null,
  };
}

/**
 * Find the next DST transition after a given time.
 */
function findNextTransition(
  timezone: string,
  from: DateTime
): DateTime | null {
  const baseOffset = from.offset;
  let probe = from;
  for (let i = 1; i <= 400; i++) {
    const next = from.plus({ days: i });
    const nextInTz = next.setZone(timezone);
    if (nextInTz.offset !== baseOffset) {
      return findExactTransition(timezone, probe, next, baseOffset);
    }
    probe = next;
  }
  return null;
}

/**
 * Find the previous DST transition before a given time.
 */
function findPreviousTransition(
  timezone: string,
  from: DateTime
): DateTime | null {
  const baseOffset = from.offset;
  let probe = from;
  for (let i = 1; i <= 400; i++) {
    const prev = from.minus({ days: i });
    const prevInTz = prev.setZone(timezone);
    if (prevInTz.offset !== baseOffset) {
      return findExactTransition(timezone, prev, probe, baseOffset);
    }
    probe = prev;
  }
  return null;
}

/**
 * Binary search for exact transition point between two DateTimes.
 */
function findExactTransition(
  timezone: string,
  lo: DateTime,
  hi: DateTime,
  targetOffset: number
): DateTime | null {
  for (let i = 0; i < 50; i++) {
    const diffMs = hi.toMillis() - lo.toMillis();
    const mid = DateTime.fromMillis(lo.toMillis() + diffMs / 2, { zone: timezone });
    if (mid.offset === targetOffset) {
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi.toMillis() - lo.toMillis() < 1000) break;
  }
  return hi;
}

/**
 * Check whether a timezone has DST by sampling months.
 */
function checkHasDST(timezone: string): boolean {
  const base = DateTime.fromISO("2026-01-01", { zone: timezone });
  const baseOffset = base.offset;
  for (let m = 0; m < 12; m++) {
    const candidate = base.plus({ months: m });
    if (candidate.offset !== baseOffset) return true;
  }
  return false;
}

/**
 * Convert a datetime from one timezone to another(s).
 */
export function convertTimezone(
  isoDatetime: string,
  fromTimezone: string,
  toTimezone: string | string[],
  calendar?: string
): TemporalValue | TemporalValue[] {
  if (!isValidTimezone(fromTimezone)) {
    throw new Error(`Invalid source timezone: ${fromTimezone}`);
  }

  const source = DateTime.fromISO(isoDatetime, { zone: fromTimezone });
  if (!source.isValid) {
    throw new Error(`Cannot parse datetime: ${isoDatetime} in ${fromTimezone}`);
  }

  const targets = Array.isArray(toTimezone) ? toTimezone : [toTimezone];
  const results: TemporalValue[] = [];

  for (const tz of targets) {
    if (!isValidTimezone(tz)) {
      throw new Error(`Invalid target timezone: ${tz}`);
    }
    const converted = source.setZone(tz);
    results.push({
      utc: source.toUTC().toISO()!,
      local: converted.toISO()!,
      date: converted.toISODate()!,
      time: converted.toISOTime()!,
      timezone: tz,
      timezoneAbbr: converted.zoneName ?? tz,
      utcOffset: converted.offset,
      weekday: converted.weekday,
      weekdayName: WEEKDAY_NAMES[converted.weekday - 1],
      calendar: (calendar as "gregorian") ?? "gregorian",
      precision: "second",
      dstActive: converted.isInDST,
    });
  }

  return Array.isArray(toTimezone) ? results : results[0];
}
