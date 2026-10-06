/* @vitest-environment jsdom */

import { toast } from '@kws/design/ui/toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button, buttonVariants } from '../global/button';
import { Link } from '../global/link';
import ContactForm from './contact.form';
import { submitContactFn } from './contact.functions';

vi.mock('./contact.functions', () => ({ submitContactFn: vi.fn<typeof submitContactFn>() }));
vi.mock('@kws/design/ui/toast', () => ({
  toast: { success: vi.fn<(message: string) => void>(), error: vi.fn<(message: string) => void>() },
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

function ContactTestProvider({ children }: React.PropsWithChildren) {
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: { mutations: { retry: false } },
      }),
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function fillContactFields() {
  fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Test Buyer' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'buyer@example.test' } });
  fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '2065550100' } });
  fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Please contact me.' } });
}

describe('Contact submission', () => {
  it('rejects invalid input without calling the server', async () => {
    const { container } = render(<ContactForm />, { wrapper: ContactTestProvider });
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => expect(screen.getByText('Please enter your full name')).toBeDefined());
    expect(submitContactFn).not.toHaveBeenCalled();
  });

  it('waits for submission, preserves the payload, and resets after success', async () => {
    const pending: { resolve?: (result: Awaited<ReturnType<typeof submitContactFn>>) => void } = {};
    vi.mocked(submitContactFn).mockReturnValue(
      new Promise((resolve) => {
        pending.resolve = resolve;
      }),
    );
    render(<ContactForm propertyAddress='123 Test Street' />, { wrapper: ContactTestProvider });
    fillContactFields();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(submitContactFn).toHaveBeenCalledWith({
        data: {
          name: 'Test Buyer',
          email: 'buyer@example.test',
          phone: '2065550100',
          message: 'Please contact me.',
          propertyAddress: '123 Test Street',
        },
      }),
    );
    expect(
      (screen.getByRole('button', { name: /Submitting request/ }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect((screen.getByLabelText('Name') as HTMLInputElement).disabled).toBe(true);

    pending.resolve?.({ success: true, message: 'Contact request submitted successfully' });
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith('Your message has been sent successfully'),
    );
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('');
    expect(
      (screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it('reports server failure and keeps entered values available for retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(submitContactFn).mockRejectedValue(new Error('Test server unavailable'));
    render(<ContactForm />, { wrapper: ContactTestProvider });
    fillContactFields();
    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        'There was an error submitting your request. Please try again later.',
      ),
    );
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Test Buyer');
    expect(
      (screen.getByRole('button', { name: 'Send message' }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});

describe('Compass contact and action presentation', () => {
  it('retains all four fields with associated labels and a submit action', () => {
    const html = renderToStaticMarkup(
      <ContactTestProvider>
        <ContactForm />
      </ContactTestProvider>,
    );
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
    const html = renderToStaticMarkup(
      <ContactTestProvider>
        <ContactForm propertyAddress='123 Test Street' />
      </ContactTestProvider>,
    );
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
