import { Body, Head, Html, Img, Preview, Tailwind } from '@react-email/components';

import { Card, CardContent, CardHeader, Heading, Separator, Text } from '../_components';
import { getAuthAppName, getEmailLogoSrc, sharedEmailTailwindConfig } from '../_shared';

export type AuthOtpType = 'sign-in' | 'email-verification' | 'forget-password' | 'change-email';

interface AuthOtpEmailProps {
  otp?: string;
  type?: AuthOtpType;
  expiresInMinutes?: number;
}

const appName = getAuthAppName();
const logoSrc = getEmailLogoSrc();

const titleByType: Record<AuthOtpType, string> = {
  'sign-in': 'Your sign-in code',
  'email-verification': 'Your email verification code',
  'forget-password': 'Your password reset code',
  'change-email': 'Your email change verification code',
};

export const AuthOtpEmail = ({
  otp = '123456',
  type = 'sign-in',
  expiresInMinutes = 10,
}: AuthOtpEmailProps) => {
  const title = titleByType[type];

  return (
    <Html>
      <Head />
      <Tailwind config={sharedEmailTailwindConfig}>
        <Body className='bg-background px-4 py-10 font-sans text-foreground'>
          <Preview>
            {title} for {appName}
          </Preview>
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
                {title}
              </Heading>
            </CardHeader>
            <CardContent className='px-10 pb-12'>
              <Text>Enter this code to continue:</Text>
              <Text className='my-6 rounded-md border border-border bg-muted px-4 py-4 text-center font-mono text-2xl tracking-[0.2em] text-foreground'>
                {otp}
              </Text>
              <Text>This code expires in {expiresInMinutes} minutes.</Text>
              <Separator className='my-8' />
              <Text>If you did not request this code, you can safely ignore this email.</Text>
            </CardContent>
          </Card>
        </Body>
      </Tailwind>
    </Html>
  );
};

AuthOtpEmail.PreviewProps = {
  otp: '849302',
  type: 'sign-in',
  expiresInMinutes: 10,
} as AuthOtpEmailProps;

AuthOtpEmail.tailwindConfig = sharedEmailTailwindConfig;

export default AuthOtpEmail;
