import { createFileRoute, Link } from '@tanstack/react-router';

import {
  ParallaxContainer,
  ParallaxContentLayer,
  ParallaxMediaLayer,
} from '@/components/animation/parallax';
import { useSeo } from '@/lib/tools';

export const Route = createFileRoute('/buying')({
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
          title: 'Buying Your New Home',
          description:
            'Discover all of the latest market updates and the best places to eat in Seattle.',
          keywords: [
            'buying',
            'home',
            'condominium',
            'condo',
            'seattle',
            'real estate',
            'broker',
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
      {/* Hero */}
      <ParallaxContainer className='relative flex h-screen items-center justify-center overflow-hidden'>
        <ParallaxMediaLayer>
          <img
            className='h-full w-full object-cover object-top'
            src='/assets/images/buying-page.jpg'
            alt='Buying your home - Seattle Skyline'
            fetchPriority='high'
            loading='eager'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer range={75} speed={0.68}>
          <article className='banner banner-title flex'>
            <main className='relative top-[clamp(15vh,calc(10vh-4rem),25vh)] px-0 py-[clamp(1.25rem,1.65vw-2.16rem,6rem)]'>
              <h1 className='relative w-full text-left text-7xl font-medium text-white'>
                Buying your home
              </h1>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      <article className='content relative'>
        <section>
          <p>
            Navigating the process of buying a home can be overwhelming, especially if this is your
            first time. Let's take a moment to break down the steps and actions to make your dream a
            reality!
          </p>
        </section>
        <section>
          <h2>Can I Make This My Home?</h2>
          <p>
            It's the question you ask yourself twice: Just before you decide to move out of your
            current place, and just before you decide to put in an offer on your new home. It's
            important to know what drives you to answer yes or no to that question.
          </p>
          <p>
            A functional kitchen? More room, more rooms? Ample storage to eliminate clutter? Office
            space? (Needs)
          </p>
          <p>
            Closer to work? Closer to schools? Prefer to walk right outside to your favorite
            restaurant or running trail? (Location)
          </p>
          <p>
            More contemporary, more luxurious? A view? A patio, a backyard? An investment
            opportunity? (Wants)
          </p>
          <p>
            It's important to qualify these insights to make a decision on what is right for you.
            Condominiums, town homes, single-family homes, or even floating homes all offer
            different advantages. If you can't identify what it is you need, where you will be
            living, and what you want to change, you'll just be throwing darts. We're not looking to
            throw darts; we're looking to find the needle in the haystack. It is recommended to make
            a concrete list- what is negotiable, and what is a must have- so that you know where
            your lines are drawn.
          </p>
        </section>
        <section>
          <h2>What Can I Afford?</h2>
          <p>
            To know where your market lies is paramount whether financing, purchasing in cash, or
            self-financing through investments. We'll call this building your “green file.” Your
            green file should contain:
          </p>
          <ul>
            <li>Financial statements/bank accounts</li>
            <li>Recent pay stubs</li>
            <li>Credit cards statements</li>
            <li>Auto loans</li>
            <li>Investment statements such as 401k or stock portfolios</li>
            <li>Tax returns for two years</li>
          </ul>
          <p>
            Now that you have your green file you should be very well prepared to know what
            purchasing in cash looks like for your existing assets, or turning toward financing.
            When financing, it's important to shop around for different rates and experiences each
            lender offers. It sounds tart, but at the end of the day a mortgage loan is a product a
            financial institution is selling. I have a number of lenders I trust will act as a
            partner through your home-buying process and offer exceptional service that I am happy
            to refer to, however this should be a process that involves looking at a number of
            options.
          </p>
          <p>Aren't interest rates crazy high right now?</p>
          <p>
            <a href='https://www.freddiemac.com/pmms'>Freddie Mac</a> - the main industry source for
            mortgage rates- has been keeping records since 1971. Between April 1971 and June 2023.
            All things economical, interest rates are cyclical.
          </p>
          <p>
            Are they crazy high compared to the “covid” rates from 2020-2022? Absolutely, but
            counting on a worldwide pandemic to cause unprecedented disruptions to the global
            economy resulting in the Federal Reserve to artificially lower interest rates to
            never-before-seen-numbers is not something I'd bet on. You may have had a sub 3%
            interest rate during that time, but you were also in bidding wars purchasing homes
            $100,000+ over asking price.
          </p>
          <p>
            Redfin actually keeps a stream of data directly from the NWMLS (North West Multiple
            Listing Service) that you can{' '}
            <a href='https://www.redfin.com/city/16163/WA/Seattle/housing-market'>view here</a> to
            see averages year over year of home prices. If you want to dive even deeper you can pay
            a visit to the{' '}
            <a href='https://polarispacific.com/red-room/real-time-reality-check/'>
              Polaris Pacific Red Room
            </a>{' '}
            for live, essential market trends.
          </p>
        </section>
        <section>
          <h2>Find a Partner</h2>
          <p>
            Now that you have your priorities, preferences, and finances lined up it's time to seek
            representation to navigate the real estate market. There's a number of key factors to
            look into when choosing a professional to represent you:
          </p>
          <ul>
            <li>Look for a full-time agent, you shouldn't be anyone's “side hustle.”</li>
            <li>
              Are they prompt and communicative? You should never be wondering what the next step
              is, or for an extended call back. Things change quickly in this market, and you don't
              want somebody who will lose you the home you've spent so much energy searching for
              because they haven't yet responded.
            </li>
            <li>
              Market knowledge. You shouldn't be hearing “I don't know” from someone who claims to
              be an expert on the niche market you are trying to purchase in.
            </li>
            <li>
              Experience. Don't be anyone's first. We all know mistakes happen your first time.
            </li>
            <li>
              Vibe. This could be the most important. If you don't gel with who you've selected to
              represent you, then why engage in that relationship?
            </li>
          </ul>
        </section>
        <section>
          <h2>Time To Go Shopping</h2>
          <p>
            Remember, the hardest part was identifying your needs, location, and wants. Now that
            you've done that, got your finances in order, and selected an agent to represent you,
            the rest should write itself. It's time to play House Hunters, so this is also the most
            fun part! It's going to be even more fun because you've already put the work in to know
            exactly what you're looking for and what you can afford.
          </p>
          <p>
            Be patient during this process though. The perfect home for you might not be on the
            market yet and you shouldn't be settling when you buy, otherwise you have to go back to
            asking, “can I make this my home?”
          </p>
        </section>
        <section>
          <h2>Found It, Now What?</h2>
          <p>
            You've placed the offer on the home, and now it's been accepted! Congrats, but you're
            not done yet. Your agent should be appraising you of the important dates to keep track
            of prior to taking possession of your home. This includes, but is not limited to:
          </p>
          <ul>
            <li>
              Earnest money deposit: Typically, 3-5% down earnest money is due within 3 business
              days of going into contract or “mutual.” You can elect to put down less than 3%, but
              your offer is not likely to be taken seriously. Conversely, the maximum earnest money
              a Seller can retain from a Buyer in Washington State is 5% in case of default.
            </li>
            <li>
              Waiver of contingencies: There may be a few things that you needed to make contingent
              in order to purchase the home. This may include inspections, appraisals, financing, or
              association approval.
            </li>
            <li>
              Loan Application: In the case of a financing contingency, it's important to have your
              loan application submitted to the Sellers asap. Otherwise, your contingency is
              automatically waived, and you may not have enough time to properly ensure your loan
              will be underwritten.
            </li>
          </ul>
          <p>
            It might sound like a lot, but there should be two groups holding your hand through this
            process to make it as streamlined and stress-free as possible. Your agent, and the
            closing team. The closing team consists of the group that will be collecting earnest
            money, communicating and recording the steps leading to closing, and facilitating the
            process to possession and transfer of title.
          </p>
          <p>This process is known collectively as: Escrow. Not so intimidating now, is it?</p>
        </section>
        <section>
          <h2>Moving In</h2>
          <p>You did it! Almost. We're in the endgame now.</p>
          <p>
            The closing team will be scheduling a final signing appointment and (if using a lender)
            coordinating the final wire transfer. If you are bringing your own funds, you can either
            have those funds wired electronically into the closing team's escrow account, or you can
            bring a certified check (amount due will be listed on a transaction breakdown called a
            “settlement statement”) to the closing team.
          </p>
          <p>
            The Seller should arrange to have all keys and other pertinent information in an agreed
            upon location.
          </p>
          <p>
            Welcome home! You hired movers, right? Let them deal with that. It's time to celebrate
            landing somewhere you can, in fact, call home.
          </p>
        </section>
        <section>
          <p className='mb-4'>Ready to discover if we would work well together?</p>
          {/* Custom Component - ContactSheet */}
          <Link
            className='inline-flex items-center justify-center rounded-lg border-2 border-polaris-primary bg-polaris-primary! px-4 py-2 font-sans text-sm font-normal whitespace-nowrap text-white! no-underline! underline-offset-0 ring-offset-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] transition-colors duration-200 ease-linear hover:border-polaris-primary-600! hover:bg-polaris-primary-700! hover:text-white! hover:no-underline! hover:shadow-primary focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 dark:transition-colors dark:duration-200 dark:ease-linear'
            to='/contact'>
            Contact Us
          </Link>
        </section>
      </article>
    </main>
  );
}
