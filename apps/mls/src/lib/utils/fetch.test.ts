import { describe, expect, it } from 'bun:test';

import { buildFreshParentMediaUrl } from './fetch';

describe('MLS media parent lookup filters', () => {
  it('queries Property by prefixed ListingId, not its unsupported ListingKey filter', () => {
    const url = new URL(buildFreshParentMediaUrl('properties', 'NWM155606405', 'NWM2454092'));
    expect(url.searchParams.get('$filter')).toContain("ListingId eq 'NWM2454092'");
    expect(url.searchParams.get('$filter')).not.toContain('ListingKey');
    expect(url.searchParams.get('$expand')).toBe('Media');
    expect(url.searchParams.get('$top')).toBe('1');
  });

  it('refuses Property lookups without a ListingId', () => {
    expect(() => buildFreshParentMediaUrl('properties', 'NWM155606405')).toThrow(
      'prefixed ListingId',
    );
  });

  it('keeps Member and Office MLS ID filters and escapes OData strings', () => {
    expect(
      new URL(buildFreshParentMediaUrl('members', "NWMmember'1")).searchParams.get('$filter'),
    ).toContain("MemberMlsId eq 'NWMmember''1'");
    expect(
      new URL(buildFreshParentMediaUrl('offices', 'NWMoffice1')).searchParams.get('$filter'),
    ).toContain("OfficeMlsId eq 'NWMoffice1'");
  });
});
