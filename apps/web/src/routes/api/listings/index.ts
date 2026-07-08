import { createFileRoute } from '@tanstack/react-router';

import { getListingsForSearchAndFilter } from '@/features/mls/queries';

export const Route = createFileRoute('/api/listings/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Create a URL object from the incoming request URL
        const url = new URL(request.url);

        // Extract specific query parameters
        const query = url.searchParams.get('query');
        const listings = await getListingsForSearchAndFilter(query ? { query } : undefined);
        return new Response(JSON.stringify(listings), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
