// src/hijri-azan.test.ts
import { describe, it, expect } from "vitest";
import {
    hijriToGregorian,
    gregorianToHijri,
    getPrayerTimes,
    HIJRI_MONTHS,
} from "./hijri-azan.js";

describe("تست‌های تبدیل تقویم هجری قمری و تقویم رسمی ایران", () => {
    // تست ۱: مناسبت ۱۵ رمضان ۱۴۴۶ (تست قبلی شما)
    it("باید ۱۵ رمضان ۱۴۴۶ را دقیقاً به ۱۶ مارس ۲۰۲۵ تبدیل کند", () => {
        const result = hijriToGregorian(1446, 9, 15);
        expect(result.year).toBe(2025);
        expect(result.month).toBe(3);
        expect(result.day).toBe(16);
        expect(result.formatted).toBe("2025-03-16");
    });

    // تست ۲: عاشورا (۱۰ محرم ۱۴۴۶ -> ۲۶ تیر ۱۴۰۳ / 2024-07-16)
    it("باید ۱۰ محرم ۱۴۴۶ (عاشورا) را به ۱۶ ژوئیه ۲۰۲۴ تبدیل کند", () => {
        const result = hijriToGregorian(1446, 1, 10);
        expect(result.formatted).toBe("2024-07-16");

        // تبدیل برعکس (میلادی به قمری)
        const reverse = gregorianToHijri(new Date(2024, 6, 16));
        expect(reverse.year).toBe(1446);
        expect(reverse.month).toBe(1);
        expect(reverse.day).toBe(10);
        expect(reverse.monthName).toBe("محرم");
    });

    // تست ۳: عید فطر (۱ شوال ۱۴۴۶ -> ۱۱ فروردین ۱۴۰۴ / 2025-03-31)
    it("باید ۱ شوال ۱۴۴۶ (عید فطر) را به ۳۱ مارس ۲۰۲۵ تبدیل کند", () => {
        const result = hijriToGregorian(1446, 10, 1);
        expect(result.formatted).toBe("2025-03-31");
    });

    // تست ۴: عید قربان (۱۰ ذی‌الحجه ۱۴۴۵ -> ۲۸ خرداد ۱۴۰۳ / 2024-06-17)
    it("باید ۱۰ ذی‌الحجه ۱۴۴۵ را به ۱۷ ژوئن ۲۰۲۴ تبدیل کند", () => {
        const result = hijriToGregorian(1445, 12, 10);
        expect(result.formatted).toBe("2024-06-17");
    });

    // تست ۵: تست برگشت‌پذیری (Round-trip consistency)
    it("تبدیل رفت و برگشت باید یکسان باشد", () => {
        const originalDate = new Date(2025, 2, 16); // 16 March 2025
        const hijri = gregorianToHijri(originalDate);
        const backToGreg = hijriToGregorian(hijri.year, hijri.month, hijri.day);

        expect(backToGreg.year).toBe(2025);
        expect(backToGreg.month).toBe(3);
        expect(backToGreg.day).toBe(16);
    });

    // تست ۶: خطای ورودی‌های نامعتبر
    it("باید در صورت وارد کردن ماه یا روز نامعتبر خطا پرتاب کند", () => {
        expect(() => hijriToGregorian(1446, 13, 1)).toThrow();
        expect(() => hijriToGregorian(1446, 0, 1)).toThrow();
        expect(() => hijriToGregorian(1446, 5, 32)).toThrow();
    });

    // تست ۷: اعمال آفست اختیاری برای رویت هلال (adjustment)
    it("آفست +1 یا -1 باید تاریخ میلادی را دقیقاً یک روز جابجا کند", () => {
        const base = hijriToGregorian(1446, 9, 15, 0);
        const plusOne = hijriToGregorian(1446, 9, 15, 1);
        const minusOne = hijriToGregorian(1446, 9, 15, -1);

        expect(new Date(plusOne.formatted).getDate()).toBe(new Date(base.formatted).getDate() + 1);
        expect(new Date(minusOne.formatted).getDate()).toBe(new Date(base.formatted).getDate() - 1);
    });
});

describe("تست‌های محاسبه اوقات شرعی (متد تهران)", () => {
    // مختصات تهران: 35.6892, 51.3890
    const TEHRAN_LAT = 35.6892;
    const TEHRAN_LNG = 51.389;

    it("باید تمامی اوقات شرعی تهران را محاسبه کند و فرمت زمانی صحیح برگرداند", () => {
        const testDate = new Date(2025, 2, 21); // اول فروردین
        const times = getPrayerTimes(TEHRAN_LAT, TEHRAN_LNG, testDate, "Tehran");

        expect(times).toHaveProperty("imsak");
        expect(times).toHaveProperty("fajr");
        expect(times).toHaveProperty("sunrise");
        expect(times).toHaveProperty("dhuhr");
        expect(times).toHaveProperty("asr");
        expect(times).toHaveProperty("maghrib");
        expect(times).toHaveProperty("isha");

        // چک کردن الگوی ساعت (HH:mm یا فرمت استاندارد زمان)
        expect(times.fajr).toMatch(/\d{2}:\d{2}/);
        expect(times.dhuhr).toMatch(/\d{2}:\d{2}/);
    });

    it("زمان امساک باید قبل از اذان صبح باشد", () => {
        const testDate = new Date(2025, 2, 21);
        const times = getPrayerTimes(TEHRAN_LAT, TEHRAN_LNG, testDate, "Tehran");

        // تبدیل زمان به دقیقه برای مقایسه عددی
        const toMinutes = (timeStr: string) => {
            const [h, m] = timeStr.split(":").map(Number);
            return h * 60 + m;
        };

        expect(toMinutes(times.imsak)).toBeLessThan(toMinutes(times.fajr));
        expect(toMinutes(times.fajr)).toBeLessThan(toMinutes(times.sunrise));
        expect(toMinutes(times.sunrise)).toBeLessThan(toMinutes(times.dhuhr));
        expect(toMinutes(times.dhuhr)).toBeLessThan(toMinutes(times.maghrib));
    });
});