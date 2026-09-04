---
name: taghvim-temporal-reasoning
description: >
  Deterministic temporal reasoning engine for AI agents. Resolve natural-language dates,
  convert timezones, calculate business days across 100+ countries, look up public holidays,
  generate recurring schedules (RRULE), convert between Gregorian and Persian/Jalali calendars,
  and verify temporal claims to prevent hallucinations. Use this skill whenever the user
  mentions dates, times, timezones, holidays, business days, schedules, or calendar conversions.
---

# Taghvim — Temporal Intelligence for AI Agents

Taghvim is a deterministic temporal reasoning MCP server. It gives AI agents reliable date/time computation instead of guessing.

## When to use

Any time a task involves dates, times, timezones, calendars, holidays, business days, or recurring schedules, call Taghvim tools rather than computing dates yourself.

### Trigger keywords

| Category | Keywords |
|----------|----------|
| Current time | `what time`, `what date`, `what day is it` |
| Relative dates | `tomorrow`, `yesterday`, `next week`, `last month`, `in 3 days`, `90 days from now` |
| Timezones | `timezone`, `convert time`, `what time in`, `UTC`, `DST`, `daylight saving` |
| Business days | `business day`, `working day`, `next working day`, `last business day of` |
| Holidays | `holiday`, `public holiday`, `is today a holiday`, `bank holiday`, `days off` |
| Scheduling | `schedule`, `recurring`, `every Monday`, `repeating`, `RRULE`, `recurrence` |
| Calendars | `jalali`, `persian date`, `shamsi`, `solar hijri`, `ISO week`, `week number` |
| Verification | `is X a Y?`, `is that a Saturday?`, `is that before`, `leap year` |

## Available tools (12)

| Tool | Description |
|------|-------------|
| `now` | Current deterministic time — never guess the date |
| `resolve_time` | Parse "tomorrow at 3pm" → ISO timestamp |
| `calculate_date` | Add/subtract/diff/boundary operations |
| `convert_time` | Timezone conversion with DST correctness |
| `timezone_info` | UTC offset, DST status, next transition |
| `business_days` | Business day logic for 100+ countries |
| `holidays` | Public holidays for 100+ countries |
| `recurrence` | RFC 5545 RRULE from natural language |
| `calendar` | Gregorian ↔ Persian/Jalali ↔ ISO week |
| `format_time` | Locale-aware datetime formatting |
| `temporal_verify` | Verify "is X a Y?" claims |
| `jalali_persian` | Persian calendar events and conversions |

## Quick examples

### Current time
```
now(timezone="Asia/Tokyo")
→ { utc: "2026-09-04T12:00:00Z", local: "2026-09-04T21:00:00+09:00", weekday: "Friday" }
```

### Natural language resolution
```
resolve_time(expression="next Friday at 3pm", timezone="Europe/London")
→ { utc: "2026-09-11T14:00:00Z", local: "2026-09-11T15:00:00+01:00" }
```

### Timezone conversion
```
convert_time(datetime="2026-09-04T14:00:00", from_timezone="Europe/London", to_timezone=["America/New_York", "Asia/Tokyo"])
→ [ { timezone: "America/New_York", time: "07:00:00-04:00" }, { timezone: "Asia/Tokyo", time: "22:00:00+09:00" } ]
```

### Business days
```
business_days(operation="add", date="2026-09-04", count=5, country_code="DE")
→ { date: "2026-09-11" } // skips German weekends + holidays
```

### Holidays
```
holidays(operation="is_holiday", date="2026-12-25", country_code="US")
→ { isHoliday: true, holiday: { name: "Christmas Day" } }
```

### Recurrence
```
recurrence(natural_language="first Friday of every month", start_date="2026-09-01", end_date="2027-09-01")
→ { rule: { rrule: "FREQ=MONTHLY;BYDAY=1FR" }, occurrences: [...] }
```

### Persian/Jalali
```
calendar(operation="convert", date="2026-09-04", source_calendar="gregorian", target_calendar="persian")
→ { target: { date: "1405/06/13", calendar: "persian" } }
```

## Setup

```json
{
  "mcpServers": {
    "taghvim": {
      "command": "npx",
      "args": ["taghvim-mcp"]
    }
  }
}
```

## Design principles

1. **Never guess** — always call the tool instead of inferring dates
2. **Use IANA timezone names** — `America/New_York`, not `EST`
3. **Return structured JSON** — other agents can parse results directly
4. **Specify country codes** for business days/holidays — defaults to US
5. **Always bound recurrence** — never generate infinite date lists
