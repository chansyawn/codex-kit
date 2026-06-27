import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vite-plus/test";

describe("@codexkit/cli package", () => {
  it("exposes a single package-name CLI entrypoint", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      bin: Record<string, string>;
      exports?: unknown;
      name: string;
    };

    expect(packageJson.name).toBe("@codexkit/cli");
    expect(packageJson.bin.codexkit).toBe("./dist/cli.mjs");
    expect(packageJson.exports).toBeUndefined();
  });
});
