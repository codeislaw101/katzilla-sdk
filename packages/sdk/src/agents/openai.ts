import type { Katzilla } from "../client.js";
import type { ChatCompletionInput, CreateEmbeddingInput, CreateImageInput } from "../types.js";

export class OpenAIAgent {
  constructor(private client: Katzilla) {}

  chatCompletion(input: ChatCompletionInput) {
    return this.client.execute("openai", "chat-completion", input);
  }

  createEmbedding(input: CreateEmbeddingInput) {
    return this.client.execute("openai", "create-embedding", input);
  }

  createImage(input: CreateImageInput) {
    return this.client.execute("openai", "create-image", input);
  }
}
