import RRuleModule from "rrule";
import { DateTime } from "luxon";
import type { RecurrenceRule, RecurrenceResult, TemporalValue } from "./types.js";

// Use type-only import for RRule type
type RRuleInstance = InstanceType<typeof RRuleModule.RRule>;
const RRuleClass = RRuleModule.RRule;

const WEEKDAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

/**
 * Parse an RFC 5545 RRULE string into structured occurrences.
 */
export function generateOccurrences(
  rruleStr: string,
  startDate: string,
  endDate: string,
  maxOccurrences: number = 100,
  timezone: string = "UTC"
): RecurrenceResult {
  const dtStart = DateTime.fromISO(startDate, { zone: timezone });
  if (!dtStart.isValid) throw new Error(`Invalid start date: ${startDate}`);

  let rule: RRuleInstance;
  try {
    rule = RRuleClass.fromString(rruleStr);
  } catch (e) {
    throw new Error(`Invalid RRULE: ${rruleStr} — ${(e as Error).message}`);
  }

  // Override DTSTART with the provided start
  rule = new RRuleClass({
    ...rule.origOptions,
    dtstart: dtStart.toJSDate(),
  });

  const dtEnd = endDate
    ? DateTime.fromISO(endDate, { zone: timezone })
    : dtStart.plus({ years: 1 });

  const dates = rule.between(dtStart.toJSDate(), dtEnd.toJSDate(), true);
  const limited = dates.slice(0, Math.min(maxOccurrences, 500));

  const occurrences: TemporalValue[] = limited.map((d: Date) => {
    const dt = DateTime.fromJSDate(d, { zone: timezone });
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
      calendar: "gregorian" as const,
      precision: "second" as const,
      dstActive: dt.isInDST,
    };
  });

  return {
    rule: {
      rrule: rule.toString(),
      description: describeRRule(rule),
    },
    occurrences,
    count: occurrences.length,
    rangeBounded: true,
  };
}

/**
 * Convert a natural language pattern to an RRULE string where deterministic interpretation is possible.
 * Returns null for patterns that cannot be deterministically parsed.
 */
export function parseNaturalRecurrence(
  pattern: string
): { rrule: string; description: string } | null {
  const lower = pattern.toLowerCase().trim();

  // ── Weekday patterns ──
  const everyDayMatch = lower.match(/^every\s+(day|single\s+day)$/);
  if (everyDayMatch) {
    return { rrule: "FREQ=DAILY", description: "Every day" };
  }

  const everyWeekdayMatch = lower.match(/^every\s+(weekday|workday)$/);
  if (everyWeekdayMatch) {
    return {
      rrule: "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
      description: "Every weekday (Mon-Fri)",
    };
  }

  const everyWeekendMatch = lower.match(/^every\s+(weekend|weekend\s+day)$/);
  if (everyWeekendMatch) {
    return {
      rrule: "FREQ=WEEKLY;BYDAY=SA,SU",
      description: "Every weekend (Sat-Sun)",
    };
  }

  const everyXDaysMatch = lower.match(/^every\s+(\d+)\s+days?$/);
  if (everyXDaysMatch) {
    const n = parseInt(everyXDaysMatch[1], 10);
    if (n >= 1 && n <= 365) {
      return {
        rrule: `FREQ=DAILY;INTERVAL=${n}`,
        description: `Every ${n} day(s)`,
      };
    }
  }

  // ── Weekly patterns ──
  const weekdayMap: Record<string, string> = {
    monday: "MO", tuesday: "TU", wednesday: "WE", thursday: "TH",
    friday: "FR", saturday: "SA", sunday: "SU",
    mon: "MO", tue: "TU", wed: "WE", thu: "TH", fri: "FR", sat: "SA", sun: "SU",
  };

  const everyWeekday2Match = lower.match(/^every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)$/);
  if (everyWeekday2Match) {
    const day = weekdayMap[everyWeekday2Match[1]];
    if (day) {
      return {
        rrule: `FREQ=WEEKLY;BYDAY=${day}`,
        description: `Every ${everyWeekday2Match[1]}`,
      };
    }
  }

  const everyXWeeksMatch = lower.match(/^every\s+(\d+)\s+weeks?$/);
  if (everyXWeeksMatch) {
    const n = parseInt(everyXWeeksMatch[1], 10);
    if (n >= 1 && n <= 52) {
      return {
        rrule: `FREQ=WEEKLY;INTERVAL=${n}`,
        description: `Every ${n} week(s)`,
      };
    }
  }

  // ── Monthly patterns ──
  const everyMonthMatch = lower.match(/^every\s+(\d+)\s+months?$/);
  if (everyMonthMatch) {
    const n = parseInt(everyMonthMatch[1], 10);
    if (n >= 1 && n <= 24) {
      return {
        rrule: `FREQ=MONTHLY;INTERVAL=${n}`,
        description: `Every ${n} month(s)`,
      };
    }
  }

  // First/last weekday of month
  const firstWeekdayMatch = lower.match(
    /^first\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\s+of\s+(every\s+)?month$/);
  if (firstWeekdayMatch) {
    const day = weekdayMap[firstWeekdayMatch[1]];
    if (day) {
      return {
        rrule: `FREQ=MONTHLY;BYDAY=1${day}`,
        description: `First ${firstWeekdayMatch[1]} of every month`,
      };
    }
  }

  const lastWeekdayMatch = lower.match(
    /^last\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|wed|thu|fri|sat|sun)\s+of\s+(every\s+)?month$/);
  if (lastWeekdayMatch) {
    const day = weekdayMap[lastWeekdayMatch[1]];
    if (day) {
      return {
        rrule: `FREQ=MONTHLY;BYDAY=-1${day}`,
        description: `Last ${lastWeekdayMatch[1]} of every month`,
      };
    }
  }

  // ── Yearly patterns ──
  const everyYearMatch = lower.match(/^every\s+(\d+)\s+years?$/);
  if (everyYearMatch) {
    const n = parseInt(everyYearMatch[1], 10);
    if (n >= 1 && n <= 99) {
      return {
        rrule: `FREQ=YEARLY;INTERVAL=${n}`,
        description: `Every ${n} year(s)`,
      };
    }
  }

  return null;
}

/**
 * Generate an RRULE string from a natural language description.
 * Returns null if the pattern cannot be deterministically parsed.
 */
export function naturalLanguageToRRule(
  pattern: string,
  startDate: string,
  timezone: string = "UTC"
): { rrule: string; description: string; dtStart: string } | null {
  const parsed = parseNaturalRecurrence(pattern);
  if (!parsed) return null;
  return {
    ...parsed,
    dtStart: startDate,
  };
}

/**
 * Describe an RRULE in human-readable form.
 */
function describeRRule(rule: RRuleInstance): string {
  const opts = rule.origOptions;
  const parts: string[] = [];

  const freqMap: Record<number, string> = {
    [RRuleClass.DAILY]: "daily",
    [RRuleClass.WEEKLY]: "weekly",
    [RRuleClass.MONTHLY]: "monthly",
    [RRuleClass.YEARLY]: "yearly",
  };

  parts.push(freqMap[opts.freq ?? RRuleClass.DAILY] ?? "unknown");

  if (opts.interval && opts.interval > 1) {
    parts.push(`every ${opts.interval}`);
  }

  if (opts.byweekday) {
    const days = Array.isArray(opts.byweekday) ? opts.byweekday : [opts.byweekday];
    const dayNames = days.map((d: unknown) => {
      if (typeof d === "number") return WEEKDAY_NAMES[d - 1] ?? `day ${d}`;
      const obj = d as { weekday?: number };
      return WEEKDAY_NAMES[(obj.weekday ?? 1) - 1] ?? String(d);
    });
    parts.push(`on ${dayNames.join(", ")}`);
  }

  if (opts.count) {
    parts.push(`for ${opts.count} occurrences`);
  }

  if (opts.until) {
    const dt = opts.until instanceof Date
      ? DateTime.fromJSDate(opts.until)
      : DateTime.fromISO(String(opts.until));
    parts.push(`until ${dt.toISODate()}`);
  }

  return parts.join(" ");
}
