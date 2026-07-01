// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router';

import {
  ParallaxContainer,
  ParallaxContentLayer,
  ParallaxMediaLayer,
} from '@/components/animation/parallax';
import FeaturedProperties from '@/components/global/featured-properties';
import { Link } from '@/components/global/link';
import Video from '@/components/global/video';
import { featuredPropertiesOptions } from '@/features/mls/options';

export const Route = createFileRoute('/')({
  loader: ({ context }) => context.queryClient.ensureQueryData(featuredPropertiesOptions()),
  component: Home,
});

function Home() {
  return (
    <main className='min-h-full w-full overflow-hidden bg-neutral-900 text-white'>
      {/* Hero */}
      <ParallaxContainer className='relative flex h-screen items-center justify-center overflow-hidden'>
        <ParallaxContentLayer speed={1}>
          <Video
            autoPlay
            loop
            muted
            playsInline
            preload='yes'
            className='size-full object-cover object-center'
            mobileSrc='/assets/videos/intro-mobile_HD.mp4'
            tabletSrc='/assets/videos/intro-tablet_HD.mp4'
            desktopSrc='/assets/videos/intro-desktop_HD.mp4'
          />
        </ParallaxContentLayer>
      </ParallaxContainer>

      {/* Search Active Listings */}
      <ParallaxContainer className='relative flex h-screen items-center justify-center overflow-hidden border-b border-neutral-700'>
        <ParallaxMediaLayer>
          <img
            src='/assets/images/search-active-listings.jpg'
            fetchPriority='high'
            loading='eager'
            alt='Search Active Listings - Seattle Skyline'
            className='size-full object-cover object-center'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer>
          <article
            className='banner banner-title'
            style={{ display: 'flex', backgroundColor: 'rgba(0,0,0,0.15)' }}>
            <main
              style={{
                position: 'relative',
                top: 'clamp(15vh, calc(10vh - 4rem), 25vh)',
                padding: 'clamp(1.25rem, 1.65vw - 2.16rem, 6rem) 0',
              }}>
              <h1
                style={{
                  color: 'white',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'right',
                  fontWeight: '500',
                }}>
                Search Active Listings
              </h1>
              <section
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'center',
                  justifyContent: 'flex-end',
                  width: '100%',
                }}>
                <Link href='/listings' title='Find your home' variant={'outlineWhite'} size={'md'}>
                  Find your home
                </Link>
              </section>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      {/* Our Properties */}
      <ParallaxContainer className='relative flex h-screen items-center justify-center overflow-hidden border-b border-neutral-700'>
        <ParallaxMediaLayer>
          <img
            src='/assets/images/our-properties.jpg'
            fetchPriority='high'
            loading='eager'
            alt='Our Properties - Seattle Skyline'
            className='size-full object-cover object-center'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer>
          <article
            className='banner banner-title h-full max-h-4/5'
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.15)',
              padding: 'clamp(6rem, 3.25vw - 2.16rem,24rem) 0',
            }}>
            <main
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <h1
                style={{
                  color: 'white',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'left',
                  fontWeight: '500',
                  paddingBottom: '0',
                  marginTop: '2rem',
                }}>
                Our Properties
              </h1>
              <section className='w-full h-full flex grow items-center justify-center'>
                <FeaturedProperties autoplay autoPlaySpeed={4000} />
              </section>
              <section
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'end',
                  width: '100%',
                }}>
                <Link
                  href='/properties'
                  title='View our properties'
                  variant={'solidPrimary'}
                  size={'md'}>
                  View our properties
                </Link>
              </section>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      {/* Meet The Team */}
      <ParallaxContainer className='relative flex h-screen items-center justify-center overflow-hidden border-b border-neutral-700'>
        <ParallaxMediaLayer>
          <img
            src='/assets/images/meet-the-team.jpg'
            alt='Meet the Team - Polaris NW Residential Team'
            fetchPriority='high'
            loading='eager'
            className='size-full object-cover object-center brightness-75'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer>
          <article
            className='banner banner-title'
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'end',
            }}>
            <main
              style={{
                position: 'relative',
                top: 'clamp(15vh, calc(10vh - 4rem), 25vh)',
                padding: 'clamp(1.25rem, 1.65vw - 2.16rem, 6rem) 0',
              }}>
              <h1
                style={{
                  color: 'white',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'right',
                  fontWeight: '500',
                }}>
                Meet the Team
              </h1>
              <section
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'center',
                  justifyContent: 'flex-end',
                  width: '100%',
                }}>
                <Link href='/about' title='Get to know us' variant={'outlineWhite'} size={'md'}>
                  Get to know us
                </Link>
              </section>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      {/* Buying Your Home */}
      <ParallaxContainer className='relative flex h-screen items-center justify-center overflow-hidden border-b border-neutral-700'>
        <ParallaxMediaLayer>
          <img
            src='/assets/images/buying.jpg'
            alt='Buying your home - Polaris NW Residential'
            fetchPriority='high'
            loading='eager'
            className='size-full object-cover object-center'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer>
          <article
            className='banner banner-title'
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'start',
            }}>
            <main
              style={{
                position: 'relative',
                top: 'clamp(15vh, calc(10vh - 4rem), 25vh)',
                padding: 'clamp(1.25rem, 1.65vw - 2.16rem, 6rem) 0',
              }}>
              <h1
                style={{
                  color: 'white',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'left',
                  fontWeight: '500',
                }}>
                Buying your home
              </h1>
              <section
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'center',
                  justifyContent: 'flex-start',
                }}>
                <Link href='/buying' title='Learn more' variant={'outlineWhite'} size={'md'}>
                  Learn more
                </Link>
              </section>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      {/* Selling Your Home */}
      <ParallaxContainer className='relative flex h-screen items-center justify-center overflow-hidden border-b border-neutral-700'>
        <ParallaxMediaLayer>
          <img
            src='/assets/images/selling.jpg'
            alt='Selling your home - Polaris NW Residential'
            fetchPriority='high'
            loading='eager'
            className='size-full object-cover object-center'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer>
          <article
            className='banner banner-title'
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'end',
            }}>
            <main
              style={{
                position: 'relative',
                top: 'clamp(15vh, calc(10vh - 4rem), 25vh)',
                padding: 'clamp(1.25rem, 1.65vw - 2.16rem, 6rem) 0',
              }}>
              <h1
                style={{
                  color: 'white',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'right',
                  fontWeight: '500',
                }}>
                Selling your home
              </h1>
              <section
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'center',
                  justifyContent: 'flex-end',
                  width: '100%',
                }}>
                <Link href='/selling' title='Learn more' variant={'outlineWhite'} size={'md'}>
                  Learn more
                </Link>
              </section>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      {/* Blog */}
      <ParallaxContainer className='relative flex h-screen items-center justify-center overflow-hidden border-b border-neutral-700'>
        <ParallaxMediaLayer>
          <img
            src='/assets/images/blog.jpg'
            alt="Let's Discover Seattle - Polaris NW Residential"
            fetchPriority='high'
            loading='eager'
            className='size-full object-cover object-center'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer>
          <article
            className='banner banner-title'
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'start',
            }}>
            <main
              style={{
                position: 'relative',
                top: 'clamp(15vh, calc(10vh - 4rem), 25vh)',
                padding: 'clamp(1.25rem, 1.65vw - 2.16rem, 6rem) 0',
              }}>
              <h1
                style={{
                  color: 'white',
                  position: 'relative',
                  width: '100%',
                  textAlign: 'left',
                  fontWeight: '500',
                }}>
                Let's Discover Seattle
              </h1>
              <section
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'center',
                  justifyContent: 'flex-start',
                  gap: '1.75rem',
                  width: '100%',
                }}>
                <Link href='/blog' title='Our blog' variant={'outlineWhite'} size={'md'}>
                  Our blog
                </Link>
                <Link
                  href='https://www.youtube.com/@kyleweberseattle'
                  title='YouTube channel'
                  variant={'solidPrimary'}
                  size={'md'}>
                  YouTube channel
                </Link>
              </section>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>
    </main>
  );
}
