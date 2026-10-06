import { createFileRoute } from '@tanstack/react-router';

import {
  ParallaxContainer,
  ParallaxContentLayer,
  ParallaxMediaLayer,
} from '@/components/animation/parallax';
import { Link } from '@/components/global/link';
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
          title: 'Buying a Home in Seattle',
          description:
            'Understand the Seattle home-buying process, from financing and finding the right neighborhood to offers and closing, with Kyle Weber at Compass.',
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
      <ParallaxContainer className='banner-short relative flex items-center justify-center overflow-hidden'>
        <ParallaxMediaLayer>
          <img
            className='h-full w-full object-cover'
            src='/assets/images/compass/buying.webp'
            alt='A waterfront home in Seattle'
            fetchPriority='high'
            loading='eager'
          />
        </ParallaxMediaLayer>
        <ParallaxContentLayer>
          <article className='banner banner-title flex'>
            <main>
              <h1>Buying a Home in Seattle</h1>
            </main>
          </article>
        </ParallaxContentLayer>
      </ParallaxContainer>

      <article className='content page-content guide-content relative'>
        <p>
          {
            "Buying a home is exciting. It can also be overwhelming—particularly if it's your first time doing it. "
          }
        </p>
        <p>
          {
            "Seattle doesn't necessarily make things easier. Condominiums, century-old Craftsman homes, new construction, townhomes, floating homes, view properties, wildly different neighborhoods, and a market that can change considerably depending on what you're looking for. "
          }
        </p>
        <p>
          {
            "The good news is that buying doesn't have to feel complicated when you understand the process. "
          }
        </p>
        <p>{"So let's start at the beginning. "}</p>
        <h2>{'Can I Make This My Home?'}</h2>
        <p>{"It's a question you'll probably ask yourself twice. "}</p>
        <p>{"Once when you're ready to leave where you live now. "}</p>
        <p>
          {
            "And again when you're standing inside a home wondering whether you should make an offer. "
          }
        </p>
        <p>
          {'Before we start touring properties, I want to understand what makes you answer yes. '}
        </p>
        <p>
          {
            "Maybe it's a functional kitchen, another bedroom, more storage, or finally having an office that isn't also your dining room. "
          }
        </p>
        <p>{'Those are needs. '}</p>
        <p>
          {
            'Maybe you want to shorten your commute, live near a particular school, walk outside and immediately find restaurants and coffee shops, or have a running trail a few blocks away. '
          }
        </p>
        <h3>{"That's location."}</h3>
        <p>
          {
            "Then there are the things you don't necessarily need but would really like to have: contemporary finishes, a view, a rooftop deck, a backyard, more luxury, or perhaps a property with investment potential. "
          }
        </p>
        <p>{'Those are wants. '}</p>
        <p>{'Knowing the difference matters. '}</p>
        <p>
          {
            'Seattle offers everything from downtown high-rise condominiums to townhomes, single-family houses, historic homes, new construction, and even floating homes. Each offers a completely different way to live in the city. '
          }
        </p>
        <p>
          {
            "If we don't know what you need, where you want to live, and what you're willing to compromise on, we're just throwing darts. "
          }
        </p>
        <p>{"We're not looking to throw darts. "}</p>
        <h3>{"We're looking for the needle in the haystack."}</h3>
        <p>
          {
            "Before we begin, make a list. What's non-negotiable? What's preferred? And what sounded important until you realized you'd trade it immediately for a view of the Olympics? "
          }
        </p>
        <p>{"That's where the search starts. "}</p>
        <h2>{'What Can I Afford?'}</h2>
        <p>{"Before falling in love with a house, it's useful to know whether you can buy it. "}</p>
        <p>
          {
            "Whether you're financing your purchase, paying cash, or using investments to fund some or all of it, understanding your buying power is one of the first steps in the process. "
          }
        </p>
        <p>
          {
            'For financing, your lender will typically want documentation relating to your income, assets, debts, and credit history. That can include: '
          }
        </p>
        <ul>
          <li>
            <p>{'Recent pay stubs and employment information '}</p>
          </li>
          <li>
            <p>{'Bank and financial statements '}</p>
          </li>
          <li>
            <p>{'Investment and retirement accounts '}</p>
          </li>
          <li>
            <p>{'Outstanding loans and debts '}</p>
          </li>
          <li>
            <p>{'Tax returns and other income documentation '}</p>
          </li>
          <li>
            <p>{'Identification and additional financial records requested by underwriting '}</p>
          </li>
          <li>
            <p>{'Think of it as building your financial file before we start shopping.'}</p>
          </li>
        </ul>
        <p>
          {
            "If you're financing, getting pre-approved before seriously touring homes is important. It establishes a realistic price range and puts us in a much better position when it's time to write an offer. "
          }
        </p>
        <p>{'And shop around. '}</p>
        <p>
          {
            "A mortgage is a financial product. Rates, fees, loan programs, responsiveness, and service can vary considerably from lender to lender. I work with lenders I trust and am happy to make introductions, but you're never obligated to use one of them. "
          }
        </p>
        <p>
          {
            "The right lender should be part of the team—not another person we're chasing for answers three hours before an offer deadline. "
          }
        </p>
        <h2>{"Aren't Interest Rates Crazy High?"}</h2>
        <p>
          {
            'Compared with the historically low rates buyers saw during the pandemic era? They can certainly feel that way. '
          }
        </p>
        <p>
          {
            'But mortgage rates have moved through dramatically different environments over the decades. The exceptionally low rates of 2020–2021 were exactly that: exceptional. '
          }
        </p>
        <h3>
          {
            "More importantly, the rate itself isn't really the question. The question is what the rate means for you."
          }
        </h3>
        <p>
          {
            'Interest rates affect your monthly payment and therefore your purchasing power. A lower rate may allow you to comfortably spend more; a higher rate may mean adjusting your purchase price, down payment, or expectations. '
          }
        </p>
        <p>
          {
            "Rates also don't exist in a vacuum. Periods of lower rates can bring more buyers into the market and increase competition, while higher borrowing costs can change both buyer demand and seller behavior. "
          }
        </p>
        <p>
          {
            "So rather than trying to perfectly time an interest-rate cycle, we'll look at the entire equation: "
          }
        </p>
        <p>
          <strong>
            {'Price. Payment. Competition. Inventory. Your timeline. Your financial comfort level.'}
          </strong>{' '}
        </p>
        <p>{'Sometimes buying now makes sense. '}</p>
        <p>{'Sometimes waiting makes sense. '}</p>
        <p>{"That's what we need to figure out. "}</p>
        <h2>{'Who You Gonna Call?'}</h2>
        <p>{"You've identified what you want. You've figured out what you can afford. "}</p>
        <p>{'Now you need someone to help you find it. '}</p>
        <p>
          {
            "Choosing a Seattle real estate agent to represent you as a buyer isn't simply about finding someone who can open doors. You want someone who understands the market you're trying to enter and can guide you through everything that happens after you find the house. "
          }
        </p>
        <p>{'I think there are a few things worth looking for. '}</p>
        <p>{"Full-time representation. You shouldn't be someone's side hustle. "}</p>
        <p>
          {
            "Communication. Real estate moves quickly. You shouldn't spend your home search wondering where your agent went. "
          }
        </p>
        <p>
          {
            "Market knowledge. Your broker should understand the neighborhoods, buildings, property types, comparable sales, and peculiarities of the market you're considering. "
          }
        </p>
        <p>
          {
            'Experience. Writing the offer is easy. Recognizing problems, understanding leverage, negotiating terms, and getting the transaction to closing are where experience becomes considerably more valuable. '
          }
        </p>
        <p>{"Vibe. Don't underestimate this one. "}</p>
        <p>
          {
            'You may spend weeks or months touring homes with this person, discussing your finances, making significant decisions, and occasionally needing them to talk you out of—or into—something. '
          }
        </p>
        <p>{'You should probably like them. '}</p>
        <h2>{'Time to Go Shopping'}</h2>
        <p>{'This is the fun part. '}</p>
        <p>
          {
            "You've figured out your needs, wants, location, budget, financing, and representation. "
          }
        </p>
        <p>{'Now we get to play House Hunters. '}</p>
        <p>{"Except we're actually buying one. "}</p>
        <p>
          {
            "We'll monitor the market, identify properties worth seeing, tour homes, compare options, look at recent sales, and gradually learn what your budget actually buys in the neighborhoods you're considering. "
          }
        </p>
        <p>{'And the search may change along the way. '}</p>
        <p>
          {
            "Maybe the neighborhood you were convinced you wanted doesn't feel right once you've spent a few Saturdays there. Maybe the extra bedroom becomes less important than outdoor space. Maybe you walk into a condo you never would have clicked on yourself and immediately understand why I wanted you to see it. "
          }
        </p>
        <p>{"That's part of the process. "}</p>
        <p>{'Be patient. '}</p>
        <p>{'The right home may not be listed today. '}</p>
        <p>
          {
            "You shouldn't buy something simply because you're tired of looking. Eventually, we need to come back to the question we started with: "
          }
        </p>
        <h3>{'Can I make this my home?'}</h3>
        <p>{'If the answer is yes, then we start talking numbers. '}</p>
        <h2>{'Making an Offer on a Home in Seattle'}</h2>
        <p>{'Finding the home is only half the job. '}</p>
        <p>{'Now we need to buy it. '}</p>
        <p>
          {
            "Before writing an offer, we'll review comparable sales, current competition, days on market, property condition, seller circumstances when known, and any available disclosures or documentation. "
          }
        </p>
        <p>
          {'Then we decide not only how much to offer, but how to structure the offer itself. '}
        </p>
        <p>{'Price matters. '}</p>
        <p>{'So do the terms. '}</p>
        <p>
          {
            'Depending on the property and transaction, an offer may address financing, earnest money, inspection, appraisal, title, condominium or HOA review, closing date, possession, and other contingencies. '
          }
        </p>
        <p>{"The goal isn't simply to write the highest offer. "}</p>
        <p>
          {
            "It's to write an offer that reflects the value of the property, protects you appropriately, and gives us the best possible chance of accomplishing what you want. "
          }
        </p>
        <p>{'And sometimes the right advice is to walk away. '}</p>
        <p>{'There will be another house. '}</p>
        <h2>{'The Other Guys'}</h2>
        <p>{'Your offer has been accepted. '}</p>
        <p>{'Congratulations. '}</p>
        <p>{"We're not done. "}</p>
        <p>
          <strong>
            {
              "This is when you'll start hearing words like mutual, escrow, title, earnest money, inspection, appraisal, underwriting, and contingency deadlines."
            }
          </strong>{' '}
        </p>
        <p>{"Don't worry. I'll keep track of them. "}</p>
        <p>
          {
            "Earnest money. This is money deposited after mutual acceptance, according to the terms of the purchase agreement, to demonstrate your commitment to the transaction. The appropriate amount and deadline depend on the offer we've written and the competitive circumstances. "
          }
        </p>
        <p>
          {
            "Inspection. If your offer includes an inspection contingency, we'll arrange for a professional inspection and evaluate what—if anything—we want to do based on the results. "
          }
        </p>
        <p>
          {
            "Appraisal. If you're financing, your lender may require an appraisal as part of approving the loan. "
          }
        </p>
        <p>
          {
            'Financing and underwriting. Your lender will continue verifying your financial information and processing the loan. '
          }
        </p>
        <p>{'This is not the ideal moment to finance a Porsche. '}</p>
        <p>
          {
            "Condominium or HOA review. If you're buying into an association, there's another layer of due diligence. We'll pay attention to the documents available to us, financial health, reserves, assessments, insurance, litigation, rules, and other factors that can affect ownership. "
          }
        </p>
        <p>{'This is especially important when buying a condo in Seattle. '}</p>
        <p>{"A beautiful unit doesn't necessarily mean a healthy building. "}</p>
        <h2>{'What Exactly Is Escrow?'}</h2>
        <p>{'Think of escrow as the neutral middle of the transaction. '}</p>
        <p>
          {
            'The escrow company coordinates many of the financial and administrative pieces required to close the sale. Among other things, it can hold earnest money, prepare closing documents and settlement figures, coordinate funds, and facilitate the final transfer associated with closing. '
          }
        </p>
        <p>
          {
            "Meanwhile, title work helps establish the seller's ability to convey title and identifies relevant matters affecting the property. "
          }
        </p>
        <p>{"You don't need to become an expert in either. "}</p>
        <p>{"That's what the rest of us are here for. "}</p>
        <h2>{'Moving In'}</h2>
        <p>{'You did it. '}</p>
        <p>{'Almost. '}</p>
        <p>{"We're in the endgame now. "}</p>
        <p>
          {
            "As closing approaches, you'll receive final figures showing the funds required to complete your purchase. If you're financing, your lender and escrow team will coordinate loan funding and the remaining funds you need to provide. "
          }
        </p>
        <p>
          {
            "We'll typically have an opportunity for a final walkthrough shortly before closing to confirm that the property remains in the expected condition and that the terms of the agreement have been satisfied. "
          }
        </p>
        <p>{'Then comes signing. '}</p>
        <p>{'Funding. '}</p>
        <p>{'Recording. '}</p>
        <p>{"And finally, the part you've been waiting for: "}</p>
        <p>
          <strong>{'Keys.'}</strong>{' '}
        </p>
        <p>{'Welcome home. '}</p>
        <p>{'You hired movers, right? '}</p>
        <p>{'Let them deal with that. '}</p>
        <p>{"You've earned a drink. "}</p>
        <h2>{'Ready to Buy a Home in Seattle?'}</h2>
        <p>{"You don't need to know exactly what you want before reaching out. "}</p>
        <p>
          {"Maybe you've already been pre-approved and have three neighborhoods narrowed down. "}
        </p>
        <p>{"Maybe you're moving to Seattle and can't tell Ballard from Belltown yet. "}</p>
        <p>
          {'Maybe you just want to know whether buying makes more sense than continuing to rent. '}
        </p>
        <p>{"That's enough to start. "}</p>
        <p>
          {
            "We'll figure out what you're looking for, what the Seattle real estate market offers within your budget, and whether now is actually the right time to make a move. "
          }
        </p>
        <p>
          <strong>{"Let's find somewhere in Seattle you can call home."}</strong>{' '}
        </p>
        <div className='mt-10'>
          <Link to='/contact' variant='solidPrimary' size='lg'>
            Contact Kyle
          </Link>
        </div>
      </article>
    </main>
  );
}
