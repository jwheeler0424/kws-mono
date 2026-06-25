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

interface VerifyEmailProps {
  userFirstname?: string;
  verificationLink?: string;
}

const appName = getAuthAppName();
const resolvedBaseUrl = getResolvedEmailBaseUrl();
const logoSrc = getEmailLogoSrc();

export const VerifyEmail = ({
  userFirstname = 'there',
  verificationLink = `${resolvedBaseUrl}/verify-email`,
}: VerifyEmailProps) => {
  return (
    <Html>
      <Head />
      <Tailwind config={sharedEmailTailwindConfig}>
        <Body className='bg-background px-4 py-10 font-sans text-foreground'>
          <Preview>Verify your email for {appName}</Preview>
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
                Verify your email address
              </Heading>
            </CardHeader>
            <CardContent className='px-10 pb-12'>
              <Text>Hi {userFirstname},</Text>
              <Text>
                Thanks for creating an account with {appName}. Please confirm your email address to
                finish setting up your account.
              </Text>
              <Flex justify='center' className='my-8'>
                <Button size='lg' className='no-underline' href={verificationLink}>
                  Verify email
                </Button>
              </Flex>
              <Text>
                If the button above does not work, copy and paste this URL into your browser:
              </Text>
              <Text className='my-0 break-all'>
                <Link href={verificationLink}>{verificationLink}</Link>
              </Text>
              <Separator className='my-8' />
              <Text>If you did not create an account, you can safely ignore this email.</Text>
            </CardContent>
          </Card>
        </Body>
      </Tailwind>
    </Html>
  );
};

VerifyEmail.PreviewProps = {
  userFirstname: 'Alan',
  verificationLink: `${resolvedBaseUrl}/verify-email`,
} as VerifyEmailProps;

VerifyEmail.tailwindConfig = sharedEmailTailwindConfig;

export default VerifyEmail;
