// src/routes/__root.tsx
/// <reference types="vite/client" />
import { cn } from '@kws/design/lib/utils/clsx-merge';
import { ScrollArea } from '@kws/design/ui/scroll-area';
import { charsetMeta, defineSiteConfig, iconLinks, seo, viewportMeta } from '@kws/seo';
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  type AnyRouteMatch,
} from '@tanstack/react-router';
import * as React from 'react';

import { FrontendFooter } from '@/components/layout/footer';
import { FrontendHeader } from '@/components/layout/header';
import ApplicationProvider from '@/providers/application.provider';

import { DefaultCatchBoundary } from '../components/environment/default-catch-boundary';
import { NotFound } from '../components/environment/not-found';
import { type RouterContext } from '../lib/tools';
import appCss from '../styles/global.css?url';

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: async () => {
    const siteConfig = defineSiteConfig({
      siteName: 'KyleWeberSeattle.com',
      siteUrl: 'https://kyleweberseattle.com',
      defaultTitle: 'KyleWeberSeattle.com - Find Your True North in the Housing Market',
      titleTemplate: '%s | KyleWeberSeattle.com',
      defaultDescription:
        'KyleWeberSeattle.com is your guide to navigating the housing market with confidence.',
      defaultImage: {
        url: 'http://localhost:5173/assets/images/blog-page.jpb',
        width: 2048,
        height: 1080,
      },
      twitterHandle: '@kyleweberseattle',
      twitterSite: '@kyleweberseattle',
      themeColor: '#ff0000',
    });
    return { siteConfig };
    // Placeholder for any root-level data fetching or context setup that may be needed in the future.
  },
  loader: async ({ context, location }) => {
    const isTransparent = location.pathname === '/';
    return {
      isTransparent,
      location,
      siteConfig: context.siteConfig,
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      charsetMeta(),
      viewportMeta(),
      ...seo({
        title: 'KyleWeberSeattle.com - Find Your True North in the Housing Market',
        description: `KyleWeberSeattle.com is your guide to navigating the housing market with confidence.`,
      }),
    ],
    links: [
      ...iconLinks({
        favicon: '/favicon.ico',
        icon16: '/favicon-16x16.png',
        icon32: '/favicon-32x32.png',
        icon96: '/favicon-96x96.png',
        appleTouchIcon: '/apple-touch-icon.png',
        manifest: '/site.webmanifest',
        themeColor: loaderData?.siteConfig.themeColor,
      }),
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ] as AnyRouteMatch['links'],
  }),
  errorComponent: DefaultCatchBoundary,
  notFoundComponent: () => <NotFound />,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const { isTransparent, location } = Route.useLoaderData();
  return (
    <html lang='en' suppressHydrationWarning style={{ width: '100%', height: '100%' }}>
      <head>
        <HeadContent />
      </head>
      <body className='flex h-full w-full flex-col font-sans antialiased'>
        <ApplicationProvider>
          <div
            className={cn([
              'flex h-full min-h-0 w-full flex-col overflow-clip bg-white font-sans antialiased select-none',
            ])}>
            <FrontendHeader />
            <ScrollArea
              key={location.pathname}
              data-parallax-scroller
              className={cn('min-h-0 w-full grow', isTransparent && 'frontend-home-scroller')}>
              <div className={cn('flex min-h-full w-full flex-col gap-16')}>
                <section className={cn('flex w-full grow flex-col')}>{children}</section>
                <FrontendFooter />
              </div>
            </ScrollArea>
          </div>
          {/* <TanstackDevtools /> */}
        </ApplicationProvider>
        <Scripts />
      </body>
    </html>
  );
}
