import { Coordinates, CalculationMethod, PrayerTimes } from "adhan";

export const HIJRI_MONTHS = [
    "محرم", "صفر", "ربیع‌الاول", "ربیع‌الثانی",
    "جمادی‌الاول", "جمادی‌الثانی", "رجب", "شعبان",
    "رمضان", "شوال", "ذی‌القعده", "ذی‌الحجه"
];

function isHijriLeapYear(year: number): boolean {
    return (11 * year + 14) % 30 < 11;
}

function getHijriDaysInMonth(year: number, month: number): number {
    if (month % 2 === 1) return 30;
    if (month === 12) return isHijriLeapYear(year) ? 30 : 29;
    return 29;
}

function gregorianToJulianDay(year: number, month: number, day: number): number {
    let y = year;
    let m = month;
    if (m <= 2) {
        y -= 1;
        m += 12;
    }
    const a = Math.floor(y / 100);
    const b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + b - 1524.5;
}

function julianDayToGregorian(jd: number) {
    const z = Math.floor(jd + 0.5);
    const f = jd + 0.5 - z;
    let a = z;
    if (z >= 2299161) {
        const alpha = Math.floor((z - 1867216.25) / 36524.25);
        a = z + 1 + alpha - Math.floor(alpha / 4);
    }
    const b = a + 1524;
    const c = Math.floor((b - 122.1) / 365.25);
    const d = Math.floor(365.25 * c);
    const e = Math.floor((b - d) / 30.6001);

    const day = Math.floor(b - d - Math.floor(30.6001 * e) + f);
    const month = e < 14 ? e - 1 : e - 13;
    const year = month > 2 ? c - 4716 : c - 4715;

    return { year, month, day };
}

function julianDayToHijri(jd: number) {
    const jdFloor = Math.floor(jd) + 0.5;
    let daysSinceEpoch = jdFloor - 1948438.5;

    const cycle = Math.floor(daysSinceEpoch / 10631);
    let daysInCycle = daysSinceEpoch - cycle * 10631;

    let yearInCycle = Math.floor((daysInCycle - 0.5) / 354.366);
    let daysToYear = Math.floor(yearInCycle * 354 + (11 * yearInCycle + 3) / 30);

    if (daysInCycle < daysToYear) {
        yearInCycle--;
        daysToYear = Math.floor(yearInCycle * 354 + (11 * yearInCycle + 3) / 30);
    }

    let year = cycle * 30 + yearInCycle + 1;
    let dayOfYear = Math.floor(daysInCycle - daysToYear);

    let month = 1;
    while (month <= 12) {
        const dim = getHijriDaysInMonth(year, month);
        if (dayOfYear <= dim) {
            break;
        }
        dayOfYear -= dim;
        month++;
    }

    const day = dayOfYear === 0 ? 1 : dayOfYear;

    return {
        year,
        month,
        day,
        monthName: HIJRI_MONTHS[month - 1] ?? "",
        formatted: `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`
    };
}

function hijriToJulianDay(year: number, month: number, day: number): number {
    const y = year - 1;
    const cycle = Math.floor(y / 30);
    const yearInCycle = y % 30;

    let days = cycle * 10631 + Math.floor(yearInCycle * 354 + (11 * yearInCycle + 3) / 30);

    for (let m = 1; m < month; m++) {
        days += getHijriDaysInMonth(year, m);
    }
    days += day;

    return days + 1948438.5;
}

export function gregorianToHijri(date: Date, adjustment: number = 0) {
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();

    const jd = gregorianToJulianDay(y, m, d) + adjustment;
    return julianDayToHijri(jd);
}

export function hijriToGregorian(year: number, month: number, day: number, adjustment: number = 0) {
    if (month < 1 || month > 12 || day < 1 || day > 30) {
        throw new Error("روز یا ماه قمری نامعتبر است.");
    }

    const approxJd = Math.floor(
        1948438.5 + 354.367 * (year - 1) + 29.5 * (month - 1) + day
    );
    const approxG = julianDayToGregorian(approxJd);

    let bestDate = new Date(approxG.year, approxG.month - 1, approxG.day);
    let found = false;

    for (let offset = -4; offset <= 4; offset++) {
        const candidate = new Date(approxG.year, approxG.month - 1, approxG.day + offset);
        const h = gregorianToHijri(candidate, 0);

        if (h.year === year && h.month === month && h.day === day) {
            bestDate = candidate;
            found = true;
            break;
        }
    }

    if (!found) {
        for (let offset = -4; offset <= 4; offset++) {
            const candidate = new Date(approxG.year, approxG.month - 1, approxG.day + offset);
            const h = gregorianToHijri(candidate, 0);
            if (h.year === year && h.month === month) {
                bestDate = candidate;
                break;
            }
        }
    }

    if (adjustment !== 0) {
        bestDate = new Date(bestDate.getFullYear(), bestDate.getMonth(), bestDate.getDate() + adjustment);
    }

    const resYear = bestDate.getFullYear();
    const resMonth = bestDate.getMonth() + 1;
    const resDay = bestDate.getDate();

    return {
        year: resYear,
        month: resMonth,
        day: resDay,
        formatted: `${resYear}-${String(resMonth).padStart(2, "0")}-${String(resDay).padStart(2, "0")}`
    };
}

export function getPrayerTimes(
    latitude: number,
    longitude: number,
    date: Date = new Date(),
    method: "Tehran" | "MuslimWorldLeague" | "UmmAlQura" = "Tehran"
) {
    const coordinates = new Coordinates(latitude, longitude);
    let params = CalculationMethod.Tehran();
    if (method === "UmmAlQura") params = CalculationMethod.UmmAlQura();
    else if (method === "MuslimWorldLeague") params = CalculationMethod.MuslimWorldLeague();

    const times = new PrayerTimes(coordinates, date, params);
    const formatTime = (d: Date) =>
        d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });

    return {
        imsak: formatTime(new Date(times.fajr.getTime() - 10 * 60 * 1000)),
        fajr: formatTime(times.fajr),
        sunrise: formatTime(times.sunrise),
        dhuhr: formatTime(times.dhuhr),
        asr: formatTime(times.asr),
        maghrib: formatTime(times.maghrib),
        isha: formatTime(times.isha)
    };
}