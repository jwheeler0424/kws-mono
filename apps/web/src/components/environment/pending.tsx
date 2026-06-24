import type { PropsWithChildren } from 'react';

import { Spinner } from '@kws/design/ui/spinner';

export function Pending({ children }: PropsWithChildren<{}>) {
  return (
    <div className={`p-2 text-2xl`}>
      <Spinner />
      {children ? (
        <div className='mt-2 text-base text-gray-600 dark:text-gray-400'>{children}</div>
      ) : null}
    </div>
  );
}
