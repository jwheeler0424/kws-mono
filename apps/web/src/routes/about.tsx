import { createFileRoute } from '@tanstack/react-router';

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
          title: 'Meet the Team',
          description:
            'Discover all of the latest market updates and the best places to eat in Seattle.',
          keywords: [
            'about',
            'Seattle',
            'Broker',
            'Real Estate',
            'team',
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
    <main>
      <header className='content page-header'>
        <h1>This is us.</h1>
        <p>
          Standing out isn't hard when you're in a vertical business. But we push it further by
          boldly and loudly celebrating what really brings people to cities - that enticing blend of
          inspiration, excitement, and eccentricity. The iconically tall buildings help, though.
        </p>
      </header>
      <main>
        <article className='banner banner-team' data-red-bg>
          <aside>
            <img
              className='h-full w-full object-cover object-top'
              src='/assets/images/larry_ahrens.jpg'
              alt='Larry Ahrens - Headshot'
              fetchPriority='high'
              loading='eager'
            />
          </aside>
          <main>
            <h4 className='m-0'>Broker</h4>
            <h2 className='m-0'>
              <>
                Larry
                <br />
                Ahrens
              </>
            </h2>
            <p>
              Larry has called Seattle home since 1998 and has been involved in varying sales
              positions for 30 + years- including over 20 years specifically in Seattle real estate.
              As the Sales Director of Spire, he has helped facilitate the fastest selling
              condominium building in the West Coast. Bringing his contagious energy, vast knowledge
              and experience, as well as his background as an educator Larry offers his clients
              -both Buyers and Sellers- top notch experience, dedication, effort, and communication
              to yield the best results possible. Personal experience in rural, suburban, and city
              life has given Larry expertise and market knowledge to help anyone looking to find
              that perfect home.
            </p>
          </main>
        </article>
        <article className='banner banner-team'>
          <aside>
            <img
              className='h-full w-full object-cover object-top'
              src='/assets/images/madelyn_jacklin.jpg'
              alt='Madelyn Jacklin - Headshot'
              fetchPriority='high'
              loading='eager'
            />
          </aside>
          <main>
            <h4 className='m-0'>Broker</h4>
            <h2 className='m-0'>
              <>
                Madelyn
                <br />
                Jacklin
              </>
            </h2>
            <p>
              As a Seattle native, Madelyn has always understood why so many people move to this
              area and end up making it not just a place they stop in for a while, but a place they
              want to call home. Having represented clients selling luxury high-rise projects
              throughout Seattle, Madelyn brings an intimate knowledge of the local market. She got
              into this business because she feels passionate about people and will go above and
              beyond to make sure that her clients find exactly what they are looking for.
            </p>
          </main>
        </article>
        <article className='banner banner-team' data-red-bg>
          <aside>
            <img
              className='h-full w-full object-cover object-top'
              src='/assets/images/brooke_kavieff.jpg'
              alt='Brooke Kavieff - Headshot'
              fetchPriority='high'
              loading='eager'
            />
          </aside>
          <main>
            <h4 className='m-0'>Broker</h4>
            <h2 className='m-0'>
              <>
                Brooke
                <br />
                Kavieff
              </>
            </h2>
            <p>
              Brooke brings over a decade of active real estate experience to the team. With a knack
              for selling luxury condos and single-family homes, she has generated over $180 million
              in sales. Brooke has equal experience helping sell and buy homes in both Seattle and
              Bellevue, being your active bridge to the region. Having participated in hundreds of
              transactions, she understands how to effectively guide buyers and sellers through each
              step of the transaction.
            </p>
          </main>
        </article>
        <article className='banner banner-team'>
          <aside>
            <img
              className='h-full w-full object-cover object-top'
              src='/assets/images/derek_koch.jpg'
              alt='Derek Koch - Headshot'
              fetchPriority='high'
              loading='eager'
            />
          </aside>
          <main>
            <h4 className='m-0'>Broker</h4>
            <h2 className='m-0'>
              <>
                Derek
                <br />
                Koch
              </>
            </h2>
            <p>
              Now based in Seattle with Polaris Pacific's new development sales and marketing team,
              Derek consistently aligns himself with top-tier professionals. He is currently a
              member of the sales team for Spire, the top-selling luxury condominium tower in
              downtown Seattle. Having spent the last 17 years in New York City, Derek made a
              significant mark in the realms of real estate and hospitality. In these dynamic,
              service-driven markets, he forged a successful career by cultivating enduring
              relationships and delivering exceptional client experiences. His dedication led to a
              feature in the New York Times, the "Deal of the Year" award from the Real Estate Board
              of New York in 2018, and notable mentions in other leading publications including the
              New York Post and the Wall Street Journal.
            </p>
          </main>
        </article>
        <article className='banner banner-team' data-red-bg>
          <aside>
            <img
              className='h-full w-full object-cover object-top'
              src='/assets/images/steven_madsen.jpg'
              alt='Steven Madsen - Headshot'
              fetchPriority='high'
              loading='eager'
            />
          </aside>
          <main>
            <h4 className='m-0'>Broker</h4>
            <h2 className='m-0'>
              <>
                Steven
                <br />
                Madsen
              </>
            </h2>
            <p>
              Born in the Pacific Northwest and having called it home his entire life, Steven
              considers himself fortunate. He has seen firsthand that there is something for
              everyone – the vibrancy and pace of a globally-recognized city, quiet neighborhoods
              with amazing schools and parks, plenty of shopping, fine dining and entertainment, and
              of course the great outdoors. Steven has played a crucial role in selling some of
              Seattle’s most successful buildings- most recently a member of the sales team at Mari,
              Bellevue’s newest high-rise condominium.
            </p>
          </main>
        </article>
        <article className='banner banner-team'>
          <aside>
            <img
              className='h-full w-full object-cover object-top'
              src='/assets/images/kyle_weber.jpg'
              alt='Kyle Weber - Headshot'
              fetchPriority='high'
              loading='eager'
            />
          </aside>
          <main>
            <h4 className='m-0'>Managing Broker</h4>
            <h2 className='m-0'>
              <>
                Kyle
                <br />
                Weber
              </>
            </h2>
            <p>
              Kyle is an expert in the downtown metropolitan area- having sold over $120 Million
              worth of homes throughout Seattle including some of the highest-priced product in the
              city. Partnering with Polaris Pacific, one of the foremost brokerages in new
              construction, has given him the opportunity to represent some of the most prestigious
              developers in the area and- quite literally- know most buildings inside-out to help
              his buyers. While achieving record prices for his sellers has been a proud badge to
              wear, Kyle finds himself most enjoying the “search” - helping clients find the perfect
              home in the area that checks all their boxes.
            </p>
          </main>
        </article>
        <article className='banner banner-team' data-red-bg>
          <aside>
            <img
              className='h-full w-full object-cover object-top'
              src='/assets/images/josh_nasvik.jpg'
              alt='Josh Nasvik - Headshot'
              fetchPriority='high'
              loading='eager'
            />
          </aside>
          <main>
            <h4 className='m-0'>Managing Director</h4>
            <h2 className='m-0'>
              <>
                Josh
                <br />
                Nasvik
              </>
            </h2>
            <p>
              Based in our Seattle office, Josh leads business development and operations as
              Managing Director for our rapidly-expanding portfolio in the Pacific Northwest. He has
              directed the sales and marketing strategy for teams throughout the West Coast and
              works to foster communication between clients. Josh brings an unparalleled 25 years of
              experience in real estate and a thoughtful, holistic approach to client relationships.
              Josh oversees both our Seattle and Bellevue listings, assuring focus throughout the
              Greater Seattle Area.
            </p>
          </main>
        </article>
        <article className='banner banner-team'>
          <aside>
            <img
              className='h-full w-full object-cover object-top'
              src='/assets/images/dana_van_galder.jpg'
              alt='Dana Van Galder - Headshot'
              fetchPriority='high'
              loading='eager'
            />
          </aside>
          <main>
            <h4 className='m-0'>Marketing Director</h4>
            <h2 className='m-0'>
              <>
                Dana
                <br />
                Van Galder
              </>
            </h2>
            <p>
              Dana has a unique background in marketing, project management and business
              development. She has implemented numerous residential marketing strategies cumulating
              over $1 Billion in sales. Her imaginative lens and creative network have resulted in
              multiple award-winning marketing campaigns. Prior to joining Polaris Pacific, Dana
              worked for the Urban Land Institute. Dana received her bachelor of arts in urban
              studies and planning from the University of California, San Diego.
            </p>
          </main>
        </article>
        <article className='banner banner-team' data-red-bg>
          <aside>
            <img
              className='h-full w-full object-cover object-top'
              src='/assets/images/jonan_wu.jpg'
              alt='Jonan Wu - Headshot'
              fetchPriority='high'
              loading='eager'
            />
          </aside>
          <main>
            <h4 className='m-0'>Transaction Coordinator</h4>
            <h2 className='m-0'>
              <>
                Jonan
                <br />
                Wu
              </>
            </h2>
            <p>
              With over 20 years of knowledge marketing high profile luxury condominiums in the
              greater Seattle area, Jonan has contributed to the successful sale of over 1,500
              homes, supporting and collaborating with sales teams to achieve set goals. He works in
              partnership with developers, lenders, escrow managers, selling brokers, and marketing
              teams in the industry to attain an ideal transition from sold to closed.
            </p>
          </main>
        </article>
      </main>
    </main>
  );
}
