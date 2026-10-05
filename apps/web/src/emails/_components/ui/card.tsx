import {
  Container as EmailContainer,
  Section as EmailSection,
  Text as EmailText,
} from '@react-email/components';

import { cn } from '@/lib/utils';

type CardSize = 'default' | 'sm';

function Card({
  className,
  size = 'default',
  ...props
}: React.ComponentProps<typeof EmailContainer> & { size?: CardSize }) {
  return (
    <EmailContainer
      className={cn(
        'group/card overflow-hidden rounded-lg bg-card py-6 text-sm text-card-foreground',
        size === 'sm' && 'py-4',
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<typeof EmailSection>) {
  return <EmailSection className={cn('rounded-t-lg px-6', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof EmailText>) {
  return (
    <EmailText className={cn('m-0 text-base leading-normal font-medium', className)} {...props} />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<typeof EmailText>) {
  return <EmailText className={cn('m-0 text-sm text-muted-foreground', className)} {...props} />;
}

function CardContent({ className, ...props }: React.ComponentProps<typeof EmailSection>) {
  return <EmailSection className={cn('px-6', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<typeof EmailSection>) {
  return <EmailSection className={cn('rounded-b-lg px-6', className)} {...props} />;
}

export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle };
