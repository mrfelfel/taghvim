---
name: international-scheduling
description: >
  Business day calculations and public holiday awareness across 100+ countries.
  Check if a date is a business day, find next/previous business day, add business days,
  count business days between dates. Look up public holidays for any country.
  Supports configurable weekends: Sat-Sun (US/UK), Fri-Sat (Iran/Saudi), Sun-Mon (Maldives).
triggers:
  - "business day"
  - "working day"
  - "next working day"
  - "last business day of"
  - "holiday"
  - "public holiday"
  - "is today a holiday"
  - "when is the next holiday"
  - "days off"
  - "office open"
  - "bank holiday"
  - "weekend"
  - "count business days"
  - "add business days"
  - "is this a working day"
tags:
  - business-days
  - holidays
  - scheduling
  - international
  - country-specific
  - working-days
  - public-holidays
  - mcp
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

## Core tools

| Tool | Use when... |
|------|-------------|
| `business_days` | Any business/working day calculation |
| `holidays` | Holiday lookup, checking if a date is a holiday, finding next holiday |

## Common patterns

### Check if a date is available
```
User: "Is next Monday a good day to send the contract?"
→ business_days(operation=is_business_day, date=<next_monday>, country_code=US)
```

### Schedule around holidays
```
User: "Send the invoice 5 business days before the end of the year"
→ business_days(operation=add, date=2026-12-31, count=-5, country_code=US)
```

### Country-specific scheduling
```
User: "When is the next business day in Japan?"
→ business_days(operation=next, date=<today>, country_code=JP)
```

### Holiday awareness
```
User: "Is there a public holiday in Germany this week?"
→ holidays(operation=between, country_code=DE, start_date=<monday>, end_date=<sunday>)
```

## Key principles

- **Always specify the country code** — defaults to US if omitted
- **Never assume Saturday/Sunday weekend** — Middle Eastern countries use Friday/Saturday
- **Check both weekends AND holidays** — a business day is neither
- **Use ISO 3166-1 alpha-2 codes**: US, GB, DE, JP, IR, AE, SA, FR, etc.
