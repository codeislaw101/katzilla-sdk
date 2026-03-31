import type { Katzilla } from "../client.js";
import type { CaptureEventInput, GetInsightsInput, FeatureFlagInput } from "../types.js";

export class PostHogAgent {
  constructor(private client: Katzilla) {}

  captureEvent(input: CaptureEventInput) {
    return this.client.execute("posthog", "capture-event", input);
  }

  getInsights(input: GetInsightsInput) {
    return this.client.execute("posthog", "get-insights", input);
  }

  featureFlag(input: FeatureFlagInput) {
    return this.client.execute("posthog", "feature-flag", input);
  }
}
