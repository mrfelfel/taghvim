---
name: temporal-reasoning
description: Deterministic date/time resolution, arithmetic, and timezone conversion for AI agents
triggers:
  - "what time is it"
  - "what date is it"
  - "tomorrow"
  - "next Friday"
  - "in 3 weeks"
  - "convert time"
  - "timezone"
  - "DST"
  - "daylight saving"
  - "how many days until"
  - "date arithmetic"
  - "add days"
  - "start of month"
  - "end of quarter"
tools:
  - now
  - resolve_time
  - calculate_date
  - convert_time
  - timezone_info
  - format_time
  - temporal_verify
---

# Temporal Reasoning Skill

Use the **taghvim-mcp** server to perform deterministic temporal computation.

## When to use this skill

Activate when the user asks about or references:
- Current date/time (never guess — always call `now`)
- Relative dates: "tomorrow", "next Friday", "in two weeks", "90 days from now"
- Date arithmetic: "add 3 months", "what's the first day of next quarter"
- Timezone conversion: "what time is that in Tokyo?", "14:00 London → New York"
- Timezone info: "is New York in DST right now?", "what's the UTC offset of Tehran?"
- Formatting: "format this date in Japanese locale"
- Verifying temporal claims: "is December 25 2027 a Saturday?"

## Core tools

| Tool | Use when... |
|------|-------------|
| `now` | User asks current time, date, or "what day is it" — never let the LLM guess |
| `resolve_time` | Any natural-language date/time expression needs resolving |
| `calculate_date` | Date math: add/subtract, find boundaries, compute differences |
| `convert_time` | Convert a datetime across timezones (supports multi-target) |
| `timezone_info` | DST status, UTC offset, next transition for a timezone |
| `format_time` | Locale-aware formatting (ISO, Jalali, human-readable, custom) |
| `temporal_verify` | Verify "is X a Y?" claims to prevent hallucinations |

## Common agent patterns

### Scheduling
```
User: "Schedule the report for the last business day of next month at 9 AM London time"

Agent workflow:
1. calculate_date: date=<current>, operation=end_of, period=month → get end of month
2. business_days: operation=previous, date=<end_of_month>, country_code=US → last business day
3. convert_time: datetime=<date>T09:00:00, from_timezone=Europe/London, to_timezone=America/New_York
```

### International meetings
```
User: "I have a call at 3 PM Tokyo time. What time is that in London and New York?"

Agent workflow:
1. convert_time: datetime=<today>T15:00:00, from_timezone=Asia/Tokyo, to_timezone=["Europe/London", "America/New_York"]
```

### Date verification
```
User: "Is Christmas 2027 on a Saturday?"

Agent workflow:
1. temporal_verify: claim="Is 2027-12-25 a Saturday?"
```

## Key principles

- **Never guess the current date/time** — always call `now`
- **Always use IANA timezone names** (e.g. `America/New_York`, not `EST`)
- **Return structured JSON** — other agents can parse it directly
- **Use deterministic tools** instead of LLM inference for any date computation
