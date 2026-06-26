import { createFileRoute, Link } from '@tanstack/react-router';
import { z } from 'zod';

import ContactForm from '@/components/forms/contact.form';

const contactSearchSchema = z.object({
  address: z.string().optional(),
});

export const Route = createFileRoute('/contact')({
  component: RouteComponent,
  validateSearch: contactSearchSchema,
});

function RouteComponent() {
  const { address } = Route.useSearch();
  return (
    <main className='content relative'>
      <section>
        <h1 className='mt-16 mb-10'>Reach out to us</h1>
        <main className='flex h-full w-full flex-col-reverse items-center gap-10 md:flex-row md:items-start md:justify-center lg:justify-start lg:gap-24'>
          <img
            alt='Polaris Pacific Team'
            className='relative mb-0 aspect-video h-fit w-full max-w-md rounded-sm border border-gray-200 shadow md:mt-4 md:h-[calc(50%*16/9)] md:w-[45%] md:max-w-none'
            src='/assets/images/meet-the-team.jpg'
          />
          <div className='mt-4 flex w-full max-w-md flex-col gap-8 sm:max-w-none md:w-1/2 lg:max-w-lg'>
            <section className='mb-2 flex flex-col-reverse items-start justify-between gap-6 sm:flex-row sm:flex-wrap sm:items-center'>
              <div className='w-full max-w-56 leading-loose tracking-wider'>
                <h3 className='text-[clamp(1.13rem,1.07rem+0.28vw,1.35rem)] leading-[clamp(1.42rem,0.65vw+1.29rem,1.94rem)]'>
                  Polaris Pacific
                </h3>
                <p className='text-[clamp(0.85rem,0.06vw+0.88rem,0.90rem)] leading-loose text-[#707070]'>
                  2228 1st Ave., Suite 230 Seattle, WA 98121
                </p>
              </div>
              <div className='w-full max-w-56 leading-loose tracking-wider'>
                <h3 className='text-[clamp(1.13rem,1.07rem+0.28vw,1.35rem)] leading-[clamp(1.42rem,0.65vw+1.29rem,1.94rem)]'>
                  Polaris NW Residential
                </h3>
                <p className='text-[clamp(0.85rem,0.06vw+0.88rem,0.90rem)] leading-loose text-[#707070]'>
                  <a href='tel:+12066498935'>206.649.8935</a>
                  <br />
                  <a href='mailto:pnw@polarispacific.com'>pnw@polarispacific.com</a>
                </p>
              </div>
            </section>
            <section className='mb-2 flex flex-wrap items-center justify-between gap-6'>
              {/* Custom Component - ContactForm */}
              <ContactForm propertyAddress={address} />
            </section>
            <>
              <p className='text-[clamp(0.74rem,-0.01vw+0.79rem,0.78rem)] text-[#707070]'>
                By providing Polaris Pacific with your contact information, you acknowledge and
                agree to our <Link to='/policies/privacy'>Privacy Policy</Link> and consent to
                receiving marketing communications, including through automated calls, texts, and
                emails, some of which may use artificial or prerecorded voices. This consent isn't
                necessary for purchasing any products or services and you may opt out at any time.
                To opt out from texts, you can reply, 'stop' at any time. To opt out from emails,
                you can click on the unsubscribe link in the emails. Message and data rates may
                apply.
              </p>
            </>
          </div>
        </main>
      </section>
    </main>
  );
}
