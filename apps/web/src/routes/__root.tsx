// src/routes/__root.tsx
/// <reference types="vite/client" />
import { cn } from '@kws/design/lib/utils/clsx-merge';
import { charsetMeta, defineSiteConfig, iconLinks, seo, viewportMeta } from '@kws/seo';
import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
  useLocation,
  useRouterState,
  type AnyRouteMatch,
} from '@tanstack/react-router';
import * as React from 'react';

import { ScrollArea } from '@/components/global/scroll-area';
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
      defaultTitle: 'KyleWeberSeattle.com - Your guide to Seattle',
      titleTemplate: '%s | KyleWeberSeattle.com',
      defaultDescription:
        'Explore Seattle real estate with Kyle Weber at Compass, from finding your next home to selling with confidence.',
      defaultImage: {
        url: 'https://kyleweberseattle.com/assets/images/compass/seattle.webp',
        width: 1672,
        height: 941,
      },
      twitterHandle: '@kyleweberseattle',
      twitterSite: '@kyleweberseattle',
      themeColor: '#171717',
    });
    return { siteConfig };
    // Placeholder for any root-level data fetching or context setup that may be needed in the future.
  },
  loader: async ({ context }) => {
    return {
      siteConfig: context.siteConfig,
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      charsetMeta(),
      viewportMeta(),
      ...seo({
        title: 'KyleWeberSeattle.com - Your guide to Seattle',
        description:
          'Explore Seattle real estate with Kyle Weber at Compass, from finding your next home to selling with confidence.',
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
  const { pathname } = useLocation();
  const isRoutePending = useRouterState({ select: (state) => state.status === 'pending' });
  const isTransparent = pathname === '/';
  return (
    <html lang='en' suppressHydrationWarning style={{ width: '100%', height: '100%' }}>
      <head>
        <HeadContent />
      </head>
      <body className='flex h-full w-full flex-col font-sans antialiased'>
        <ApplicationProvider>
          <div
            className={cn([
              'flex h-full min-h-0 w-full flex-col overflow-clip bg-white font-sans antialiased',
            ])}>
            <FrontendHeader />
            <ScrollArea
              key={pathname}
              data-parallax-scroller
              className={cn('grow w-full min-h-0', isTransparent && 'frontend-home-scroller')}>
              <div
                className={cn(
                  'flex min-h-full w-full flex-col',
                  isTransparent ? 'gap-16' : 'gap-8 sm:gap-12',
                )}>
                <section
                  data-interior-page={isTransparent ? undefined : ''}
                  className={cn('flex w-full grow flex-col')}>
                  {children}
                </section>
                {!isRoutePending ? <FrontendFooter /> : null}
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
