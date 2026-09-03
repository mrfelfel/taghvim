#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import moment from "jalali-moment";
import {
  JALALI_EVENTS,
  JALALI_MONTHS,
  WEEKDAYS_FA,
} from "./events.js";

// ── helpers ──────────────────────────────────────────────

function formatJalali(m: moment.Moment) {
  const jDate = m.format("jYYYY/jMM/jDD");
  const gDate = m.format("YYYY/MM/DD");
  const monthDay = m.format("jMM/jDD");
  const event = JALALI_EVENTS[monthDay] ?? null;
  const weekday = m.locale("fa").format("dddd");
  const monthName = JALALI_MONTHS[m.jMonth()];
  const year = m.jYear();
  const day = m.jDate();

  return {
    jalali: jDate,
    gregorian: gDate,
    weekday,
    monthName,
    year,
    day,
    event,
  };
}

function formatResult(data: ReturnType<typeof formatJalali>) {
  const lines: string[] = [
    `تاریخ جلالی: ${data.jalali} (${data.weekday})`,
    `تاریخ میلادی: ${data.gregorian}`,
    `${data.day} ${data.monthName} ${data.year}`,
  ];
  if (data.event) {
    lines.push(`مناسبت: ${data.event}`);
  }
  return lines.join("\n");
}

// ── MCP server ───────────────────────────────────────────

const server = new McpServer({
  name: "taghvim-mcp",
  version: "2.0.0",
});

// 1. jalali_now ───────────────────────────────────────────

server.tool(
  "jalali_now",
  "Current Jalali date, weekday, month name, and today's event (if any)",
  {},
  async () => {
    const now = moment();
    const data = formatJalali(now);
    return {
      content: [{ type: "text", text: formatResult(data) }],
    };
  }
);

// 2. convert_to_jalali ────────────────────────────────────

server.tool(
  "convert_to_jalali",
  "Convert a Gregorian date (YYYY-MM-DD) to Jalali",
  {
    date: z
      .string()
      .describe("Gregorian date in YYYY-MM-DD format, e.g. 2024-03-20"),
  },
  async ({ date }) => {
    const m = moment(date, "YYYY-MM-DD");
    if (!m.isValid()) {
      return {
        content: [{ type: "text", text: "تاریخ معتبر نیست. فرمت صحیح: YYYY-MM-DD" }],
        isError: true,
      };
    }
    const data = formatJalali(m);
    return {
      content: [{ type: "text", text: formatResult(data) }],
    };
  }
);

// 3. convert_to_gregorian ─────────────────────────────────

server.tool(
  "convert_to_gregorian",
  "Convert a Jalali date (YYYY-MM-DD) to Gregorian",
  {
    date: z
      .string()
      .describe("Jalali date in YYYY-MM-DD format, e.g. 1403-01-01"),
  },
  async ({ date }) => {
    const m = moment(date, "jYYYY-jMM-jDD");
    if (!m.isValid()) {
      return {
        content: [{ type: "text", text: "تاریخ معتبر نیست. فرمت صحیح: YYYY-MM-DD (جلالی)" }],
        isError: true,
      };
    }
    const data = formatJalali(m);
    return {
      content: [{ type: "text", text: formatResult(data) }],
    };
  }
);

// 4. get_events ───────────────────────────────────────────

server.tool(
  "get_events",
  "Search Jalali calendar events/holidays by keyword or list all events of a month",
  {
    keyword: z
      .string()
      .optional()
      .describe("Search keyword in event names, e.g. نوروز, معلم, سینما"),
    month: z
      .number()
      .min(1)
      .max(12)
      .optional()
      .describe("Jalali month number (1-12) to list all events"),
  },
  async ({ keyword, month }) => {
    if (!keyword && !month) {
      return {
        content: [{ type: "text", text: "یکی از پارامترهای keyword یا month را ارسال کنید." }],
        isError: true,
      };
    }

    const results: string[] = [];

    if (month) {
      const monthStr = String(month).padStart(2, "0");
      const monthName = JALALI_MONTHS[month - 1];
      results.push(` مناسبت‌های ماه ${monthName}:`);
      results.push("");
      for (const [date, event] of Object.entries(JALALI_EVENTS)) {
        if (date.startsWith(monthStr + "/")) {
          const day = parseInt(date.split("/")[1]);
          results.push(`  ${day} ${monthName}: ${event}`);
        }
      }
    } else if (keyword) {
      results.push(` جستجوی مناسبت‌ها با کلمه «${keyword}»:`);
      results.push("");
      let found = 0;
      for (const [date, event] of Object.entries(JALALI_EVENTS)) {
        if (event.includes(keyword)) {
          const [m, d] = date.split("/");
          const monthName = JALALI_MONTHS[parseInt(m) - 1];
          results.push(`  ${parseInt(d)} ${monthName}: ${event}`);
          found++;
        }
      }
      if (found === 0) {
        results.push("  مناسبتی با این کلمه یافت نشد.");
      } else {
        results.push("");
        results.push(`  ${found} مناسبت یافت شد.`);
      }
    }

    return {
      content: [{ type: "text", text: results.join("\n") }],
    };
  }
);

// 5. days_until ───────────────────────────────────────────

server.tool(
  "days_until",
  "Calculate days between today and a target Jalali date",
  {
    date: z
      .string()
      .describe("Target Jalali date in YYYY-MM-DD, e.g. 1404-01-01"),
  },
  async ({ date }) => {
    const target = moment(date, "jYYYY-jMM-jDD");
    if (!target.isValid()) {
      return {
        content: [{ type: "text", text: "تاریخ معتبر نیست. فرمت صحیح: YYYY-MM-DD (جلالی)" }],
        isError: true,
      };
    }

    const today = moment();
    const diff = target.diff(today, "days");
    const data = formatJalali(target);

    let relation: string;
    if (diff === 0) {
      relation = " امروز!";
    } else if (diff > 0) {
      relation = ` ${diff} روز دیگر`;
    } else {
      relation = ` ${Math.abs(diff)} روز پیش`;
    }

    const lines = [
      `تاریخ هدف: ${data.jalali} (${data.weekday})`,
      `${data.day} ${data.monthName} ${data.year}`,
      relation,
    ];
    if (data.event) {
      lines.push(`مناسبت: ${data.event}`);
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  }
);

// 6. jalali_range ─────────────────────────────────────────

server.tool(
  "jalali_range",
  "List Jalali dates with events within a date range",
  {
    from: z
      .string()
      .describe("Start date in Jalali YYYY-MM-DD, e.g. 1403-01-01"),
    to: z
      .string()
      .describe("End date in Jalali YYYY-MM-DD, e.g. 1403-03-31"),
  },
  async ({ from, to }) => {
    const start = moment(from, "jYYYY-jMM-jDD");
    const end = moment(to, "jYYYY-jMM-jDD");

    if (!start.isValid() || !end.isValid()) {
      return {
        content: [{ type: "text", text: "تاریخ‌ها معتبر نیستند." }],
        isError: true,
      };
    }

    const results: string[] = [];
    const current = start.clone();

    while (current.isSameOrBefore(end)) {
      const monthDay = current.format("jMM/jDD");
      if (JALALI_EVENTS[monthDay]) {
        results.push(`${current.format("jYYYY/jMM/jDD")} (${current.locale("fa").format("dddd")}): ${JALALI_EVENTS[monthDay]}`);
      }
      current.add(1, "day");
    }

    if (results.length === 0) {
      return {
        content: [{ type: "text", text: "مناسبتی در این بازه زمانی یافت نشد." }],
      };
    }

    return {
      content: [{ type: "text", text: ` مناسبت‌ها از ${from} تا ${to}:\n\n${results.join("\n")}` }],
    };
  }
);

// 7. month_overview ───────────────────────────────────────

server.tool(
  "month_overview",
  "Get a full overview of a Jalali month with day names and events",
  {
    year: z.number().describe("Jalali year, e.g. 1403"),
    month: z.number().min(1).max(12).describe("Jalali month (1-12)"),
  },
  async ({ year, month }) => {
    const monthStr = String(month).padStart(2, "0");
    const monthName = JALALI_MONTHS[month - 1];
    const firstDay = moment(`${year}/${monthStr}/01`, "jYYYY/jMM/jDD");
    const daysInMonth = firstDay.daysInMonth();

    const lines: string[] = [
      ` ${monthName} ${year}`,
      "─".repeat(40),
    ];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = String(day).padStart(2, "0");
      const m = moment(`${year}/${monthStr}/${dayStr}`, "jYYYY/jMM/jDD");
      const weekday = m.locale("fa").format("dddd");
      const eventKey = `${monthStr}/${dayStr}`;
      const event = JALALI_EVENTS[eventKey];

      let line = `  ${dayStr} ${weekday}`;
      if (event) {
        line += ` ★ ${event}`;
      }
      lines.push(line);
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
    };
  }
);

// ── start ────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Taghvim MCP server running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
