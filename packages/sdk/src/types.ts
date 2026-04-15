/**
 * Input/output types for all Katzilla agent actions.
 * These mirror the Zod schemas defined in each agent package.
 */

// ── Quality & Citation Metadata ────────────────────────────────

export interface QualityMeta {
  freshness_seconds: number;
  source_uptime_7d: number | null;
  last_verified: string | null;
  data_completeness: number;
  confidence: "high" | "medium" | "low";
  /** Truth Engine numeric certainty score (0.000 – 1.000) */
  certainty_score: number;
}

export interface CitationBlock {
  source_name: string;
  source_url: string;
  retrieved_at: string;
  data_hash: string;
  license: string;
}

// ── Token Optimization (response shaping) ────────────────────

export interface TokenOptimizationParams {
  _fields?: string[];
  _format?: "full" | "compact";
  _limit?: number;
  _page?: number;
  _normalize?: boolean;
  _units?: "metric" | "imperial";
  _summary?: boolean;
  _mock?: boolean;
}

// ── API Response ───────────────────────────────────────────────

export interface KatzillaResponse<T = Record<string, unknown>> {
  success: boolean;
  data: T | null;
  text: string | null;
  meta: {
    agent: string;
    action: string;
    authMethod: string;
    creditsCharged: number;
    cacheStatus: "hit" | "miss" | "stale" | "mock";
    /** True when served from cache — no quota charged */
    cachedFree?: boolean;
    durationMs: number;
  };
  quality: QualityMeta;
  citation: CitationBlock | null;
}

export interface KatzillaError {
  error: string;
  details?: Array<{ path: string; message: string }>;
  missing?: Array<{ key: string; label: string; methods: string[] }>;
  hint?: string;
}

// ── Tool Definition Types ─────────────────────────────────────

export interface KatzillaToolDefinition {
  name: string;
  agentHandle: string;
  actionId: string;
  /** Short human-readable title (MCP 2025-03-26). */
  title?: string;
  description: string;
  inputSchema: Record<string, unknown>;
  /** JSON Schema for the response envelope (MCP 2025-03-26). */
  outputSchema?: Record<string, unknown>;
  /** MCP tool annotations — readOnlyHint, idempotentHint, openWorldHint, title, etc. */
  annotations?: Record<string, unknown>;
}

export interface OpenAIFunctionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// ── Scrape Types ──────────────────────────────────────────────

export type ScrapeFormat = "markdown" | "html" | "text";
export type ScrapeEngine = "http" | "browser";

export interface ScrapePageOptions {
  /** Output format (default: "markdown") */
  format?: ScrapeFormat;
  /** CSS selector to extract a specific element */
  selector?: string;
  /** CSS selector to wait for (browser engine only) */
  waitFor?: string;
  /** Force engine selection (default: "http") */
  engine?: ScrapeEngine;
  /** Request timeout in ms (default: 30000) */
  timeout?: number;
  /** Custom request headers */
  headers?: Record<string, string>;
}

export interface ScrapeMetadata {
  title: string | null;
  description: string | null;
  url: string;
  statusCode: number;
  loadTimeMs: number;
  engine: ScrapeEngine;
  contentLength: number;
}

export interface ScrapeLink {
  text: string;
  href: string;
}

export interface ScrapePageData {
  content: string;
  metadata: ScrapeMetadata;
  links: ScrapeLink[];
}

export interface ScrapeResponse {
  success: boolean;
  data: ScrapePageData;
  meta: {
    agent: "scrape";
    action: string;
    engine: ScrapeEngine;
    creditsCharged: number;
    cacheStatus: "hit" | "miss";
    cachedFree: boolean;
    durationMs: number;
  };
  citation?: CitationBlock;
}
