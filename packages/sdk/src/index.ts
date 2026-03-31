/**
 * @katzilla/sdk — Official TypeScript SDK for the Katzilla API.
 *
 * Usage:
 *   import { Katzilla } from "@katzilla/sdk";
 *
 *   const kz = new Katzilla({ apiKey: "kz_abc123" });
 *
 *   // Typed methods
 *   const payment = await kz.stripe.createPaymentIntent({ amount: 2000 });
 *   const email = await kz.sendgrid.sendEmail({ to: "bob@example.com", from: "hi@katzilla.dev", subject: "Hi" });
 *
 *   // Dynamic (untyped)
 *   const result = await kz.agent("stripe").action("create-payment-intent", { amount: 2000 });
 */

export { Katzilla, KatzillaApiError } from "./client.js";
export type { KatzillaOptions } from "./client.js";
export type { KatzillaResponse, KatzillaError } from "./types.js";

// Re-export all input types for consumers who want to type their own code
export type {
  // Stripe
  CreatePaymentIntentInput,
  CreateCheckoutSessionInput,
  CreateRefundInput,
  CreateCustomerInput,
  ListPaymentsInput,
  // SendGrid
  SendEmailInput,
  SendTemplateInput,
  AddContactInput,
  // Supabase
  SupabaseQueryInput,
  SupabaseInsertInput,
  SupabaseUploadInput,
  SupabaseAuthSignupInput,
  // S3
  PutObjectInput,
  GetObjectInput,
  ListObjectsInput,
  PresignUrlInput,
  // GitHub
  CreateIssueInput,
  CreatePrInput,
  ListReposInput,
  GetFileInput,
  CreateCommentInput,
  // Slack
  SendMessageInput,
  CreateChannelInput,
  ListChannelsInput,
  UploadFileInput,
  // Notion
  CreatePageInput,
  QueryDatabaseInput,
  UpdatePageInput,
  NotionSearchInput,
  // Google Sheets
  ReadRangeInput,
  WriteRangeInput,
  AppendRowInput,
  CreateSheetInput,
  // OpenAI
  ChatCompletionInput,
  CreateEmbeddingInput,
  CreateImageInput,
  // Twilio
  SendSmsInput,
  SendWhatsappInput,
  LookupNumberInput,
  // Cloudflare
  CreateDnsRecordInput,
  ListZonesInput,
  PurgeCacheInput,
  // PostHog
  CaptureEventInput,
  GetInsightsInput,
  FeatureFlagInput,
  // Sentry
  SentryListIssuesInput,
  ResolveIssueInput,
  CreateReleaseInput,
  // Uptime
  CheckUrlInput,
  GetStatusInput,
} from "./types.js";
