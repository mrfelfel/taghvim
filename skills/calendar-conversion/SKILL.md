---
name: calendar-conversion
description: >
  Convert between Gregorian, Persian/Jalali, and ISO week calendars. Generate recurring
  schedules using RFC 5545 RRULE from natural language patterns like "every Monday" or
  "first Friday of every month". Access Persian calendar events and month overviews.
  Use this for any calendar system conversion or recurring schedule generation.
triggers:
  - "jalali"
  - "persian date"
  - "shamsi"
  - "solar hijri"
  - "تقویم"
  - "شمسی"
  - "جلالی"
  - "convert to jalali"
  - "convert to gregorian"
  - "ISO week"
  - "week number"
  - "recurrence"
  - "recurring"
  - "every Monday"
  - "RRULE"
  - "every month"
  - "every year"
  - "repeating schedule"
  - "iCalendar"
  - "RFC 5545"
tags:
  - jalali
  - persian
  - solar-hijri
  - gregorian
  - iso-week
  - recurrence
  - rrule
  - rfc5545
  - icalendar
  - calendar
  - mcp
tools:
  - calendar
  - jalali_persian
  - recurrence
---

# Calendar Conversion Skill

Use the **taghvim-mcp** server for calendar system conversions and recurring schedules.

## When to use this skill

Activate when the user asks about or references:
- Persian/Jalali/Shamsi/Solar Hijri dates
- Converting between Gregorian and Jalali
- Jalali month calendars or events
- ISO week numbers
- Recurring schedules and patterns
- RRULE (RFC 5545) generation
- "Every Monday", "first Friday of the month", etc.

## Supported calendar systems

| System | Example | Notes |
|--------|---------|-------|
| Gregorian | 2026-09-04 | Standard international |
| Persian / Jalali / Solar Hijri | 1405-06-13 | Used in Iran, Afghanistan |
| ISO Week | 2026-W36-5 | Week-based calendar |

## Core tools

| Tool | Use when... |
|------|-------------|
| `calendar` | Calendar conversions, validation, weekday lookup, month calendars |
| `jalali_persian` | Jalali-specific: events, month overviews, day counting |
| `recurrence` | Recurring schedules via RRULE or natural language |

## Common patterns

### Persian date conversion
```
User: "What Gregorian date is 1405-06-13?"
→ calendar(operation=convert, date=1405-06-13, source_calendar=persian, target_calendar=gregorian)
```

### Jalali month overview
```
User: "Show me the month of Shahrivar 1405 with all events"
→ jalali_persian(operation=month_overview, year=1405, month=6)
```

### Recurring meeting
```
User: "Generate dates for every first Friday of the month for the next year"
→ recurrence(natural_language=first Friday of every month, start_date=2026-09-01, end_date=2027-09-01)
```

## Key principles

- **Jalali dates use `jYYYY-jMM-jDD` format** (e.g. 1405-06-13)
- **Always specify source and target calendars** in conversion requests
- **Recurrence results are always bounded** — never generate infinite lists
- **Use RRULE strings** for complex patterns; natural language for simple ones
