import { createFileRoute } from '@tanstack/react-router';

import {
  ParallaxContainer,
  ParallaxContentLayer,
  ParallaxMediaLayer,
} from '@/components/animation/parallax';
import { useSeo } from '@/lib/tools';

export const Route = createFileRoute('/about')({
  loader: async ({ context }) => {
    return {
      siteConfig: context.siteConfig,
    };
  },
  head: ({ loaderData }) => {
    const { seo } = useSeo(loaderData!.siteConfig);
    return {
      meta: [
        ...seo({
          title: 'About Me - Kyle Weber',
          description:
            'Meet Kyle Weber, a Seattle real estate broker at Compass with a passion for the city, its neighborhoods and helping you find home.',
          keywords: [
            'about',
            'Seattle',
            'Broker',
            'Real Estate',
            'Kyle Weber',
            'Compass',
            'bio',
            'story',
            'experience',
            'background',
          ].join(', '),
        }),
      ],
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className='w-full'>
      <ParallaxContainer className='banner-short relative flex items-center justify-center overflow-hidden'>
        <ParallaxMediaLayer>
          <img
            src='/assets/images/compass/about-banner.webp'
            alt='Seattle skyline'
            className='h-full w-full object-cover'
            fetchPriority='high'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer>
          <article className='banner banner-title flex'>
            <main className='py-12'>
              <h1>About Me</h1>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>
      <article className='about-story mx-auto flow-root w-11/12 max-w-[100rem] px-2 py-16 md:px-5 2xl:px-12'>
        <header className='mb-8'>
          <span className='font-sans text-sm text-neutral-600'>Seattle Real Estate · Compass</span>
          <h2 className='mt-3! mb-0! text-4xl'>Kyle Weber</h2>
        </header>
        <img
          src='/assets/images/compass/kyle-white.jpg'
          width={1200}
          height={1800}
          alt='Kyle Weber at Compass'
          className='mx-auto mb-8 h-auto w-full max-w-56 lg:float-left lg:mr-12 lg:w-2/5 lg:max-w-72 2xl:max-w-sm'
        />
        <p>
          {
            'A California native, I made the move to Seattle at the end of 2016 and traded in sunshine for rain - lots of rain. I’m able to look back on that move without regrets due to the experiences I’ve found here: White-capped mountains reminiscent of New Zealand, stunning sunsets, a wine scene that raises the eyebrows of Napa Valley snobs, rooftop bars best described as a “Manhattan moment”, and seafood - lots of seafood. '
          }
        </p>
        <p>
          {
            "While I was enamored with the culinary world in Seattle, I also found a passion for finding the right place to call home. It can be daunting first moving here to sift through so many options, and more emphatically, one for the right price. I quickly found I had a knack for finding the “needle in the haystack.” What fascinated me most about Seattle real estate was that its neighborhoods and homes were every bit as varied as its food scene. A century-old Craftsman can sit around the corner from a glass-and-steel highrise. A neighborhood dive that's been pouring beers for decades can share a block with one of the city's most ambitious new restaurants. Seattle has a way of putting the polished and the imperfect, the old and the new, right next to each other—and somehow making it all belong. Finding those places, and understanding what makes each one special, became something of an obsession. "
          }
        </p>
        <img
          src='/assets/images/compass/kyle-brown.jpg'
          width={1200}
          height={1800}
          alt='Portrait of Kyle Weber'
          className='mx-auto my-8 h-auto w-full max-w-56 lg:float-right lg:ml-12 lg:w-1/3 lg:max-w-64 2xl:max-w-xs'
          loading='lazy'
        />
        <p>
          {
            'After spending years working for various developers throughout the greater Seattle area, including some of the most prestigious high-rise condominium projects, I went on to obtain my Managing Brokers license. I have sold over 200 homes amounting to a combined worth of over $150,000,000. Partnering with Compass has given me the opportunity to represent some of the most prestigious clients in the area. I’d like to share this experience with you. '
          }
        </p>
        <p>
          {
            'Let me tell you where you should go out to eat on a lazy Monday night, and what price to list your home at on Thursday morning. Let me show you that sleek new condominium you’ve been looking for, and where the best coffee is for your morning walks once you’ve moved in. Let me guide you through the offer process, and where to celebrate our success. '
          }
        </p>
        <p>
          {
            'Because after nearly a decade of calling Seattle home, I’ve learned that knowing a city means more than knowing its streets. It’s knowing where to eat, where to drink, where to wander, and eventually, where you want to stay. Real estate is how I make my living. Food, film, and a genuine curiosity about this city are how I’ve come to know it. And somewhere along the way, Seattle stopped being the place I moved to and simply became home. '
          }
        </p>
      </article>
    </main>
  );
}
