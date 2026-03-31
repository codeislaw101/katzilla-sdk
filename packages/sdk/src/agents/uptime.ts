import type { Katzilla } from "../client.js";
import type { CheckUrlInput, GetStatusInput } from "../types.js";

export class UptimeAgent {
  constructor(private client: Katzilla) {}

  checkUrl(input: CheckUrlInput) {
    return this.client.execute("uptime", "check-url", input);
  }

  getStatus(input: GetStatusInput) {
    return this.client.execute("uptime", "get-status", input);
  }
}
