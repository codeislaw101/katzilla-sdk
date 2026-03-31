import type { Katzilla } from "../client.js";
import type { CreatePageInput, QueryDatabaseInput, UpdatePageInput, NotionSearchInput } from "../types.js";

export class NotionAgent {
  constructor(private client: Katzilla) {}

  createPage(input: CreatePageInput) {
    return this.client.execute("notion", "create-page", input);
  }

  queryDatabase(input: QueryDatabaseInput) {
    return this.client.execute("notion", "query-database", input);
  }

  updatePage(input: UpdatePageInput) {
    return this.client.execute("notion", "update-page", input);
  }

  search(input: NotionSearchInput) {
    return this.client.execute("notion", "search", input);
  }
}
