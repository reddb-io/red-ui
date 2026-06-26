import { describe, expect, it } from "vitest";

import { collectionPreviewQuery } from "./collection-preview";

describe("collectionPreviewQuery", () => {
  it("uses LIST KV for native key-value collections", () => {
    expect(collectionPreviewQuery("rr_requests", "kv")).toBe(
      "LIST KV rr_requests LIMIT 200"
    );
  });

  it("keeps table-like collections on SELECT preview", () => {
    expect(collectionPreviewQuery("users", "table")).toBe(
      "SELECT * FROM users LIMIT 200"
    );
  });
});
