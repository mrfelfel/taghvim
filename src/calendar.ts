import { DateTime } from "luxon";
import moment from "jalali-moment";
import { JALALI_MONTHS } from "./events.js";
import type { CalendarSystem, TemporalValue, TemporalPrecision } from "./types.js";

const WEEKDAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

/**
 * Build a TemporalValue from an ISO string and timezone.
 */
export function buildTemporalValue(
  isoString: string,
  timezone: string = "UTC",
  precision: TemporalPrecision = "second",
  calendar: CalendarSystem = "gregorian"
): TemporalValue {
  const dt = DateTime.fromISO(isoString, { zone: timezone });
  if (!dt.isValid) throw new Error(`Invalid datetime: ${isoString} in ${timezone}`);

  return {
    utc: dt.toUTC().toISO()!,
    local: dt.toISO()!,
    date: dt.toISODate()!,
    time: dt.toISOTime()!,
    timezone,
    timezoneAbbr: dt.zoneName ?? timezone,
    utcOffset: dt.offset,
    weekday: dt.weekday,
    weekdayName: WEEKDAY_NAMES[dt.weekday - 1],
    calendar,
    precision,
    dstActive: dt.isInDST,
  };
}

/**
 * Build a TemporalValue from a plain Date object.
 */
export function temporalFromDate(
  date: Date,
  timezone: string = "UTC",
  precision: TemporalPrecision = "second",
  calendar: CalendarSystem = "gregorian"
): TemporalValue {
  const dt = DateTime.fromJSDate(date, { zone: timezone });
  return buildTemporalValue(dt.toISO()!, timezone, precision, calendar);
}

/**
 * Parse an ISO 8601 / RFC 3339 string into a Luxon DateTime.
 */
export function parseISO(
  isoString: string,
  timezone?: string
): DateTime {
  const opts: { zone?: string } = {};
  if (timezone) opts.zone = timezone;
  const dt = DateTime.fromISO(isoString, opts);
  if (!dt.isValid) throw new Error(`Cannot parse ISO datetime: ${isoString}`);
  return dt;
}

/**
 * Get current time as a TemporalValue.
 */
export function nowTemporal(
  timezone: string = "UTC",
  calendar: CalendarSystem = "gregorian"
): TemporalValue {
  return temporalFromDate(new Date(), timezone, "second", calendar);
}

/**
 * Jalali month index (0-based) for a Gregorian date.
 */
export function jalaliMonthIndex(gregorianDate: string): number {
  const m = moment(gregorianDate, "YYYY-MM-DD");
  if (!m.isValid()) throw new Error(`Invalid date: ${gregorianDate}`);
  return m.jMonth();
}

/**
 * Get Jalali month name for a Gregorian date.
 */
export function jalaliMonthName(gregorianDate: string): string {
  return JALALI_MONTHS[jalaliMonthIndex(gregorianDate)];
}

/**
 * Convert a TemporalValue to Jalali representation.
 */
export function toJalali(tv: TemporalValue): TemporalValue {
  const m = moment(tv.date, "YYYY-MM-DD");
  if (!m.isValid()) throw new Error(`Cannot convert to Jalali: ${tv.date}`);
  const jalaliStr = m.format("jYYYY/jMM/jDD");
  const weekdayFa = m.locale("fa").format("dddd");

  return {
    ...tv,
    calendar: "persian",
    date: jalaliStr,
    weekdayName: weekdayFa,
  };
}

/**
 * Start/end-of-period operations using Luxon.
 */
export function startOf(
  dt: DateTime,
  unit: "day" | "week" | "month" | "quarter" | "year"
): DateTime {
  return dt.startOf(unit);
}

export function endOf(
  dt: DateTime,
  unit: "day" | "week" | "month" | "quarter" | "year"
): DateTime {
  return dt.endOf(unit);
}

/**
 * Format a DateTime using Intl.DateTimeFormat.
 */
export function formatIntl(
  dt: DateTime,
  locale: string,
  options?: Intl.DateTimeFormatOptions
): string {
  const fmt = new Intl.DateTimeFormat(locale, options);
  return fmt.format(dt.toJSDate());
}

/**
 * Get weekday name in a given locale.
 */
export function weekdayInLocale(
  weekday: number,
  locale: string,
  format: "long" | "short" | "narrow" = "long"
): string {
  const base = DateTime.fromISO("2026-01-05"); // a Monday
  const d = base.plus({ days: weekday - 1 });
  return formatIntl(d, locale, { weekday: format });
}
