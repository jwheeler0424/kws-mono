import core from './core';
import data from './data';
import email from './email';
import integrations from './integrations';
import mls from './mls';
import pulse from './pulse';
import queue from './queue';

export const env = {
  ...core,
  ...data,
  ...email,
  ...integrations,
  ...mls,
  ...pulse,
  ...queue,
} as const;

export default env;
