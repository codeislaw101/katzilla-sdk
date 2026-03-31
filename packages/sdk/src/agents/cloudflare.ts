import type { Katzilla } from "../client.js";
import type { CreateDnsRecordInput, ListZonesInput, PurgeCacheInput } from "../types.js";

export class CloudflareAgent {
  constructor(private client: Katzilla) {}

  createDnsRecord(input: CreateDnsRecordInput) {
    return this.client.execute("cloudflare", "create-dns-record", input);
  }

  listZones(input: ListZonesInput = {}) {
    return this.client.execute("cloudflare", "list-zones", input);
  }

  purgeCache(input: PurgeCacheInput) {
    return this.client.execute("cloudflare", "purge-cache", input);
  }
}
