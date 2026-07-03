// src/routes/robots[.]txt.ts
import { env } from '@kws/config';
import { buildRobotsTxt } from '@kws/seo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/robots./txt')({
  server: {
    handlers: {
      GET: async () => {
        const isProduction = env.NODE_ENV === 'production';

        const body = buildRobotsTxt(
          isProduction
            ? {
                rules: [{ userAgent: '*', allow: ['/'], disallow: ['/admin', '/api'] }],
                sitemapUrls: [`${env.APP_URL}/sitemap.xml`],
              }
            : { rules: [{ userAgent: '*', disallow: ['/'] }] }, // block crawlers on non-prod
        );

        return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
      },
    },
  },
});
