import { db } from '@/lib/database';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/listings/')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const listings = await db.query.properties.findMany({
          columns: {
            listingKey: true,

          }
        });
        return new Response(JSON.stringify(listings), {
          headers: { 'Content-Type': 'application/json' },
        });
      },
    },
  },
});
