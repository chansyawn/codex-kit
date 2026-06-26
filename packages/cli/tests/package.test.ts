import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vite-plus/test";

describe("@codexkit/runtime package", () => {
  it("exposes the thin CLI entrypoints", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      bin: Record<string, string>;
      name: string;
    };

    expect(packageJson.name).toBe("@codexkit/runtime");
    expect(packageJson.bin.codexkit).toBe("./dist/cli.mjs");
    expect(packageJson.bin.runtime).toBe("./dist/cli.mjs");
  });
});
