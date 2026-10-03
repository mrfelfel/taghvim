export interface HijriDate {
    year: number;
    month: number;
    day: number;
    formatted: string;
}

export interface GregorianDate {
    year: number;
    month: number;
    day: number;
    formatted: string;
}

export const HIJRI_MONTHS = [
    "محرم", "صفر", "ربیع‌الاول", "ربیع‌الثانی",
    "جمادی‌الاول", "جمادی‌الثانی", "رجب", "شعبان",
    "رمضان", "شوال", "ذی‌القعده", "ذی‌الحجه"
];

function gregorianToJulianDay(year: number, month: number, day: number): number {
    if (month <= 2) {
        year -= 1;
        month += 12;
    }
    const a = Math.floor(year / 100);
    const b = 2 - a + Math.floor(a / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + b - 1524.5;
}

function julianDayToGregorian(jd: number): GregorianDate {
    const z = Math.floor(jd + 0.5);
    const f = (jd + 0.5) - z;
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

    return {
        year,
        month,
        day,
        formatted: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
    };
}

function julianDayToHijri(jd: number): HijriDate {
    const jdFloor = Math.floor(jd) + 0.5;
    const daysSinceEpoch = jdFloor - 1948439.5;
    const year = Math.floor((30 * daysSinceEpoch + 10646) / 10631);
    const startOfYear = gregorianToJulianDay(1948439.5 + Math.ceil((year - 1) * 354.366), 1, 1); // تقریب

    let priorDays = Math.floor(daysSinceEpoch - Math.floor((year - 1) * 354.366));
    const month = Math.min(12, Math.ceil((priorDays - 29) / 29.5) + 1);
    const day = Math.floor(priorDays - Math.floor((month - 1) * 29.5)) + 1;

    return {
        year,
        month,
        day,
        formatted: `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`
    };
}

function hijriToJulianDay(year: number, month: number, day: number): number {
    return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + 1948439.5 - 1;
}

export function convertGregorianToHijri(date: Date): HijriDate {
    const jd = gregorianToJulianDay(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return julianDayToHijri(jd);
}

export function convertHijriToGregorian(year: number, month: number, day: number): GregorianDate {
    if (month < 1 || month > 12 || day < 1 || day > 30) {
        throw new Error("روز یا ماه وارد شده برای تقویم هجری قمری نامعتبر است.");
    }
    const jd = hijriToJulianDay(year, month, day);
    return julianDayToGregorian(jd);
}