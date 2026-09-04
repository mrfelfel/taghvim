import Holidays from "date-holidays";
import type { HolidayEntry, HolidayQueryResult } from "./types.js";

const hd = new Holidays();

/**
 * Initialize the holiday library for a given country.
 */
function initCountry(countryCode: string, region?: string): void {
  try {
    if (region) {
      hd.init(countryCode, region);
    } else {
      hd.init(countryCode);
    }
  } catch {
    throw new Error(
      `Unsupported country code: ${countryCode}` +
        (region ? ` (region: ${region})` : "")
    );
  }
  // Verify the country was actually set by checking we can get holidays
  try {
    hd.getHolidays(new Date().getFullYear());
  } catch {
    throw new Error(
      `Unsupported country code: ${countryCode}` +
        (region ? ` (region: ${region})` : "")
    );
  }
}

/**
 * Get all public holidays for a country and year.
 */
export function getHolidays(
  countryCode: string,
  year: number,
  region?: string
): HolidayQueryResult {
  initCountry(countryCode, region);
  const raw = hd.getHolidays(year);

  const holidays: HolidayEntry[] = raw.map((h) => {
    const rec = h as unknown as Record<string, string>;
    return {
      date: rec.date.slice(0, 10),
      name: rec.name,
      type: rec.type || "public",
    };
  });

  return {
    holidays,
    count: holidays.length,
    countryCode: countryCode.toUpperCase(),
    year,
  };
}

/**
 * Check if a specific date is a public holiday.
 */
export function isHoliday(
  dateStr: string,
  countryCode: string,
  region?: string
): {
  isHoliday: boolean;
  date: string;
  countryCode: string;
  holiday?: HolidayEntry;
} {
  initCountry(countryCode, region);
  const isH = hd.isHoliday(dateStr);

  let holiday: HolidayEntry | undefined;
  if (isH) {
    const year = parseInt(dateStr.slice(0, 4), 10);
    const raw = hd.getHolidays(year);
    const found = raw.find((h) => {
      const rec = h as unknown as Record<string, string>;
      return rec.date.slice(0, 10) === dateStr;
    });
    if (found) {
      const rec = found as unknown as Record<string, string>;
      holiday = {
        date: dateStr,
        name: rec.name,
        type: rec.type || "public",
      };
    }
  }

  return {
    isHoliday: !!isH,
    date: dateStr,
    countryCode: countryCode.toUpperCase(),
    holiday,
  };
}

/**
 * Get the next upcoming public holiday for a country.
 */
export function nextHoliday(
  countryCode: string,
  afterDate?: string,
  region?: string
): HolidayEntry | null {
  initCountry(countryCode, region);
  const startYear = afterDate
    ? parseInt(afterDate.slice(0, 4), 10)
    : new Date().getFullYear();
  const startStr = afterDate || new Date().toISOString().slice(0, 10);

  for (let year = startYear; year <= startYear + 1; year++) {
    const raw = hd.getHolidays(year);
    const sorted = raw
      .map((h) => {
        const rec = h as unknown as Record<string, string>;
        return {
          date: rec.date.slice(0, 10),
          name: rec.name,
          type: rec.type || "public",
        };
      })
      .filter((h) => h.date > startStr)
      .sort((a, b) => a.date.localeCompare(b.date));

    if (sorted.length > 0) return sorted[0];
  }
  return null;
}

/**
 * Get all holidays between two dates.
 */
export function holidaysBetween(
  countryCode: string,
  startDate: string,
  endDate: string,
  region?: string
): HolidayEntry[] {
  initCountry(countryCode, region);
  const startYear = parseInt(startDate.slice(0, 4), 10);
  const endYear = parseInt(endDate.slice(0, 4), 10);

  const all: HolidayEntry[] = [];
  for (let year = startYear; year <= endYear; year++) {
    const raw = hd.getHolidays(year);
    for (const h of raw) {
      const rec = h as unknown as Record<string, string>;
      const dateStr = rec.date.slice(0, 10);
      if (dateStr >= startDate && dateStr <= endDate) {
        all.push({
          date: dateStr,
          name: rec.name,
          type: rec.type || "public",
        });
      }
    }
  }
  return all.sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get list of supported countries.
 */
export function supportedCountries(): string[] {
  try {
    return hd.getCountries() as unknown as string[];
  } catch {
    return [];
  }
}
