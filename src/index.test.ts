import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DateTime } from "luxon";

// ── Engine imports ────────────────────────────────────────────────────────────
import { buildTemporalValue, nowTemporal, startOf, endOf } from "./calendar.js";
import {
  convertTimezone,
  isValidTimezone,
  getTimezoneInfo,
} from "./timezone.js";
import {
  isBusinessDay,
  nextBusinessDay,
  previousBusinessDay,
  addBusinessDays,
  countBusinessDays,
  lastBusinessDayOfMonth,
} from "./business-day.js";
import {
  getHolidays as getHolidaysList,
  isHoliday,
  nextHoliday,
  holidaysBetween,
} from "./holidays.js";
import {
  generateOccurrences,
  parseNaturalRecurrence,
} from "./recurrence.js";
import { formatDatetime } from "./format.js";
import { verifyTemporalClaim } from "./verify.js";
import { resolveNaturalLanguage } from "./resolve.js";
import {
  gregorianToJalali,
  jalaliToGregorian,
  jalaliIsValid,
  formatJalaliFull,
  jalaliAddDays,
  jalaliDiffDays,
  jalaliDaysInMonth,
} from "./persian.js";

// ═══════════════════════════════════════════════════════════════════════════════
// calendar.ts
// ═══════════════════════════════════════════════════════════════════════════════

describe("calendar", () => {
  it("buildTemporalValue returns correct structure", () => {
    const tv = buildTemporalValue("2026-09-04T12:00:00Z", "UTC");
    assert.ok(tv.utc.includes("2026-09-04T12:00:00"), `utc: ${tv.utc}`);
    assert.equal(tv.date, "2026-09-04");
    assert.equal(tv.weekday, 5); // 2026-09-04 is a Friday
    assert.equal(tv.calendar, "gregorian");
    assert.equal(typeof tv.utcOffset, "number");
    assert.equal(tv.weekdayName, "Friday");
  });

  it("nowTemporal returns current time", () => {
    const before = Date.now();
    const tv = nowTemporal("UTC");
    const after = Date.now();
    const utcMs = new Date(tv.utc).getTime();
    assert.ok(utcMs >= before - 1000 && utcMs <= after + 1000);
    assert.equal(tv.timezone, "UTC");
  });

  it("startOf and endOf work correctly", () => {
    const dt = DateTime.fromISO("2026-09-04T14:30:00Z");
    assert.equal(startOf(dt, "day").toISODate(), "2026-09-04");
    assert.equal(endOf(dt, "day").toISODate(), "2026-09-04");
    assert.equal(startOf(dt, "month").toISODate(), "2026-09-01");
    assert.equal(endOf(dt, "month").toISODate(), "2026-09-30");
    assert.equal(startOf(dt, "year").toISODate(), "2026-01-01");
    assert.equal(endOf(dt, "year").toISODate(), "2026-12-31");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// timezone.ts
// ═══════════════════════════════════════════════════════════════════════════════

describe("timezone", () => {
  it("isValidTimezone validates known zones", () => {
    assert.ok(isValidTimezone("UTC"));
    assert.ok(isValidTimezone("America/New_York"));
    assert.ok(isValidTimezone("Asia/Tokyo"));
    assert.ok(isValidTimezone("Asia/Tehran"));
    assert.ok(!isValidTimezone("Not/A/Zone"));
  });

  it("convertTimezone converts across timezones", () => {
    const result = convertTimezone(
      "2026-09-04T12:00:00",
      "Europe/London",
      "America/New_York"
    ) as import("./types.js").TemporalValue;
    assert.equal(result.date, "2026-09-04");
    assert.equal(result.timezone, "America/New_York");
  });

  it("convertTimezone handles multiple targets", () => {
    const results = convertTimezone(
      "2026-09-04T12:00:00",
      "Europe/London",
      ["America/New_York", "Asia/Tokyo"]
    ) as import("./types.js").TemporalValue[];
    assert.ok(Array.isArray(results));
    assert.equal(results.length, 2);
    assert.equal(results[0].timezone, "America/New_York");
    assert.equal(results[1].timezone, "Asia/Tokyo");
  });

  it("getTimezoneInfo returns structured info", () => {
    const info = getTimezoneInfo("America/New_York");
    assert.equal(info.timezone, "America/New_York");
    assert.equal(typeof info.isDST, "boolean");
    assert.equal(typeof info.hasDST, "boolean");
    assert.equal(typeof info.utcOffset, "string");
  });

  it("getTimezoneInfo handles non-DST zones", () => {
    const info = getTimezoneInfo("Asia/Tokyo");
    assert.equal(info.hasDST, false);
    assert.equal(info.isDST, false);
  });

  it("convertTimezone throws on invalid timezone", () => {
    assert.throws(() => {
      convertTimezone("2026-09-04T12:00:00Z", "Invalid/Zone", "UTC");
    }, /Invalid source timezone/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// business-day.ts
// ═══════════════════════════════════════════════════════════════════════════════

describe("business-day", () => {
  // Use dates in October 2026 to avoid US holidays (Labor Day = Sept 7, Columbus Day = Oct 12)
  // Oct 14 (Wed) and surrounding dates are safe
  it("isBusinessDay identifies weekdays", () => {
    // 2026-10-14 is a Wednesday
    const result = isBusinessDay("2026-10-14", "US");
    assert.equal(result.isBusinessDay, true);
    assert.equal(result.dayType, "business");
  });

  it("isBusinessDay identifies weekends", () => {
    // 2026-10-10 is a Saturday
    const sat = isBusinessDay("2026-10-10", "US");
    assert.equal(sat.isBusinessDay, false);
    assert.equal(sat.dayType, "weekend");
  });

  it("US Saturday/Sunday weekend", () => {
    const sat = isBusinessDay("2026-10-10", "US"); // Saturday
    const sun = isBusinessDay("2026-10-11", "US"); // Sunday
    assert.equal(sat.isBusinessDay, false);
    assert.equal(sun.isBusinessDay, false);
  });

  it("Iran Friday/Saturday weekend", () => {
    // 2026-10-09 = Friday, 2026-10-10 = Saturday
    const fri = isBusinessDay("2026-10-09", "IR");
    const sat = isBusinessDay("2026-10-10", "IR");
    assert.equal(fri.isBusinessDay, false, "Friday is weekend in Iran");
    assert.equal(sat.isBusinessDay, false, "Saturday is weekend in Iran");
  });

  it("nextBusinessDay skips weekends", () => {
    // 2026-10-10 = Saturday, next business day = 2026-10-13 Monday
    const result = nextBusinessDay("2026-10-10", "US");
    assert.equal(result.date, "2026-10-13");
    assert.equal(result.isBusinessDay, true);
  });

  it("previousBusinessDay skips weekends", () => {
    // 2026-10-11 = Sunday, previous business day = 2026-10-09 Friday
    const result = previousBusinessDay("2026-10-11", "US");
    assert.equal(result.date, "2026-10-09");
    assert.equal(result.isBusinessDay, true);
  });

  it("addBusinessDays adds correctly", () => {
    // 2026-10-14 Wednesday + 1 = 2026-10-15 Thursday
    const result = addBusinessDays("2026-10-14", 1, "US");
    assert.equal(result.date, "2026-10-15");
  });

  it("addBusinessDays skips weekends", () => {
    // 2026-10-14 Wednesday + 5 = 2026-10-21 Wednesday (skips Sat/Sun)
    const result = addBusinessDays("2026-10-14", 5, "US");
    assert.equal(result.date, "2026-10-21");
  });

  it("addBusinessDays subtracts correctly", () => {
    const result = addBusinessDays("2026-10-15", -1, "US");
    assert.equal(result.date, "2026-10-14"); // Thursday -> Wednesday
  });

  it("countBusinessDays counts correctly", () => {
    // 2026-10-05 (Mon) to 2026-10-11 (Sun)
    // Mon(5), Tue(6), Wed(7), Thu(8), Fri(9), Sat(X), Sun(X) = 5 business days
    const result = countBusinessDays("2026-10-05", "2026-10-11", "US");
    assert.equal(result.count, 5);
  });

  it("lastBusinessDayOfMonth returns correct date", () => {
    // September 2026: 30th = Tuesday (not a US holiday)
    const result = lastBusinessDayOfMonth(2026, 9, "US");
    assert.equal(result.date, "2026-09-30");
    assert.equal(result.isBusinessDay, true);
  });

  it("lastBusinessDayOfMonth handles month ending on weekend", () => {
    // August 2026: 31st = Monday (not a US holiday)
    const result = lastBusinessDayOfMonth(2026, 8, "US");
    assert.equal(result.date, "2026-08-31"); // Monday is last business day
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// holidays.ts
// ═══════════════════════════════════════════════════════════════════════════════

describe("holidays", () => {
  it("getHolidays returns US holidays", () => {
    const result = getHolidaysList("US", 2026);
    assert.ok(result.holidays.length > 0, `Got ${result.holidays.length} holidays`);
    assert.equal(result.countryCode, "US");
    assert.equal(result.year, 2026);
    // Christmas should be in there
    const christmas = result.holidays.find(
      (h) => h.date === "2026-12-25"
    );
    assert.ok(christmas, "Christmas should be a US holiday");
  });

  it("isHoliday identifies Christmas", () => {
    const result = isHoliday("2026-12-25", "US");
    assert.equal(result.isHoliday, true);
    assert.ok(result.holiday);
  });

  it("isHoliday returns false for non-holidays", () => {
    const result = isHoliday("2026-09-09", "US"); // Wednesday, no major holiday
    assert.equal(result.isHoliday, false);
  });

  it("nextHoliday returns future holiday", () => {
    const result = nextHoliday("US", "2026-09-04");
    assert.ok(result);
    assert.ok(result!.date > "2026-09-04");
  });

  it("holidaysBetween returns holidays in range", () => {
    const result = holidaysBetween("US", "2026-12-01", "2026-12-31");
    assert.ok(result.length > 0);
    const christmas = result.find((h) => h.date === "2026-12-25");
    assert.ok(christmas, "Christmas should be in December range");
  });

  it("returns empty for unsupported country code", () => {
    // date-holidays silently accepts unknown codes, returning empty results
    const result = getHolidaysList("XX", 2026);
    assert.equal(result.holidays.length, 0);
    assert.equal(result.countryCode, "XX");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// recurrence.ts
// ═══════════════════════════════════════════════════════════════════════════════

describe("recurrence", () => {
  it("generates weekly occurrences", () => {
    const result = generateOccurrences(
      "FREQ=WEEKLY;BYDAY=MO",
      "2026-09-01",
      "2026-10-01"
    );
    assert.ok(result.occurrences.length > 0);
    for (const occ of result.occurrences) {
      assert.equal(occ.weekday, 1, `${occ.date} should be Monday`);
    }
  });

  it("generates daily occurrences", () => {
    const result = generateOccurrences(
      "FREQ=DAILY",
      "2026-09-01",
      "2026-09-10"
    );
    assert.equal(result.occurrences.length, 10);
  });

  it("generates monthly first-Friday occurrences", () => {
    const result = generateOccurrences(
      "FREQ=MONTHLY;BYDAY=1FR",
      "2026-01-01",
      "2026-12-31"
    );
    assert.equal(result.occurrences.length, 12);
    for (const occ of result.occurrences) {
      assert.equal(occ.weekday, 5, `${occ.date} should be Friday`);
    }
  });

  it("respects max_occurrences", () => {
    const result = generateOccurrences(
      "FREQ=DAILY",
      "2026-09-01",
      "2026-12-31",
      5
    );
    assert.equal(result.occurrences.length, 5);
  });

  it("parseNaturalRecurrence parses 'every Monday'", () => {
    const result = parseNaturalRecurrence("every Monday");
    assert.ok(result);
    assert.ok(result!.rrule.includes("BYDAY=MO"));
  });

  it("parseNaturalRecurrence parses 'every weekday'", () => {
    const result = parseNaturalRecurrence("every weekday");
    assert.ok(result);
    assert.ok(result!.rrule.includes("BYDAY=MO,TU,WE,TH,FR"));
  });

  it("parseNaturalRecurrence parses 'every 2 weeks'", () => {
    const result = parseNaturalRecurrence("every 2 weeks");
    assert.ok(result);
    assert.ok(result!.rrule.includes("INTERVAL=2"));
  });

  it("parseNaturalRecurrence returns null for ambiguous patterns", () => {
    const result = parseNaturalRecurrence("whenever I feel like it");
    assert.equal(result, null);
  });

  it("throws for invalid RRULE", () => {
    assert.throws(() => {
      generateOccurrences("INVALID_RRULE", "2026-09-01", "2026-09-30");
    }, /Invalid RRULE/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// format.ts
// ═══════════════════════════════════════════════════════════════════════════════

describe("format", () => {
  it("formats as iso8601", () => {
    const result = formatDatetime("2026-09-04T12:00:00Z", "iso8601");
    assert.ok(result.includes("2026-09-04T12:00:00"));
  });

  it("formats as utc", () => {
    const result = formatDatetime("2026-09-04T12:00:00Z", "utc");
    assert.ok(result.includes("2026-09-04T12:00:00"));
  });

  it("formats as unix timestamp", () => {
    const result = formatDatetime("2026-09-04T00:00:00Z", "unix");
    const expected = Math.floor(
      new Date("2026-09-04T00:00:00Z").getTime() / 1000
    );
    assert.equal(Number(result), expected);
  });

  it("formats as jalali", () => {
    const result = formatDatetime("2026-09-04", "jalali");
    assert.ok(result.includes("1405"), `Expected 1405 in: ${result}`);
  });

  it("formats with locale", () => {
    const result = formatDatetime(
      "2026-09-04T12:00:00Z",
      "datetime-long",
      "UTC",
      "de-DE"
    );
    assert.ok(typeof result === "string");
    assert.ok(result.length > 0);
  });

  it("throws for invalid datetime", () => {
    assert.throws(() => {
      formatDatetime("not-a-date", "iso8601");
    }, /Invalid datetime/);
  });

  it("throws for unknown format", () => {
    assert.throws(() => {
      formatDatetime("2026-09-04T12:00:00Z", "nonexistent_format");
    }, /Unknown format/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// verify.ts
// ═══════════════════════════════════════════════════════════════════════════════

describe("verify", () => {
  it("verifies weekday correctly", () => {
    // 2026-09-04 is a Friday
    const result = verifyTemporalClaim("Is 2026-09-04 a Friday");
    assert.equal(result.verified, true);
    assert.equal(result.facts.actualWeekday, "friday");
  });

  it("verifies wrong weekday", () => {
    const result = verifyTemporalClaim("Is 2026-09-04 a Monday");
    assert.equal(result.verified, false);
  });

  it("verifies before/after comparison", () => {
    const result = verifyTemporalClaim("Is 2026-09-03 before 2026-09-04");
    assert.equal(result.verified, true);
    assert.equal(result.facts.dateAIsBeforeDateB, true);
  });

  it("verifies leap year", () => {
    assert.equal(verifyTemporalClaim("Is 2024 a leap year").verified, true);
    assert.equal(verifyTemporalClaim("Is 2025 a leap year").verified, false);
    assert.equal(verifyTemporalClaim("Is 2000 a leap year").verified, true);
    assert.equal(verifyTemporalClaim("Is 1900 a leap year").verified, false);
  });

  it("verifies same date", () => {
    const result = verifyTemporalClaim(
      "Are 2026-09-04 and 2026-09-04 the same"
    );
    assert.equal(result.verified, true);
  });

  it("throws for unsupported claim", () => {
    assert.throws(() => {
      verifyTemporalClaim("Is it going to rain tomorrow?");
    }, /Cannot verify claim/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// resolve.ts
// ═══════════════════════════════════════════════════════════════════════════════

describe("resolve", () => {
  it("resolves 'tomorrow'", () => {
    const result = resolveNaturalLanguage(
      "tomorrow",
      "2026-09-04T12:00:00Z"
    );
    assert.ok("date" in result);
    assert.equal((result as { date: string }).date, "2026-09-05");
  });

  it("resolves 'in 3 days'", () => {
    const result = resolveNaturalLanguage(
      "in 3 days",
      "2026-09-04T12:00:00Z"
    );
    assert.ok("date" in result);
    assert.equal((result as { date: string }).date, "2026-09-07");
  });

  it("resolves date expression", () => {
    const result = resolveNaturalLanguage(
      "January 15, 2027",
      "2026-09-04T12:00:00Z"
    );
    assert.ok("date" in result);
    assert.equal((result as { date: string }).date, "2027-01-15");
  });

  it("applies timezone to resolved time", () => {
    const result = resolveNaturalLanguage(
      "tomorrow",
      "2026-09-04T12:00:00Z",
      "Asia/Tokyo"
    );
    assert.ok("timezone" in result);
    assert.equal((result as { timezone: string }).timezone, "Asia/Tokyo");
  });

  it("throws for unparseable expression", () => {
    assert.throws(() => {
      resolveNaturalLanguage("purple monkey dishwasher");
    }, /Cannot parse/);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// persian.ts — Jalali calendar
// ═══════════════════════════════════════════════════════════════════════════════

describe("persian", () => {
  it("gregorianToJalali converts correctly", () => {
    const result = gregorianToJalali("2026-09-04");
    assert.ok(result.includes("1405"), `Expected 1405 in: ${result}`);
  });

  it("jalaliToGregorian converts correctly", () => {
    const result = jalaliToGregorian("1405-06-13");
    assert.ok(result.includes("2026"), `Expected 2026 in: ${result}`);
    assert.ok(result.includes("09"), `Expected 09 in: ${result}`);
  });

  it("jalaliToGregorian round-trips", () => {
    const gregDate = "2026-09-04";
    const jalali = gregorianToJalali(gregDate);
    const backToGreg = jalaliToGregorian(jalali);
    assert.equal(backToGreg, gregDate);
  });

  it("jalaliIsValid validates dates", () => {
    assert.ok(jalaliIsValid("1405-06-13"));
    assert.ok(!jalaliIsValid("9999-99-99"), "9999-99-99 should be invalid");
    assert.ok(!jalaliIsValid("1405-13-01"), "Month 13 should be invalid");
  });

  it("jalaliDaysInMonth returns correct counts for month 1", () => {
    // Farvardin (1) has 31 days
    assert.equal(jalaliDaysInMonth(1405, 1), 31);
  });

  it("jalaliDaysInMonth returns correct counts for month 2", () => {
    // Ordibehesht (2) has 31 days
    assert.equal(jalaliDaysInMonth(1405, 2), 31);
  });

  it("jalaliDaysInMonth returns correct counts for month 3", () => {
    // Khordad (3) has 31 days
    assert.equal(jalaliDaysInMonth(1405, 3), 31);
  });

  it("jalaliAddDays adds correctly", () => {
    const result = jalaliAddDays("1405-06-13", 1);
    assert.ok(result);
    assert.ok(result !== "1405-06-13");
  });

  it("jalaliDiffDays calculates difference", () => {
    const result = jalaliDiffDays("1405-01-01", "1405-01-02");
    assert.equal(result, 1);
  });

  it("formatJalaliFull returns complete info", () => {
    const result = formatJalaliFull("1405/06/13");
    assert.equal(result.year, 1405);
    assert.ok(result.weekday);
    assert.ok(result.monthName);
    assert.ok(result.gregorian);
  });

  // ── Property test: Gregorian → Jalali → Gregorian round-trip ──
  it("property: Gregorian → Jalali → Gregorian preserves date", () => {
    const dates = [
      "2026-01-01",
      "2026-02-28",
      "2026-03-01",
      "2026-06-15",
      "2026-12-31",
      "2025-02-28",
      "2024-02-29", // Leap year
    ];
    for (const greg of dates) {
      const jalali = gregorianToJalali(greg);
      const back = jalaliToGregorian(jalali);
      assert.equal(back, greg, `Round-trip failed for ${greg}`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Invariant tests
// ═══════════════════════════════════════════════════════════════════════════════

describe("invariants", () => {
  it("timezone conversion round-trip preserves instant", () => {
    const original = "2026-09-04T12:00:00Z";
    const toTokyo = convertTimezone(original, "UTC", "Asia/Tokyo") as import("./types.js").TemporalValue;
    const back = convertTimezone(toTokyo.local, "Asia/Tokyo", "UTC") as import("./types.js").TemporalValue;
    // Luxon's toISO includes .000 milliseconds, so normalize for comparison
    const normalize = (s: string) => s.replace(".000Z", "Z");
    assert.equal(normalize(back.utc), normalize(original), "Round-trip through Tokyo should preserve UTC instant");
  });

  it("timezone conversion to multiple targets preserves UTC", () => {
    const original = "2026-09-04T12:00:00Z";
    const results = convertTimezone(original, "UTC", ["America/New_York", "Asia/Tokyo", "Europe/London"]) as import("./types.js").TemporalValue[];
    const normalize = (s: string) => s.replace(".000Z", "Z");
    for (const r of results) {
      assert.equal(normalize(r.utc), normalize(original), `UTC should be preserved for ${r.timezone}`);
    }
  });

  it("business day add/subtract is inverse", () => {
    const base = "2026-09-14"; // Monday
    const added = addBusinessDays(base, 3, "US");
    const subtracted = addBusinessDays(added.date, -3, "US");
    assert.equal(subtracted.date, base, "Add then subtract should return to original");
  });

  it("leap year rules are correct", () => {
    assert.equal(verifyTemporalClaim("Is 2024 a leap year").verified, true);
    assert.equal(verifyTemporalClaim("Is 2000 a leap year").verified, true);
    assert.equal(verifyTemporalClaim("Is 1900 a leap year").verified, false);
    assert.equal(verifyTemporalClaim("Is 2025 a leap year").verified, false);
    assert.equal(verifyTemporalClaim("Is 2100 a leap year").verified, false);
  });

  it("month end edge cases handled in date arithmetic", () => {
    const result = addBusinessDays("2026-01-31", 0, "US");
    assert.equal(result.date, "2026-01-31");
  });
});
