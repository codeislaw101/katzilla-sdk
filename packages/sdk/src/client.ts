/**
 * Katzilla SDK — HTTP client that talks to api.katzilla.dev.
 *
 * Usage:
 *   const kz = new Katzilla({ apiKey: "kz_abc123" });
 *   const quakes = await kz.agent("data-hazards").action("recent-earthquakes", { minMagnitude: 5 });
 */

import type { KatzillaResponse, KatzillaError } from "./types.js";

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
   * Execute a data agent action.
   *
   *   const result = await kz.agent("data-hazards").action("recent-earthquakes", { minMagnitude: 5 });
   */
  agent(handle: string) {
    return {
      action: <T = Record<string, unknown>>(actionId: string, input: Record<string, unknown> = {}) =>
        this.execute<T>(handle, actionId, input),
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
}
