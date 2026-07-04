// src/router.tsx
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import { DefaultCatchBoundary } from './components/environment/default-catch-boundary';
import { NotFound } from './components/environment/not-found';
import { Pending } from './components/environment/pending';
import { getRouterContext } from './lib/tools';
import { routeTree } from './routeTree.gen';

function createRouterInstance() {
  const context = getRouterContext();
  gsap.registerPlugin(ScrollTrigger);
  const router = createTanStackRouter({
    routeTree,
    defaultPendingComponent: (props) => <Pending {...props} />,
    defaultErrorComponent: (props) => <DefaultCatchBoundary {...props} />,
    defaultNotFoundComponent: () => <NotFound />,
    context,
    scrollRestoration: false,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  });

  setupRouterSsrQueryIntegration({ router, queryClient: context.queryClient });

  return router;
}

export type AppRouter = ReturnType<typeof createRouterInstance>;

let browserRouter: AppRouter | null = null;

export function getRouter(): AppRouter {
  if (typeof window !== 'undefined' && browserRouter) {
    return browserRouter;
  }

  const router = createRouterInstance();

  if (typeof window !== 'undefined') {
    browserRouter = router;
  }

  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof createRouterInstance>;
  }
  interface StaticDataRouteOption {
    breadcrumb?: string | ((match: any) => string); // Can be a string or a function for dynamic names
  }
}
