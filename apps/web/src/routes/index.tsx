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
            preload='metadata'
            poster='/assets/images/compass/search.webp'
            className='size-full object-cover object-center'
            mobileSrc='/assets/videos/compass/intro-portrait.mp4'
            tabletSrc='/assets/videos/compass/intro-portrait.mp4'
            desktopSrc='/assets/videos/compass/intro-landscape.mp4'
          />
        </ParallaxContentLayer>
      </ParallaxContainer>

      {/* Search Active Listings */}
      <ParallaxContainer className='relative flex h-screen items-center justify-center overflow-hidden border-b border-neutral-700'>
        <ParallaxMediaLayer>
          <img
            src='/assets/images/compass/search.webp'
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
                <Link href='/listings' title='Find your home' variant={'solidWhite'} size={'md'}>
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
            src='/assets/images/compass/properties.webp'
            fetchPriority='high'
            loading='eager'
            alt='Our exclusive listings in Seattle'
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
                Our Exclusive Listings
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
                  title='View exclusive listings'
                  variant={'solidWhite'}
                  size={'md'}>
                  View exclusive listings
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
            src='/assets/images/compass/about-home.webp'
            alt='Pike Place Market in Seattle'
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
                About Me
              </h1>
              <section
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'center',
                  justifyContent: 'flex-end',
                  width: '100%',
                }}>
                <Link href='/about' title='Get to know me' variant={'solidWhite'} size={'md'}>
                  Get to know me
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
            src='/assets/images/compass/buying.webp'
            alt='A waterfront home in Seattle'
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
                Buying Your New Home
              </h1>
              <section
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'center',
                  justifyContent: 'flex-start',
                }}>
                <Link href='/buying' title='Learn more' variant={'solidWhite'} size={'md'}>
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
            src='/assets/images/compass/selling.webp'
            alt='A modern Seattle home surrounded by trees'
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
                Selling Your Home in Seattle
              </h1>
              <section
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignContent: 'center',
                  justifyContent: 'flex-end',
                  width: '100%',
                }}>
                <Link href='/selling' title='Learn more' variant={'solidWhite'} size={'md'}>
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
            src='/assets/images/compass/seattle.webp'
            alt='Seattle skyline at dusk'
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
                <Link href='/blog' title='Our blog' variant={'solidWhite'} size={'md'}>
                  Our blog
                </Link>
                <Link
                  href='https://www.youtube.com/@kyleweberseattle'
                  title='YouTube channel'
                  variant={'solidWhite'}
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
