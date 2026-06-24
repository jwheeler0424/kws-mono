import { createFileRoute } from '@tanstack/react-router';

import { useSeo } from '@/lib/tools';

export const Route = createFileRoute('/policies/dmca')({
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
          title: 'DMCA Policy',
          description:
            'Discover all of the latest market updates and the best places to eat in Seattle.',
          keywords: ['dmca', 'policy', 'dmca policy', 'Seattle', 'Broker', 'Real Estate'].join(
            ', ',
          ),
        }),
      ],
    };
  },
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <main className='content relative'>
      <section>
        <article>
          <h1>DMCA Policy</h1>
          <section>
            <p>
              This Digital Millennium Copyright Act policy (“Policy”) applies to the{' '}
              <a
                href='https://www.kyleweberseattle.com'
                target='_blank'
                rel='nofollow noreferrer noopener external'>
                polarisnwresidential.com
              </a>{' '}
              website (“Website” or “Service”) and any of its related products and services
              (collectively, “Services”) and outlines how Polaris Pacific (“Polaris Pacific”, “we”,
              “us” or “our”) addresses copyright infringement notifications and how you (“you” or
              “your”) may submit a copyright infringement complaint.
            </p>
            <p>
              Protection of intellectual property is of utmost importance to us and we ask our users
              and their authorized agents to do the same. It is our policy to expeditiously respond
              to clear notifications of alleged copyright infringement that comply with the United
              States Digital Millennium Copyright Act (“DMCA”) of 1998, the text of which can be
              found at the U.S. Copyright Office{' '}
              <a
                href='https://www.copyright.gov'
                target='_blank'
                rel='nofollow noreferrer noopener external'>
                website
              </a>
              .
            </p>
          </section>
          <section>
            <h2>What to consider before submitting a copyright complaint</h2>
            <p>
              Before submitting a copyright complaint to us, consider whether the use could be
              considered fair use. Fair use states that brief excerpts of copyrighted material may,
              under certain circumstances, be quoted verbatim for purposes such as criticism, news
              reporting, teaching, and research, without the need for permission from or payment to
              the copyright holder.
            </p>
            <p>
              Please note that if you are unsure whether the material you are reporting is in fact
              infringing, you may wish to contact an attorney before filing a notification with us.
            </p>
            <p>
              The DMCA requires you to provide your personal information in the copyright
              infringement notification. If you are concerned about the privacy of your personal
              information, you may wish to{' '}
              <a href='https://www.copyrighted.com/professional-takedowns' target='_blank'>
                hire an agent
              </a>{' '}
              to report infringing material for you.
            </p>
          </section>
          <section>
            <h2>Notifications of infringement</h2>
            <p>
              If you are a copyright owner or an agent thereof, and you believe that any material
              available on our Services infringes your copyrights, then you may submit a written
              copyright infringement notification (“Notification”) using the contact details below
              pursuant to the DMCA. All such Notifications must comply with the DMCA requirements.
              You may refer to a{' '}
              <a href='https://www.copyrighted.com/dmca-notice-generator' target='_blank'>
                DMCA takedown notice generator
              </a>{' '}
              or other similar services to avoid making mistake and ensure compliance of your
              Notification.
            </p>
            <p>
              Filing a DMCA complaint is the start of a pre-defined legal process. Your complaint
              will be reviewed for accuracy, validity, and completeness. If your complaint has
              satisfied these requirements, our response may include the removal or restriction of
              access to allegedly infringing material.
            </p>
            <p>
              If we remove or restrict access to materials or terminate an account in response to a
              Notification of alleged infringement, we will make a good faith effort to contact the
              affected user with information concerning the removal or restriction of access.
            </p>
            <p>
              Notwithstanding anything to the contrary contained in any portion of this Policy,
              Polaris Pacific reserves the right to take no action upon receipt of a DMCA copyright
              infringement notification if it fails to comply with all the requirements of the DMCA
              for such notifications.
            </p>
            <p>
              The process described in this Policy does not limit our ability to pursue any other
              remedies we may have to address suspected infringement.
            </p>
          </section>
          <section>
            <h2>Changes and amendments</h2>
            <p>
              We reserve the right to modify this Policy or its terms related to the Website and
              Services at any time at our discretion. When we do, we will revise the updated date at
              the bottom of this page. We may also provide notice to you in other ways at our
              discretion, such as through the contact information you have provided.
            </p>
            <p>
              An updated version of this Policy will be effective immediately upon the posting of
              the revised Policy unless otherwise specified. Your continued use of the Website and
              Services after the effective date of the revised Policy (or such other act specified
              at that time) will constitute your consent to those changes.
            </p>
          </section>
          <section>
            <h2>Reporting copyright infringement</h2>
            <p>
              If you would like to notify us of the infringing material or activity, we encourage
              you to contact us using the details below:
            </p>
            <p>
              <a
                href='https://www.kyleweberseattle.com/contact'
                target='_blank'
                rel='nofollow noreferrer noopener external'>
                https://www.kyleweberseattle.com/contact
              </a>
              <br />
              <a href='mailto:contact@polarisnwresidential.com'>contact@polarisnwresidential.com</a>
            </p>
          </section>
        </article>
      </section>
    </main>
  );
}
