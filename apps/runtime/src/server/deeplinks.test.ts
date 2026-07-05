import { describe, expect, it } from "vite-plus/test";

import { createRuntimeApi } from "@/server/api";

import { createSystemDeeplinkOpener, normalizeCodexDeeplinkHref } from "./deeplinks";

describe("deeplink opener", () => {
  it("accepts codex deeplinks", () => {
    expect(normalizeCodexDeeplinkHref("codex://threads/thread-a")).toBe("codex://threads/thread-a");
    expect(normalizeCodexDeeplinkHref(" codex://threads/thread%20a ")).toBe(
      "codex://threads/thread%20a",
    );
  });

  it("rejects non-codex and empty href values", () => {
    expect(normalizeCodexDeeplinkHref("http://localhost:3000")).toBeUndefined();
    expect(normalizeCodexDeeplinkHref("")).toBeUndefined();
    expect(normalizeCodexDeeplinkHref(undefined)).toBeUndefined();
  });

  it("opens deeplinks through the macOS open command", async () => {
    const calls: Array<{ args: string[]; command: string }> = [];
    const opener = createSystemDeeplinkOpener(async (command, args) => {
      calls.push({ args, command });
    });

    await opener("codex://threads/thread-a");

    expect(calls).toEqual([{ args: ["codex://threads/thread-a"], command: "open" }]);
  });
});

describe("deeplink API", () => {
  it("opens codex deeplinks", async () => {
    const openedHrefs: string[] = [];
    const app = createRuntimeApi({
      codexHome: "/tmp/codexkit-test",
      openDeeplink: async (href) => {
        openedHrefs.push(href);
      },
      startedAt: 0,
      version: "test",
    });

    const response = await app.request("/deeplinks/open", {
      body: JSON.stringify({ href: "codex://threads/thread-a" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(response.status).toBe(202);
    expect(openedHrefs).toEqual(["codex://threads/thread-a"]);
  });

  it("rejects invalid href values", async () => {
    const openedHrefs: string[] = [];
    const app = createRuntimeApi({
      codexHome: "/tmp/codexkit-test",
      openDeeplink: async (href) => {
        openedHrefs.push(href);
      },
      startedAt: 0,
      version: "test",
    });

    for (const body of [{ href: "https://example.com" }, { href: "" }, {}]) {
      const response = await app.request("/deeplinks/open", {
        body: JSON.stringify(body),
        headers: { "content-type": "application/json" },
        method: "POST",
      });

      expect(response.status).toBe(400);
    }

    expect(openedHrefs).toEqual([]);
  });

  it("returns a server error when the system opener fails", async () => {
    const app = createRuntimeApi({
      codexHome: "/tmp/codexkit-test",
      openDeeplink: async () => {
        throw new Error("open failed");
      },
      startedAt: 0,
      version: "test",
    });

    const response = await app.request("/deeplinks/open", {
      body: JSON.stringify({ href: "codex://threads/thread-a" }),
      headers: { "content-type": "application/json" },
      method: "POST",
    });

    expect(response.status).toBe(500);
  });
});
