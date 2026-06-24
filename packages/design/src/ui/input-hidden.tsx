import * as React from 'react';

type HiddenValue = string | number | boolean | Array<string | number | boolean> | undefined;

type InputHiddenProps = Omit<React.ComponentProps<'input'>, 'value'> & {
  control?: HTMLElement | null;
  value?: HiddenValue;
};

function normalizeHiddenValue(value: HiddenValue): string {
  if (value === undefined) return '';
  if (Array.isArray(value)) return value.map((item) => String(item)).join(',');
  return String(value);
}

export function InputHidden({ type = 'hidden', value, style, control: _control, ...props }: InputHiddenProps) {
  return (
    <input
      type={type}
      value={normalizeHiddenValue(value)}
      style={{
        position: 'absolute',
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: 'hidden',
        clip: 'rect(0, 0, 0, 0)',
        whiteSpace: 'nowrap',
        border: 0,
        ...style,
      }}
      {...props}
    />
  );
}
