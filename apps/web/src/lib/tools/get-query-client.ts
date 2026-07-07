import { QueryClient } from '@tanstack/react-query';

const QUERY_CLIENT_GLOBAL_KEY = '__KWS_QUERY_CLIENT__' as const;

type QueryClientGlobalStore = {
  [QUERY_CLIENT_GLOBAL_KEY]?: unknown;
};

const DEV_QUERY_GC_TIME = 1000 * 60 * 2;
const PROD_QUERY_GC_TIME = 1000 * 60 * 10;

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Keep cache pressure low during local development where routes/components are recreated often.
        gcTime: import.meta.env.DEV ? DEV_QUERY_GC_TIME : PROD_QUERY_GC_TIME,
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  });
}

function getGlobalQueryClient(): QueryClient | null {
  const globals = globalThis as QueryClientGlobalStore;
  return (globals[QUERY_CLIENT_GLOBAL_KEY] as QueryClient | undefined) ?? null;
}

function setGlobalQueryClient(client: QueryClient | null) {
  const globals = globalThis as QueryClientGlobalStore;

  if (client) {
    globals[QUERY_CLIENT_GLOBAL_KEY] = client;
    return;
  }

  delete globals[QUERY_CLIENT_GLOBAL_KEY];
}

export function getQueryClient() {
  if (typeof window === 'undefined') {
    return createQueryClient();
  }

  const globalQueryClient = getGlobalQueryClient();
  if (globalQueryClient) {
    return globalQueryClient;
  }

  const browserQueryClient = createQueryClient();
  setGlobalQueryClient(browserQueryClient);

  return browserQueryClient;
}

export function clearBrowserQueryClient() {
  if (typeof window === 'undefined') {
    return;
  }

  const queryClient = getGlobalQueryClient();
  queryClient?.clear();

  setGlobalQueryClient(null);
}
