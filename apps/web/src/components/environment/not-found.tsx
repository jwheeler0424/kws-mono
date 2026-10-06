import type { PropsWithChildren } from 'react';

import { Button } from '@/components/global/button';
import { Link } from '@/components/global/link';

export function NotFound({ children }: PropsWithChildren<{}>) {
  return (
    <div className='content max-w-[100rem] gap-6 py-16'>
      <h1 className='m-0'>Page not found</h1>
      <div className='text-neutral-600'>
        {children || <p>The page you are looking for does not exist.</p>}
      </div>
      <div className='flex flex-wrap items-center gap-3'>
        <Button variant='outlinePrimary' size='md' onClick={() => window.history.back()}>
          Go back
        </Button>
        <Link to='/' variant='solidPrimary' size='md'>
          Home
        </Link>
      </div>
    </div>
  );
}
