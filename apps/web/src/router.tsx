// src/router.tsx
import { createRouter } from '@tanstack/react-router';

import { DefaultCatchBoundary } from './components/environment/default-catch-boundary';
import { NotFound } from './components/environment/not-found';
import { Pending } from './components/environment/pending';
import { routeTree } from './routeTree.gen';

export function getRouter() {
  const router = createRouter({
    routeTree,
    defaultPendingComponent: (props) => <Pending {...props} />,
    defaultErrorComponent: (props) => <DefaultCatchBoundary {...props} />,
    defaultNotFoundComponent: () => <NotFound />,
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
  });

  return router;
}
