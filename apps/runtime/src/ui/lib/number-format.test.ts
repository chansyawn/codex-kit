import { describe, expect, it } from "vite-plus/test";

import { formatCompactNumber, formatIntegerNumber } from "./number-format";

describe("number formatting", () => {
  it("formats compact numbers with the selected locale", () => {
    expect(formatCompactNumber(12_345, "en")).toBe("12.3K");
    expect(formatCompactNumber(12_345, "zh-CN")).toBe("1.2万");
    expect(formatCompactNumber(123_456_789, "zh-CN")).toBe("1.2亿");
  });

  it("formats integers with locale-specific separators", () => {
    expect(formatIntegerNumber(12_345, "en")).toBe("12,345");
    expect(formatIntegerNumber(12_345, "zh-CN")).toBe("12,345");
  });
});
