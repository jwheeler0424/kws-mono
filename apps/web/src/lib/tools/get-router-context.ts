import { QueryClient } from '@tanstack/react-query';

import type { SiteConfig } from '@kws/seo';
import { getQueryClient } from './get-query-client';

export type RouterContext = {
  queryClient: QueryClient;
  siteConfig: SiteConfig
};

export function getRouterContext(): RouterContext {
  const queryClient = getQueryClient();

  return {
    queryClient,
    siteConfig: undefined!,
  };
}
