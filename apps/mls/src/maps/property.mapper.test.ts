import { describe, expect, it } from 'bun:test';

import type { MlsPropertyPayload } from '../types';

import { mapProperty } from './property.mapper';

describe('NWMLS property mapping', () => {
  it('preserves all announced contact fields', () => {
    const mapped = mapProperty({
      ListingKey: 'NWM1',
      MlgCanView: true,
      ListAgentPreferredPhone: '555-0100',
      ListAgentEmail: 'agent@example.com',
      ListOfficeEmail: 'office@example.com',
      CoListAgentPreferredPhone: '555-0101',
      CoListAgentEmail: 'coagent@example.com',
      CoListOfficeEmail: 'cooffice@example.com',
    } as MlsPropertyPayload);
    expect(mapped.listAgentPreferredPhone).toBe('555-0100');
    expect(mapped.listAgentEmail).toBe('agent@example.com');
    expect(mapped.listOfficeEmail).toBe('office@example.com');
    expect(mapped.coListAgentPreferredPhone).toBe('555-0101');
    expect(mapped.coListAgentEmail).toBe('coagent@example.com');
    expect(mapped.coListOfficeEmail).toBe('cooffice@example.com');
  });

  it('distinguishes omitted media from an explicit empty snapshot', () => {
    expect(mapProperty({ ListingKey: 'NWM1' } as MlsPropertyPayload).mediaSnapshotPresent).toBe(
      false,
    );
    expect(
      mapProperty({ ListingKey: 'NWM1', Media: [] } as MlsPropertyPayload).mediaSnapshotPresent,
    ).toBe(true);
  });

  it('marks private media unavailable without saving the signed URL', () => {
    const mapped = mapProperty({
      ListingKey: 'NWM1',
      Media: [{ MediaKey: 'photo', MediaURL: 'secret', Permission: ['Private'] }],
    } as MlsPropertyPayload);
    expect(mapped.media[0]?.mediaURL).toBeNull();
    expect(mapped.media[0]?.deletedAt).toBeInstanceOf(Date);
  });
});
