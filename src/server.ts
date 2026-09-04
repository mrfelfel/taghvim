import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { DateTime } from "luxon";

import { resolveNaturalLanguage } from "./resolve.js";
import { buildTemporalValue, nowTemporal } from "./calendar.js";
import {
  convertTimezone,
  getTimezoneInfo,
  isValidTimezone,
  listTimezones,
} from "./timezone.js";
import {
  isBusinessDay,
  nextBusinessDay,
  previousBusinessDay,
  addBusinessDays,
  countBusinessDays,
  lastBusinessDayOfMonth,
  businessDaysInRange,
} from "./business-day.js";
import {
  getHolidays,
  isHoliday,
  nextHoliday,
  holidaysBetween,
  supportedCountries,
} from "./holidays.js";
import {
  generateOccurrences,
  naturalLanguageToRRule,
  parseNaturalRecurrence,
} from "./recurrence.js";
import { formatDatetime } from "./format.js";
import { verifyTemporalClaim } from "./verify.js";
import {
  gregorianToJalali,
  jalaliToGregorian,
  jalaliIsValid,
  formatJalaliFull,
  getJalaliEvents,
  getEventsInRange,
  jalaliAddDays,
  jalaliDiffDays,
  jalaliDaysInMonth,
} from "./persian.js";
import { JALALI_MONTHS } from "./events.js";

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify({ status: "error", error: message }) }],
    isError: true,
  };
}

/**
 * Register all Taghvim MCP tools on the given server instance.
 */
export function registerTools(server: McpServer): void {
  // ═══════════════════════════════════════════════════════════════════════════
  // now
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "now",
    "Return the current deterministic time. Do NOT let the LLM infer the current date/time — call this tool instead. Returns UTC and local time, weekday, UTC offset, and DST status.",
    {
      timezone: z
        .string()
        .optional()
        .default("UTC")
        .describe("IANA timezone, e.g. 'America/New_York', 'Asia/Tokyo'"),
      calendar: z
        .enum(["gregorian", "persian", "iso-week"])
        .optional()
        .default("gregorian")
        .describe("Calendar system for date representation"),
    },
    async ({ timezone, calendar }) => {
      try {
        const tv = nowTemporal(timezone, calendar);
        return ok(tv);
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // resolve_time
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "resolve_time",
    "Resolve a natural-language date/time expression into a deterministic ISO timestamp. Use this whenever the user mentions relative dates ('tomorrow', 'next Friday', 'in two weeks', 'the first Monday of next month'). The LLM interprets the language; this tool performs the actual temporal computation. Returns structured result with UTC, local, and precision info.",
    {
      expression: z
        .string()
        .describe(
          "Natural-language temporal expression, e.g. 'tomorrow at 3pm', 'next Friday', 'in 3 weeks'"
        ),
      reference_time: z
        .string()
        .optional()
        .describe(
          "Reference time as ISO 8601. Defaults to now. Use when relative to a specific date."
        ),
      timezone: z
        .string()
        .optional()
        .default("UTC")
        .describe("IANA timezone for resolution, e.g. 'Europe/London'"),
      locale: z
        .string()
        .optional()
        .default("en-US")
        .describe("Locale for date interpretation"),
    },
    async ({ expression, reference_time, timezone, locale }) => {
      try {
        const ref = reference_time || new Date().toISOString();
        const result = resolveNaturalLanguage(expression, ref, timezone, locale);
        return ok(result as Record<string, unknown>);
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // calculate_date
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "calculate_date",
    "Perform deterministic date arithmetic: add/subtract units, snap to day/week/month/quarter/year boundaries, or compute differences between dates. Handles leap years and month-end edge cases correctly. Example: 2026-01-31 + 1 month → 2026-02-28.",
    {
      date: z.string().describe("ISO 8601 date or datetime"),
      operation: z
        .enum([
          "add", "subtract", "diff",
          "start_of", "end_of",
          "next_weekday", "previous_weekday",
        ])
        .describe(
          "Operation: add/subtract value+unit, diff two dates, start_of/end_of period, next/previous weekday"
        ),
      value: z.number().optional().describe("Numeric amount for add/subtract/diff"),
      unit: z
        .enum(["days", "weeks", "months", "years", "hours", "minutes", "seconds"])
        .optional()
        .describe("Unit for add/subtract"),
      target_date: z.string().optional().describe("Second date for diff or comparison"),
      weekday: z
        .enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"])
        .optional()
        .describe("Weekday name for next_weekday/previous_weekday"),
      period: z
        .enum(["day", "week", "month", "quarter", "year"])
        .optional()
        .describe("Period for start_of/end_of"),
      timezone: z.string().optional().default("UTC"),
      calendar: z.enum(["gregorian", "persian", "iso-week"]).optional().default("gregorian"),
    },
    async ({ date, operation, value, unit, target_date, weekday, period, timezone, calendar }) => {
      try {
        const dt = DateTime.fromISO(date, { zone: timezone });
        if (!dt.isValid) return err(`Invalid date: ${date}`);

        switch (operation) {
          case "add": {
            if (!value || !unit) return err("add requires 'value' and 'unit'");
            const result = dt.plus({ [unit]: value });
            return ok({
              date: result.toISODate()!,
              datetime: result.toISO()!,
              operation: `${date} + ${value} ${unit}`,
              calendar,
            });
          }
          case "subtract": {
            if (!value || !unit) return err("subtract requires 'value' and 'unit'");
            const result = dt.minus({ [unit]: value });
            return ok({
              date: result.toISODate()!,
              datetime: result.toISO()!,
              operation: `${date} - ${value} ${unit}`,
              calendar,
            });
          }
          case "diff": {
            if (!target_date) return err("diff requires 'target_date'");
            const target = DateTime.fromISO(target_date, { zone: timezone });
            if (!target.isValid) return err(`Invalid target_date: ${target_date}`);
            const dur = target.diff(dt, ["years", "months", "days", "hours", "minutes", "seconds"]);
            return ok({
              years: Math.floor(dur.years),
              months: Math.floor(dur.months),
              days: Math.floor(dur.days),
              hours: Math.floor(dur.hours),
              minutes: Math.floor(dur.minutes),
              seconds: Math.floor(dur.seconds),
              totalDays: Math.floor(dur.as("days")),
              totalHours: Math.floor(dur.as("hours")),
              startDate: dt.toISODate()!,
              endDate: target.toISODate()!,
            });
          }
          case "start_of": {
            if (!period) return err("start_of requires 'period'");
            const result = dt.startOf(period as "day" | "week" | "month" | "quarter" | "year");
            return ok({
              date: result.toISODate()!,
              datetime: result.toISO()!,
              operation: `start of ${period}`,
            });
          }
          case "end_of": {
            if (!period) return err("end_of requires 'period'");
            const result = dt.endOf(period as "day" | "week" | "month" | "quarter" | "year");
            return ok({
              date: result.toISODate()!,
              datetime: result.toISO()!,
              operation: `end of ${period}`,
            });
          }
          case "next_weekday": {
            if (!weekday) return err("next_weekday requires 'weekday'");
            const dayMap: Record<string, number> = {
              monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
              friday: 5, saturday: 6, sunday: 7,
            };
            const targetDow = dayMap[weekday];
            let current = dt.plus({ days: 1 });
            while (current.weekday !== targetDow) current = current.plus({ days: 1 });
            return ok({
              date: current.toISODate()!,
              datetime: current.toISO()!,
              operation: `next ${weekday}`,
            });
          }
          case "previous_weekday": {
            if (!weekday) return err("previous_weekday requires 'weekday'");
            const dayMap2: Record<string, number> = {
              monday: 1, tuesday: 2, wednesday: 3, thursday: 4,
              friday: 5, saturday: 6, sunday: 7,
            };
            const targetDow2 = dayMap2[weekday];
            let current2 = dt.minus({ days: 1 });
            while (current2.weekday !== targetDow2) current2 = current2.minus({ days: 1 });
            return ok({
              date: current2.toISODate()!,
              datetime: current2.toISO()!,
              operation: `previous ${weekday}`,
            });
          }
          default:
            return err(`Unknown operation: ${operation}`);
        }
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // convert_time
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "convert_time",
    "Convert a datetime between IANA timezones. Correctly handles DST transitions and date-boundary changes. Never hardcodes UTC offsets. Use IANA timezone names (e.g. 'America/New_York', 'Asia/Tokyo'). Can convert to multiple timezones at once.",
    {
      datetime: z.string().describe("ISO 8601 datetime to convert"),
      from_timezone: z.string().describe("Source IANA timezone"),
      to_timezone: z
        .union([z.string(), z.array(z.string())])
        .describe(
          "Target IANA timezone(s). Pass a string or array for multiple targets."
        ),
    },
    async ({ datetime, from_timezone, to_timezone }) => {
      try {
        const result = convertTimezone(datetime, from_timezone, to_timezone);
        return ok(result);
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // timezone_info
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "timezone_info",
    "Get deterministic timezone information: UTC offset, DST status, abbreviation, and next/previous DST transitions. Uses the IANA timezone database. Handles zones with no DST correctly.",
    {
      timezone: z.string().describe("IANA timezone, e.g. 'America/New_York', 'Asia/Tehran'"),
      reference_time: z
        .string()
        .optional()
        .describe("ISO 8601 reference time. Defaults to now."),
    },
    async ({ timezone, reference_time }) => {
      try {
        const info = getTimezoneInfo(timezone, reference_time);
        return ok(info);
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // business_days
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "business_days",
    "Business-day calculations: check if a date is a business day, find next/previous business day, add business days, count business days between dates. Supports configurable weekends and public holidays by country (US, UK, DE, JP, IR, UAE, etc.). Does NOT assume Saturday/Sunday weekend globally.",
    {
      operation: z
        .enum([
          "is_business_day", "next", "previous", "add", "count",
          "last_of_month", "range",
        ])
        .describe("Operation to perform"),
      date: z.string().optional().describe("Target date (YYYY-MM-DD)"),
      start_date: z.string().optional().describe("Start date for count/range"),
      end_date: z.string().optional().describe("End date for count/range"),
      count: z.number().optional().describe("Number of business days to add"),
      country_code: z
        .string()
        .optional()
        .default("US")
        .describe("ISO 3166-1 alpha-2 country code, e.g. 'US', 'GB', 'DE', 'JP', 'IR'"),
      year: z.number().optional().describe("Year for last_of_month"),
      month: z.number().optional().describe("Month (1-12) for last_of_month"),
    },
    async ({ operation, date, start_date, end_date, count, country_code, year, month }) => {
      try {
        const cc = country_code ?? "US";
        switch (operation) {
          case "is_business_day":
            if (!date) return err("is_business_day requires 'date'");
            return ok(isBusinessDay(date, cc));
          case "next":
            if (!date) return err("next requires 'date'");
            return ok(nextBusinessDay(date, cc));
          case "previous":
            if (!date) return err("previous requires 'date'");
            return ok(previousBusinessDay(date, cc));
          case "add":
            if (!date || count === undefined) return err("add requires 'date' and 'count'");
            return ok(addBusinessDays(date, count, cc));
          case "count":
            if (!start_date || !end_date) return err("count requires 'start_date' and 'end_date'");
            return ok(countBusinessDays(start_date, end_date, cc));
          case "last_of_month":
            if (!year || !month) return err("last_of_month requires 'year' and 'month'");
            return ok(lastBusinessDayOfMonth(year, month, cc));
          case "range":
            if (!start_date || !end_date) return err("range requires 'start_date' and 'end_date'");
            return ok({
              days: businessDaysInRange(start_date, end_date, cc),
              count: businessDaysInRange(start_date, end_date, cc).length,
              startDate: start_date,
              endDate: end_date,
              countryCode: cc,
            });
          default:
            return err(`Unknown operation: ${operation}`);
        }
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // holidays
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "holidays",
    "Public holiday intelligence: list all holidays for a country and year, check if a specific date is a holiday, find the next upcoming holiday, or get holidays in a date range. Supports 100+ countries via the IATA holiday database. Distinguishes between actual and observed holiday dates.",
    {
      operation: z
        .enum(["list", "is_holiday", "next", "between", "countries"])
        .describe("Query operation"),
      country_code: z
        .string()
        .optional()
        .describe("ISO 3166-1 alpha-2 country code, e.g. 'US', 'GB', 'DE', 'JP'"),
      year: z.number().optional().describe("Year (defaults to current year)"),
      date: z.string().optional().describe("Date to check (YYYY-MM-DD)"),
      start_date: z.string().optional().describe("Range start date (YYYY-MM-DD)"),
      end_date: z.string().optional().describe("Range end date (YYYY-MM-DD)"),
      region: z.string().optional().describe("State/province code where applicable"),
    },
    async ({ operation, country_code, year, date, start_date, end_date, region }) => {
      try {
        switch (operation) {
          case "countries":
            return ok({ countries: supportedCountries(), count: supportedCountries().length });
          case "list":
            if (!country_code) return err("list requires 'country_code'");
            return ok(getHolidays(country_code, year || new Date().getFullYear(), region));
          case "is_holiday":
            if (!country_code || !date) return err("is_holiday requires 'country_code' and 'date'");
            return ok(isHoliday(date, country_code, region));
          case "next":
            if (!country_code) return err("next requires 'country_code'");
            const next = nextHoliday(country_code, date, region);
            return ok(next ? { holiday: next } : { holiday: null, message: "No upcoming holidays found" });
          case "between":
            if (!country_code || !start_date || !end_date) {
              return err("between requires 'country_code', 'start_date', and 'end_date'");
            }
            const between = holidaysBetween(country_code, start_date, end_date, region);
            return ok({ holidays: between, count: between.length });
          default:
            return err(`Unknown operation: ${operation}`);
        }
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // recurrence
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "recurrence",
    "Generate recurring date schedules using RFC 5545 RRULE. Supports natural language patterns ('every Monday', 'first Friday of every month', 'every 90 days') converted deterministically to RRULE where possible. Always generates bounded results within a date range. Never generates infinite recurrences.",
    {
      rrule: z.string().optional().describe("RFC 5545 RRULE string, e.g. 'FREQ=WEEKLY;BYDAY=MO'"),
      natural_language: z
        .string()
        .optional()
        .describe("Human-readable pattern, e.g. 'every Monday', 'first Friday of every month'"),
      start_date: z.string().describe("Start date (YYYY-MM-DD) for occurrence generation"),
      end_date: z.string().optional().describe("End date (YYYY-MM-DD) bounding occurrences"),
      max_occurrences: z
        .number()
        .optional()
        .default(100)
        .describe("Maximum occurrences to generate (max 500)"),
      timezone: z.string().optional().default("UTC"),
    },
    async ({ rrule: rruleStr, natural_language, start_date, end_date, max_occurrences, timezone }) => {
      try {
        // If natural language provided, try to convert to RRULE
        if (natural_language && !rruleStr) {
          const converted = naturalLanguageToRRule(natural_language, start_date, timezone);
          if (converted) {
            const result = generateOccurrences(
              converted.rrule,
              start_date,
              end_date || DateTime.fromISO(start_date).plus({ years: 1 }).toISODate()!,
              max_occurrences,
              timezone
            );
            return ok({
              ...result,
              naturalLanguageInput: natural_language,
              parsedRRule: converted.rrule,
              parseNote: "Deterministically parsed from natural language",
            });
          }
          return ok({
            status: "ambiguous",
            expression: natural_language,
            message:
              "This pattern cannot be deterministically converted to an RRULE. " +
              "Use the 'rrule' parameter with a standard RFC 5545 RRULE string instead.",
          });
        }

        if (!rruleStr) {
          return err("Provide either 'rrule' or 'natural_language'");
        }

        const result = generateOccurrences(
          rruleStr,
          start_date,
          end_date || DateTime.fromISO(start_date).plus({ years: 1 }).toISODate()!,
          max_occurrences,
          timezone
        );
        return ok(result);
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // calendar
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "calendar",
    "Calendar system operations: convert between Gregorian, Persian/Jalali, and ISO week calendars. Validate dates, get weekday information, generate month calendars. Persian/Jalali is a first-class supported calendar.",
    {
      operation: z
        .enum(["convert", "validate", "weekday", "month_info", "month_calendar", "events"])
        .describe("Calendar operation"),
      date: z.string().optional().describe("Date in source calendar format (YYYY-MM-DD)"),
      source_calendar: z
        .enum(["gregorian", "persian", "iso-week"])
        .optional()
        .default("gregorian")
        .describe("Source calendar system"),
      target_calendar: z
        .enum(["gregorian", "persian", "iso-week"])
        .optional()
        .describe("Target calendar for conversion"),
      year: z.number().optional().describe("Year for month_info/month_calendar"),
      month: z.number().optional().describe("Month (1-12) for month_info/month_calendar"),
    },
    async ({ operation, date, source_calendar, target_calendar, year, month }) => {
      try {
        switch (operation) {
          case "convert": {
            if (!date) return err("convert requires 'date'");
            if (source_calendar === "persian" && target_calendar === "gregorian") {
              const gregorian = jalaliToGregorian(date);
              const jalali = formatJalaliFull(date);
              return ok({
                source: { date, calendar: "persian" },
                target: { date: gregorian, calendar: "gregorian" },
                weekday: jalali.weekday,
                event: jalali.event,
              });
            }
            if (source_calendar === "gregorian" && target_calendar === "persian") {
              const jalaliDate = gregorianToJalali(date);
              const full = formatJalaliFull(jalaliDate);
              return ok({
                source: { date, calendar: "gregorian" },
                target: { date: jalaliDate, calendar: "persian" },
                weekday: full.weekday,
                monthName: full.monthName,
                event: full.event,
              });
            }
            // ISO week calendar via Luxon
            const dt = DateTime.fromISO(date);
            if (!dt.isValid) return err(`Invalid date: ${date}`);
            if (target_calendar === "iso-week") {
              return ok({
                source: { date: dt.toISODate()!, calendar: "gregorian" },
                target: {
                  year: dt.year,
                  week: dt.weekNumber,
                  weekday: dt.weekday,
                  date: `${dt.year}-W${String(dt.weekNumber).padStart(2, "0")}-${dt.weekday}`,
                  calendar: "iso-week",
                },
              });
            }
            return err(`Unsupported conversion: ${source_calendar} → ${target_calendar}`);
          }
          case "validate": {
            if (!date) return err("validate requires 'date'");
            if (source_calendar === "persian") {
              return ok({
                date,
                calendar: "persian",
                isValid: jalaliIsValid(date),
              });
            }
            const dt2 = DateTime.fromISO(date);
            return ok({
              date,
              calendar: source_calendar ?? "gregorian",
              isValid: dt2.isValid,
            });
          }
          case "weekday": {
            if (!date) return err("weekday requires 'date'");
            if (source_calendar === "persian") {
              const parts = date.split(/[-/]/);
              if (parts.length !== 3) return err("Persian date must be YYYY-MM-DD");
              const wd = jalaliAddDays(`${parts[0]}/${parts[1]}/${parts[2]}`, 0);
              const full = formatJalaliFull(wd);
              return ok({
                date,
                weekday: full.weekday,
                calendar: "persian",
              });
            }
            const dt3 = DateTime.fromISO(date);
            if (!dt3.isValid) return err(`Invalid date: ${date}`);
            const weekdayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            return ok({
              date,
              weekday: weekdayNames[dt3.weekday - 1],
              weekdayNumber: dt3.weekday,
              calendar: "gregorian",
            });
          }
          case "month_info": {
            if (!year || !month) return err("month_info requires 'year' and 'month'");
            if (source_calendar === "persian") {
              const daysInMonth = jalaliDaysInMonth(year, month);
              return ok({
                year,
                month,
                monthName: JALALI_MONTHS[month - 1],
                daysInMonth,
                calendar: "persian",
              });
            }
            const dt4 = DateTime.utc(year, month, 1);
            return ok({
              year,
              month,
              monthName: dt4.toLocaleString({ month: "long" }),
              daysInMonth: dt4.daysInMonth,
              calendar: "gregorian",
            });
          }
          case "month_calendar": {
            if (!year || !month) return err("month_calendar requires 'year' and 'month'");
            if (source_calendar === "persian") {
              const daysInMonth = jalaliDaysInMonth(year, month);
              const monthName = JALALI_MONTHS[month - 1];
              const calendar: Array<{ day: number; weekday: string; gregorian: string }> = [];
              const events = getJalaliEvents();
              for (let d = 1; d <= daysInMonth; d++) {
                const jalaliStr = `${year}/${String(month).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
                const gregorian = jalaliToGregorian(jalaliStr);
                const full = formatJalaliFull(jalaliStr);
                calendar.push({
                  day: d,
                  weekday: full.weekday,
                  gregorian,
                });
              }
              return ok({
                year,
                month,
                monthName,
                daysInMonth,
                calendar,
                events,
                calendar_system: "persian",
              });
            }
            // Gregorian month calendar
            const dt5 = DateTime.utc(year, month, 1);
            const daysInMonthG = dt5.daysInMonth ?? 31;
            const cal: Array<{ day: number; weekday: string; date: string }> = [];
            const weekdayNames2 = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
            for (let d = 1; d <= daysInMonthG; d++) {
              const dayDt = DateTime.utc(year, month, d);
              cal.push({
                day: d,
                weekday: weekdayNames2[dayDt.weekday - 1],
                date: dayDt.toISODate()!,
              });
            }
            return ok({
              year,
              month,
              monthName: dt5.toLocaleString({ month: "long" }),
              daysInMonth: daysInMonthG,
              calendar: cal,
              calendar_system: "gregorian",
            });
          }
          case "events": {
            // Jalali events lookup
            const allEvents = getJalaliEvents();
            const entries = Object.entries(allEvents).map(([date, event]) => ({
              jalaliDate: date,
              event,
            }));
            return ok({ events: entries, count: entries.length });
          }
          default:
            return err(`Unknown operation: ${operation}`);
        }
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // format_time
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "format_time",
    "Deterministically format a datetime string. Supports ISO 8601, RFC 3339, locale-aware formats (en-US, de-DE, ja-JP, fa-IR, etc.), Jalali, human-readable, and custom Luxon format strings. Use Intl.DateTimeFormat for locale-specific output.",
    {
      datetime: z.string().describe("ISO 8601 datetime to format"),
      format: z
        .string()
        .describe(
          "Format name or pattern: iso8601, rfc3339, utc, unix, relative, human, jalali, " +
          "weekday, date-short/medium/long/full, time-short/medium/long, " +
          "datetime-short/medium/long/full, or a Luxon format string"
        ),
      timezone: z.string().optional().default("UTC"),
      locale: z.string().optional().default("en-US"),
      calendar: z.enum(["gregorian", "persian", "iso-week"]).optional().default("gregorian"),
    },
    async ({ datetime, format: fmt, timezone, locale, calendar }) => {
      try {
        const result = formatDatetime(datetime, fmt, timezone, locale, calendar);
        return ok({
          formatted: result,
          datetime,
          format: fmt,
          timezone,
          locale,
        });
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // temporal_verify
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "temporal_verify",
    "Verify a temporal claim deterministically. Prevents temporal hallucinations by checking facts like: 'Is 2026-12-31 a Thursday?', 'Is December 25 2027 a Saturday?', 'Is 3 PM London before 10 AM New York?', 'Is 2024 a leap year?'. Always returns structured facts.",
    {
      claim: z.string().describe("Natural language temporal claim to verify"),
      date: z.string().optional().describe("Date (YYYY-MM-DD) referenced in the claim"),
      datetime: z.string().optional().describe("Datetime (ISO 8601) referenced in the claim"),
      timezone: z.string().optional().default("UTC"),
    },
    async ({ claim, date, datetime, timezone }) => {
      try {
        const result = verifyTemporalClaim(claim, date, datetime, timezone);
        return ok(result);
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // jalali_persian — backward-compatible Jalali-specific tools
  // ═══════════════════════════════════════════════════════════════════════════

  server.tool(
    "jalali_persian",
    "Persian/Jalali calendar operations: convert dates, look up events, get month overviews, calculate days until Jalali dates. This is a convenience wrapper for Jalali-specific functionality. For universal calendar operations, use the 'calendar' tool instead.",
    {
      operation: z
        .enum([
          "now",
          "convert_to_jalali",
          "convert_to_gregorian",
          "get_events",
          "days_until",
          "jalali_range",
          "month_overview",
        ])
        .describe("Jalali-specific operation"),
      date: z.string().optional().describe("Date in YYYY-MM-DD format"),
      keyword: z.string().optional().describe("Search keyword for events"),
      month: z.number().optional().describe("Jalali month (1-12)"),
      year: z.number().optional().describe("Jalali year"),
      from: z.string().optional().describe("Start date (Jalali YYYY-MM-DD) for range"),
      to: z.string().optional().describe("End date (Jalali YYYY-MM-DD) for range"),
    },
    async ({ operation, date, keyword, month, year, from, to }) => {
      try {
        switch (operation) {
          case "now": {
            const gregorianDate = new Date().toISOString().slice(0, 10);
            const jalaliDate = gregorianToJalali(gregorianDate);
            const full = formatJalaliFull(jalaliDate);
            return ok({
              jalali: full.jalali,
              gregorian: full.gregorian,
              weekday: full.weekday,
              monthName: full.monthName,
              year: full.year,
              day: full.day,
              event: full.event,
            });
          }
          case "convert_to_jalali": {
            if (!date) return err("convert_to_jalali requires 'date'");
            const jalali = gregorianToJalali(date);
            const full = formatJalaliFull(jalali);
            return ok({
              gregorian: date,
              jalali: full.jalali,
              weekday: full.weekday,
              monthName: full.monthName,
              year: full.year,
              day: full.day,
              event: full.event,
            });
          }
          case "convert_to_gregorian": {
            if (!date) return err("convert_to_gregorian requires 'date'");
            const gregorian = jalaliToGregorian(date);
            const full = formatJalaliFull(date);
            return ok({
              jalali: date,
              gregorian,
              weekday: full.weekday,
              monthName: full.monthName,
              event: full.event,
            });
          }
          case "get_events": {
            if (!keyword && !month) return err("Provide 'keyword' or 'month'");
            const events = getJalaliEvents();
            let filtered = Object.entries(events);

            if (month) {
              const monthStr = String(month).padStart(2, "0");
              filtered = filtered.filter(([d]) => d.startsWith(monthStr + "/"));
              return ok({
                month,
                monthName: JALALI_MONTHS[month - 1],
                events: filtered.map(([date, event]) => ({
                  jalaliDate: `/${date}`,
                  event,
                })),
                count: filtered.length,
              });
            }

            if (keyword) {
              const results = filtered
                .filter(([, event]) => event.includes(keyword!))
                .map(([date, event]) => ({
                  jalaliDate: `/${date}`,
                  event,
                }));
              return ok({
                keyword,
                events: results,
                count: results.length,
              });
            }
            return err("Provide 'keyword' or 'month'");
          }
          case "days_until": {
            if (!date) return err("days_until requires 'date'");
            const todayGregorian = new Date().toISOString().slice(0, 10);
            const todayJalali = gregorianToJalali(todayGregorian);
            const diff = jalaliDiffDays(todayJalali, date);
            const full = formatJalaliFull(date);
            return ok({
              target: full.jalali,
              targetGregorian: full.gregorian,
              weekday: full.weekday,
              daysUntil: diff,
              relation: diff === 0 ? "today" : diff > 0 ? `${diff} days ahead` : `${Math.abs(diff)} days ago`,
              event: full.event,
            });
          }
          case "jalali_range": {
            if (!from || !to) return err("jalali_range requires 'from' and 'to'");
            const rangeEvents = getEventsInRange(from, to);
            return ok({
              range: { from, to },
              events: rangeEvents,
              count: rangeEvents.length,
            });
          }
          case "month_overview": {
            if (!year || !month) return err("month_overview requires 'year' and 'month'");
            const daysInMonth = jalaliDaysInMonth(year, month);
            const monthName = JALALI_MONTHS[month - 1];
            const events = getJalaliEvents();
            const overview: Array<{
              day: number;
              weekday: string;
              gregorian: string;
              event: string | null;
            }> = [];

            for (let d = 1; d <= daysInMonth; d++) {
              const jalaliStr = `${year}/${String(month).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
              const gregorian = jalaliToGregorian(jalaliStr);
              const full = formatJalaliFull(jalaliStr);
              const eventKey = `${String(month).padStart(2, "0")}/${String(d).padStart(2, "0")}`;
              overview.push({
                day: d,
                weekday: full.weekday,
                gregorian,
                event: events[eventKey] ?? null,
              });
            }

            return ok({
              year,
              month,
              monthName,
              daysInMonth,
              calendar: overview,
            });
          }
          default:
            return err(`Unknown operation: ${operation}`);
        }
      } catch (e) {
        return err((e as Error).message);
      }
    }
  );
}
