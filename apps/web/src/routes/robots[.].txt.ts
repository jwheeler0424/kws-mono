// src/routes/robots[.]txt.ts
import { siteConfig } from '@/lib/tools/seo';
import { buildRobotsTxt } from '@kws/seo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/robots./txt')({
  server: {
    handlers: {
      GET: async () => {
        // TODO: fix env detection for Bun
        const isProduction = Bun.env.VERCEL_ENV === 'production' || Bun.env.NODE_ENV === 'production'

        const body = buildRobotsTxt(
          isProduction
            ? {
              rules: [{ userAgent: '*', allow: ['/'], disallow: ['/admin', '/api'] }],
              sitemapUrls: [`${siteConfig.siteUrl}/sitemap.xml`],
            }
            : { rules: [{ userAgent: '*', disallow: ['/'] }] }, // block crawlers on non-prod
        )

        return new Response(body, { headers: { 'Content-Type': 'text/plain' } })
      },
    },
  },
});
