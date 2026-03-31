import type { Katzilla } from "../client.js";
import type { PutObjectInput, GetObjectInput, ListObjectsInput, PresignUrlInput } from "../types.js";

export class S3Agent {
  constructor(private client: Katzilla) {}

  putObject(input: PutObjectInput) {
    return this.client.execute("s3", "put-object", input);
  }

  getObject(input: GetObjectInput) {
    return this.client.execute("s3", "get-object", input);
  }

  listObjects(input: ListObjectsInput) {
    return this.client.execute("s3", "list-objects", input);
  }

  presignUrl(input: PresignUrlInput) {
    return this.client.execute("s3", "presign-url", input);
  }
}
