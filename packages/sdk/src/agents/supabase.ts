import type { Katzilla } from "../client.js";
import type {
  SupabaseQueryInput,
  SupabaseInsertInput,
  SupabaseUploadInput,
  SupabaseAuthSignupInput,
} from "../types.js";

export class SupabaseAgent {
  constructor(private client: Katzilla) {}

  query(input: SupabaseQueryInput) {
    return this.client.execute("supabase", "query", input);
  }

  insert(input: SupabaseInsertInput) {
    return this.client.execute("supabase", "insert", input);
  }

  uploadFile(input: SupabaseUploadInput) {
    return this.client.execute("supabase", "upload-file", input);
  }

  authSignup(input: SupabaseAuthSignupInput) {
    return this.client.execute("supabase", "auth-signup", input);
  }
}
