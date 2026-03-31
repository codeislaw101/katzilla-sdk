import type { Katzilla } from "../client.js";
import type { SendEmailInput, SendTemplateInput, AddContactInput } from "../types.js";

export class SendGridAgent {
  constructor(private client: Katzilla) {}

  sendEmail(input: SendEmailInput) {
    return this.client.execute("sendgrid", "send-email", input);
  }

  sendTemplate(input: SendTemplateInput) {
    return this.client.execute("sendgrid", "send-template", input);
  }

  addContact(input: AddContactInput) {
    return this.client.execute("sendgrid", "add-contact", input);
  }
}
