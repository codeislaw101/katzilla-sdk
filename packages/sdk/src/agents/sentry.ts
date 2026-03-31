import type { Katzilla } from "../client.js";
import type { SentryListIssuesInput, ResolveIssueInput, CreateReleaseInput } from "../types.js";

export class SentryAgent {
  constructor(private client: Katzilla) {}

  listIssues(input: SentryListIssuesInput) {
    return this.client.execute("sentry", "list-issues", input);
  }

  resolveIssue(input: ResolveIssueInput) {
    return this.client.execute("sentry", "resolve-issue", input);
  }

  createRelease(input: CreateReleaseInput) {
    return this.client.execute("sentry", "create-release", input);
  }
}
