import { useEffect, type ReactNode } from "react";

import { DirectionProvider } from "@/ui/components/direction";

type DirectionStateProviderProps = {
  children: ReactNode;
};

const DOCUMENT_DIRECTION = "ltr";

export function DirectionStateProvider({ children }: DirectionStateProviderProps) {
  useEffect(() => {
    document.documentElement.dir = DOCUMENT_DIRECTION;
  }, []);

  return <DirectionProvider direction={DOCUMENT_DIRECTION}>{children}</DirectionProvider>;
}
