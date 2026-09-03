# Taghvim MCP Server

MCP server for the Jalali (Persian Solar Hijri) calendar. Provides 7 tools for AI agents to work with Iranian dates, holidays, and events.

## Features

- Convert between Gregorian and Jalali dates
- Look up today's date and events
- Search calendar events by keyword
- Calculate days until a target date
- List events in a date range
- Full month overview with day names

## Install

```bash
npm install
npm run build
```

## Usage with Claude Desktop

Add to your `claude_desktop_config.json`:

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

## Usage with Claude Code

Add to `.claude/settings.json`:

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

### `jalali_now`

Returns the current Jalali date, weekday, month name, and today's event.

**Parameters:** None

**Example output:**
```
تاریخ جلالی: 1403/06/14 (سه‌شنبه)
تاریخ میلادی: 2024/09/03
14 شهریور 1403
مناسبت: روز فرهنگ عمومی
```

---

### `convert_to_jalali`

Convert a Gregorian date to Jalali.

| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | string | Gregorian date in `YYYY-MM-DD` format |

---

### `convert_to_gregorian`

Convert a Jalali date to Gregorian.

| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | string | Jalali date in `YYYY-MM-DD` format |

---

### `get_events`

Search events by keyword or list all events of a specific month.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keyword` | string | No | Search in event names |
| `month` | number | No | Jalali month (1-12) |

**Examples:**
- Search for "نوروز" → all Norouz-related events
- Month `1` → all events in Farvardin

---

### `days_until`

Calculate days between today and a target Jalali date.

| Parameter | Type | Description |
|-----------|------|-------------|
| `date` | string | Target date in Jalali `YYYY-MM-DD` |

**Example output for Norouz 1404:**
```
تاریخ هدف: 1404/01/01 (جمعه)
۱ فروردین ۱۴۰۴
 ۱۶۸ روز دیگر
مناسبت: جشن نوروز / جشن سال نو
```

---

### `jalali_range`

List all events within a Jalali date range.

| Parameter | Type | Description |
|-----------|------|-------------|
| `from` | string | Start date in Jalali `YYYY-MM-DD` |
| `to` | string | End date in Jalali `YYYY-MM-DD` |

---

### `month_overview`

Full overview of a Jalali month with weekday names and events.

| Parameter | Type | Description |
|-----------|------|-------------|
| `year` | number | Jalali year (e.g. 1403) |
| `month` | number | Jalali month (1-12) |

**Example output:**
```
 فروردین 1403
────────────────────────────────────────
 01 شنبه ★ جشن نوروز / جشن سال نو
 02 یکشنبه ★ عید نوروز
 03 دوشنبه ★ عید نوروز
 ...
```

## Development

```bash
npm run dev    # watch mode
npm run build  # compile
npm start      # run server
```

## License

MIT
