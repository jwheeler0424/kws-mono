import type { ErrorComponentProps } from '@tanstack/react-router';

import { ErrorComponent, useRouter, useRouterState } from '@tanstack/react-router';

import { Button } from '@/components/global/button';
import { Link } from '@/components/global/link';

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter();
  const isRoot = useRouterState({
    select: (state) => state.location.pathname === '/',
  });

  console.error(error);

  return (
    <div className='flex min-w-0 flex-1 flex-col items-center justify-center gap-6 p-4'>
      <ErrorComponent error={error} />
      <div className='flex flex-wrap items-center gap-3'>
        <Button
          variant='solidPrimary'
          size='md'
          onClick={() => {
            void router.invalidate();
          }}>
          Try again
        </Button>
        {isRoot ? (
          <Link to='/' variant='outlinePrimary' size='md'>
            Home
          </Link>
        ) : (
          <Button variant='outlinePrimary' size='md' onClick={() => window.history.back()}>
            Go back
          </Button>
        )}
      </div>
    </div>
  );
}
