import moment from "jalali-moment";
import { JALALI_EVENTS, JALALI_MONTHS, WEEKDAYS_FA } from "./events.js";

// Jalali month day counts (1-indexed: month 1-12)
// Months 1-6 and 10: 31 days; Months 7, 9, 11: 30 days
// Month 12 (Esfand): 30 if leap year, 29 if not
const JALALI_MONTH_DAYS = [31, 31, 31, 31, 31, 31, 30, 30, 30, 31, 30, 29];

/**
 * Determine if a Jalali year is a leap year.
 * Uses a standard algorithm based on the 2820-year cycle.
 */
function isJalaliLeapYear(year: number): boolean {
  // Residual-based leap year check for the Solar Hijri calendar.
  // The 33-year cycle: 8 leap years per 33 years.
  // Simplified: compute the remainder of (year + 2346) mod 2820,
  // then check against known leap year positions.
  const r = ((year + 2346) % 2820) + 1;
  // Leap years in the 2820-year cycle occur at positions:
  // 1, 5, 9, 13, 17, 22, 26, 30, 34, 38, 43, 47, 51, 55, 59, 64, 68, 72, ...
  // Using the known pattern: leap if r mod 33 is in {1, 5, 9, 13, 17, 22, 26, 30}
  const mod = r % 33;
  return mod === 1 || mod === 5 || mod === 9 || mod === 13 || mod === 17 || mod === 22 || mod === 26 || mod === 30;
}

/**
 * Get the number of days in a Jalali month.
 */
function jalaliDaysInMonthCalc(year: number, month: number): number {
  if (month === 12) {
    return isJalaliLeapYear(year) ? 30 : 29;
  }
  return JALALI_MONTH_DAYS[month - 1] ?? 30;
}

export function formatJalaliFull(dateStr: string): {
  jalali: string;
  gregorian: string;
  weekday: string;
  monthName: string;
  year: number;
  day: number;
  event: string | null;
} {
  const m = moment(dateStr, "jYYYY/jMM/jDD");
  if (!m.isValid()) {
    throw new Error(`Invalid Jalali date: ${dateStr}`);
  }
  return {
    jalali: m.format("jYYYY/jMM/jDD"),
    gregorian: m.format("YYYY-MM-DD"),
    weekday: m.locale("fa").format("dddd"),
    monthName: JALALI_MONTHS[m.jMonth()],
    year: m.jYear(),
    day: m.jDate(),
    event: JALALI_EVENTS[m.format("jMM/jDD")] ?? null,
  };
}

export function gregorianToJalali(gregorianDate: string): string {
  const m = moment(gregorianDate, "YYYY-MM-DD");
  if (!m.isValid()) throw new Error(`Invalid Gregorian date: ${gregorianDate}`);
  return m.format("jYYYY/jMM/jDD");
}

export function jalaliToGregorian(jalaliDate: string): string {
  const m = moment(jalaliDate, "jYYYY-jMM-jDD");
  if (!m.isValid()) throw new Error(`Invalid Jalali date: ${jalaliDate}`);
  return m.format("YYYY-MM-DD");
}

export function jalaliIsValid(dateStr: string): boolean {
  try {
    const m = moment(dateStr, "jYYYY-jMM-jDD");
    if (!m.isValid()) return false;
    // Verify the date round-trips correctly to catch invalid values
    const year = m.jYear();
    const month = m.jMonth() + 1; // 1-indexed
    const day = m.jDate();
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > jalaliDaysInMonthCalc(year, month)) return false;
    return true;
  } catch {
    return false;
  }
}

export function jalaliDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);
  return jalaliDaysInMonthCalc(year, month);
}

export function jalaliWeekday(year: number, month: number, day: number): string {
  const m = moment(
    `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`,
    "jYYYY/jMM/jDD"
  );
  if (!m.isValid()) throw new Error(`Invalid Jalali date: ${year}/${month}/${day}`);
  return m.locale("fa").format("dddd");
}

export function jalaliDiffDays(from: string, to: string): number {
  const a = moment(from, "jYYYY-jMM-jDD");
  const b = moment(to, "jYYYY-jMM-jDD");
  if (!a.isValid() || !b.isValid()) throw new Error("Invalid Jalali date(s)");
  return b.diff(a, "days");
}

export function jalaliAddDays(dateStr: string, days: number): string {
  const m = moment(dateStr, "jYYYY-jMM-jDD");
  if (!m.isValid()) throw new Error(`Invalid Jalali date: ${dateStr}`);
  m.add(days, "days");
  return m.format("jYYYY/jMM/jDD");
}

export function getJalaliEvents(): Record<string, string> {
  return JALALI_EVENTS;
}

export function getJalaliMonthName(month: number): string {
  if (month < 1 || month > 12) throw new Error(`Invalid month: ${month}`);
  return JALALI_MONTHS[month - 1];
}

export function getJalaliWeekdayName(index: number): string {
  if (index < 0 || index > 6) throw new Error(`Invalid weekday index: ${index}`);
  return WEEKDAYS_FA[index];
}

export function getEventsInRange(
  from: string,
  to: string
): Array<{ date: string; jalali: string; weekday: string; event: string }> {
  const start = moment(from, "jYYYY-jMM-jDD");
  const end = moment(to, "jYYYY-jMM-jDD");
  if (!start.isValid() || !end.isValid()) throw new Error("Invalid Jalali date(s)");

  const results: Array<{ date: string; jalali: string; weekday: string; event: string }> = [];
  const current = start.clone();

  while (current.isSameOrBefore(end)) {
    const monthDay = current.format("jMM/jDD");
    const event = JALALI_EVENTS[monthDay];
    if (event) {
      results.push({
        date: current.format("YYYY-MM-DD"),
        jalali: current.format("jYYYY/jMM/jDD"),
        weekday: current.locale("fa").format("dddd"),
        event,
      });
    }
    current.add(1, "day");
  }
  return results;
}
