import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { RuntimeDirection, RuntimeLocale } from "@/features/settings/model";

const mockedRuntimeLocale = vi.hoisted(() => ({
  current: "en" as RuntimeLocale,
}));

vi.mock("@/features/settings/client-provider", () => ({
  useRuntimeLocale: () => ({
    locale: mockedRuntimeLocale.current,
    setLocalePreference: vi.fn(),
  }),
}));

vi.mock("@/ui/components/direction", () => ({
  DirectionProvider: ({
    children,
    direction,
  }: {
    children: ReactNode;
    direction: RuntimeDirection;
  }) => (
    <div data-direction={direction} data-testid="direction-provider">
      {children}
    </div>
  ),
}));

import { DirectionStateProvider } from "./direction";

type RenderedProvider = {
  container: HTMLDivElement;
  root: Root;
};

describe("DirectionStateProvider", () => {
  beforeEach(() => {
    mockedRuntimeLocale.current = "en";
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("lang");
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("lang");
  });

  it("syncs ltr direction and lang for the current runtime locale", async () => {
    const rendered = await renderProvider();

    expect(document.documentElement.dir).toBe("ltr");
    expect(document.documentElement.lang).toBe("en");
    expect(getProviderDirection(rendered.container)).toBe("ltr");

    await unmountProvider(rendered.root);
  });

  it("syncs rtl direction when the runtime locale uses an rtl language subtag", async () => {
    mockedRuntimeLocale.current = "ar-SA" as RuntimeLocale;
    const rendered = await renderProvider();

    expect(document.documentElement.dir).toBe("rtl");
    expect(document.documentElement.lang).toBe("ar-SA");
    expect(getProviderDirection(rendered.container)).toBe("rtl");

    await unmountProvider(rendered.root);
  });
});

async function renderProvider(): Promise<RenderedProvider> {
  const container = document.createElement("div");
  const root = createRoot(container);

  await act(async () => {
    root.render(
      <DirectionStateProvider>
        <span>content</span>
      </DirectionStateProvider>,
    );
  });

  return { container, root };
}

async function unmountProvider(root: Root): Promise<void> {
  await act(async () => {
    root.unmount();
  });
}

function getProviderDirection(container: HTMLElement): string | null {
  return (
    container.querySelector("[data-testid='direction-provider']")?.getAttribute("data-direction") ??
    null
  );
}
