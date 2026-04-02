/**
 * Katzilla SDK — HTTP client that talks to api.katzilla.dev.
 *
 * Usage:
 *   const kz = new Katzilla({ apiKey: "kz_abc123" });
 *   const quakes = await kz.agent("data-hazards").action("recent-earthquakes", { minMagnitude: 5 });
 */

import type { KatzillaResponse, KatzillaError, KatzillaToolDefinition, OpenAIFunctionTool } from "./types.js";

export interface KatzillaOptions {
  /** API key (starts with kz_) */
  apiKey: string;
  /** Base URL override (default: https://api.katzilla.dev) */
  baseUrl?: string;
}

export class KatzillaApiError extends Error {
  constructor(
    public statusCode: number,
    public body: KatzillaError,
  ) {
    super(body.error);
    this.name = "KatzillaApiError";
  }
}

export class Katzilla {
  private apiKey: string;
  private baseUrl: string;

  constructor(options: KatzillaOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || "https://api.katzilla.dev").replace(/\/$/, "");
  }

  /**
   * Query a data source by agent handle + action ID.
   *
   *   const quakes = await kz.query("hazards", "usgs-earthquakes", { minMagnitude: 5 });
   */
  query<T = Record<string, unknown>>(
    agentHandle: string,
    actionId: string,
    input: Record<string, unknown> = {},
  ): Promise<KatzillaResponse<T>> {
    const handle = agentHandle.replace(/^katzilla-/, "");
    return this.execute<T>(handle, actionId, input);
  }

  /**
   * Execute a data agent action.
   *
   *   const result = await kz.agent("hazards").action("usgs-earthquakes", { minMagnitude: 5 });
   */
  agent(handle: string) {
    const normalizedHandle = handle.replace(/^katzilla-/, "");
    return {
      action: <T = Record<string, unknown>>(actionId: string, input: Record<string, unknown> = {}) =>
        this.execute<T>(normalizedHandle, actionId, input),
    };
  }

  /**
   * Low-level execute method.
   */
  async execute<T = Record<string, unknown>>(
    agentHandle: string,
    actionId: string,
    input: object = {},
    credentials?: Record<string, string>,
  ): Promise<KatzillaResponse<T>> {
    const url = `${this.baseUrl}/agents/${agentHandle}/actions/${actionId}`;
    const body = credentials ? { ...(input as Record<string, unknown>), credentials } : input;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": this.apiKey,
      },
      body: JSON.stringify(body),
    });

    const json = await res.json();

    if (!res.ok) {
      throw new KatzillaApiError(res.status, json as KatzillaError);
    }

    return json as KatzillaResponse<T>;
  }

  /**
   * Fetch all available tool definitions from the API.
   */
  async getTools(): Promise<KatzillaToolDefinition[]> {
    const res = await fetch(`${this.baseUrl}/agents/tools`);
    const json = await res.json();
    if (!res.ok) throw new KatzillaApiError(res.status, json as KatzillaError);
    return (json as { tools: KatzillaToolDefinition[] }).tools;
  }

  /**
   * Get tools formatted as OpenAI function calling tool definitions.
   */
  async asOpenAITools(): Promise<OpenAIFunctionTool[]> {
    const tools = await this.getTools();
    return tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }));
  }

  /**
   * Execute a tool call by its compound name (e.g. "hazards__usgs-earthquakes").
   * Useful for handling OpenAI/MCP tool call responses.
   */
  async executeToolCall<T = Record<string, unknown>>(
    toolName: string,
    args: Record<string, unknown> = {},
  ): Promise<KatzillaResponse<T>> {
    const sepIdx = toolName.indexOf("__");
    if (sepIdx === -1) {
      throw new Error(`Invalid tool name "${toolName}" — expected format "agentHandle__actionId"`);
    }
    const agentHandle = toolName.slice(0, sepIdx);
    const actionId = toolName.slice(sepIdx + 2);
    return this.execute<T>(agentHandle, actionId, args);
  }
}
