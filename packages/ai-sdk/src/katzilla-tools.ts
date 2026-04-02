/**
 * Vercel AI SDK adapter — converts Katzilla data sources into AI SDK tools.
 *
 * Usage:
 *   import { katzillaTools } from "@katzilla/ai-sdk";
 *   const tools = await katzillaTools({ apiKey: "kz_..." });
 *   const result = await generateText({ model, tools, prompt });
 */

import { tool, jsonSchema } from "ai";
import { Katzilla } from "@katzilla/sdk";

export interface KatzillaToolsOptions {
  apiKey: string;
  baseUrl?: string;
}

/**
 * Fetch all Katzilla tool definitions and return them as Vercel AI SDK tools.
 */
export async function katzillaTools(options: KatzillaToolsOptions) {
  const client = new Katzilla({
    apiKey: options.apiKey,
    baseUrl: options.baseUrl,
  });

  const defs = await client.getTools();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tools: Record<string, any> = {};

  for (const def of defs) {
    tools[def.name] = tool({
      description: def.description,
      parameters: jsonSchema<Record<string, unknown>>(def.inputSchema as any),
      execute: async (args: Record<string, unknown>) => {
        const result = await client.executeToolCall(def.name, args);
        return {
          data: result.data,
          quality: result.quality,
          citation: result.citation,
        };
      },
    });
  }

  return tools;
}
