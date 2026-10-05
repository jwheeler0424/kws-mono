import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { submitContactFn } from './contact.functions';

import { Button, buttonVariants } from '../global/button';
import { Link } from '../global/link';
import ContactForm from './contact.form';

vi.mock('./contact.functions', () => ({ submitContactFn: vi.fn<typeof submitContactFn>() }));

describe('Compass contact and action presentation', () => {
  it('retains all four fields with associated labels and a submit action', () => {
    const html = renderToStaticMarkup(<ContactForm />);
    for (const name of ['name', 'email', 'phone', 'message']) {
      expect(html).toContain(`id="${name}"`);
      expect(html).toContain(`for="${name}"`);
    }
    expect(html).toContain('type="email"');
    expect(html).toContain('type="tel"');
    expect(html).toContain('type="submit"');
    expect(html).toContain('Send message');
    expect(html).toContain('sm:grid-cols-2');
    expect(html).toContain('min-h-44');
  });

  it('preserves the property-specific message without submitting', () => {
    const html = renderToStaticMarkup(<ContactForm propertyAddress='123 Test Street' />);
    expect(html).toContain('123 Test Street');
    expect(html).toContain('interested in learning more about the property');
    expect(html).toContain('Could you please provide me with additional information?');
  });

  it.each(['solidPrimary', 'outlinePrimary', 'solidWhite', 'outlineWhite'] as const)(
    'uses consistent geometry and typography for %s actions',
    (variant) => {
      const classes = buttonVariants({ variant, size: 'md' });
      expect(classes).toContain('rounded-full');
      expect(classes).toContain('font-sans');
      expect(classes).toContain('text-base');
      expect(classes).toContain('font-medium');
      expect(classes).toContain('leading-[1.3]');
      expect(classes).toContain('pt-[calc(0.75rem+0.125em)]');
      expect(classes).toContain('pb-[calc(0.75rem-0.125em)]');
      expect(classes).not.toContain('drop-shadow');
      expect(classes).not.toContain('border-2');
    },
  );

  it('keeps disabled button semantics and ordinary links inline', () => {
    const button = renderToStaticMarkup(<Button disabled>Send message</Button>);
    const link = renderToStaticMarkup(<Link href='https://example.test'>Read more</Link>);
    expect(button).toContain('disabled');
    expect(link).toContain('href="https://example.test"');
    expect(link).toContain('min-h-0');
    expect(link).not.toContain('bg-black');
    expect(link).not.toContain('min-h-11');
    expect(link).not.toContain('0.125em');
  });

  it('keeps icon buttons geometrically centered and uses shared filter-button styling', () => {
    const icon = renderToStaticMarkup(<Button size='icon' aria-label='Next' />);
    const filter = renderToStaticMarkup(
      <Button variant='solidPrimary' size='md'>
        Advanced Filter
      </Button>,
    );
    expect(icon).not.toContain('0.125em');
    expect(filter).toContain('0.125em');
    expect(filter).toContain('text-base');
    expect(filter).toContain('bg-black');
    expect(filter).not.toContain('border-2');
    expect(filter).not.toContain('drop-shadow');
  });
});
