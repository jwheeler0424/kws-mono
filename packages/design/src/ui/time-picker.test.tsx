import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import * as React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { TimeValue } from './time-picker';

import { TimePicker } from './time-picker';

type MockButtonProps = React.ComponentProps<'button'>;
type MockInputProps = React.ComponentProps<'input'>;
type MockPickerSurfaceProps = {
  trigger: React.ReactNode;
  children: React.ReactNode;
};
type SelectContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};
type MockSelectProps = {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
};
type MockSelectChildProps = {
  children: React.ReactNode;
};
type MockSelectItemProps = {
  value: string;
  children: React.ReactNode;
};

afterEach(() => {
  cleanup();
});

vi.mock('./button', () => ({
  Button: ({ children, ...props }: MockButtonProps) =>
    React.createElement('button', { type: 'button', ...props }, children),
}));

vi.mock('./input', () => ({
  Input: (props: MockInputProps) => React.createElement('input', props),
}));

vi.mock('./picker-surface', () => ({
  PickerSurface: ({ trigger, children }: MockPickerSurfaceProps) =>
    React.createElement(
      'div',
      null,
      React.createElement('div', null, trigger),
      React.createElement('div', null, children),
    ),
}));

vi.mock('./select', () => {
  const SelectContext = React.createContext<SelectContextValue | null>(null);

  const Select = ({ value, onValueChange, children }: MockSelectProps) =>
    React.createElement(
      SelectContext.Provider,
      { value: { value: value ?? '', onValueChange: onValueChange ?? (() => {}) } },
      React.createElement('div', null, children),
    );

  const SelectTrigger = ({ children }: MockSelectChildProps) => React.createElement('div', null, children);
  const SelectValue = () => null;
  const SelectContent = ({ children }: MockSelectChildProps) => React.createElement('div', null, children);
  const SelectItem = ({ value, children }: MockSelectItemProps) => {
    const context = React.useContext(SelectContext);
    return React.createElement(
      'button',
      {
        type: 'button',
        'aria-label': `option-${value}`,
        onClick: () => {
          context?.onValueChange(value);
        },
      },
      children,
    );
  };

  return {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  };
});

vi.mock('./calendar', () => ({
  Calendar: () => React.createElement('div'),
}));

vi.mock('./separator', () => ({
  Separator: () => React.createElement('hr'),
}));

describe('TimePicker segmented mode', () => {
  it('renders uncontrolled defaultValue formatted for 24h mode', () => {
    render(React.createElement(TimePicker, { defaultValue: { hour: 9, minute: 5 } }));

    expect(screen.getAllByRole('button')[0]?.textContent).toContain('09:05');
  });

  it('calls onValueChange without mutating displayed controlled value', () => {
    const onValueChange = vi.fn<(value: TimeValue | undefined) => void>();

    render(
      React.createElement(TimePicker, {
        value: { hour: 9, minute: 10 },
        onValueChange,
        minuteStep: 5,
      }),
    );

    const option15Buttons = screen.getAllByRole('button', { name: 'option-15' });
    fireEvent.click(option15Buttons[option15Buttons.length - 1]!);

    expect(onValueChange).toHaveBeenCalled();
    expect(screen.getAllByRole('button')[0]?.textContent).toContain('09:10');
  });

  it('normalizes stepped minute value when selecting segmented options', () => {
    const onValueChange = vi.fn<(value: TimeValue | undefined) => void>();

    render(
      React.createElement(TimePicker, {
        defaultValue: { hour: 8, minute: 0 },
        onValueChange,
        minuteStep: 15,
      }),
    );

    const option45Buttons = screen.getAllByRole('button', { name: 'option-45' });
    fireEvent.click(option45Buttons[option45Buttons.length - 1]!);

    expect(onValueChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        hour: 8,
        minute: 45,
      }),
    );
  });
});
