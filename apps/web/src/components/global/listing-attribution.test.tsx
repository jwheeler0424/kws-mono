/* @vitest-environment jsdom */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ListingAttribution } from './listing-attribution';

describe('NWMLS listing attribution', () => {
  it('allows long listing firm names to wrap even within a nowrap parent', () => {
    const firm = 'A Very Long Brokerage Name With AnUnbrokenBrokerageNameThatMustWrap';
    const container = document.createElement('div');
    container.className = 'whitespace-nowrap';
    container.innerHTML = renderToStaticMarkup(
      <ListingAttribution
        firm={firm}
        broker={null}
        phone={null}
        email={null}
        buyerFirm={null}
        sold={false}
      />,
    );

    const brokerLine = container.querySelector('span');
    expect(brokerLine?.textContent).toBe(`Listing Broker: ${firm}`);
    expect(brokerLine?.classList.contains('whitespace-normal')).toBe(true);
    expect(brokerLine?.classList.contains('wrap-anywhere')).toBe(true);
    expect(brokerLine?.classList.contains('max-w-full')).toBe(true);
    expect(brokerLine?.classList.contains('leading-tight')).toBe(true);
  });

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
    const container = document.createElement('div');
    container.innerHTML = markup;
    const rows = Array.from(container.querySelectorAll('span'), (row) => row.textContent);
    expect(rows).toEqual(['Listing Broker: Firm', 'Broker', '555-0100', 'broker@example.com']);
    expect(container.querySelector('p')?.textContent).not.toContain(';');
    expect(container.textContent).toContain('Provided by NWMLS');
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
    const container = document.createElement('div');
    container.innerHTML = markup;
    expect(Array.from(container.querySelectorAll('span'), (row) => row.textContent)).toEqual([
      'Listing Broker: Firm',
      'Buyer Brokerage: Buyer Firm',
      'Broker',
    ]);
    expect(container.querySelector('span')?.nextElementSibling?.textContent).toContain(
      'Buyer Brokerage: Buyer Firm',
    );
    expect(markup).not.toContain('null');
  });
});
