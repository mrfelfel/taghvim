import { DateTime } from "luxon";
import type { TemporalVerifyParams } from "./types.js";

interface VerifyResult {
  claim: string;
  verified: boolean;
  facts: Record<string, unknown>;
}

const WEEKDAY_MAP: Record<string, number> = {
  monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
  friday: 5, saturday: 6, sunday: 7,
};

/**
 * Verify a temporal claim deterministically.
 * Supports claims like:
 * - "Is YYYY-MM-DD a <weekday>?"
 * - "Is <date> before <date2>?"
 * - "Does this timestamp fall inside DST?"
 * - "What is the UTC offset of <timezone> at <time>?"
 */
export function verifyTemporalClaim(
  claim: string,
  date?: string,
  datetime?: string,
  timezone: string = "UTC"
): VerifyResult {
  const lowerClaim = claim.toLowerCase().trim();

  // ── Weekday verification ──
  const weekdayMatch = lowerClaim.match(
    /(?:is|does)\s+(?:the\s+)?(?:date\s+)?(\d{4}-\d{2}-\d{2}|[a-z]+\s+\d{1,2}(?:,?\s*\d{4})?)\s+(?:a\s+)?(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i
  );
  if (weekdayMatch) {
    const targetDate = weekdayMatch[1];
    const expectedDay = weekdayMatch[2].toLowerCase();
    const dt = DateTime.fromISO(targetDate.replace(/,?\s*\d{4}$/, (y) => y.trim()));
    if (!dt.isValid) throw new Error(`Invalid date: ${targetDate}`);
    const actualDay = ["", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][dt.weekday];
    return {
      claim,
      verified: actualDay === expectedDay,
      facts: {
        date: dt.toISODate(),
        expectedWeekday: expectedDay,
        actualWeekday: actualDay,
        weekdayNumber: dt.weekday,
      },
    };
  }

  // ── Before/after comparison ──
  const comparisonMatch = lowerClaim.match(
    /(?:is|does)\s+(\d{4}-\d{2}-\d{2}(?:T[\d:Z+\-]+)?)\s+(?:before|earlier\s+than|after|later\s+than)\s+(\d{4}-\d{2}-\d{2}(?:T[\d:Z+\-]+)?)/i
  );
  if (comparisonMatch) {
    const dateA = comparisonMatch[1];
    const dateB = comparisonMatch[2];
    const isBefore = lowerClaim.includes("before") || lowerClaim.includes("earlier");
    const dtA = DateTime.fromISO(dateA);
    const dtB = DateTime.fromISO(dateB);
    if (!dtA.isValid || !dtB.isValid) {
      throw new Error(`Invalid datetime(s): ${dateA}, ${dateB}`);
    }
    const actualBefore = dtA < dtB;
    return {
      claim,
      verified: isBefore ? actualBefore : !actualBefore,
      facts: {
        dateA: dtA.toISO()!,
        dateB: dtB.toISO()!,
        dateAIsBeforeDateB: actualBefore,
      },
    };
  }

  // ── DST check ──
  const dstMatch = lowerClaim.match(
    /(?:does|is)\s+(?:the\s+)?(?:time(?:stamp)?|date)?\s*(?:\()?\s*(\d{4}-\d{2}-\d{2}(?:T[\d:Z+\-]+)?)\s*\)?\s*(?:fall\s+inside|in|during)\s+(?:daylight\s+saving|dst|summer\s+time)/i
  );
  if (dstMatch || lowerClaim.includes("dst") || lowerClaim.includes("daylight saving")) {
    const dtStr = dstMatch?.[1] || datetime || date;
    if (!dtStr) throw new Error("Provide a date/datetime for DST verification");
    const dt = DateTime.fromISO(dtStr, { zone: timezone });
    if (!dt.isValid) throw new Error(`Invalid datetime: ${dtStr}`);
    return {
      claim,
      verified: dt.isInDST,
      facts: {
        datetime: dt.toISO()!,
        timezone,
        isDST: dt.isInDST,
        utcOffset: dt.offset,
      },
    };
  }

  // ── Day of year ──
  const dayOfYearMatch = lowerClaim.match(
    /(?:is|does)\s+(\d{4}-\d{2}-\d{2})\s+(?:the\s+)?day\s+(\d+)/i
  );
  if (dayOfYearMatch) {
    const dt = DateTime.fromISO(dayOfYearMatch[1]);
    const expectedDay = parseInt(dayOfYearMatch[2], 10);
    if (!dt.isValid) throw new Error(`Invalid date: ${dayOfYearMatch[1]}`);
    return {
      claim,
      verified: dt.ordinal === expectedDay,
      facts: {
        date: dt.toISODate(),
        expectedDayOfYear: expectedDay,
        actualDayOfYear: dt.ordinal,
      },
    };
  }

  // ── Same date check ──
  const sameDateMatch = lowerClaim.match(
    /(?:are|do)\s+(\d{4}-\d{2}-\d{2})\s+and\s+(\d{4}-\d{2}-\d{2})\s+(?:the\s+same|equivalent)/i
  );
  if (sameDateMatch) {
    const dtA = DateTime.fromISO(sameDateMatch[1]);
    const dtB = DateTime.fromISO(sameDateMatch[2]);
    if (!dtA.isValid || !dtB.isValid) {
      throw new Error(`Invalid date(s): ${sameDateMatch[1]}, ${sameDateMatch[2]}`);
    }
    return {
      claim,
      verified: dtA.toISODate() === dtB.toISODate(),
      facts: {
        dateA: dtA.toISODate(),
        dateB: dtB.toISODate(),
        areSame: dtA.toISODate() === dtB.toISODate(),
      },
    };
  }

  // ── Leap year check ──
  const leapMatch = lowerClaim.match(
    /(?:is|does)\s+(\d{4})\s+(?:a\s+)?leap\s+year/i
  );
  if (leapMatch) {
    const year = parseInt(leapMatch[1], 10);
    const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    return {
      claim,
      verified: isLeap,
      facts: { year, isLeapYear: isLeap },
    };
  }

  // Fallback: cannot determine
  throw new Error(
    `Cannot verify claim: "${claim}". ` +
    `Supported patterns: "Is YYYY-MM-DD a Monday?", ` +
    `"Is date before date2?", "Is timestamp in DST?", ` +
    `"Is YYYY a leap year?", "Are date and date2 the same?"`
  );
}
