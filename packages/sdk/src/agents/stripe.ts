import type { Katzilla } from "../client.js";
import type {
  CreatePaymentIntentInput,
  CreateCheckoutSessionInput,
  CreateRefundInput,
  CreateCustomerInput,
  ListPaymentsInput,
  KatzillaResponse,
} from "../types.js";

export class StripeAgent {
  constructor(private client: Katzilla) {}

  createPaymentIntent(input: CreatePaymentIntentInput) {
    return this.client.execute("stripe", "create-payment-intent", input);
  }

  createCheckoutSession(input: CreateCheckoutSessionInput) {
    return this.client.execute("stripe", "create-checkout-session", input);
  }

  createRefund(input: CreateRefundInput) {
    return this.client.execute("stripe", "create-refund", input);
  }

  createCustomer(input: CreateCustomerInput) {
    return this.client.execute("stripe", "create-customer", input);
  }

  listPayments(input: ListPaymentsInput = {}) {
    return this.client.execute("stripe", "list-payments", input);
  }
}
