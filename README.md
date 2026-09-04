# Taghvim

**Deterministic temporal reasoning engine for AI agents.**

LLMs are surprisingly bad at dates, timezones, business days, holidays, and recurring schedules. Taghvim gives agents deterministic temporal primitives they can call instead of guessing.

```bash
npx taghvim-mcp
```

## Why Taghvim

When a user asks an agent to "schedule the report for the last business day of next month at 9 AM London time", the agent needs to:

1. Resolve "next month" → deterministic date range
2. Find the last business day → skip weekends + holidays
3. Attach "9 AM London" → timezone-aware timestamp
4. Return a structured result, not a guess

Taghvim provides the tools that make this possible.

## Install

```bash
npm install taghvim-mcp
```

Or run directly:

```bash
npx taghvim-mcp
```

## MCP Configuration

### Claude Desktop / Claude Code

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

Or with a local installation:

```json
{
  "mcpServers": {
    "taghvim": {
      "command": "node",
      "args": ["/absolute/path/to/taghvim/dist/index.js"]
    }
  }
}
```

## Tools

### `now`

Return the current deterministic time. Never let the LLM guess the current date.

```
Parameters: timezone (IANA), calendar (gregorian|persian|iso-week)
Returns: UTC, local, date, time, weekday, UTC offset, DST status
```

### `resolve_time`

Resolve natural-language date/time expressions into ISO timestamps.

```
Expression examples:
  "tomorrow at 3pm"
  "next Friday"
  "in 3 weeks"
  "January 15, 2027"
  "the first Monday of next month"
```

### `calculate_date`

Deterministic date arithmetic with correct month-end and leap-year handling.

```
Operations: add, subtract, diff, start_of, end_of, next_weekday, previous_weekday

Examples:
  2026-01-31 + 1 month → 2026-02-28 (handled correctly)
  start_of month for 2026-09-04 → 2026-09-01
```

### `convert_time`

Convert datetimes between IANA timezones with DST correctness.

```
Parameters: datetime, from_timezone, to_timezone (string or array)
Convert to multiple targets at once.
Never hardcodes UTC offsets.
```

### `timezone_info`

Deterministic timezone metadata: UTC offset, DST status, abbreviation, and next/previous DST transitions.

### `business_days`

Business-calendar calculations with configurable weekends and holidays by country.

```
Operations: is_business_day, next, previous, add, count, last_of_month, range

Supported countries: US, UK, DE, JP, IR, UAE, and 100+ more.
Weekend definitions: Sat-Sun (US/UK), Fri-Sat (Iran/Saudi), Sun-Mon (Maldives).
```

### `holidays`

Public holiday intelligence for 100+ countries.

```
Operations: list, is_holiday, next, between, countries

Distinguishes between actual and observed holiday dates.
```

### `recurrence`

RFC 5545 RRULE recurrence with natural-language parsing.

```
Natural language patterns:
  "every Monday"
  "every weekday"
  "first Friday of every month"
  "every 90 days"

Always generates bounded results. Never produces infinite recurrences.
```

### `calendar`

Calendar-system operations: Gregorian ↔ Persian/Jalali, date validation, weekday, month info, month calendar generation.

### `format_time`

Deterministic formatting: ISO 8601, RFC 3339, locale-aware, Jalali, human-readable.

```
Locales supported: en-US, en-GB, de-DE, fr-FR, ja-JP, fa-IR, ar, es-ES, and any valid BCP 47 locale.
```

### `temporal_verify`

Verify temporal claims deterministically to prevent hallucinations.

```
Claims:
  "Is 2026-12-31 a Thursday?"
  "Is 2024 a leap year?"
  "Are 2026-01-01 and 2026-01-01 the same?"
```

### `jalali_persian`

Persian/Jalali calendar operations: convert dates, look up events, get month overviews, calculate days until Jalali dates.

## Architecture

```
LLM / Agent
      │
      │ natural language
      ▼
Taghvim MCP
      │
      ├── resolve / parse
      │
      ▼
Canonical temporal representation (ISO 8601 + IANA TZ)
      │
      ▼
Deterministic temporal engine
      │
      ▼
Structured JSON result
```

### Standards Used

- **ISO 8601 / RFC 3339** — datetime representation
- **IANA Timezone Database** — timezone identifiers via Luxon
- **RFC 5545 / iCalendar RRULE** — recurrence rules via `rrule` library
- **BCP 47** — locale identifiers

### Core Dependencies

| Library | Purpose | License |
|---------|---------|---------|
| `luxon` | Timezone-aware date/time | MIT |
| `rrule` | RFC 5545 recurrence | MIT |
| `chrono-node` | Natural language date parsing | MIT |
| `date-holidays` | Holiday data for 100+ countries | MIT |
| `jalali-moment` | Persian/Jalali calendar | MIT |
| `@modelcontextprotocol/sdk` | MCP server | MIT |

## Development

```bash
npm install
npm run build      # compile TypeScript
npm test           # run test suite
npm run lint       # type-check without emit
npm run dev        # watch mode
```

## Testing

```bash
npm test
```

70 tests covering:
- Date arithmetic (leap years, month boundaries, DST transitions)
- Timezone conversion (UTC, DST zones, non-DST zones, half-hour offsets)
- Business days (US, UK, Iran, Japan weekends; holiday interactions)
- Holidays (multiple countries, observed dates)
- Recurrence (weekly, monthly, yearly, DST-crossing)
- Calendar systems (Gregorian ↔ Persian round-trips)
- Natural language parsing
- Input validation
- Invariant/property tests

## License

MIT
