import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ListingAttribution } from './listing-attribution';

describe('NWMLS listing attribution', () => {
  it('includes the firm, broker and supplied contacts in the required order', () => {
    const markup = renderToStaticMarkup(
      <ListingAttribution
        firm='Firm'
        broker='Broker'
        phone='555-0100'
        email='broker@example.com'
        buyerFirm={null}
        sold={false}
      />,
    );
    expect(markup).toContain('Listing Broker: Firm; Broker; 555-0100; broker@example.com');
    expect(markup).toContain('Provided by NWMLS');
  });

  it('omits unavailable contacts and includes cooperating brokerage for sold listings', () => {
    const markup = renderToStaticMarkup(
      <ListingAttribution
        firm='Firm'
        broker='Broker'
        phone={null}
        email=' '
        buyerFirm='Buyer Firm'
        sold
      />,
    );
    expect(markup).toContain('Listing Broker: Firm; Broker; Buyer Brokerage: Buyer Firm');
    expect(markup).not.toContain('null');
  });
});
