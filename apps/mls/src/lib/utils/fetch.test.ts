import { env } from '@kws/config';
import { describe, expect, it } from 'bun:test';

import {
  buildActivePropertyMediaChunkUrl,
  buildFreshParentMediaUrl,
  resolveMlsApiRequestUrl,
} from './fetch';

describe('MLS media queue chunk request', () => {
  it('requests up to 1000 active listings with Media from the oldest incomplete timestamp', () => {
    const url = new URL(buildActivePropertyMediaChunkUrl(new Date('2026-10-01T00:00:00Z'), 5000));
    const filter = url.searchParams.get('$filter');
    expect(filter).toContain("StandardStatus in ('Active','Active Under Contract','Coming Soon')");
    expect(filter).toContain('ModificationTimestamp ge 2026-10-01T00:00:00.000Z');
    expect(filter).toContain('MlgCanView eq true');
    expect(url.searchParams.get('$expand')).toBe('Media');
    expect(url.searchParams.get('$top')).toBe('1000');
  });
});

describe('MLS API request URL validation', () => {
  it('allows same-origin continuation links and rejects cross-origin URLs', () => {
    const apiOrigin = new URL(env.MLS_API_URL).origin;
    const requestUrl = `${apiOrigin}/v2/Property?%24top=1`;

    expect(resolveMlsApiRequestUrl('Property?%24skip=100', requestUrl)).toBe(
      `${apiOrigin}/v2/Property?%24skip=100`,
    );
    expect(() => resolveMlsApiRequestUrl('https://attacker.example/steal')).toThrow(
      'outside the configured origin',
    );
  });
});

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
