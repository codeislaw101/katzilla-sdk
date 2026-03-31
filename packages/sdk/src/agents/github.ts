import type { Katzilla } from "../client.js";
import type {
  CreateIssueInput,
  CreatePrInput,
  ListReposInput,
  GetFileInput,
  CreateCommentInput,
} from "../types.js";

export class GitHubAgent {
  constructor(private client: Katzilla) {}

  createIssue(input: CreateIssueInput) {
    return this.client.execute("github", "create-issue", input);
  }

  createPr(input: CreatePrInput) {
    return this.client.execute("github", "create-pr", input);
  }

  listRepos(input: ListReposInput) {
    return this.client.execute("github", "list-repos", input);
  }

  getFile(input: GetFileInput) {
    return this.client.execute("github", "get-file", input);
  }

  createComment(input: CreateCommentInput) {
    return this.client.execute("github", "create-comment", input);
  }
}
