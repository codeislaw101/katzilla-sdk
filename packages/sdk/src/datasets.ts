/**
 * Katzilla Datasets API — unified data.gov catalog + retrieval.
 *
 * See https://katzilla.dev/docs/pricing for the billing model. In short:
 *   - search, metadata, raw file, and pre-parsed rows each cost 1 API call
 *     against your data plan's monthly `requestLimit`.
 *   - `/parsed?parse=true` on an `indexable` dataset runs Claude against the
 *     upstream file and meters PAGES against your plan's page allowance.
 *     Paid plans (Pro, Business) include a monthly page budget; overage
 *     bills at $0.025/page (Pro) or $0.020/page (Business). Free tier is
 *     blocked from this path — it returns 402 with an upgrade message.
 *
 * Cache: Claude-parse results are cached per dataset for 30 days keyed on
 * the upstream `modified` date. First reader pays the pages; subsequent
 * readers within the cache window are served free.
 */

export type RetrievalState = "structured" | "raw_only" | "link_only";

export interface RetrievalBlock {
  state: RetrievalState;
  parsed: {
    available: boolean;
    reason: string | null;
    quota: "data" | null;
  };
  file: {
    available: boolean;
    url: string | null;
    upstream_url: string | null;
    format: string | null;
    quota: "data" | null;
  };
  parse: {
    available: boolean;
    endpoint: string | null;
    /** Byte-size-based page-count estimate. Charged pages can differ
     *  slightly once Claude actually reads the file. */
    estimated_pages: number | null;
    per_page_cents: number | null;
    reason: string | null;
  };
}

export interface PageUsageBlock {
  pages_this_period: number;
  included_pages: number;
  overage_pages: number;
  overage_cents_so_far: number;
}

export interface DatasetMetadata {
  id: string;
  title: string;
  organization: string | null;
  description: string | null;
  row_count: number | null;
  column_count: number | null;
  modified: string | null;
  retrieval: RetrievalBlock;
}

export interface SearchOptions {
  q?: string;
  org?: string;
  format?: string;
  state?: RetrievalState;
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  total: number;
  limit: number;
  offset: number;
  results: DatasetMetadata[];
}

export interface ParsedDatasetResponse extends DatasetMetadata {
  columns: Array<{ name: string; type?: string }> | null;
  rows: unknown[] | null;
  resource: { url: string | null; format: string | null };
  /** Populated only when `?parse=true` actually ran Claude live. */
  reader?: "claude-document" | "autoparse";
  model?: string;
  text?: string | null;
  structured?: Record<string, unknown> | null;
  cache_status?: "hit" | "miss";
  /** Pages charged for this request. 0 on cache hits. */
  pages_charged?: number;
  usage?: PageUsageBlock;
  validated_at?: string | null;
}

export interface GetParsedOptions {
  /** Request a Claude-backed live parse. Only meaningful on datasets
   *  whose `retrieval.state === "raw_only"`; ignored on `"structured"`
   *  (we always serve from cache). */
  parse?: boolean;
  /** Cap returned rows. Default 100, max 1000. */
  maxRows?: number;
}

export interface PagesUsageResponse {
  period_start: string;
  period_end: string;
  pages_consumed: number;
  included_pages: number;
  overage_pages: number;
  per_page_cents: number | null;
  overage_cents_so_far: number;
}
