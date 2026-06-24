import React, { type Dispatch, type SetStateAction } from 'react';

import { cn } from '@/lib/utils';

export interface HamburgerProps extends React.ComponentProps<'button'> {
  menuOpen: boolean;
  setMenuOpen: Dispatch<SetStateAction<boolean>>;
  isTransparent?: boolean;
}

export const Hamburger = ({
  className,
  menuOpen,
  setMenuOpen,
  isTransparent = false,
  ref,
  ...props
}: HamburgerProps) => {
  const handleClick = () => {
    setMenuOpen(!menuOpen);
  };

  return (
    <button
      className={cn(
        'parent group relative h-8 w-8 rounded-md ring-offset-white transition duration-200 ease-linear hover:ring-offset-polaris-primary! focus-visible:ring-2 focus-visible:ring-gray-800 focus-visible:ring-offset-2 focus-visible:outline-none',
        isTransparent && 'ring-offset-gray-600 hover:ring-offset-polaris-primary-600',
        menuOpen
          ? 'ring-offset-polaris-primary hover:ring-offset-polaris-primary-300! focus-visible:ring-polaris-primary-900'
          : 'ring-offset-white',
        className,
      )}
      id='menu-toggle'
      type='button'
      onClick={handleClick}
      ref={ref}
      {...props}>
      <div
        className={cn(
          'child absolute top-1.5 left-1 block h-0.75 w-6 rounded-sm bg-gray-800 transition-colors duration-200 ease-linear group-hover:bg-polaris-primary',
          isTransparent ? 'bg-white' : 'bg-gray-800',
          menuOpen
            ? 'top-3.5 -rotate-45 bg-white [transition:top_150ms_linear,background-color_200ms_linear,transform_150ms_linear_150ms] group-hover:bg-white'
            : isTransparent
              ? 'top-1.5 bg-white [transition:top_150ms_linear_150ms,background-color_200ms_linear,transform_150ms_linear]'
              : 'top-1.5 bg-gray-800 [transition:top_150ms_linear_150ms,background-color_200ms_linear,transform_150ms_linear]',
        )}></div>
      <div
        className={cn(
          'child absolute top-3.5 left-1 block h-0.75 w-6 rounded-sm bg-gray-800 transition-colors duration-200 ease-linear group-hover:bg-polaris-primary',
          isTransparent ? 'bg-white' : 'bg-gray-800',
          menuOpen
            ? 'opacity-0 [transition:opacity_150ms_linear,background-color_200ms_linear]'
            : 'opacity-100 [transition:opacity_150ms_linear_150ms,background-color_200ms_linear]',
        )}></div>
      <div
        className={cn(
          'child absolute top-5.5 left-1 block h-0.75 w-6 rounded-sm bg-gray-800 transition-colors duration-200 ease-linear group-hover:bg-polaris-primary',
          isTransparent ? 'bg-white' : 'bg-gray-800',
          menuOpen
            ? 'top-3.5 rotate-45 bg-white [transition:top_150ms_linear,background-color_200ms_linear,transform_150ms_linear_150ms] group-hover:bg-white'
            : isTransparent
              ? 'top-5.5 bg-white [transition:top_150ms_linear_150ms,background-color_200ms_linear,transform_150ms_linear]'
              : 'top-5.5 bg-gray-800 [transition:top_150ms_linear_150ms,background-color_200ms_linear,transform_150ms_linear]',
        )}></div>
    </button>
  );
};
