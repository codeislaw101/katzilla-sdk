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
  _summary?: boolean;
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
    cacheStatus: "hit" | "miss" | "stale";
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
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface OpenAIFunctionTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
