import { useEffect, type ReactNode } from "react";

import { useRuntimeLocale } from "@/features/settings/client-provider";
import { resolveLocaleDirection } from "@/features/settings/model";
import { DirectionProvider } from "@/ui/components/direction";

type DirectionStateProviderProps = {
  children: ReactNode;
};

export function DirectionStateProvider({ children }: DirectionStateProviderProps) {
  const { locale } = useRuntimeLocale();
  const direction = resolveLocaleDirection(locale);

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = locale;
  }, [direction, locale]);

  return <DirectionProvider direction={direction}>{children}</DirectionProvider>;
}
