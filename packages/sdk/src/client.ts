/**
 * Katzilla SDK — HTTP client that talks to api.katzilla.dev.
 *
 * Usage:
 *   const kz = new Katzilla({ apiKey: "kz_abc123" });
 *   const quakes = await kz.agent("data-hazards").action("recent-earthquakes", { minMagnitude: 5 });
 */

import type { KatzillaResponse, KatzillaError, KatzillaToolDefinition, OpenAIFunctionTool, TokenOptimizationParams, ScrapePageOptions, ScrapeResponse } from "./types.js";

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
   *
   *   // With token optimization:
   *   const gdp = await kz.query("economic", "fred-series", { seriesId: "GDP" }, {
   *     _fields: ["date", "value"],
   *     _limit: 10,
   *     _format: "compact",
   *     _normalize: true,
   *     _units: "metric",
   *   });
   */
  query<T = Record<string, unknown>>(
    agentHandle: string,
    actionId: string,
    input: Record<string, unknown> = {},
    options?: Partial<TokenOptimizationParams>,
  ): Promise<KatzillaResponse<T>> {
    const handle = agentHandle.replace(/^katzilla-/, "");
    const merged = options ? { ...input, ...options } : input;
    return this.execute<T>(handle, actionId, merged);
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

  // ── Support Tickets ──────────────────────────────────────────

  /** Support ticket management. */
  support = {
    /**
     * Create a support ticket.
     *
     *   await kz.support.createTicket({ subject: "Bug report", description: "Details..." });
     */
    createTicket: async (opts: {
      subject: string;
      description: string;
      category?: "general" | "billing" | "bug" | "feature" | "api" | "account";
      priority?: "low" | "normal" | "high" | "urgent";
    }): Promise<{ id: string; status: string }> => {
      const body = {
        ...opts,
        description: `${opts.description}\n\n---\n_Filed via Katzilla TypeScript SDK_`,
      };
      return this._supportRequest("POST", "/support/tickets", body);
    },

    /**
     * List your support tickets.
     */
    listTickets: async (opts?: { status?: string; page?: number }): Promise<{ tickets: SupportTicket[] }> => {
      const params = new URLSearchParams();
      if (opts?.status) params.set("status", opts.status);
      if (opts?.page) params.set("page", String(opts.page));
      const qs = params.toString();
      return this._supportRequest("GET", `/support/tickets${qs ? `?${qs}` : ""}`);
    },

    /**
     * Get a single ticket with its full conversation.
     */
    getTicket: async (id: string): Promise<SupportTicketDetail> => {
      return this._supportRequest("GET", `/support/tickets/${id}`);
    },

    /**
     * Reply to a support ticket.
     */
    reply: async (id: string, message: string): Promise<{ id: string }> => {
      return this._supportRequest("POST", `/support/tickets/${id}/replies`, { body: message });
    },
  };

  // ── Web Scraping ─────────────────────────────────────────────

  /** Web scraping API powered by Crawlee. */
  scrape = {
    /**
     * Scrape a single page and return clean content.
     *
     *   const page = await kz.scrape.page("https://example.com");
     *   console.log(page.data.content); // markdown
     *
     *   const html = await kz.scrape.page("https://example.com", { format: "html" });
     */
    page: async (url: string, options?: ScrapePageOptions): Promise<ScrapeResponse> => {
      return this._scrapeRequest<ScrapeResponse>("POST", "/scrape/page", { url, ...options });
    },
  };

  private async _scrapeRequest<T>(method: string, path: string, body?: object): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "X-API-Key": this.apiKey,
      "Content-Type": "application/json",
    };
    const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const json = await res.json();
    if (!res.ok) throw new KatzillaApiError(res.status, json as KatzillaError);
    return json as T;
  }

  private async _supportRequest<T>(method: string, path: string, body?: object): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = { "X-API-Key": this.apiKey };
    const init: RequestInit = { method, headers };
    if (body) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    const res = await fetch(url, init);
    const json = await res.json();
    if (!res.ok) throw new KatzillaApiError(res.status, json as KatzillaError);
    return json as T;
  }
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketDetail extends SupportTicket {
  description: string;
  replies: Array<{ id: string; authorRole: string; body: string; createdAt: string }>;
}
