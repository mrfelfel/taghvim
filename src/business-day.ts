import { DateTime } from "luxon";
import Holidays from "date-holidays";
import type { BusinessDayResult, WeekendDefinition } from "./types.js";

const hd = new Holidays();

// Country codes that use Fri-Sat weekend
const FRI_SAT_COUNTRIES = new Set([
  "AF", "BH", "DZ", "EG", "IQ", "IR", "IL", "JO", "KW", "LY",
  "OM", "PS", "QA", "SA", "SD", "SY", "AE", "YE",
]);

// Country codes that use Sun-Mon weekend (rare)
const SUN_MON_COUNTRIES = new Set(["MV"]);

// Luxon weekdays: 1=Monday, 2=Tuesday, ..., 6=Saturday, 7=Sunday
function getWeekendDays(countryCode: string): [number, number] {
  const cc = countryCode.toUpperCase();
  if (FRI_SAT_COUNTRIES.has(cc)) return [5, 6]; // Friday, Saturday
  if (SUN_MON_COUNTRIES.has(cc)) return [7, 1]; // Sunday, Monday
  return [6, 7]; // Default: Saturday, Sunday
}

function isWeekend(dt: DateTime, countryCode: string): boolean {
  const [d1, d2] = getWeekendDays(countryCode);
  return dt.weekday === d1 || dt.weekday === d2;
}

function getHolidaysForCountry(
  countryCode: string,
  year: number
): Array<{ date: string; name: string; type: string }> {
  try {
    hd.init(countryCode);
    const raw = hd.getHolidays(year);
    return raw.map((h) => {
      const rec = h as unknown as Record<string, string>;
      return { date: rec.date, name: rec.name, type: rec.type };
    });
  } catch {
    return [];
  }
}

function holidayMapForYear(
  countryCode: string,
  year: number
): Map<string, string> {
  const holidays = getHolidaysForCountry(countryCode, year);
  const map = new Map<string, string>();
  for (const h of holidays) {
    // date-holidays returns dates like "2026-01-01 00:00:00"
    const dateStr = h.date.slice(0, 10);
    map.set(dateStr, h.name);
  }
  return map;
}

function getHolidayName(
  dt: DateTime,
  countryCode: string,
  holidayCache: Map<number, Map<string, string>>
): string | undefined {
  const year = dt.year;
  if (!holidayCache.has(year)) {
    holidayCache.set(year, holidayMapForYear(countryCode, year));
  }
  return holidayCache.get(year)!.get(dt.toISODate()!);
}

/**
 * Check if a specific date is a business day.
 */
export function isBusinessDay(
  dateStr: string,
  countryCode: string = "US"
): BusinessDayResult {
  const dt = DateTime.fromISO(dateStr, { zone: "utc" });
  if (!dt.isValid) throw new Error(`Invalid date: ${dateStr}`);

  const holidayCache = new Map<number, Map<string, string>>();
  const holidayName = getHolidayName(dt, countryCode, holidayCache);
  const weekend = isWeekend(dt, countryCode);

  return {
    date: dt.toISODate()!,
    isBusinessDay: !weekend && !holidayName,
    dayType: holidayName ? "holiday" : weekend ? "weekend" : "business",
    holidayName,
    countryCode: countryCode.toUpperCase(),
  };
}

/**
 * Find the next business day after a given date.
 */
export function nextBusinessDay(
  dateStr: string,
  countryCode: string = "US"
): BusinessDayResult {
  const dt = DateTime.fromISO(dateStr, { zone: "utc" }).plus({ days: 1 });
  if (!dt.isValid) throw new Error(`Invalid date: ${dateStr}`);

  const holidayCache = new Map<number, Map<string, string>>();
  let current = dt;

  for (let i = 0; i < 100; i++) {
    const holidayName = getHolidayName(current, countryCode, holidayCache);
    const weekend = isWeekend(current, countryCode);
    if (!weekend && !holidayName) {
      return {
        date: current.toISODate()!,
        isBusinessDay: true,
        dayType: "business",
        countryCode: countryCode.toUpperCase(),
      };
    }
    current = current.plus({ days: 1 });
  }
  throw new Error(`Could not find next business day within 100 days for ${countryCode}`);
}

/**
 * Find the previous business day before a given date.
 */
export function previousBusinessDay(
  dateStr: string,
  countryCode: string = "US"
): BusinessDayResult {
  const dt = DateTime.fromISO(dateStr, { zone: "utc" }).minus({ days: 1 });
  if (!dt.isValid) throw new Error(`Invalid date: ${dateStr}`);

  const holidayCache = new Map<number, Map<string, string>>();
  let current = dt;

  for (let i = 0; i < 100; i++) {
    const holidayName = getHolidayName(current, countryCode, holidayCache);
    const weekend = isWeekend(current, countryCode);
    if (!weekend && !holidayName) {
      return {
        date: current.toISODate()!,
        isBusinessDay: true,
        dayType: "business",
        countryCode: countryCode.toUpperCase(),
      };
    }
    current = current.minus({ days: 1 });
  }
  throw new Error(`Could not find previous business day within 100 days for ${countryCode}`);
}

/**
 * Add business days to a date.
 */
export function addBusinessDays(
  dateStr: string,
  count: number,
  countryCode: string = "US"
): BusinessDayResult {
  if (count === 0) {
    return isBusinessDay(dateStr, countryCode);
  }

  const holidayCache = new Map<number, Map<string, string>>();
  let current = DateTime.fromISO(dateStr, { zone: "utc" });
  let remaining = Math.abs(count);
  const direction = count > 0 ? 1 : -1;

  // Start from the next/previous day
  current = current.plus({ days: direction });

  while (remaining > 0) {
    const holidayName = getHolidayName(current, countryCode, holidayCache);
    const weekend = isWeekend(current, countryCode);
    if (!weekend && !holidayName) {
      remaining--;
      if (remaining === 0) {
        return {
          date: current.toISODate()!,
          isBusinessDay: true,
          dayType: "business",
          countryCode: countryCode.toUpperCase(),
        };
      }
    }
    current = current.plus({ days: direction });
  }

  return {
    date: current.toISODate()!,
    isBusinessDay: true,
    dayType: "business",
    countryCode: countryCode.toUpperCase(),
  };
}

/**
 * Count business days between two dates (inclusive of start, exclusive of end).
 */
export function countBusinessDays(
  startDate: string,
  endDate: string,
  countryCode: string = "US"
): {
  count: number;
  startDate: string;
  endDate: string;
  countryCode: string;
} {
  const start = DateTime.fromISO(startDate, { zone: "utc" });
  const end = DateTime.fromISO(endDate, { zone: "utc" });
  if (!start.isValid || !end.isValid) {
    throw new Error(`Invalid date(s): ${startDate}, ${endDate}`);
  }

  const holidayCache = new Map<number, Map<string, string>>();
  let count = 0;
  let current = start;

  while (current < end) {
    const holidayName = getHolidayName(current, countryCode, holidayCache);
    const weekend = isWeekend(current, countryCode);
    if (!weekend && !holidayName) {
      count++;
    }
    current = current.plus({ days: 1 });
  }

  return {
    count,
    startDate: start.toISODate()!,
    endDate: end.toISODate()!,
    countryCode: countryCode.toUpperCase(),
  };
}

/**
 * Find the last business day of a month.
 */
export function lastBusinessDayOfMonth(
  year: number,
  month: number,
  countryCode: string = "US"
): BusinessDayResult {
  const dt = DateTime.utc(year, month).endOf("month").startOf("day");
  const dateStr = dt.toISODate()!;
  // First check if the last day itself is a business day
  const check = isBusinessDay(dateStr, countryCode);
  if (check.isBusinessDay) return check;
  // Otherwise, find the previous business day
  return previousBusinessDay(dateStr, countryCode);
}

/**
 * Get a list of business days in a date range.
 */
export function businessDaysInRange(
  startDate: string,
  endDate: string,
  countryCode: string = "US"
): string[] {
  const start = DateTime.fromISO(startDate, { zone: "utc" });
  const end = DateTime.fromISO(endDate, { zone: "utc" });
  if (!start.isValid || !end.isValid) {
    throw new Error(`Invalid date(s): ${startDate}, ${endDate}`);
  }

  const holidayCache = new Map<number, Map<string, string>>();
  const days: string[] = [];
  let current = start;

  while (current <= end) {
    const holidayName = getHolidayName(current, countryCode, holidayCache);
    const weekend = isWeekend(current, countryCode);
    if (!weekend && !holidayName) {
      days.push(current.toISODate()!);
    }
    current = current.plus({ days: 1 });
  }

  return days;
}
