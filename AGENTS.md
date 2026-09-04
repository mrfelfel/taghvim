# Taghvim — Temporal Intelligence for AI Agents

**Package**: `taghvim-mcp` | **MCP Server**: `taghvim-mcp` | **npm**: https://www.npmjs.com/package/taghvim-mcp

## What this does

Taghvim is a deterministic temporal reasoning engine exposed as an MCP server.
It gives AI agents reliable date/time computation instead of guessing.

## When an agent should use Taghvim

Any time a task involves dates, times, timezones, calendars, holidays, business days, or recurring schedules, the agent should call Taghvim tools rather than computing dates itself.

### Trigger keywords for agents

| Category | Keywords / phrases |
|----------|-------------------|
| Time | `what time`, `current time`, `what date`, `what day` |
| Relative dates | `tomorrow`, `yesterday`, `next week`, `last month`, `in 3 days`, `90 days from now` |
| Timezones | `timezone`, `convert time`, `what time in`, `UTC`, `DST`, `daylight saving` |
| Business days | `business day`, `working day`, `next working day`, `last business day of` |
| Holidays | `holiday`, `public holiday`, `is today a holiday`, `bank holiday`, `days off` |
| Scheduling | `schedule`, `recurring`, `every Monday`, `repeating`, `RRULE`, `recurrence` |
| Calendars | `jalali`, `persian date`, `shamsi`, `solar hijri`, `ISO week`, `week number` |
| Verification | `is X a Y?`, `is that a Saturday?`, `is that before` |

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

## Available tools (12 total)

| Tool | Description |
|------|-------------|
| `now` | Current deterministic time — never let the LLM guess the date |
| `resolve_time` | Parse "tomorrow at 3pm" → ISO timestamp |
| `calculate_date` | Add/subtract/diff/boundary operations on dates |
| `convert_time` | Timezone conversion with DST correctness |
| `timezone_info` | UTC offset, DST status, next transition |
| `business_days` | Business day logic for 100+ countries |
| `holidays` | Public holidays for 100+ countries |
| `recurrence` | RFC 5545 RRULE generation from natural language |
| `calendar` | Gregorian ↔ Persian/Jalali ↔ ISO week conversion |
| `format_time` | Locale-aware datetime formatting |
| `temporal_verify` | Anti-hallucination: verify "is X a Y?" claims |
| `jalali_persian` | Persian calendar events, month overviews, conversions |

## Agent decision tree

```
User mentions a date/time?
├─ "What time is it?" → now
├─ "Tomorrow", "next Friday" → resolve_time
├─ "Add 3 months" → calculate_date
├─ "In Tokyo time" → convert_time
├─ "Is it DST?" → timezone_info
├─ "Business day" / "holiday" → business_days / holidays
├─ "Every Monday" / "RRULE" → recurrence
├─ "Jalali date" / "Persian" → calendar or jalali_persian
├─ "Format in Japanese" → format_time
└─ "Is Dec 25 a Saturday?" → temporal_verify
```

## Design principles

1. **Never guess** — always call the tool instead of inferring dates
2. **Use IANA timezone names** — `America/New_York`, not `EST`
3. **Return structured JSON** — other agents can parse results directly
4. **Specify country codes** for business days/holidays — defaults to US
5. **Always bound recurrence** — never generate infinite date lists
