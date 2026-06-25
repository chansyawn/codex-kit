import { createRouter, RouterProvider } from "@tanstack/react-router";

import { DirectionStateProvider } from "@/app/direction";
import { I18nStateProvider } from "@/app/i18n";
import { ThemeStateProvider } from "@/app/theme";
import { routeTree } from "@/routeTree.gen";
import { TooltipProvider } from "@/ui/components/tooltip";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <ThemeStateProvider>
      <I18nStateProvider>
        <DirectionStateProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </DirectionStateProvider>
      </I18nStateProvider>
    </ThemeStateProvider>
  );
}
