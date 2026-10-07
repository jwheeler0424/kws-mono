import { describe, expect, it } from 'bun:test';

import { createFeaturedPropertyMatcher } from '@/lib/featured-property';

import type { MlsPropertyPayload } from '../types';

import { mapMemberMedia, mapOfficeMedia, resolveMlsMediaKey } from './media.mapper';
import { mapMember } from './member.mapper';
import { mapOffice } from './office.mapper';
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

describe('featured property member scope', () => {
  const matchesConfiguredMember = createFeaturedPropertyMatcher([' NWMmember1 ']);
  const baseProperty = {
    standardStatus: 'Active',
    mlgCanView: true,
    deletedAt: null,
    listAgentMlsId: null,
    coListAgentMlsId: null,
    buyerAgentMlsId: null,
    coBuyerAgentMlsId: null,
  };

  it('matches configured members in each listing/buyer agent role', () => {
    expect(matchesConfiguredMember({ ...baseProperty, listAgentMlsId: 'NWMmember1' })).toBe(true);
    expect(matchesConfiguredMember({ ...baseProperty, coListAgentMlsId: 'NWMmember1' })).toBe(true);
    expect(matchesConfiguredMember({ ...baseProperty, buyerAgentMlsId: 'NWMmember1' })).toBe(true);
    expect(matchesConfiguredMember({ ...baseProperty, coBuyerAgentMlsId: 'NWMmember1' })).toBe(
      true,
    );
  });

  it('rejects unmatched, hidden, deleted, and non-active properties', () => {
    expect(matchesConfiguredMember({ ...baseProperty, listAgentMlsId: 'NWMother' })).toBe(false);
    expect(matchesConfiguredMember({ ...baseProperty, mlgCanView: false })).toBe(false);
    expect(matchesConfiguredMember({ ...baseProperty, deletedAt: new Date() })).toBe(false);
    expect(matchesConfiguredMember({ ...baseProperty, standardStatus: 'Pending' })).toBe(false);
  });
});

describe('Member and Office media without upstream MediaKey', () => {
  it('does not fail parent mapping for keyless media', () => {
    const member = mapMember({
      MemberMlsId: 'NWMmember1',
      MlgCanView: true,
      Media: [{ MediaURL: 'signed-url' }],
    });
    const office = mapOffice({
      OfficeMlsId: 'NWMoffice1',
      MlgCanView: true,
      Media: [{ MediaURL: 'signed-url' }],
    });
    expect(member.media[0]?.mediaKey).toBe('member:NWMmember1');
    expect(office.media[0]?.mediaKey).toBe('office:NWMoffice1');
    expect(member.media[0]?.mediaURL).toBeNull();
    expect(office.media[0]?.mediaURL).toBeNull();
    expect(member.mediaSnapshotPresent).toBe(true);
    expect(office.mediaSnapshotPresent).toBe(true);
  });

  it('uses the same fallback to match fresh snapshots despite rotated signed URLs', () => {
    const mapped = mapMemberMedia({ MediaURL: 'first-url' }, 'NWMmember1');
    expect(resolveMlsMediaKey({ MediaURL: 'new-url' }, 'NWMmember1', 'members')).toBe(
      mapped?.mediaKey ?? null,
    );
  });

  it('preserves provided keys and distinguishes available media object identities', () => {
    expect(mapMemberMedia({ MediaKey: 'provided' }, 'NWMmember1')?.mediaKey).toBe('provided');
    const first = mapOfficeMedia({ MediaObjectID: 'first' }, 'NWMoffice1');
    const second = mapOfficeMedia({ MediaObjectID: 'second' }, 'NWMoffice1');
    expect(first?.mediaKey).not.toBe(second?.mediaKey);
    expect(resolveMlsMediaKey({ MediaObjectID: 'first' }, 'NWMoffice1', 'offices')).toBe(
      first?.mediaKey ?? null,
    );
  });

  it('retains strict Property media identity validation', () => {
    expect(() =>
      mapProperty({
        ListingKey: 'NWM1',
        Media: [{ MediaURL: 'signed-url' }],
      } as MlsPropertyPayload),
    ).toThrow('without MediaKey');
  });
});
