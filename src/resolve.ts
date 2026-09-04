import * as chrono from "chrono-node";
import { DateTime } from "luxon";
import type { TemporalValue, TemporalPrecision } from "./types.js";

const WEEKDAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

/**
 * Parse a natural language date/time expression into a TemporalValue.
 * Uses chrono-node for robust parsing, then applies timezone and calendar context.
 */
export function resolveNaturalLanguage(
  expression: string,
  referenceTime: string = new Date().toISOString(),
  timezone: string = "UTC",
  locale: string = "en-US"
): TemporalValue | { status: "ambiguous"; expression: string; possibleInterpretations: TemporalValue[]; reason: string } {
  const refDate = DateTime.fromISO(referenceTime);
  if (!refDate.isValid) {
    throw new Error(`Invalid reference time: ${referenceTime}`);
  }

  const results = chrono.parse(expression, refDate.toJSDate());

  if (results.length === 0) {
    throw new Error(
      `Cannot parse temporal expression: "${expression}". ` +
      `Supported patterns include: "tomorrow", "next Friday", ` +
      `"in 3 weeks", "Jan 15 2027", "2027-01-15T09:00:00Z".`
    );
  }

  if (results.length > 1) {
    // Multiple interpretations — return ambiguous
    const interpretations = results.map((r) => buildFromChrono(r, timezone));
    return {
      status: "ambiguous",
      expression,
      possibleInterpretations: interpretations,
      reason: `Expression "${expression}" has ${results.length} possible interpretations`,
    };
  }

  return buildFromChrono(results[0], timezone);
}

/**
 * Build a TemporalValue from a chrono-node parsing result.
 */
function buildFromChrono(
  result: chrono.ParsedResult,
  timezone: string
): TemporalValue {
  const jsDate = result.start.date();
  const dt = DateTime.fromJSDate(jsDate, { zone: timezone });

  if (!dt.isValid) {
    throw new Error(`Cannot convert parsed result to timezone: ${timezone}`);
  }

  const precision = determinePrecision(result);

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
    calendar: "gregorian",
    precision,
    dstActive: dt.isInDST,
  };
}

/**
 * Determine precision level from chrono parsing result.
 */
function determinePrecision(result: chrono.ParsedResult): TemporalPrecision {
  const components = result.start;
  if (components.get("hour") !== undefined) {
    if (components.get("minute") !== undefined) {
      if (components.get("second") !== undefined) {
        return "second";
      }
      return "minute";
    }
    return "hour";
  }
  if (components.get("day") !== undefined) return "day";
  if (components.get("month") !== undefined) return "month";
  return "year";
}
