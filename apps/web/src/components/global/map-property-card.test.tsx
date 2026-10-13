/* @vitest-environment jsdom */

import type { TPropertyCard } from '@kws/schema';
import type { PropsWithChildren } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { MapPropertyCard } from './map-property-card';

vi.mock('@tanstack/react-router', () => ({
  Link: ({ children }: PropsWithChildren) => <a>{children}</a>,
}));

function makeListing(overrides: Partial<TPropertyCard> = {}): TPropertyCard {
  return {
    listingKey: 'NWMLS-123',
    listingId: 'NWMLS12345',
    livingArea: '1400',
    livingAreaUnits: 'SqFt',
    bathroomsFull: 2,
    bathroomsHalf: 1,
    bathroomsThreeQuarter: 0,
    bedroomsTotal: 3,
    buyerOfficeName: null,
    internetAddressDisplayYN: true,
    listAgentEmail: 'agent@example.com',
    listAgentPreferredPhone: '555-0100',
    listPrice: '850000',
    memberFullName: 'Morgan Agent',
    officeName: 'Northwest Homes',
    primaryPhotoFullUrl: '/primary-photo.jpg',
    primaryPhotoPreviewUrl: '/preview-photo.jpg',
    primaryPhotoThumbnailUrl: '/thumbnail-photo.jpg',
    primaryPhotoUrl: '/original-photo.jpg',
    propertySubType: 'Single Family Residence',
    propertyType: 'Residential',
    standardStatus: 'Active',
    streetNumber: '123',
    streetName: 'Main',
    streetSuffix: 'St',
    city: 'Seattle',
    stateOrProvince: 'WA',
    postalCode: '98101',
    NWM_ShowMapLink: 'true',
    NWM_IDXMustRemovePhotosYN: false,
    NWM_IDXMustRemovePrimaryPhotoYN: false,
    ...overrides,
  } as TPropertyCard;
}

describe('MapPropertyCard', () => {
  it('shows the primary photo, useful listing details, MLS ID, and NWMLS attribution', () => {
    const markup = renderToStaticMarkup(<MapPropertyCard listing={makeListing()} />);

    expect(markup).toContain('src="/preview-photo.jpg"');
    expect(markup).toContain('123 Main St');
    expect(markup).toContain('Seattle, WA 98101');
    expect(markup).toContain('850,000');
    expect(markup).toContain('3 bd');
    expect(markup).toContain('2.5 ba');
    expect(markup).toContain('1,400 SqFt');
    expect(markup).toContain('MLS® ID: 12345');
    expect(markup).toContain('Listing Broker: Northwest Homes');
    expect(markup).toContain('Provided by NWMLS');
    expect(markup).toContain('View listing');
    expect(markup).not.toContain('View Property');
    expect(markup).not.toContain('Levels');

    const container = document.createElement('div');
    container.innerHTML = markup;
    const mlsId = Array.from(container.querySelectorAll('span')).find((span) =>
      span.textContent?.includes('MLS® ID: 12345'),
    );
    const viewListing = Array.from(container.querySelectorAll('span')).find((span) =>
      span.textContent?.includes('View listing'),
    );

    expect(mlsId?.parentElement).toBe(viewListing?.parentElement);
    expect(viewListing?.classList.contains('ml-auto')).toBe(true);
  });

  it('honors address and photo display restrictions', () => {
    const markup = renderToStaticMarkup(
      <MapPropertyCard
        listing={makeListing({
          internetAddressDisplayYN: false,
          NWM_ShowMapLink: 'false',
          NWM_IDXMustRemovePhotosYN: 'true',
        })}
      />,
    );

    expect(markup).not.toContain('123 Main St');
    expect(markup).not.toContain('Seattle, WA 98101');
    expect(markup).not.toContain('/preview-photo.jpg');
    expect(markup).toContain('Single Family Residence');
    expect(markup).toContain('MLS® ID: 12345');
  });
});
