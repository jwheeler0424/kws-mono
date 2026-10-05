import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';

import ContactForm from '@/components/forms/contact.form';

const contactSearchSchema = z.object({
  address: z.string().optional(),
});

export const Route = createFileRoute('/contact')({
  component: RouteComponent,
  validateSearch: contactSearchSchema,
  head: () => ({
    meta: [
      { title: 'Contact Kyle Weber | KyleWeberSeattle.com' },
      {
        name: 'description',
        content:
          'Reach out to Kyle Weber at Compass to discuss buying or selling a home in Seattle.',
      },
    ],
  }),
});

function RouteComponent() {
  const { address } = Route.useSearch();
  return (
    <main className='content relative max-w-[100rem] py-16'>
      <header>
        <h1 className='m-0'>Reach out to me.</h1>
      </header>
      <div className='grid items-start gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20'>
        <aside className='flex flex-col gap-8 lg:pt-1'>
          <div>
            <h2 className='mb-3 text-2xl'>Kyle Weber</h2>
            <p className='text-base leading-8 text-neutral-600'>
              <a href='tel:+12066498935'>206.649.8935</a>
              <br />
              <a href='mailto:kweber@compass.com'>kweber@compass.com</a>
            </p>
          </div>
          <div>
            <img
              src='/assets/brand/compass-black.png'
              alt='Compass'
              width={180}
              height={24}
              className='mb-4 h-auto w-36'
            />
            <address className='max-w-64 text-base leading-8 text-neutral-600 not-italic'>
              700 110th Ave NE #270
              <br />
              Bellevue, WA 98004
            </address>
          </div>
        </aside>
        <section className='w-full max-w-4xl' aria-label='Contact Kyle'>
          <ContactForm propertyAddress={address} />
          <p className='mt-8 text-xs leading-6 text-neutral-600'>
            By providing Compass with your contact information, you acknowledge and agree to our{' '}
            <Link to='/policies/privacy'>Privacy Policy</Link> and consent to receiving marketing
            communications, including through automated calls, texts, and emails, some of which may
            use artificial or prerecorded voices. This consent isn't necessary for purchasing any
            products or services and you may opt out at any time. To opt out from texts, you can
            reply, 'stop' at any time. To opt out from emails, you can click on the unsubscribe link
            in the emails. Message and data rates may apply.
          </p>
        </section>
      </div>
    </main>
  );
}
