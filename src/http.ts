#!/usr/bin/env node

import { createServer } from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./server.js";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

const server = new McpServer({
  name: "taghvim-mcp",
  version: "3.0.2",
});

registerTools(server);

// Track active sessions
const sessions = new Map<string, SSEServerTransport>();

const httpServer = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host}`);

  // Health check
  if (url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", version: "3.0.2", tools: 14 }));
    return;
  }

  // SSE endpoint — client connects here to receive events
  if (url.pathname === "/sse" && req.method === "GET") {
    const transport = new SSEServerTransport("/messages", res);
    sessions.set(transport.sessionId, transport);

    res.on("close", () => {
      sessions.delete(transport.sessionId);
    });

    await server.connect(transport);
    return;
  }

  // Messages endpoint — client sends JSON-RPC here
  if (url.pathname === "/messages" && req.method === "POST") {
    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      res.writeHead(400);
      res.end("Missing sessionId");
      return;
    }

    const transport = sessions.get(sessionId);
    if (!transport) {
      res.writeHead(404);
      res.end("Session not found");
      return;
    }

    await transport.handlePostMessage(req, res);
    return;
  }

  // Root — show info
  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      name: "taghvim-mcp",
      version: "3.0.2",
      description: "Deterministic temporal reasoning engine for AI agents",
      endpoints: {
        sse: "/sse",
        messages: "/messages?sessionId=<id>",
        health: "/health",
      },
      tools: [
        "now", "resolve_time", "calculate_date", "convert_time",
        "timezone_info", "business_days", "holidays", "recurrence",
        "calendar", "format_time", "temporal_verify", "jalali_persian",
        "next_event", "month_calendar",
      ],
      github: "https://github.com/mrfelfel/taghvim",
      npm: "https://www.npmjs.com/package/taghvim-mcp",
    }, null, 2));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

httpServer.listen(PORT, () => {
  console.error(`Taghvim MCP HTTP server running on http://localhost:${PORT}`);
  console.error(`SSE endpoint: http://localhost:${PORT}/sse`);
});
