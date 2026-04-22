/**
 * @katzilla/sdk — Official TypeScript SDK for the Katzilla Data API.
 *
 * Usage:
 *   import { Katzilla } from "@katzilla/sdk";
 *
 *   const kz = new Katzilla({ apiKey: "kz_abc123" });
 *   const quakes = await kz.agent("data-hazards").action("recent-earthquakes", { minMagnitude: 5 });
 */

export { Katzilla, KatzillaApiError } from "./client.js";
export type { KatzillaOptions, SupportTicket, SupportTicketDetail } from "./client.js";
export type { KatzillaResponse, KatzillaError, KatzillaToolDefinition, OpenAIFunctionTool, ScrapeFormat, ScrapeEngine, ScrapePageOptions, ScrapeResponse, ScrapePageData, ScrapeMetadata, ScrapeLink } from "./types.js";
export type {
  RetrievalState,
  RetrievalBlock,
  PageUsageBlock,
  DatasetMetadata,
  SearchOptions,
  SearchResult,
  ParsedDatasetResponse,
  GetParsedOptions,
  PagesUsageResponse,
} from "./datasets.js";
