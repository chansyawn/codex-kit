import { describe, expect, it } from "vite-plus/test";

import { resolveLocaleDirection } from "./model";

describe("runtime settings model", () => {
  it("resolves text direction from locale language", () => {
    expect(resolveLocaleDirection("en")).toBe("ltr");
    expect(resolveLocaleDirection("zh-CN")).toBe("ltr");
    expect(resolveLocaleDirection("ar")).toBe("rtl");
    expect(resolveLocaleDirection("ar-EG")).toBe("rtl");
    expect(resolveLocaleDirection("he")).toBe("rtl");
  });
});
