import {
  Overflow,
  OverflowGroup,
  OverflowIndicator,
  OverflowItem,
  type OverflowInfo,
} from '@/components/overflow';
import { getInitials } from '@/lib/utils';

import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { Badge } from './badge';

export type AvatarGroupMember = {
  id: string;
  name: string;
  image?: string | null;
};

export function AvatarGroup({
  members,
  className,
}: {
  members: AvatarGroupMember[];
  className?: string;
}) {
  return (
    <Overflow orientation='horizontal' className={className ?? 'w-full min-w-0 overflow-hidden'}>
      <OverflowGroup fill={true} className='flex max-w-full min-w-0 items-center -space-x-2'>
        {members.map((member) => (
          <OverflowItem key={member.id}>
            <Avatar
              size='default'
              className='rounded-full border-2 border-background shadow-[0_0_0_1px_hsl(var(--border))]'
              title={member.name}>
              <AvatarImage src={member.image ?? undefined} alt={member.name} />
              <AvatarFallback className='rounded-full text-[10px]'>
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>
          </OverflowItem>
        ))}
        <OverflowIndicator>
          {({ hiddenCount }: OverflowInfo) =>
            hiddenCount > 0 ? (
              <Badge variant='outlineGray' presentation='tag' size='md' className='ml-2'>
                +{hiddenCount}
              </Badge>
            ) : null
          }
        </OverflowIndicator>
      </OverflowGroup>
    </Overflow>
  );
}
