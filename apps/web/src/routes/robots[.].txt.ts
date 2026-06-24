// src/routes/robots[.]txt.ts
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/robots./txt')({
  server: {
    handlers: {
      GET: async () => {
        const robots = `User-agent: *
Allow: /

Sitemap: https://kyleweberseattle.com/sitemap.xml`;

        return new Response(robots, {
          headers: {
            'Content-Type': 'text/plain',
          },
        });
      },
    },
  },
});
