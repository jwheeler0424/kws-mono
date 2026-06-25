import { pixelBasedPreset, type TailwindConfig } from '@react-email/components';

import emailTailwindConfig from './tailwind.config';

export function getEmailBaseUrl() {
  const appBaseUrl = process.env.VITE_APP_URL ?? '';
  if (!appBaseUrl) {
    return '';
  }

  return appBaseUrl.startsWith('http') ? appBaseUrl : `https://${appBaseUrl}`;
}

export function getEmailLogoSrc() {
  const baseUrl = getEmailBaseUrl();
  return baseUrl ? `${baseUrl}/android-chrome-192x192.png` : undefined;
}

export function getResolvedEmailBaseUrl() {
  return getEmailBaseUrl() || 'http://localhost:3777';
}

export function getAuthAppName() {
  const value = process.env.VITE_APP_NAME?.trim();
  return value && value.length > 0 ? value : 'Admin Template';
}

export const sharedEmailTailwindConfig: TailwindConfig = {
  ...(emailTailwindConfig as unknown as TailwindConfig),
  presets: [pixelBasedPreset],
};
