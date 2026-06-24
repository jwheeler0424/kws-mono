import type { VariantProps } from 'class-variance-authority';

import { createLink, type LinkComponent } from '@tanstack/react-router';
import * as React from 'react';

import { cn } from '@/lib/utils';

import { buttonVariants } from './button';

export const linkVariants = buttonVariants;

// ── Internal router link ────────────────────────────────────────────────────
// `href` is omitted from the base so createLink can inject it after resolving
// the route. All other anchor HTML attrs pass through.
type RouterLinkBaseProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  VariantProps<typeof linkVariants>;

const RouterLinkBase = React.forwardRef<HTMLAnchorElement, RouterLinkBaseProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <a ref={ref} className={cn(linkVariants({ variant, size, className }))} {...props} />
  ),
);
RouterLinkBase.displayName = 'RouterLinkBase';

const CreatedRouterLink = createLink(RouterLinkBase);

// ── External / bare anchor link ─────────────────────────────────────────────
// When `href` is provided and `to` is NOT, we render a plain styled <a>.
// `to?: never` discriminates this branch from the router-link branch.
type ExternalLinkProps = Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> &
  VariantProps<typeof linkVariants> & {
    href: string;
    to?: never;
  };

type AppLinkComponent = LinkComponent<typeof RouterLinkBase> &
  ((props: ExternalLinkProps) => React.ReactElement);

// Keep TanStack's generic LinkComponent signature intact for router links,
// and add an external href-only branch for non-router anchors.
export const Link = ((props: unknown) => {
  if (
    typeof props === 'object' &&
    props !== null &&
    'href' in props &&
    !('to' in props && (props as { to?: unknown }).to != null)
  ) {
    const {
      href,
      variant = 'default',
      size = 'default',
      className,
      to: _to,
      ...rest
    } = props as ExternalLinkProps & { to?: never };
    return <a href={href} className={cn(linkVariants({ variant, size, className }))} {...rest} />;
  }

  return <CreatedRouterLink {...(props as Parameters<typeof CreatedRouterLink>[0])} />;
}) as AppLinkComponent;
