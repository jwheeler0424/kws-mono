import { createSeoHelpers, defineSiteConfig } from '@kws/seo'

export const siteConfig = defineSiteConfig({
  siteName: 'My App',
  siteUrl: 'https://myapp.com',
  defaultTitle: 'My App',
  titleTemplate: '%s | My App',
  defaultDescription: 'My App is a platform for...',
  defaultImage: { url: 'https://myapp.com/og-default.png', width: 1200, height: 630 },
  twitterHandle: '@myapp',
  twitterSite: '@myapp',
  themeColor: '#0f172a',
})

export const { seo, createHead } = createSeoHelpers(siteConfig)