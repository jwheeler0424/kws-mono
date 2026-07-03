import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LISTINGS_SEARCH,
  encodeListingsSearch,
  fromQueryString,
  mergeListingsSearchPatch,
  parseListingsSearch,
  toQueryParams,
  toQueryString,
  toRouteSearch,
} from './search';

describe('mls search utils unit tests', () => {
  it('returns defaults for invalid parse input', () => {
    const parsed = parseListingsSearch({ query: 123 });

    expect(parsed).toEqual(DEFAULT_LISTINGS_SEARCH);
  });

  it('parses populated query strings with ranges, bounds, and proximity', () => {
    const parsed = fromQueryString(
      [
        'query=lake+house',
        'limit=30',
        'priceMin=250000',
        'priceMax=900000',
        'sqFtMin=1300',
        'sqFtMax=4200',
        'bedroomsMin=2',
        'bedroomsMax=5',
        'bathroomsMin=2',
        'bathroomsMax=4',
        'useMapBounds=true',
        'boundsNeLat=47.7',
        'boundsNeLng=-121.9',
        'boundsSwLat=47.1',
        'boundsSwLng=-122.6',
        'sortBy=priceAsc',
        'proximityLat=47.6205',
        'proximityLng=-122.3493',
        'proximityRadiusMiles=10',
      ].join('&'),
    );

    expect(parsed).toEqual({
      query: 'lake house',
      limit: 30,
      price: { min: 250000, max: 900000 },
      sqFt: { min: 1300, max: 4200 },
      bedrooms: { min: 2, max: 5 },
      bathrooms: { min: 2, max: 4 },
      useMapBounds: true,
      bounds: {
        northEast: { lat: 47.7, lng: -121.9 },
        southWest: { lat: 47.1, lng: -122.6 },
      },
      sortBy: 'priceAsc',
      proximity: {
        lat: 47.6205,
        lng: -122.3493,
        radiusMiles: 10,
      },
    });
  });

  it('ignores invalid numeric and boolean values from query string', () => {
    const parsed = fromQueryString(
      [
        'limit=abc',
        'priceMin=-10',
        'priceMax=not-a-number',
        'useMapBounds=yes',
        'boundsNeLat=foo',
        'boundsNeLng=-122.1',
        'boundsSwLat=47.4',
        'boundsSwLng=bar',
      ].join('&'),
    );

    expect(parsed).toEqual(DEFAULT_LISTINGS_SEARCH);
  });

  it('normalizes merged patches through shared schema rules', () => {
    const merged = mergeListingsSearchPatch(DEFAULT_LISTINGS_SEARCH, {
      useMapBounds: true,
      bounds: {
        northEast: { lat: 47.0, lng: -123.0 },
        southWest: { lat: 48.0, lng: -122.0 },
      },
      sortBy: 'newest',
    });

    expect(merged.useMapBounds).toBe(true);
    expect(merged.bounds).toBeNull();
    expect(merged.sortBy).toBe('newest');
  });

  it('encodes defaults to an empty query payload', () => {
    expect(encodeListingsSearch(DEFAULT_LISTINGS_SEARCH)).toEqual({});
    expect(toQueryString(DEFAULT_LISTINGS_SEARCH)).toBe('');
  });

  it('keeps route encoder aligned with search encoder', () => {
    const input = parseListingsSearch({
      query: 'city loft',
      limit: 20,
      sortBy: 'priceDesc',
    });

    expect(toRouteSearch(input)).toEqual(encodeListingsSearch(input));
  });

  it('serializes only defined values in query params', () => {
    const params = toQueryParams(
      parseListingsSearch({
        query: 'townhome',
        limit: 15,
        price: { min: 300000, max: null },
        sqFt: { min: null, max: 2500 },
        bedrooms: null,
        bathrooms: { min: 2, max: 3 },
        useMapBounds: true,
        bounds: {
          northEast: { lat: 40.9, lng: -73.7 },
          southWest: { lat: 40.4, lng: -74.2 },
        },
        sortBy: 'newest',
        proximity: null,
      }),
    );

    expect(params.get('query')).toBe('townhome');
    expect(params.get('limit')).toBe('15');
    expect(params.get('priceMin')).toBe('300000');
    expect(params.get('priceMax')).toBeNull();
    expect(params.get('sqFtMin')).toBeNull();
    expect(params.get('sqFtMax')).toBe('2500');
    expect(params.get('bathroomsMin')).toBe('2');
    expect(params.get('bathroomsMax')).toBe('3');
    expect(params.get('useMapBounds')).toBe('true');
    expect(params.get('sortBy')).toBeNull();
  });
});

describe('mls search utils end-to-end roundtrip tests', () => {
  const roundtrip = (searchInput: unknown) => {
    const canonical = parseListingsSearch(searchInput);
    const qs = toQueryString(canonical);
    const reparsed = fromQueryString(qs);

    return { canonical, qs, reparsed };
  };

  it('roundtrips a fully populated filter object across encode and parse boundaries', () => {
    const { canonical, reparsed } = roundtrip({
      query: 'waterfront condo',
      limit: 40,
      price: { min: 200000, max: 1200000 },
      sqFt: { min: 900, max: 3000 },
      bedrooms: { min: 1, max: 4 },
      bathrooms: { min: 1, max: 3 },
      useMapBounds: true,
      bounds: {
        northEast: { lat: 33.95, lng: -118.2 },
        southWest: { lat: 33.6, lng: -118.65 },
      },
      sortBy: 'priceDesc',
      proximity: { lat: 33.9, lng: -118.4, radiusMiles: 12 },
    });

    expect(reparsed).toEqual(canonical);
  });

  it('roundtrips minimal and partial filters', () => {
    const { canonical, reparsed } = roundtrip({
      query: 'midtown',
      price: { min: null, max: 800000 },
      bedrooms: { min: 2, max: null },
      useMapBounds: false,
      bounds: {
        northEast: { lat: 41.0, lng: -73.0 },
        southWest: { lat: 40.0, lng: -74.0 },
      },
    });

    expect(reparsed).toEqual(canonical);
    expect(reparsed.useMapBounds).toBe(false);
    expect(reparsed.bounds).toBeNull();
  });

  it('handles leading question mark and canonicalizes implicit defaults', () => {
    const parsed = fromQueryString('?query=beach&sortBy=newest&useMapBounds=0');
    const qs = toQueryString(parsed);

    expect(parsed.query).toBe('beach');
    expect(parsed.sortBy).toBe('newest');
    expect(parsed.useMapBounds).toBe(false);
    expect(qs).toBe('query=beach');
  });

  it('canonicalizes repeated parse->encode->parse cycles without drift', () => {
    const first = fromQueryString(
      toQueryString(
        parseListingsSearch({
          query: 'suburban home',
          limit: 25,
          bathrooms: { min: 2, max: 4 },
          sortBy: 'proximity',
          proximity: { lat: 32.7767, lng: -96.797, radiusMiles: 20 },
        }),
      ),
    );

    const second = fromQueryString(toQueryString(first));
    const third = fromQueryString(toQueryString(second));

    expect(second).toEqual(first);
    expect(third).toEqual(second);
  });
});
