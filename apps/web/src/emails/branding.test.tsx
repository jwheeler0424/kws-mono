import { render } from '@react-email/render';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAuthAppName, getEmailLogoSrc, getResolvedEmailBaseUrl } from './_shared';
import { AuthOtpEmail, type AuthOtpType } from './auth/auth-otp';
import { MagicLinkEmail } from './auth/magic-link';
import { OrganizationInvitationEmail } from './auth/organization-invitation';
import { PasswordResetSuccessEmail } from './auth/password-reset-success';
import { ResetPasswordEmail } from './auth/reset-password';
import { VerifyEmail } from './auth/verify-email';
import { ContactRequestEmail } from './contact/contact-request';

vi.mock('@kws/config/env', () => ({ env: { APP_URL: 'https://example.test' } }));

const originalEnvironment = {
  VITE_APP_NAME: process.env.VITE_APP_NAME,
  VITE_APP_URL: process.env.VITE_APP_URL,
};

afterEach(() => {
  for (const [key, value] of Object.entries(originalEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function expectCompassBrand(html: string) {
  expect(html).toContain('/assets/brand/compass-black.png');
  expect(html).toContain('alt="Compass"');
  expect(html).not.toMatch(/Polaris|android-chrome|Knockout|Admin Template/);
}

describe('Compass email presentation', () => {
  it('uses a dedicated logo without changing configured action origins', () => {
    process.env.VITE_APP_NAME = '';
    process.env.VITE_APP_URL = '';
    expect(getAuthAppName()).toBe('Kyle Weber at Compass');
    expect(getEmailLogoSrc()).toBe('https://kyleweberseattle.com/assets/brand/compass-black.png');
    expect(getResolvedEmailBaseUrl()).toBe('http://localhost:3777');
    process.env.VITE_APP_URL = 'example.test';
    expect(getEmailLogoSrc()).toBe('https://example.test/assets/brand/compass-black.png');
    expect(getResolvedEmailBaseUrl()).toBe('https://example.test');
    process.env.VITE_APP_NAME = 'Configured Name';
    expect(getAuthAppName()).toBe('Configured Name');
  });

  it.each<AuthOtpType>(['sign-in', 'email-verification', 'forget-password', 'change-email'])(
    'preserves the %s code, expiration and security warning',
    async (type) => {
      const html = await render(<AuthOtpEmail type={type} otp='849302' expiresInMinutes={7} />);
      expectCompassBrand(html);
      expect(html).toContain('849302');
      expect(html.replace(/<!--[\s\S]*?-->/g, '')).toContain('7 minutes');
      expect(html).toContain('safely ignore this email');
    },
  );

  it.each([undefined, '842-513'])(
    'preserves magic links and optional code %s',
    async (loginCode) => {
      const html = await render(
        <MagicLinkEmail
          email='buyer@example.test'
          magicLink='https://example.test/magic?token=abc'
          loginCode={loginCode}
        />,
      );
      expectCompassBrand(html);
      expect(html).toContain('https://example.test/magic?token=abc');
      expect(html).toContain('buyer@example.test');
      if (loginCode) expect(html).toContain(loginCode);
      else expect(html).not.toContain('temporary login code');
    },
  );

  it('preserves verification, reset and sign-in action URLs', async () => {
    const templates = [
      {
        element: <VerifyEmail verificationLink='https://example.test/verify?token=abc' />,
        url: 'https://example.test/verify?token=abc',
      },
      {
        element: (
          <ResetPasswordEmail
            userFirstname='Buyer'
            resetPasswordLink='https://example.test/reset?token=abc'
          />
        ),
        url: 'https://example.test/reset?token=abc',
      },
      {
        element: (
          <PasswordResetSuccessEmail
            userFirstname='Buyer'
            loginUrl='https://example.test/sign-in'
          />
        ),
        url: 'https://example.test/sign-in',
      },
    ];
    for (const { element, url } of templates) {
      const html = await render(element);
      expectCompassBrand(html);
      expect(html).toContain(url);
    }
  });

  it('preserves organization identity, invitation URL and recipient warning', async () => {
    const html = await render(
      <OrganizationInvitationEmail
        recipientName='Buyer'
        invitedByUsername='Agent'
        invitedByEmail='agent@example.test'
        organizationName='Test Organization'
        inviteLink='https://example.test/invite?token=abc'
      />,
    );
    expectCompassBrand(html);
    for (const value of [
      'Buyer',
      'Agent',
      'agent@example.test',
      'Test Organization',
      'https://example.test/invite?token=abc',
      'you can ignore this message',
    ]) {
      expect(html).toContain(value);
    }
  });

  it.each([undefined, '123 Test Street'])(
    'preserves contact details and optional address %s',
    async (propertyAddress) => {
      const html = await render(
        <ContactRequestEmail
          propertyAddress={propertyAddress}
          name='Test Buyer'
          email='buyer@example.test'
          phone='2065550100'
          message='Please contact me about this home.'
        />,
      );
      expectCompassBrand(html);
      for (const value of [
        'Test Buyer',
        'buyer@example.test',
        'tel:2065550100',
        'Please contact me about this home.',
        '700 110th Ave NE #270',
        'kweber@compass.com',
      ]) {
        expect(html).toContain(value);
      }
      if (propertyAddress) expect(html).toContain(propertyAddress);
      else expect(html).not.toContain('Property Address');
    },
  );
});
