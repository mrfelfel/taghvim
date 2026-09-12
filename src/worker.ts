import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTools } from "./server.js";

// Build server once (module-level singleton)
function createServer(): McpServer {
  const server = new McpServer({
    name: "taghvim-mcp",
    version: "3.0.2",
  });
  registerTools(server);
  return server;
}

export default {
  async fetch(request: Request, _env: unknown, _ctx: unknown): Promise<Response> {
    const url = new URL(request.url);

    // CORS
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Health
    if (url.pathname === "/health") {
      return Response.json({
        status: "ok",
        name: "taghvim-mcp",
        version: "3.0.2",
        platform: "cloudflare-workers",
      });
    }

    // Root info
    if (url.pathname === "/" && request.method === "GET") {
      return Response.json({
        name: "taghvim-mcp",
        version: "3.0.2",
        description: "Deterministic temporal reasoning engine for AI agents",
        platform: "cloudflare-workers",
        endpoints: { health: "/health" },
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

    // Note: Full MCP SSE transport requires server-side state which is
    // limited in Cloudflare Workers. For full MCP over HTTP, use Vercel
    // or self-hosted Node.js deployment. The Worker serves as a REST
    // health/info endpoint and can be extended with RPC-style calls.

    return new Response("Not found", { status: 404 });
  },
};
