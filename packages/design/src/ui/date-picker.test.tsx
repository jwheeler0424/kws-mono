/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DatePicker } from './date-picker';

type MockButtonProps = React.ComponentProps<'button'>;
type MockPopoverProps = {
  children: React.ReactNode;
};
type MockPopoverTriggerProps = {
  render: React.ReactNode;
};
type MockPopoverContentProps = {
  children: React.ReactNode;
};
type MockCalendarProps = {
  mode?: 'single' | 'range';
  onSelect?: (value: unknown) => void;
};

afterEach(() => {
  cleanup();
});

vi.mock('./button', () => ({
  Button: ({ children, ...props }: MockButtonProps) =>
    React.createElement('button', { type: 'button', ...props }, children),
}));

vi.mock('./popover', () => ({
  Popover: ({ children }: MockPopoverProps) => React.createElement('div', null, children),
  PopoverTrigger: ({ render }: MockPopoverTriggerProps) => React.createElement('div', null, render),
  PopoverContent: ({ children }: MockPopoverContentProps) =>
    React.createElement('div', null, children),
}));

vi.mock('./calendar', () => ({
  Calendar: ({ mode, onSelect }: MockCalendarProps) =>
    React.createElement(
      'div',
      null,
      React.createElement(
        'button',
        {
          type: 'button',
          'aria-label': 'pick-date',
          onClick: () => onSelect?.(new Date(2027, 0, 15)),
        },
        `pick-${mode ?? 'single'}`,
      ),
      React.createElement(
        'button',
        {
          type: 'button',
          'aria-label': 'pick-range',
          onClick: () =>
            onSelect?.({
              from: new Date(2027, 0, 10),
              to: new Date(2027, 0, 12),
            }),
        },
        'pick-range',
      ),
    ),
}));

vi.mock('./card', () => ({
  Card: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  CardHeader: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  CardTitle: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  CardDescription: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  CardContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
  CardFooter: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', null, children),
}));

function getTriggerButton() {
  return screen.getAllByRole('button')[0]!;
}

describe('DatePicker', () => {
  it('stages changes until apply in uncontrolled mode', () => {
    render(React.createElement(DatePicker, { placeholder: 'Pick a date' }));

    expect(getTriggerButton().textContent).toContain('Pick a date');

    fireEvent.click(screen.getByRole('button', { name: 'pick-date' }));

    expect(getTriggerButton().textContent).toContain('Pick a date');

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(getTriggerButton().textContent).toContain('2027');
  });

  it('reverts staged changes on cancel', () => {
    render(
      React.createElement(DatePicker, {
        defaultValue: new Date(2026, 0, 2),
      }),
    );

    expect(getTriggerButton().textContent).toContain('2026');

    fireEvent.click(screen.getByRole('button', { name: 'pick-date' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(getTriggerButton().textContent).toContain('2026');
    expect(getTriggerButton().textContent).not.toContain('2027');
  });

  it('calls onValueChange but does not mutate trigger text in controlled mode', () => {
    const onValueChange = vi.fn<(value: unknown) => void>();

    render(
      React.createElement(DatePicker, {
        value: new Date(2026, 0, 2),
        onValueChange,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'pick-date' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onValueChange).toHaveBeenCalledWith(new Date(2027, 0, 15));
    expect(getTriggerButton().textContent).toContain('2026');
  });

  it('supports range mode with staged apply', () => {
    const onValueChange = vi.fn<(value: unknown) => void>();

    render(
      React.createElement(DatePicker, {
        mode: 'range',
        onValueChange,
        placeholder: 'Pick a range',
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'pick-range' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onValueChange).toHaveBeenCalledWith({
      from: new Date(2027, 0, 10),
      to: new Date(2027, 0, 12),
    });
    expect(getTriggerButton().textContent).toContain('2027');
  });

  it('emits input-like onChange with serialized committed value', () => {
    const onChange = vi.fn<(event: React.ChangeEvent<HTMLInputElement>) => void>();

    render(
      React.createElement(DatePicker, {
        onChange,
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'pick-date' }));
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));

    expect(onChange).toHaveBeenCalled();

    const event = onChange.mock.calls[0]?.[0] as React.ChangeEvent<HTMLInputElement>;
    expect(event.target.value).toBe('2027-01-15');
  });
});
