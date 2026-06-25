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

interface OrganizationInvitationEmailProps {
  recipientName?: string;
  invitedByUsername?: string;
  invitedByEmail?: string;
  organizationName?: string;
  inviteLink?: string;
}

const appName = getAuthAppName();
const resolvedBaseUrl = getResolvedEmailBaseUrl();
const logoSrc = getEmailLogoSrc();

export const OrganizationInvitationEmail = ({
  recipientName = 'there',
  invitedByUsername = 'A teammate',
  invitedByEmail = 'teammate@example.com',
  organizationName = 'Your organization',
  inviteLink = `${resolvedBaseUrl}/accept-invitation`,
}: OrganizationInvitationEmailProps) => {
  return (
    <Html>
      <Head />
      <Tailwind config={sharedEmailTailwindConfig}>
        <Body className='bg-background px-4 py-10 font-sans text-foreground'>
          <Preview>
            Join {organizationName} on {appName}
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
                Join {organizationName}
              </Heading>
            </CardHeader>
            <CardContent className='px-10 pb-12'>
              <Text>Hello {recipientName},</Text>
              <Text>
                <strong>{invitedByUsername}</strong> ({invitedByEmail}) invited you to join the
                <strong> {organizationName}</strong> workspace in {appName}.
              </Text>
              <Flex justify='center' className='my-8'>
                <Button size='lg' className='no-underline' href={inviteLink}>
                  Accept invitation
                </Button>
              </Flex>
              <Text>If the button does not work, copy and paste this URL into your browser:</Text>
              <Text className='my-0 break-all'>
                <Link href={inviteLink}>{inviteLink}</Link>
              </Text>
              <Separator className='my-8' />
              <Text>
                This invite was intended for this email address. If you were not expecting this, you
                can ignore this message.
              </Text>
            </CardContent>
          </Card>
        </Body>
      </Tailwind>
    </Html>
  );
};

OrganizationInvitationEmail.PreviewProps = {
  recipientName: 'Alan',
  invitedByUsername: 'Grace',
  invitedByEmail: 'grace@example.com',
  organizationName: 'Enigma',
  inviteLink: `${resolvedBaseUrl}/accept-invitation`,
} as OrganizationInvitationEmailProps;

OrganizationInvitationEmail.tailwindConfig = sharedEmailTailwindConfig;

export default OrganizationInvitationEmail;
