import { Body, Head, Html, Img, Preview, Tailwind } from '@react-email/components';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Flex,
  Heading,
  Separator,
  Text,
} from '../_components';
import {
  getAuthAppName,
  getEmailLogoSrc,
  getResolvedEmailBaseUrl,
  sharedEmailTailwindConfig,
} from '../_shared';

interface PasswordResetSuccessEmailProps {
  userFirstname?: string;
  loginUrl?: string;
}

const appName = getAuthAppName();
const resolvedBaseUrl = getResolvedEmailBaseUrl();
const logoSrc = getEmailLogoSrc();

export const PasswordResetSuccessEmail = ({
  userFirstname = 'there',
  loginUrl = `${resolvedBaseUrl}/login`,
}: PasswordResetSuccessEmailProps) => {
  return (
    <Html>
      <Head />
      <Tailwind config={sharedEmailTailwindConfig}>
        <Body className='bg-background px-4 py-10 font-sans text-foreground'>
          <Preview>Your password was updated</Preview>
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
                Password updated
              </Heading>
            </CardHeader>
            <CardContent className='px-10 pb-12'>
              <Text>Hi {userFirstname},</Text>
              <Text>Your password for {appName} was changed successfully.</Text>
              <Flex justify='center' className='my-8'>
                <Button size='lg' className='no-underline' href={loginUrl}>
                  Sign in
                </Button>
              </Flex>
              <Separator className='my-8' />
              <Text>
                If you did not make this change, reset your password immediately and contact
                support.
              </Text>
            </CardContent>
          </Card>
        </Body>
      </Tailwind>
    </Html>
  );
};

PasswordResetSuccessEmail.PreviewProps = {
  userFirstname: 'Alan',
  loginUrl: `${resolvedBaseUrl}/login`,
} as PasswordResetSuccessEmailProps;

PasswordResetSuccessEmail.tailwindConfig = sharedEmailTailwindConfig;

export default PasswordResetSuccessEmail;
