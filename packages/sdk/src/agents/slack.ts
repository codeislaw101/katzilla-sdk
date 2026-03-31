import type { Katzilla } from "../client.js";
import type { SendMessageInput, CreateChannelInput, ListChannelsInput, UploadFileInput } from "../types.js";

export class SlackAgent {
  constructor(private client: Katzilla) {}

  sendMessage(input: SendMessageInput) {
    return this.client.execute("slack", "send-message", input);
  }

  createChannel(input: CreateChannelInput) {
    return this.client.execute("slack", "create-channel", input);
  }

  listChannels(input: ListChannelsInput = {}) {
    return this.client.execute("slack", "list-channels", input);
  }

  uploadFile(input: UploadFileInput) {
    return this.client.execute("slack", "upload-file", input);
  }
}
