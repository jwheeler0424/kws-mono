import { createFileRoute } from '@tanstack/react-router';

import {
  ParallaxContainer,
  ParallaxContentLayer,
  ParallaxMediaLayer,
} from '@/components/animation/parallax';
import { Link } from '@/components/global/link';
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
          title: 'Selling a Home in Seattle',
          description:
            'Plan your Seattle home sale with Kyle Weber at Compass: pricing, preparation, marketing, offers and a clear understanding of your net proceeds.',
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
      <ParallaxContainer className='banner-short relative flex items-center justify-center overflow-hidden'>
        <ParallaxMediaLayer>
          <img
            className='h-full w-full object-cover'
            src='/assets/images/selling-page.jpg'
            alt='Selling your home - Seattle Skyline at night'
            fetchPriority='high'
            loading='eager'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer>
          <article className='banner banner-title flex'>
            <main className='py-12'>
              <h1>Selling a Home in Seattle</h1>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      <article className='content guide-content relative'>
        <p>
          {
            'Selling your home is more than putting a price on it, taking a few photos, and waiting for an offer. '
          }
        </p>
        <p>
          {
            "Timing, preparation, pricing, marketing, negotiation, and the particulars of the Seattle real estate market can all have a meaningful impact on your result. Whether you're selling a downtown Seattle condo, a century-old Craftsman, or something that doesn't fit neatly into either category, the process should begin with understanding what you own, what it's worth, and what you want to accomplish. "
          }
        </p>
        <p>{"Let's start at the beginning. "}</p>
        <h2>{'Had Enough of It, Huh?'}</h2>
        <p>{"Or maybe you're sitting on years of equity and it's simply time to cash in. "}</p>
        <p>
          {
            'People sell homes for all kinds of reasons: a new job, a growing family, an empty nest, a change in lifestyle, an investment decision, or—how do I put this—familial restructuring. '
          }
        </p>
        <p>{"Figuring out why you're selling is usually the easy part. "}</p>
        <p>
          {'Figuring out when to sell your Seattle home can be considerably more complicated. '}
        </p>
        <h2>{'Now or Never?'}</h2>
        <p>
          {
            'In a perfect world, you sell entirely on your terms, with the market firmly in your favor. '
          }
        </p>
        <p>{"However, it's not always sunny in Seattle. "}</p>
        <p>
          {
            'Before we decide when to list, I want to understand what selling actually accomplishes for you. What did you pay for the property? How much equity do you have? Is there a mortgage to pay off? Are you buying something else? Could keeping the property as a rental make more sense? '
          }
        </p>
        <h3>{'And, importantly: what will it actually cost to sell?'}</h3>
        <h3>{'What Does It Cost to Sell a Home in Seattle?'}</h3>
        <p>
          {
            "There isn't one universal number, but these are some of the expenses Seattle sellers should anticipate: "
          }
        </p>
        <ul>
          <li>
            <p>
              {
                "Real estate commissions. Broker compensation is negotiable and established in your listing agreement. Depending on the transaction, a seller may also agree to contribute toward compensation for the buyer's broker. "
              }
            </p>
          </li>
          <li>
            <p>
              {
                "Real Estate Excise Tax (REET). Washington generally imposes REET on the seller, with the state portion calculated using graduated rates and an additional applicable local rate. Because rates and thresholds can change, I recommend calculating this for the specific property and anticipated sales price using the Washington Department of Revenue's REET information. "
              }
            </p>
          </li>
          <li>
            <p>
              {
                "Federal capital-gains taxes. Depending on your basis, gain, ownership and occupancy history, and other circumstances, federal capital-gains taxes may apply. Washington's separate capital-gains tax, however, specifically exempts sales of real estate. Talk with your CPA or tax advisor about your individual situation. "
              }
            </p>
          </li>
          <li>
            <p>
              {
                "Staging and preparation. Sometimes that means a fully staged vacant home. Sometimes it's editing what you already own, moving a few things around, and getting rid of half the stuff in the closet. The right strategy depends on the property. "
              }
            </p>
          </li>
          <li>
            <p>
              {
                "Photography and marketing. This one's easy: if I'm listing your home, professional presentation is part of the job. "
              }
            </p>
          </li>
          <li>
            <p>
              {
                'Condominium resale certificate. Condo sellers should anticipate HOArelated resale documentation and associated fees. '
              }
            </p>
          </li>
          <li>
            <p>
              {
                'Title and escrow. Sellers will generally have title, escrow, recording, and other transaction-related charges determined by the particular transaction and service providers. '
              }
            </p>
          </li>
          <li>
            <p>
              {
                'Prorations. Property taxes, HOA dues, utilities, and other expenses may be prorated through the closing date. '
              }
            </p>
          </li>
          <li>
            <p>
              {
                "Pre-inspection. For some properties, inspecting before listing allows us to identify issues early, provide buyers with more information, and potentially reduce uncertainty once offers arrive. It isn't the right strategy for every home."
              }
            </p>
          </li>
        </ul>
        <p>
          {
            "The point isn't to memorize every possible expense. It's to understand your estimated net proceeds before we decide whether selling makes sense. "
          }
        </p>
        <p>{"That's a calculation I want to make before your home ever hits the market. "}</p>
        <h2>{'What’s It Worth?'}</h2>
        <p>{'This is where things get interesting. '}</p>
        <p>
          {
            "To estimate the market value of your Seattle home, I'll prepare a Comparative Market Analysis (CMA) using relevant properties that are active, pending, and— most importantly—recently sold. "
          }
        </p>
        <p>{"But a CMA isn't Zillow with nicer fonts. "}</p>
        <p>
          {
            'Two units in the same condominium building can command meaningfully different prices because of floor height, exposure, view, parking, storage, renovations, floor plan, or even where they sit within the building. '
          }
        </p>
        <p>
          {
            "The same applies to single-family homes. Condition, lot, architecture, street, school boundaries, renovation quality, and even which side of the block you're on can matter. "
          }
        </p>
        <p>{'Comparable sales give us the evidence. Experience provides the context. '}</p>
        <p>
          {
            'From there, we determine a probable range of market value and decide how we want to approach it. '
          }
        </p>
        <h2>{'Pricing Your Seattle Home'}</h2>
        <p>{"Price and value aren't necessarily the same thing. "}</p>
        <p>
          {
            'The value is what we believe the market supports. The list price is part of the strategy we use to reach it. '
          }
        </p>
        <p>{'There are several ways we can approach that. '}</p>
        <p>{'Price at market value. '}</p>
        <p>
          {
            'Usually the most straightforward strategy. We establish where comparable sales and current competition suggest the home belongs and price accordingly. '
          }
        </p>
        <p>{'Price below market value. '}</p>
        <p>
          {
            'Sometimes the goal is velocity. A compelling price can create urgency, increase showing traffic, and potentially generate multiple offers. '
          }
        </p>
        <p>
          {
            "You've identified the market value, but you want buyers through the door quickly. Ideally, they all cram into the open house at once and decide they can't possibly live without it. "
          }
        </p>
        <p>{"It's a bold strategy, Cotton. "}</p>
        <p>
          {
            "Sometimes it works beautifully. Sometimes you've simply listed your house for less money. This strategy is extremely dependent on the property and current market conditions. "
          }
        </p>
        <p>{'Price above market value. '}</p>
        <p>
          {
            "There's nothing inherently wrong with testing the upper end of a property's range when the evidence supports it. "
          }
        </p>
        <p>
          {
            "The danger is pricing based on what we wish the home were worth rather than what buyers are demonstrating they're willing to pay. "
          }
        </p>
        <p>
          {
            'A home that accumulates market time can become increasingly difficult to reposition. Buyers notice price reductions. They notice days on market. And eventually they begin asking what is wrong with the property—even when the answer is simply that it started at the wrong price. '
          }
        </p>
        <p>{"Sometimes my recommendation may even be: don't sell yet. "}</p>
        <p>
          {
            "If you have the flexibility to rent the property, hold it another year, or wait for market conditions that better align with your goals, that's a conversation worth having. "
          }
        </p>
        <p>
          {
            "My job isn't to convince you to list your home. It's to help determine whether listing it makes sense. "
          }
        </p>
        <h2>{'Marketing the Home'}</h2>
        <p>{"Once we've settled on timing and price, we need people to want it. "}</p>
        <p>{'That begins well before the listing goes live. '}</p>
        <p>
          {
            'Depending on the property, preparation can include staging, repairs, cleaning, window washing, landscaping, photography, video, floor plans, digital advertising, broker outreach, social media, and a launch strategy designed around the buyers most likely to purchase it. '
          }
        </p>
        <p>
          {
            "For luxury homes and Seattle condominiums especially, I'm interested in selling more than square footage. "
          }
        </p>
        <p>
          <strong>{"We're selling the way someone gets to live there."}</strong>{' '}
        </p>
        <p>
          {
            "The view from the kitchen at 7:00 p.m. The coffee shop downstairs. The walk to Pike Place Market. The rooftop you've probably stopped appreciating because you've lived there for five years. "
          }
        </p>
        <p>{"Those details aren't replacements for good real estate fundamentals. "}</p>
        <p>
          {
            "They're the reason someone falls in love after the fundamentals get them through the door. "
          }
        </p>
        <h2>{'Offer Review Date or Offers as Received?'}</h2>
        <p>{"There's no automatic answer. "}</p>
        <p>
          {
            'An offer review date can give buyers a common deadline and potentially allow us to evaluate multiple offers simultaneously. In the right market and with the right property, that can create considerable leverage. '
          }
        </p>
        <p>
          {
            "But it can also backfire. Buyers may decide not to wait. An aggressive deadline can feel manufactured, while one that's too far away gives buyers time to fall in love with something else. "
          }
        </p>
        <p>
          {
            'Reviewing offers as received removes that waiting period and lets us respond when a serious buyer appears. The tradeoff is that we may have less opportunity to place competing offers side by side. '
          }
        </p>
        <p>
          {
            "We'll make that decision based on the property, activity during the first few days, competing inventory, and what buyers are actually doing—not because it's simply “how listings are done.” "
          }
        </p>
        <h2>{'Deal or No Deal?'}</h2>
        <p>{'Hopefully, we have options. '}</p>
        <p>{'When an offer arrives, the first number everyone looks at is price. '}</p>
        <p>{'I look at the rest of the contract. '}</p>
        <p>
          {
            "A $1,050,000 offer isn't necessarily stronger than a $1,025,000 offer once financing, contingencies, earnest money, closing date, credits, and risk enter the equation. "
          }
        </p>
        <p>{'Some of the major considerations include: '}</p>
        <p>
          {
            'Contingencies. Inspection, financing, appraisal, condominium or association review, title, and the sale of another property can all affect the strength and certainty of an offer. '
          }
        </p>
        <p>
          {
            'Earnest money. The amount matters, but so do the circumstances under which a buyer can recover it. Washington law also contains specific provisions regarding liquidated damages and earnest-money forfeiture; under the statutory safe harbor, the amount generally may not exceed 5% of the purchase price. '
          }
        </p>
        <p>
          {
            'Financing. Cash, conventional financing, jumbo financing, and other loan structures can carry different timelines and risks. '
          }
        </p>
        <p>
          {
            'Closing date. Thirty days may be perfect. Maybe you need two weeks. Maybe you need two months and a rent-back. '
          }
        </p>
        <p>
          {
            "The strongest offer is the one whose combination of price, terms, timing, and certainty best fits what you're trying to accomplish. "
          }
        </p>
        <p>{"That's why we read the entire thing. "}</p>
        <h2>{'Champagne or Cake?'}</h2>
        <p>{"It's closing day. "}</p>
        <p>{'Before we celebrate, there are a few loose ends. '}</p>
        <p>
          {
            'The buyer may conduct a final walkthrough shortly before closing to confirm that the property is in the agreed-upon condition. '
          }
        </p>
        <p>
          {
            "You'll want your belongings out according to the contract, keys and access devices where we've agreed they'll be, and utilities and home services transferred or discontinued appropriately. Don't forget mail forwarding. Somehow, that one manages to be more annoying than selling the actual house. "
          }
        </p>
        <p>
          {
            "Before closing, we'll review the settlement statement so you understand the final numbers and where your proceeds are going. "
          }
        </p>
        <p>
          {
            'Once escrow has completed its work, the transaction has recorded, and closing has been confirmed: '
          }
        </p>
        <p>
          <strong>{"Congratulations. You've sold your home."}</strong>{' '}
        </p>
        <p>{"Now we can decide where we're having the champagne. "}</p>
        <h2>{'Thinking About Selling Your Seattle Home?'}</h2>
        <p>{"You don't need to be ready to list next week to start the conversation. "}</p>
        <p>
          {
            "If you're considering selling a home or condominium in Seattle, I can prepare a complimentary property evaluation and Comparative Market Analysis to help you understand its current market value, estimated selling costs, likely net proceeds, and what I would recommend if it were my listing. "
          }
        </p>
        <p>{'Sometimes the answer is to sell. '}</p>
        <p>{"Sometimes it's to wait. "}</p>
        <p>{"Either way, I'd rather start with the numbers. "}</p>
        <h3>{"Let's find out what your Seattle home is worth."}</h3>
        <div className='mt-10'>
          <Link to='/contact' variant='solidPrimary' size='lg'>
            Contact Kyle
          </Link>
        </div>
      </article>
    </main>
  );
}
