import { readFile } from "node:fs/promises";

import { describe, expect, it } from "vite-plus/test";

describe("@codexkit/runtime package", () => {
  it("exposes a single package-name CLI entrypoint", async () => {
    const packageJson = JSON.parse(await readFile("package.json", "utf8")) as {
      bin: string;
      exports?: unknown;
      name: string;
    };

    expect(packageJson.name).toBe("@codexkit/runtime");
    expect(packageJson.bin).toBe("./dist/cli.mjs");
    expect(packageJson.exports).toBeUndefined();
  });
});
