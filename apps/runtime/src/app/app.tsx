import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import { DirectionStateProvider } from "@/app/direction";
import { ThemeStateProvider } from "@/app/theme";
import { RuntimeSettingsProvider } from "@/features/settings/client-provider";
import { RuntimeI18nProvider } from "@/features/settings/i18n-provider";
import { routeTree } from "@/routeTree.gen";
import { TooltipProvider } from "@/ui/components/tooltip";

const router = createRouter({ routeTree });
const queryClient = new QueryClient();

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RuntimeSettingsProvider>
        <RuntimeI18nProvider>
          <ThemeStateProvider>
            <DirectionStateProvider>
              <TooltipProvider>
                <RouterProvider router={router} />
              </TooltipProvider>
            </DirectionStateProvider>
          </ThemeStateProvider>
        </RuntimeI18nProvider>
      </RuntimeSettingsProvider>
    </QueryClientProvider>
  );
}
