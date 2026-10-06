import { expect, test } from 'bun:test';

import { omitMediaUrl } from './media-history';

test('history keeps identifiers and versions but omits nested media URL capabilities', () => {
  const payload = {
    ListingKey: 'NWM1',
    Media: [
      {
        MediaKey: 'image',
        MediaURL: 'signed-secret',
        MediaModificationTimestamp: '2026-09-17T00:00:00Z',
      },
    ],
  };
  const stored = JSON.parse(JSON.stringify(payload, omitMediaUrl));
  expect(stored.Media[0]).toEqual({
    MediaKey: 'image',
    MediaModificationTimestamp: '2026-09-17T00:00:00Z',
  });
  expect(payload.Media[0]?.MediaURL).toBe('signed-secret');
});
