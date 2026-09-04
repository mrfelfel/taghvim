/**
 * Core types for the Taghvim temporal reasoning engine.
 *
 * All internal temporal representations use ISO 8601 / RFC 3339 strings
 * and IANA timezone identifiers to ensure deterministic behavior.
 */

// ── Calendar Systems ──────────────────────────────────────────────────────────

export type CalendarSystem = "gregorian" | "persian" | "hijri" | "iso-week";

// ── Temporal Primitives ───────────────────────────────────────────────────────

export interface TemporalValue {
  /** ISO 8601 / RFC 3339 instant */
  utc: string;
  /** Local time in the specified timezone */
  local: string;
  /** Date only (YYYY-MM-DD) */
  date: string;
  /** Time only (HH:mm:ss) */
  time: string;
  /** IANA timezone identifier */
  timezone: string;
  /** Human-readable timezone abbreviation */
  timezoneAbbr: string;
  /** UTC offset in hours (e.g. 1 for "+01:00") */
  utcOffset: number;
  /** ISO 8601 weekday number (1=Monday, 7=Sunday) */
  weekday: number;
  /** Human-readable weekday name */
  weekdayName: string;
  /** Calendar system used for date representation */
  calendar: CalendarSystem;
  /** Precision level of the temporal value */
  precision: TemporalPrecision;
  /** Whether DST is currently in effect */
  dstActive: boolean;
}

export type TemporalPrecision =
  | "year"
  | "month"
  | "day"
  | "hour"
  | "minute"
  | "second";

export interface TemporalInterval {
  start: string;
  end: string;
  /** ISO 8601 duration string */
  duration: string;
  timezone: string;
}

export interface Duration {
  years: number;
  months: number;
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export interface RecurrenceRule {
  /** RFC 5545 RRULE string */
  rrule: string;
  /** Human-readable description */
  description: string;
}

export interface RecurrenceResult {
  rule: RecurrenceRule;
  occurrences: TemporalValue[];
  count: number;
  rangeBounded: boolean;
}

// ── Error / Ambiguity ─────────────────────────────────────────────────────────

export type TemporalStatus = "success" | "error" | "ambiguous";

export interface TemporalResult<T = Record<string, unknown>> {
  status: TemporalStatus;
  data?: T;
  error?: TemporalError;
}

export interface TemporalError {
  code: string;
  message: string;
  details?: string;
}

export interface AmbiguityResult {
  status: "ambiguous";
  expression: string;
  possibleInterpretations: TemporalValue[];
  reason: string;
}

// ── Business Days ─────────────────────────────────────────────────────────────

export type WeekendDefinition = "sat-sun" | "fri-sat" | "sun-mon" | "custom";

export interface BusinessDayResult {
  date: string;
  isBusinessDay: boolean;
  dayType: "business" | "weekend" | "holiday";
  holidayName?: string;
  countryCode: string;
  nextBusinessDay?: string;
  previousBusinessDay?: string;
}

// ── Holidays ──────────────────────────────────────────────────────────────────

export interface HolidayEntry {
  date: string;
  name: string;
  type: string;
  observed?: string;
}

export interface HolidayQueryResult {
  holidays: HolidayEntry[];
  count: number;
  countryCode: string;
  year: number;
}

// ── Tool Parameters ───────────────────────────────────────────────────────────

export interface ResolveTimeParams {
  expression: string;
  referenceTime?: string;
  timezone?: string;
  calendar?: CalendarSystem;
  locale?: string;
}

export interface CalculateDateParams {
  date: string;
  operation: string;
  value?: number;
  unit?: string;
  timezone?: string;
  calendar?: CalendarSystem;
}

export interface ConvertTimeParams {
  datetime: string;
  fromTimezone: string;
  toTimezone: string | string[];
  calendar?: CalendarSystem;
}

export interface TimezoneInfoParams {
  timezone: string;
  referenceTime?: string;
}

export interface BusinessDaysParams {
  operation: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  count?: number;
  countryCode?: string;
  holidayCountry?: string;
}

export interface HolidaysParams {
  operation: string;
  countryCode: string;
  year?: number;
  date?: string;
  startDate?: string;
  endDate?: string;
  region?: string;
}

export interface RecurrenceParams {
  rrule?: string;
  naturalLanguage?: string;
  startDate: string;
  endDate?: string;
  maxOccurrences?: number;
  timezone?: string;
}

export interface CalendarParams {
  operation: string;
  date?: string;
  calendar?: CalendarSystem;
  year?: number;
  month?: number;
}

export interface FormatTimeParams {
  datetime: string;
  format: string;
  timezone?: string;
  locale?: string;
  calendar?: CalendarSystem;
}

export interface TemporalVerifyParams {
  claim: string;
  date?: string;
  datetime?: string;
  timezone?: string;
}

export interface NowParams {
  timezone?: string;
  calendar?: CalendarSystem;
}
