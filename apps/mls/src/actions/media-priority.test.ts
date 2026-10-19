import { afterEach, expect, test } from 'bun:test';

import { servicePriorityMedia, setMediaPriorityHandler } from './media-priority';

afterEach(() => setMediaPriorityHandler(async () => {}));

test('concurrent background callers wait for one priority service invocation', async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let calls = 0;
  const events: string[] = [];
  setMediaPriorityHandler(async () => {
    calls += 1;
    await gate;
    events.push('priority');
  });
  const first = servicePriorityMedia().then(() => events.push('background-one'));
  const second = servicePriorityMedia().then(() => events.push('background-two'));
  expect(calls).toBe(1);
  expect(events).toHaveLength(0);
  release();
  await Promise.all([first, second]);
  expect(events[0]).toBe('priority');
  expect(events).toHaveLength(3);
});
