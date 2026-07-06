import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test";

import type { RuntimeSettings, RuntimeSettingsPatch } from "./model";

const mockedSettingsClient = vi.hoisted(() => ({
  current: {
    locale: "en",
    theme: "system",
  } as RuntimeSettings,
}));
const mockedParaglideRuntime = vi.hoisted(() => ({
  getLocale: () => mockedSettingsClient.current.locale,
  setLocale: vi.fn(),
}));

vi.mock("./client", () => ({
  readSettings: vi.fn(async () => mockedSettingsClient.current),
  patchSettings: vi.fn(async (patch: RuntimeSettingsPatch) => {
    mockedSettingsClient.current = {
      ...mockedSettingsClient.current,
      ...patch,
    };

    return mockedSettingsClient.current;
  }),
}));

vi.mock("@/locales/paraglide/runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/locales/paraglide/runtime")>();

  return {
    ...actual,
    getLocale: () => mockedParaglideRuntime.getLocale(),
    overwriteGetLocale: (nextGetLocale: () => RuntimeSettings["locale"]) => {
      mockedParaglideRuntime.getLocale = nextGetLocale;
    },
    overwriteSetLocale: () => undefined,
    setLocale: mockedParaglideRuntime.setLocale,
  };
});

import { RuntimeI18nProvider, useRuntimeI18n } from "./i18n-provider";

type RenderedProvider = {
  container: HTMLDivElement;
  root: Root;
};

describe("RuntimeI18nProvider", () => {
  beforeEach(() => {
    mockedSettingsClient.current = {
      locale: "en",
      theme: "system",
    };
    mockedParaglideRuntime.getLocale = () => mockedSettingsClient.current.locale;
    mockedParaglideRuntime.setLocale.mockClear();
    (
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it("updates translated text immediately when the runtime locale changes", async () => {
    const rendered = await renderProvider(
      <RuntimeI18nProvider>
        <TranslatedProbe />
      </RuntimeI18nProvider>,
    );

    expect(rendered.container.textContent).toContain("Dashboard");

    await click(rendered.container.querySelector("button"));
    await waitForText(rendered.container, "仪表盘");

    expect(rendered.container.textContent).toContain("仪表盘");
    expect(mockedParaglideRuntime.setLocale).toHaveBeenLastCalledWith("zh-CN", {
      reload: false,
    });

    await unmountProvider(rendered.root);
  });
});

function TranslatedProbe() {
  const { setLocalePreference, t } = useRuntimeI18n();

  return (
    <button type="button" onClick={() => setLocalePreference("zh-CN")}>
      {t.dashboard_nav_dashboard()}
    </button>
  );
}

async function renderProvider(children: ReactNode): Promise<RenderedProvider> {
  const container = document.createElement("div");
  const root = createRoot(container);
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  document.body.append(container);

  await act(async () => {
    root.render(<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>);
  });

  return { container, root };
}

async function click(element: Element | null): Promise<void> {
  if (!(element instanceof HTMLElement)) {
    throw new Error("Expected an element to click.");
  }

  await act(async () => {
    element.click();
  });
}

async function waitForText(container: HTMLElement, text: string): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    if (container.textContent?.includes(text)) {
      return;
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }
}

async function unmountProvider(root: Root): Promise<void> {
  await act(async () => {
    root.unmount();
  });
}
