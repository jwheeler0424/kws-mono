import { createFileRoute, Link } from '@tanstack/react-router';

import {
  ParallaxContainer,
  ParallaxContentLayer,
  ParallaxMediaLayer,
} from '@/components/animation/parallax';
import { useSeo } from '@/lib/tools/seo';

export const Route = createFileRoute('/selling')({
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
          title: 'Selling Your Home',
          description:
            'Discover all of the latest market updates and the best places to eat in Seattle.',
          keywords: ['selling', 'home', 'real estate', 'seattle', 'broker'].join(', '),
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
            src='/assets/images/selling-page.jpg'
            alt='Selling your home - Seattle Skyline at night'
            fetchPriority='high'
            loading='eager'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer range={75} speed={0.68}>
          <article className='banner banner-title flex'>
            <main className='relative top-[clamp(15vh,calc(10vh-4rem),25vh)] px-0 py-[clamp(1.25rem,1.65vw-2.16rem,6rem)]'>
              <h1 className='relative w-full text-left text-7xl font-medium text-white'>
                Selling your home
              </h1>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      <article className='content relative'>
        <section>
          <>
            <p>
              When deciding whether or not to sell your home, it's important to take a holistic
              approach to ensure that you're prepared. Let's dive into what it takes to sell from
              inception to closing.
            </p>
          </>
        </section>
        <section>
          <h2>Time to move?</h2>
          <>
            <p>
              Or maybe you're just sitting on huge gains in equity and it's time to cash in. There
              are numerous reasons for selling including but not limited to lifestyle changes,
              employment changes, economic changes, etc...
            </p>
            <p>
              Determining the reason to sell is arguably the easiest part. The when? That may
              require some assistance.
            </p>
          </>
        </section>
        <section>
          <h2>Now or Never?</h2>
          <>
            <p>
              Possibly. In a perfect world, you sell a home on your terms when the market is in your
              favor. It's not always sunny in Seattle.
            </p>
            <p>Among things to consider when anticipating the cost of selling a home:</p>
            <ul>
              <li>
                <strong>Commissions.</strong>Typically, agents will charge a 3% listing fee to sell
                your home. Then there's the buying side (if represented), which would add another 3%
                for a total of 6% to commissions.
              </li>
              <li>
                <strong>Capital Gains.</strong>Taxes in Washington state for assets valued over
                $250,000 are 7%. There are several factors, however, that contribute to the
                realization of this tax. It is recommended to consult a financial advisor or
                accountant regarding estimations for capital gains taxes.
              </li>
              <li>
                <strong>Staging.</strong>You can expect to spend between $1000-$3000 on staging.
                Staging is a strategy to be discussed with your agent and is not always necessary.
                Good news, staging is tax deductible.
              </li>
              <li>
                <strong>Photography.</strong>If your agent isn't paying for this, you've chosen the
                wrong agent.
              </li>
              <li>
                <strong>Resale Certificate.</strong>In condominiums, you can expect to pay around
                $250 to the HOA for a copy of your resale certificate.
              </li>
              <li>
                <strong>Closing costs.</strong>This is usually paid primarily by the Buyer, however
                there may be some pro-rated expenses such as property taxes and utilities. There is
                also half of the escrow fee, which is about $1,250.
              </li>
              <li>
                <strong>Title Insurance.</strong>Sellers will pay for the Buyer's title insurance,
                which is $2000.
              </li>
              <li>
                <strong>Excise Tax.</strong>1.28% (Washington State) + .5% (King County) of a
                property's selling price. This does escalate on homes sold above $1,500,000.
              </li>
              <li>
                <strong>Pre-Inspection.</strong>It's ideal to have a pre-inspection on your home so
                you can limit offers with contingencies and offer full disclosures to Buyers. Around
                $300 for a professional inspection.
              </li>
            </ul>
            <p>
              Due to artificially lowered interest rates from 2020-2022, there is a desperate lack
              of churn for inventory. Unless forced to, there are few reasons anyone is selling
              their home bought in that time and turning their 2.5% interest rate into 7%. This lack
              of inventory has made it a ripe opportunity for Sellers to capitalize on their home
              being a limited offering.
            </p>
          </>
        </section>
        <section>
          <h2>What's It Worth?</h2>
          <>
            <p>
              To determine value, agents use a Comparative Market Analysis (CMA). CMA's will
              showcase comparable homes currently listed on the market, currently pending on the
              market, and what has recently been sold. The sold comparables are most important, as
              they have actually closed and we can see what the final price was. This will give us
              an opportunity to present our professional opinion on what the market value of your
              home is.
            </p>
            <p>
              Once that value has been determined, we can then start discussing strategy for sales:
            </p>
            <ul>
              <li>
                <strong>Is it the right time?</strong>It may not be. If you have the flexibility to
                rent out your home and wait another year, that might be my top recommendation
                depending on your capital/equity compared to market value.
              </li>
              <li>
                <strong>
                  Select an offer review date, or let offers be reviewed when submitted?
                </strong>
                An offer review date gives you as the Seller the best opportunity to view multiple
                offers at once. It also opens the door for Buyers to look elsewhere because your
                review date is either too pushy or too drawn out. Allowing offers to be reviewed
                when submitted may give you less of an opportunity to receive multiple offers at
                once, but it does give you a chance to see an offer at any moment. And Buyers know
                that too.
              </li>
              <li>
                <strong>Pricing the home at market value.</strong>This is typically what will be the
                most reasonable and least risk-driven strategy when listing on the market. It may be
                slower coming than some other options, but it is consistent.
              </li>
              <li>
                <strong>Underpricing the home.</strong>You've identified the market value but want
                to drive buyers in, and you want to drive them in quickly. In fact, you hope they
                all cram into your open house so fast that you have multiple offers to review after
                your first weekend and drive up a bidding war! It's a bold strategy, Cotton, and it
                may or may not pay off. Your agent and CMA will direct you toward what is reasonably
                possible. Very dependent on market climate.
              </li>
              <li>
                <strong>Overprice the home.</strong>This is when the Seller doesn't agree with the
                agent's recommendation or CMA, but also doesn't take the advice to wait for a better
                time to get the price they truly want. This results in crickets, and then lowering
                the price to below market value. Buyers notice homes that sit, and they present low
                offers.
              </li>
            </ul>
            <p>
              It's important that you and your selected representation are aligned when it comes to
              sales strategy.
            </p>
          </>
        </section>
        <section>
          <h2>Deal Or No Deal?</h2>
          <>
            <p>
              When being presented with offers (hopefully you have options), it's important to look
              beyond just the price offered:
            </p>
            <ul>
              <li>
                <strong>Contingencies.</strong>Including but not limited to inspections, appraisals,
                financing, association review, or sale of their current home. Usually these are
                reasonable requests, however when they start to be stacked it's important to look at
                earnest money.
              </li>
              <li>
                <strong>Earnest Money.</strong>A competitive offer will typically present 3-5% of
                earnest money towards a transaction. If an offer presents less than 3%, and is
                stacked with contingencies, this offer may not be all that serious (even if it is
                over asking price). Conversely, an offer may entice you with 50% earnest money. It's
                important to know that in Washington State, even if a Buyer with more than 5%
                earnest money breaks contract, only 5% may be kept by the Seller as damages.
              </li>
              <li>
                <strong>Closing Date.</strong>Typically, this is within 30 days. 45-60 isn't unheard
                of. Longer than 60 days? We could be in a whole new market by that time encouraging
                either you OR your buyer to look elsewhere.
              </li>
            </ul>
            <p>
              There are many factors that should keep you alert when reviewing an offer. Some are
              reasonable, others could present red flags.
            </p>
          </>
        </section>
        <section>
          <h2>Closing Time</h2>
          <>
            <p>It's closing day! Make sure to tie up your loose ends and see this through.</p>
            <p>
              There may or may not be a final walkthrough the Buyer elects for a day or two before
              closing to make sure everything is as agreed. This is more of a formality, and if
              anything is a push for you to clean and have possessions out faster.
            </p>
            <p>
              Make sure to transfer your utilities, home services, and forward your mail. Simple
              enough, but shockingly tricky to get right.
            </p>
            <p>
              After reviewing the closing team's settlement statement and receiving confirmation of
              wire transfer and recording of closing, you'll want to have your old keys in the
              agreed upon location with the Buyer.
            </p>
            <p>Congratulations, you've sold your home! Now to decide on how to celebrate.</p>
          </>
        </section>
        <section>
          <p className='mb-4'>
            If you're interested in receiving a complimentary condominium/home evaluation, let's
            connect and discover how we can work together.
          </p>
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
