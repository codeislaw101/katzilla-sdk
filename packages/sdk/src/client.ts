/**
 * Katzilla SDK — HTTP client that talks to api.katzilla.dev.
 *
 * Usage:
 *   const kz = new Katzilla({ apiKey: "kz_abc123" });
 *   const payment = await kz.stripe.createPaymentIntent({ amount: 2000 });
 */

import type { KatzillaResponse, KatzillaError } from "./types.js";
import { StripeAgent } from "./agents/stripe.js";
import { SendGridAgent } from "./agents/sendgrid.js";
import { SupabaseAgent } from "./agents/supabase.js";
import { S3Agent } from "./agents/s3.js";
import { GitHubAgent } from "./agents/github.js";
import { SlackAgent } from "./agents/slack.js";
import { NotionAgent } from "./agents/notion.js";
import { SheetsAgent } from "./agents/sheets.js";
import { CloudflareAgent } from "./agents/cloudflare.js";
import { OpenAIAgent } from "./agents/openai.js";
import { PostHogAgent } from "./agents/posthog.js";
import { SentryAgent } from "./agents/sentry.js";
import { TwilioAgent } from "./agents/twilio.js";
import { UptimeAgent } from "./agents/uptime.js";

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

  // ── Typed agent sub-clients ──────────────────────────────────
  readonly stripe: StripeAgent;
  readonly sendgrid: SendGridAgent;
  readonly supabase: SupabaseAgent;
  readonly s3: S3Agent;
  readonly github: GitHubAgent;
  readonly slack: SlackAgent;
  readonly notion: NotionAgent;
  readonly sheets: SheetsAgent;
  readonly cloudflare: CloudflareAgent;
  readonly openai: OpenAIAgent;
  readonly posthog: PostHogAgent;
  readonly sentry: SentryAgent;
  readonly twilio: TwilioAgent;
  readonly uptime: UptimeAgent;

  constructor(options: KatzillaOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = (options.baseUrl || "https://api.katzilla.dev").replace(/\/$/, "");

    this.stripe = new StripeAgent(this);
    this.sendgrid = new SendGridAgent(this);
    this.supabase = new SupabaseAgent(this);
    this.s3 = new S3Agent(this);
    this.github = new GitHubAgent(this);
    this.slack = new SlackAgent(this);
    this.notion = new NotionAgent(this);
    this.sheets = new SheetsAgent(this);
    this.cloudflare = new CloudflareAgent(this);
    this.openai = new OpenAIAgent(this);
    this.posthog = new PostHogAgent(this);
    this.sentry = new SentryAgent(this);
    this.twilio = new TwilioAgent(this);
    this.uptime = new UptimeAgent(this);
  }

  /**
   * Execute an agent action (dynamic/untyped).
   *
   *   const result = await kz.agent("stripe").action("create-payment-intent", { amount: 2000 });
   */
  agent(handle: string) {
    return {
      action: <T = Record<string, unknown>>(actionId: string, input: Record<string, unknown> = {}) =>
        this.execute<T>(handle, actionId, input),
    };
  }

  /**
   * Low-level execute method. All typed sub-clients delegate here.
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
