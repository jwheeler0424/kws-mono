import core from './core';
import data from './data';
import email from './email';
import integrations from './integrations';
import mls from './mls';
import pulse from './pulse';

export const env = {
  ...core,
  ...data,
  ...email,
  ...integrations,
  ...mls,
  ...pulse,
} as const;

export default env;
