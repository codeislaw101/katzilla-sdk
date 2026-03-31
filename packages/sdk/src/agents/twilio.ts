import type { Katzilla } from "../client.js";
import type { SendSmsInput, SendWhatsappInput, LookupNumberInput } from "../types.js";

export class TwilioAgent {
  constructor(private client: Katzilla) {}

  sendSms(input: SendSmsInput) {
    return this.client.execute("twilio", "send-sms", input);
  }

  sendWhatsapp(input: SendWhatsappInput) {
    return this.client.execute("twilio", "send-whatsapp", input);
  }

  lookupNumber(input: LookupNumberInput) {
    return this.client.execute("twilio", "lookup-number", input);
  }
}
