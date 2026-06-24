// src/routes/__root.tsx
/// <reference types="vite/client" />
import appCss from '@kws/design/global.css?url';
import { HeadContent, Link, Scripts, createRootRoute } from '@tanstack/react-router';
import * as React from 'react';

import { DefaultCatchBoundary } from '../components/environment/default-catch-boundary';
import { NotFound } from '../components/environment/not-found';
import { seo } from '../lib/utils';

export const Route = createRootRoute({
  beforeLoad: async () => {
    // Placeholder for any root-level data fetching or context setup that may be needed in the future.
  },
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'KyleWeberSeattle.com',
      },
      ...seo({
        title: 'KyleWeberSeattle.com - Find Your True North in the Housing Market',
        description: `KyleWeberSeattle.com is your guide to navigating the housing market with confidence.`,
      }),
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/favicon-96x96.png',
        sizes: '96x96',
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'shortcut icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      { rel: 'manifest', href: '/site.webmanifest', color: '#fffff' },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <HeadContent />
      </head>
      <body>
        <div className='p-2 flex gap-2 text-lg'>
          <Link
            to='/'
            activeProps={{
              className: 'font-bold',
            }}
            activeOptions={{ exact: true }}>
            Home
          </Link>{' '}
        </div>
        <hr />
        {children}
        <Scripts />
      </body>
    </html>
  );
}
