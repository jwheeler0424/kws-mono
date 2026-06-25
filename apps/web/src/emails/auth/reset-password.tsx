import { Body, Head, Html, Img, Preview, Tailwind } from '@react-email/components';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Link as EmailLink,
  Flex,
  Heading,
  Separator,
  Text,
} from '../_components';
import { getEmailLogoSrc, getResolvedEmailBaseUrl, sharedEmailTailwindConfig } from '../_shared';

interface ResetPasswordEmailProps {
  userFirstname?: string;
  resetPasswordLink?: string;
}

const resolvedBaseUrl = getResolvedEmailBaseUrl();
const logoSrc = getEmailLogoSrc();

export const ResetPasswordEmail = ({
  userFirstname = 'there',
  resetPasswordLink = `${resolvedBaseUrl}/reset-password`,
}: ResetPasswordEmailProps) => {
  return (
    <Html>
      <Head />
      <Tailwind config={sharedEmailTailwindConfig}>
        <Body className='bg-background px-4 py-10 font-sans text-foreground'>
          <Preview>Reset your password</Preview>
          <Card className='mx-auto max-w-[560px] border border-solid border-border px-4 py-0'>
            <CardHeader className='px-10 pt-12 pb-0'>
              {logoSrc ? (
                <Img src={logoSrc} width='48' height='48' alt='Application logo' className='mb-8' />
              ) : null}
              <Heading level='h2' className='mb-2'>
                Reset your password
              </Heading>
            </CardHeader>
            <CardContent className='px-10 pb-12'>
              <Text>Hi {userFirstname},</Text>
              <Text>
                Someone recently requested a password change for your account. If this was you, you
                can set a new password here:
              </Text>
              <Flex justify='center' className='my-8'>
                <Button size='lg' className='no-underline' href={resetPasswordLink}>
                  Reset password
                </Button>
              </Flex>
              <Text>
                If you don&apos;t want to change your password or didn&apos;t request this, just
                ignore and delete this message.
              </Text>
              <Separator className='my-8' />
              <Text>
                To keep your account secure, please don&apos;t forward this email to anyone. See our
                Help Center for <EmailLink href={resetPasswordLink}>more security tips</EmailLink>.
              </Text>
            </CardContent>
          </Card>
        </Body>
      </Tailwind>
    </Html>
  );
};

ResetPasswordEmail.PreviewProps = {
  userFirstname: 'Alan',
  resetPasswordLink: `${resolvedBaseUrl}/reset-password`,
} as ResetPasswordEmailProps;

ResetPasswordEmail.tailwindConfig = sharedEmailTailwindConfig;

export default ResetPasswordEmail;
