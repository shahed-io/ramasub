import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // App-wide Query defaults: avoid noisy refetches on focus/reconnect that
  // would thrash re-renders and PostgREST calls when the user tabs back or a
  // component remounts with already-fresh data. Per-query overrides still win.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 0,
    // TanStack Query owns freshness; keeping this at 0 prevents router preload
    // cache conflicts and the intermittent preload error seen on product hovers.
    defaultPreloadStaleTime: 0,
    defaultPendingMs: 0,
    defaultPendingMinMs: 0,
  });

  return router;
};
