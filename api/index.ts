import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "../src/server.js";

// Singleton server instance
let mcpServer: McpServer | null = null;

function getServer(): McpServer {
  if (!mcpServer) {
    mcpServer = new McpServer({
      name: "taghvim-mcp",
      version: "3.0.2",
    });
    registerTools(mcpServer);
  }
  return mcpServer;
}

// In-memory session store (resets on cold start — acceptable for serverless)
const sessions = new Map<string, SSEServerTransport>();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;
  const path = req.url?.split("?")[0] ?? "/";

  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Health check
  if (path === "/health" || path === "/api") {
    res.status(200).json({
      status: "ok",
      name: "taghvim-mcp",
      version: "3.0.2",
      tools: 14,
    });
    return;
  }

  // SSE endpoint
  if (path === "/sse" && method === "GET") {
    const server = getServer();
    const transport = new SSEServerTransport("/messages", res);
    sessions.set(transport.sessionId, transport);

    res.on("close", () => {
      sessions.delete(transport.sessionId);
    });

    await server.connect(transport);
    return;
  }

  // Messages endpoint
  if (path === "/messages" && method === "POST") {
    const sessionId = (req.query.sessionId as string) ?? "";
    const transport = sessions.get(sessionId);

    if (!transport) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    await transport.handlePostMessage(req, res);
    return;
  }

  // Root info
  res.status(200).json({
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
  });
}
