import { Hr } from '@react-email/components';

import { cn } from '@/lib/utils';

type SeparatorProps = React.ComponentProps<typeof Hr>;

function Separator({ className, ...props }: SeparatorProps) {
  return <Hr className={cn('my-6 border-0 border-t border-border', className)} {...props} />;
}

export { Separator };
