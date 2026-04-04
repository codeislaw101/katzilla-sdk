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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { Katzilla } from "@katzilla/sdk";

const API_KEY = process.env.KATZILLA_API_KEY;
if (!API_KEY) {
  console.error("Error: KATZILLA_API_KEY environment variable is required.");
  console.error("Get your free API key at https://katzilla.dev/dashboard");
  process.exit(1);
}

const BASE_URL = process.env.KATZILLA_BASE_URL || "https://api.katzilla.dev";

async function main() {
  const kz = new Katzilla({ apiKey: API_KEY!, baseUrl: BASE_URL });

  // Fetch tool definitions from the API
  const toolDefs = await kz.getTools();

  const server = new McpServer({
    name: "katzilla",
    version: "0.1.0",
  });

  // Register each Katzilla tool as an MCP tool
  for (const tool of toolDefs) {
    server.tool(
      tool.name,
      tool.description,
      tool.inputSchema as Record<string, unknown>,
      async (args: Record<string, unknown>) => {
        try {
          const result = await kz.executeToolCall(tool.name, args);
          const payload = {
            data: result.data,
            quality: result.quality,
            citation: result.citation,
          };
          return {
            content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
          };
        } catch (err: any) {
          return {
            content: [{ type: "text" as const, text: `Error: ${err.message}` }],
            isError: true,
          };
        }
      },
    );
  }

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal:", err.message);
  process.exit(1);
});
