import { DateTime } from "luxon";
import moment from "jalali-moment";
import type { CalendarSystem } from "./types.js";

/**
 * Format a datetime string according to various formats.
 */
export function formatDatetime(
  datetime: string,
  format: string,
  timezone: string = "UTC",
  locale: string = "en-US",
  calendar: CalendarSystem = "gregorian"
): string {
  const dt = DateTime.fromISO(datetime, { zone: timezone });
  if (!dt.isValid) throw new Error(`Invalid datetime: ${datetime}`);

  // Special named formats
  switch (format) {
    case "iso8601":
    case "rfc3339":
      return dt.toISO()!;
    case "iso-date":
      return dt.toISODate()!;
    case "iso-time":
      return dt.toISOTime()!;
    case "utc":
      return dt.toUTC().toISO()!;
    case "unix":
      return String(Math.floor(dt.toSeconds()));
    case "relative":
      return dt.toRelative()!;
    case "human":
      return dt.toLocaleString(DateTime.DATE_MED);
    case "jalali":
      return formatAsJalali(dt);
    case "jalali-full":
      return formatAsJalaliFull(dt);
    case "weekday":
      return dt.toLocaleString({ weekday: "long" }, { locale });
    case "weekday-short":
      return dt.toLocaleString({ weekday: "short" }, { locale });
  }

  // Intl.DateTimeFormat-based patterns
  const intlFormats: Record<string, Intl.DateTimeFormatOptions> = {
    "date-short": { dateStyle: "short" },
    "date-medium": { dateStyle: "medium" },
    "date-long": { dateStyle: "long" },
    "date-full": { dateStyle: "full" },
    "time-short": { timeStyle: "short" },
    "time-medium": { timeStyle: "medium" },
    "time-long": { timeStyle: "long" },
    "datetime-short": { dateStyle: "short", timeStyle: "short" },
    "datetime-medium": { dateStyle: "medium", timeStyle: "medium" },
    "datetime-long": { dateStyle: "long", timeStyle: "long" },
    "datetime-full": { dateStyle: "full", timeStyle: "full" },
  };

  if (intlFormats[format]) {
    return new Intl.DateTimeFormat(locale, intlFormats[format]).format(
      dt.toJSDate()
    );
  }

  // Luxon-style format string: try Luxon's custom format tokens
  // Luxon silently accepts unknown tokens, so validate first
  // Only allow known Luxon format tokens (single or double letter)
  const luxonTokenPattern = /^[A-Za-z]+$/;
  if (luxonTokenPattern.test(format)) {
    try {
      return dt.toFormat(format);
    } catch {
      // Fall through to error
    }
  }

  throw new Error(
    `Unknown format: ${format}. Supported: iso8601, rfc3339, iso-date, ` +
      `utc, unix, relative, human, jalali, jalali-full, weekday, ` +
      `date-short/medium/long/full, time-short/medium/long, ` +
      `datetime-short/medium/long/full, or a Luxon format string.`
  );
}

/**
 * Format a DateTime as Jalali date.
 */
function formatAsJalali(dt: DateTime): string {
  const dateStr = dt.toISODate();
  if (!dateStr) throw new Error("Cannot get ISO date from DateTime");
  return moment(dateStr, "YYYY-MM-DD").format("jYYYY/jMM/jDD");
}

/**
 * Format a DateTime as full Jalali representation.
 */
function formatAsJalaliFull(dt: DateTime): string {
  const dateStr = dt.toISODate();
  if (!dateStr) throw new Error("Cannot get ISO date from DateTime");
  const m = moment(dateStr, "YYYY-MM-DD");
  const jalali = m.format("jYYYY/jMM/jDD");
  const weekday = m.locale("fa").format("dddd");
  return `${jalali} (${weekday})`;
}
