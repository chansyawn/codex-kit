import { describe, expect, it } from "vite-plus/test";

import { createApiError, createApiSuccess } from "./api.ts";

describe("api result helpers", () => {
  it("creates a typed success result", () => {
    expect(createApiSuccess({ value: 1 })).toEqual({
      data: { value: 1 },
      ok: true,
    });
  });

  it("creates a typed error result", () => {
    expect(createApiError("not_ready", "Runtime is not ready")).toEqual({
      error: {
        code: "not_ready",
        message: "Runtime is not ready",
      },
      ok: false,
    });
  });
});
