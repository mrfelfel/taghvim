---
name: international-scheduling
description: Business day calculations and public holiday awareness across 100+ countries
triggers:
  - "business day"
  - "working day"
  - "next working day"
  - "holiday"
  - "public holiday"
  - "is today a holiday"
  - "when is the next holiday"
  - "days off"
  - "office open"
  - "bank holiday"
  - "weekend"
  - "count business days"
  - "last business day of"
tools:
  - business_days
  - holidays
---

# International Scheduling Skill

Use the **taghvim-mcp** server to handle international scheduling constraints.

## When to use this skill

Activate when the user asks about or references:
- Business/working days in any country
- Public holidays and office closures
- Weekend definitions (varies by country)
- Scheduling around holidays
- Counting business days between dates
- Finding the last business day of a month

## Supported weekend definitions

| Pattern | Countries |
|---------|-----------|
| Saturday–Sunday | US, UK, Germany, Japan, France, most of Europe |
| Friday–Saturday | Iran, Saudi Arabia, UAE, Egypt, most of Middle East |
| Sunday–Monday | Maldives |

The tool automatically uses the correct weekend for the given country code.

## Core tools

| Tool | Use when... |
|------|-------------|
| `business_days` | Any business/working day calculation |
| `holidays` | Holiday lookup, checking if a date is a holiday, finding next holiday |

## Common agent patterns

### Check if a date is available
```
User: "Is next Monday a good day to send the contract?"

Agent workflow:
1. business_days: operation=is_business_day, date=<next_monday>, country_code=US
   → if false: suggest the next business day
```

### Schedule around holidays
```
User: "Send the invoice 5 business days before the end of the year"

Agent workflow:
1. business_days: operation=add, date=2026-12-31, count=-5, country_code=US
   → result.date is the target
```

### Country-specific scheduling
```
User: "When is the next business day in Japan?"

Agent workflow:
1. business_days: operation=next, date=<today>, country_code=JP
```

### Holiday awareness
```
User: "Is there a public holiday in Germany this week?"

Agent workflow:
1. holidays: operation=between, country_code=DE, start_date=<monday>, end_date=<sunday>
   → check result.holidays.length > 0
```

## Key principles

- **Always specify the country code** — defaults to US if omitted
- **Never assume Saturday/Sunday weekend** — Middle Eastern countries use Friday/Saturday
- **Check both weekends AND holidays** — a business day is neither a weekend nor a holiday
- **Use ISO 3166-1 alpha-2 codes**: US, GB, DE, JP, IR, AE, SA, FR, etc.
