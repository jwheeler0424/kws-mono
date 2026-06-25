import { Body, Head, Html, Img, Preview, Tailwind } from '@react-email/components';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Flex,
  Heading,
  Link,
  Separator,
  Text,
} from '../_components';
import {
  getAuthAppName,
  getEmailLogoSrc,
  getResolvedEmailBaseUrl,
  sharedEmailTailwindConfig,
} from '../_shared';

interface MagicLinkEmailProps {
  email?: string;
  magicLink?: string;
  loginCode?: string;
}

const appName = getAuthAppName();
const resolvedBaseUrl = getResolvedEmailBaseUrl();
const logoSrc = getEmailLogoSrc();

export const MagicLinkEmail = ({
  email = 'user@example.com',
  magicLink = `${resolvedBaseUrl}/auth/magic-link`,
  loginCode,
}: MagicLinkEmailProps) => {
  return (
    <Html>
      <Head />
      <Tailwind config={sharedEmailTailwindConfig}>
        <Body className='bg-background px-4 py-10 font-sans text-foreground'>
          <Preview>Sign in to {appName}</Preview>
          <Card className='mx-auto max-w-[560px] border border-solid border-border px-4 py-0'>
            <CardHeader className='px-10 pt-12 pb-0'>
              {logoSrc ? (
                <Img
                  src={logoSrc}
                  width='48'
                  height='48'
                  alt={`${appName} logo`}
                  className='mb-8'
                />
              ) : null}
              <Heading level='h2' className='mb-2'>
                Sign in with a magic link
              </Heading>
            </CardHeader>
            <CardContent className='px-10 pb-12'>
              <Text>
                Use this secure sign-in link for <strong>{email}</strong>. It expires soon for your
                security.
              </Text>
              <Flex justify='center' className='my-8'>
                <Button size='lg' className='no-underline' href={magicLink}>
                  Sign in to {appName}
                </Button>
              </Flex>
              {loginCode ? (
                <>
                  <Text>Or use this temporary login code:</Text>
                  <Flex justify='center' className='my-4'>
                    <Text className='my-0 inline-block rounded-md border border-border bg-muted px-4 py-3 text-center font-mono text-foreground'>
                      {loginCode}
                    </Text>
                  </Flex>
                </>
              ) : null}
              <Separator className='my-8' />
              <Text>If this wasn&apos;t you, you can safely ignore this email.</Text>
              <Text className='my-0 break-all'>
                <Link variant='subtle' href={magicLink}>
                  {magicLink}
                </Link>
              </Text>
            </CardContent>
          </Card>
        </Body>
      </Tailwind>
    </Html>
  );
};

MagicLinkEmail.PreviewProps = {
  email: 'alan@example.com',
  magicLink: `${resolvedBaseUrl}/auth/magic-link`,
  loginCode: '842-513',
} as MagicLinkEmailProps;

MagicLinkEmail.tailwindConfig = sharedEmailTailwindConfig;

export default MagicLinkEmail;
