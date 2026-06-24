// src/routes/sitemap[.]xml.ts
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: async () => {
        // const posts = await fetchAllPosts()
        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://kyleweberseattle.com/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  
</urlset>`;
        //         const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
        // <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        //   <url>
        //     <loc>https://myapp.com/</loc>
        //     <changefreq>daily</changefreq>
        //     <priority>1.0</priority>
        //   </url>
        //   ${posts
        //     .map(
        //       (post) => `
        //   <url>
        //     <loc>https://myapp.com/posts/${post.id}</loc>
        //     <lastmod>${post.updatedAt}</lastmod>
        //     <changefreq>weekly</changefreq>
        //   </url>`,
        //     )
        //     .join('')}
        // </urlset>`

        return new Response(sitemap, {
          headers: {
            'Content-Type': 'application/xml',
          },
        });
      },
    },
  },
});
