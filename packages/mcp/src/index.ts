#!/usr/bin/env node
/**
 * @katzilla/mcp — Standalone MCP server for Claude Desktop, Cursor, and other MCP clients.
 *
 * Usage:
 *   npx @katzilla/mcp
 *
 * Environment variables:
 *   KATZILLA_API_KEY — Your Katzilla API key (starts with kz_)
 *
 * Claude Desktop config (~/.config/claude/claude_desktop_config.json):
 *   {
 *     "mcpServers": {
 *       "katzilla": {
 *         "command": "npx",
 *         "args": ["@katzilla/mcp"],
 *         "env": { "KATZILLA_API_KEY": "kz_your_key_here" }
 *       }
 *     }
 *   }
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Katzilla } from "@katzilla/sdk";

// The key is optional at startup so indexers and MCP inspectors (e.g. Glama)
// can register tools without provisioning an env var — /agents/tools is a
// public endpoint. We only refuse tool calls if the key is missing.
const API_KEY = process.env.KATZILLA_API_KEY ?? "";
const BASE_URL = process.env.KATZILLA_BASE_URL || "https://api.katzilla.dev";

async function main() {
  const kz = new Katzilla({ apiKey: API_KEY, baseUrl: BASE_URL });
  const toolDefs = await kz.getTools();

  // Build a quick lookup so CallTool doesn't re-scan the list.
  const byName = new Map(toolDefs.map((t) => [t.name, t]));

  const server = new Server(
    { name: "katzilla", version: "0.1.3" },
    { capabilities: { tools: {} } },
  );

  // Katzilla's /agents/tools returns JSON Schema, which is exactly what the
  // MCP tools/list response expects — hand it through directly instead of
  // going via McpServer.tool(), which wants Zod shapes.
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefs.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema as Record<string, unknown>,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const { name, arguments: args = {} } = req.params;
    if (!byName.has(name)) {
      return {
        content: [{ type: "text" as const, text: `Error: unknown tool "${name}"` }],
        isError: true,
      };
    }
    if (!API_KEY) {
      return {
        content: [{
          type: "text" as const,
          text: "Error: KATZILLA_API_KEY is not set. Get a free key at https://katzilla.dev/dashboard and add it to your MCP client's env config.",
        }],
        isError: true,
      };
    }
    try {
      const result = await kz.executeToolCall(name, args as Record<string, unknown>);
      const payload = { data: result.data, quality: result.quality, citation: result.citation };
      return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
    } catch (err: any) {
      return {
        content: [{ type: "text" as const, text: `Error: ${err.message}` }],
        isError: true,
      };
    }
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
