import { Body, Font, Head, Html, Img, Preview, Tailwind } from '@react-email/components';

import { env } from '@/config/env';

import { Card, CardContent, CardHeader, Heading, Link, Separator, Text } from '../_components';
import { getAuthAppName, getEmailLogoSrc, sharedEmailTailwindConfig } from '../_shared';

const appName = getAuthAppName();
const logoSrc = getEmailLogoSrc();

interface ContactRequestEmailProps {
  propertyAddress?: string | undefined;
  subject?: string | undefined;
  name: string;
  email: string;
  phone: string;
  message: string;
}

export const ContactRequestEmail = ({
  propertyAddress,
  subject,
  name = 'John Doe',
  email = 'john@email.com',
  phone = '555-555-5555',
  message = 'This is a test message',
}: ContactRequestEmailProps) => (
  <Html>
    <Head>
      <Font
        fontFamily='Knockout'
        fallbackFontFamily='Verdana'
        webFont={{
          url: `${env.APP_URL}/assets/fonts/knockout/Knockout-68.otf`,
          format: 'opentype',
        }}
        fontWeight={400}
        fontStyle='normal'
      />
    </Head>
    <Tailwind config={sharedEmailTailwindConfig}>
      <Body className='bg-background px-4 py-10 font-sans text-foreground'>
        <Preview>
          {subject ?? `You've recieved a new contact message!`} for {appName}
        </Preview>
        <Card className='mx-auto max-w-[560px] border border-solid border-border px-4 py-0'>
          <CardHeader className='px-10 pt-12 pb-0'>
            {logoSrc ? (
              <Img src={logoSrc} width='48' height='48' alt={`${appName} logo`} className='mb-8' />
            ) : null}
            <Heading level='h2' className='mb-2'>
              You've recieved a new contact message!
            </Heading>
          </CardHeader>
          <CardContent className='px-10 pb-12'>
            <Text style={paragraph}>
              {propertyAddress
                ? `You have recieved a new contact message in regards to a property
            that is listed on your website. Please see the details below.`
                : `You have recieved a new contact message. Please see the details below.`}
            </Text>
            {propertyAddress && (
              <>
                <Heading style={h3}>Property Address</Heading>
                <Text style={paragraph}>{propertyAddress}</Text>
                <Separator className='my-8' />
              </>
            )}

            <Heading style={h3}>Contact Information</Heading>

            <Text style={paragraph}>
              📱{' '}
              <Link style={anchor} href={`tel:${phone}`}>
                {phone}
              </Link>
            </Text>
            <Text style={paragraph}>
              📧{' '}
              <Link style={anchor} href={`mailto:${email}`}>
                {email}
              </Link>
            </Text>
            <Text style={paragraph}>📇 {name}</Text>
            <Text style={paragraph}>📄 {message}</Text>

            <Separator className='my-8' />
            <Text style={footer}>
              Polaris NW Residential <br />
              Polaris Pacific, 2228 1st Ave., Suite 230 Seattle, WA 98121
            </Text>
          </CardContent>
        </Card>
      </Body>
    </Tailwind>
  </Html>
);

export default ContactRequestEmail;

const h3 = {
  color: '#525f7f',
  fontSize: '16px',
  fontWeight: '600' as const,
  lineHeight: '24px',
  textAlign: 'left' as const,
};

const paragraph = {
  color: '#525f7f',

  fontSize: '16px',
  lineHeight: '24px',
  textAlign: 'left' as const,
};

const anchor = {
  color: '#556cd6',
  textDecoration: 'underline',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
};
