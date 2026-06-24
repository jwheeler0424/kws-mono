import type { VariantProps } from 'class-variance-authority';

import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-4xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground [a]:hover:bg-primary/80 [&>svg]:text-primary-foreground',
        secondary:
          'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80 [&>svg]:text-secondary-foreground',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20 [&>svg]:text-destructive',
        outline:
          'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground [&>svg]:text-foreground',
        outlineGray:
          'border-zinc-400/70 text-zinc-700 dark:border-zinc-500/70 dark:text-zinc-300 [a]:hover:bg-zinc-100/50 dark:[a]:hover:bg-zinc-800/40 [&>svg]:text-zinc-700 dark:[&>svg]:text-zinc-300',
        outlineLightBlue:
          'border-blue-500/70 text-blue-700 dark:border-blue-400/70 dark:text-blue-300 [a]:hover:bg-blue-100/40 dark:[a]:hover:bg-blue-900/30 [&>svg]:text-blue-600 dark:[&>svg]:text-blue-200',
        outlineBlue:
          'border-blue-500 text-blue-400 dark:border-blue-600 dark:text-blue-500 [a]:hover:bg-blue-100/40 dark:[a]:hover:bg-blue-900/30 [&>svg]:text-blue-500 dark:[&>svg]:text-blue-600',
        outlineGreen:
          'border-green-500/70 text-green-700 dark:border-green-400/70 dark:text-green-300 [a]:hover:bg-green-100/40 dark:[a]:hover:bg-green-900/30 [&>svg]:text-green-600 dark:[&>svg]:text-green-200',
        outlineRed:
          'border-red-500/70 text-red-700 dark:border-red-400/70 dark:text-red-400 [a]:hover:bg-red-100/40 dark:[a]:hover:bg-red-900/30 [&>svg]:text-red-600 dark:[&>svg]:text-red-200',
        outlinePurple:
          'border-purple-400/55 text-purple-600 dark:border-purple-300/50 dark:text-purple-300 [a]:hover:bg-purple-100/28 dark:[a]:hover:bg-purple-900/18 [&>svg]:text-purple-600 dark:[&>svg]:text-purple-300',
        outlineIndigo:
          'border-violet-500/45 text-violet-600 dark:border-violet-400/40 dark:text-violet-200 [a]:hover:bg-violet-100/24 dark:[a]:hover:bg-violet-900/14 [&>svg]:text-violet-600 dark:[&>svg]:text-violet-200',
        outlineDisabledGray:
          'border-border/80 dark:border-border/80 text-muted-foreground/70 dark:text-muted-foreground/70 [&>svg]:text-muted-foreground/70',
        ghost: 'hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50',
        link: 'text-primary underline-offset-4 hover:underline',
        subtleGreen: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
        subtleGray: 'bg-gray-100 text-gray-700 dark:bg-zinc-800/70 dark:text-zinc-200',
        subtleBlue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
        subtleEmerald:
          'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200',
        subtleRed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
        subtleOrange: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-200',
        subtleAmber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
        subtleYellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
        subtleTeal: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-200',
        subtleCyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-200',
        subtleIndigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-200',
        subtleViolet: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
        subtlePink: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-200',
        scopeGlobal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
        scopeOrganization: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
        scopeTeam: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
      },
      presentation: {
        default: '',
        tag: 'rounded-sm',
        plain: 'h-auto rounded-none border-0 bg-transparent p-0 font-normal',
        header: 'h-auto rounded-none border-0 bg-transparent p-0 pt-0.75 font-normal',
        pill: 'rounded-full px-2 py-0.5 text-xs font-medium',
        beacon: 'rounded-full h-2 w-2 p-0',
      },
      size: {
        xs: 'h-4.5 px-1.5 text-[10px] [&>svg]:size-2.5!',
        sm: 'h-5 px-2 text-[11px] [&>svg]:size-3!',
        md: 'h-6 px-2.5 text-xs [&>svg]:size-3!',
        lg: 'h-7 px-3 text-sm [&>svg]:size-3.5!',
        xl: 'h-8 px-3.5 text-sm [&>svg]:size-4!',
      },
    },
    compoundVariants: [
      {
        presentation: 'tag',
        size: 'sm',
        className: 'rounded-[0.25rem] leading-0 items-center pt-1 px-1.5',
      },
      {
        presentation: 'beacon',
        size: 'sm',
        className: 'rounded-full h-2 w-2 p-0',
      },
    ],
    defaultVariants: {
      variant: 'default',
      presentation: 'default',
      size: 'sm',
    },
  },
);

function Badge({
  className,
  variant = 'default',
  presentation = 'default',
  size = 'sm',
  render,
  ...props
}: useRender.ComponentProps<'div'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'div',
    props: mergeProps<'div'>(
      {
        className: cn(badgeVariants({ variant, presentation, size }), className),
      },
      props,
    ),
    render,
    state: {
      slot: 'badge',
      variant,
      presentation,
      size,
    },
  });
}

export { Badge, badgeVariants };
