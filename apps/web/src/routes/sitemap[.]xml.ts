// src/routes/sitemap[.]xml.ts
import { env } from '@kws/config';
import { buildSitemapXml } from '@kws/seo';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        // const posts = await fetchAllPosts()

        const xml = buildSitemapXml([
          { loc: env.APP_URL, changefreq: 'daily', priority: 1.0 },
          { loc: `${env.APP_URL}/blog`, changefreq: 'daily', priority: 0.8 },
          // ...posts.map((post) => ({
          //   loc: `${env.APP_URL}/blog/${post.id}`,
          //   lastmod: post.updatedAt,
          //   changefreq: 'weekly' as const,
          //   priority: 0.7,
          // })),
        ]);

        return new Response(xml, { headers: { 'Content-Type': 'application/xml' } });
      },
    },
  },
});
