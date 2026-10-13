import { pixelBasedPreset, type TailwindConfig } from '@react-email/components';

import emailTailwindConfig from './tailwind.config';

export function getEmailBaseUrl() {
  const appBaseUrl = process.env.VITE_APP_URL ?? '';
  if (!appBaseUrl) {
    return '';
  }

  return appBaseUrl.startsWith('http') ? appBaseUrl : `https://${appBaseUrl}`;
}

export function getEmailAssetSrc(path: string) {
  const baseUrl = getEmailBaseUrl() || 'https://kyleweberseattle.com';
  return new URL(path.replace(/^\/+/, ''), `${baseUrl.replace(/\/+$/, '')}/`).toString();
}

export function getEmailLogoSrc() {
  return getEmailAssetSrc('/assets/brand/compass-black.png');
}

export function getResolvedEmailBaseUrl() {
  return getEmailBaseUrl() || 'http://localhost:3777';
}

export function getAuthAppName() {
  const value = process.env.VITE_APP_NAME?.trim();
  return value && value.length > 0 ? value : 'Kyle Weber at Compass';
}

export const sharedEmailTailwindConfig: TailwindConfig = {
  ...(emailTailwindConfig as unknown as TailwindConfig),
  presets: [pixelBasedPreset],
};
