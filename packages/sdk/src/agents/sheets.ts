import type { Katzilla } from "../client.js";
import type { ReadRangeInput, WriteRangeInput, AppendRowInput, CreateSheetInput } from "../types.js";

export class SheetsAgent {
  constructor(private client: Katzilla) {}

  readRange(input: ReadRangeInput) {
    return this.client.execute("sheets", "read-range", input);
  }

  writeRange(input: WriteRangeInput) {
    return this.client.execute("sheets", "write-range", input);
  }

  appendRow(input: AppendRowInput) {
    return this.client.execute("sheets", "append-row", input);
  }

  createSheet(input: CreateSheetInput) {
    return this.client.execute("sheets", "create-sheet", input);
  }
}
