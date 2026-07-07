// src/router.tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';

import { DefaultCatchBoundary } from './components/environment/default-catch-boundary';
import { NotFound } from './components/environment/not-found';
import { Pending } from './components/environment/pending';
import { clearBrowserQueryClient, getRouterContext } from './lib/tools';
import { cleanupGsapForHotReload, ensureGsapRegistered } from './lib/tools/gsap';
import { cleanupLeafletForHotReload } from './lib/tools/leaflet';
import { routeTree } from './routeTree.gen';

const ROUTER_GLOBAL_KEY = '__KWS_APP_ROUTER__' as const;

type RouterGlobalStore = {
  [ROUTER_GLOBAL_KEY]?: unknown;
};

const getGlobalRouter = (): AppRouter | null => {
  const globals = globalThis as RouterGlobalStore;
  return (globals[ROUTER_GLOBAL_KEY] as AppRouter | undefined) ?? null;
};

const setGlobalRouter = (router: AppRouter | null) => {
  const globals = globalThis as RouterGlobalStore;

  if (router) {
    globals[ROUTER_GLOBAL_KEY] = router;
    return;
  }

  delete globals[ROUTER_GLOBAL_KEY];
};

const disposeRouterInstance = (router: AppRouter | null) => {
  if (!router) {
    return;
  }

  router.options.context.queryClient.clear();
  (router as AppRouter & { dispose?: () => void }).dispose?.();
};

function createRouterInstance() {
  const context = getRouterContext();
  ensureGsapRegistered();
  const router = createTanStackRouter({
    routeTree,
    defaultPendingComponent: (props) => <Pending {...props} />,
    defaultErrorComponent: (props) => <DefaultCatchBoundary {...props} />,
    defaultNotFoundComponent: () => <NotFound />,
    context,
    scrollRestoration: false,
  });

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

  return router;
}

export type AppRouter = ReturnType<typeof createRouterInstance>;

let browserRouter: AppRouter | null = null;

export function getRouter(): AppRouter {
  if (typeof window !== 'undefined') {
    const globalRouter = getGlobalRouter();
    if (globalRouter) {
      browserRouter = globalRouter;
      return globalRouter;
    }

    if (browserRouter) {
      return browserRouter;
    }
  }

  const router = createRouterInstance();

  if (typeof window !== 'undefined') {
    browserRouter = router;
    setGlobalRouter(router);
  }

  return router;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    const router = getGlobalRouter() ?? browserRouter;

    disposeRouterInstance(router);
    cleanupGsapForHotReload();
    cleanupLeafletForHotReload();
    clearBrowserQueryClient();

    browserRouter = null;
    setGlobalRouter(null);
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouterInstance>;
  }
  interface StaticDataRouteOption {
    breadcrumb?: string | ((match: any) => string); // Can be a string or a function for dynamic names
  }
}
