import {
  PROPERTY_CARD_HEIGHT,
  PROPERTY_CARD_MAX_WIDTH,
} from '@/components/global/property-card.constants';
import { cn } from '@/lib/utils';

function Block({ className }: { className: string }) {
  return <div className={cn('animate-pulse rounded bg-gray-200/70', className)} />;
}

export function PropertyCardSkeleton({ className }: { className?: string }) {
  return (
    <article
      className={cn(
        'flex h-(--property-card-height) w-full max-w-(--property-card-width) flex-col rounded-none bg-white p-2 shadow-md',
        className,
      )}
      style={
        {
          '--property-card-height': `${PROPERTY_CARD_HEIGHT}px`,
          '--property-card-width': `${PROPERTY_CARD_MAX_WIDTH}px`,
        } as React.CSSProperties
      }>
      <section className='relative aspect-video w-full overflow-hidden rounded-t'>
        <Block className='h-full w-full rounded-t' />
        <Block className='absolute top-0 right-0 h-5 w-20 rounded-none rounded-bl' />
        <div className='absolute bottom-0 left-0 w-full bg-black/25 p-1'>
          <Block className='h-3 w-3/4 bg-gray-200/80' />
        </div>
      </section>

      <main className='w-full rounded-b border border-t-0 border-gray-100/50 p-2'>
        <header className='space-y-2'>
          <Block className='h-3 w-3/5' />
          <Block className='h-6 w-1/2' />
          <div className='flex h-10 items-start gap-1.5'>
            <Block className='h-5 w-5 rounded-full' />
            <div className='flex w-full flex-col gap-1'>
              <Block className='h-4 w-5/6' />
              <Block className='h-4 w-2/3' />
            </div>
          </div>
          <div className='flex items-center gap-1.5'>
            <Block className='h-5 w-5 rounded-sm' />
            <Block className='h-3 w-1/2' />
          </div>
        </header>

        <div className='my-3 h-px w-full bg-gray-100/60' />

        <div className='grid grid-cols-3 gap-2 @sm:gap-4'>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-1'>
              <Block className='h-5 w-5 rounded-full' />
              <Block className='h-3 w-5' />
            </div>
            <Block className='h-3 w-8' />
          </div>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-1'>
              <Block className='h-5 w-5 rounded-full' />
              <Block className='h-3 w-5' />
            </div>
            <Block className='h-3 w-8' />
          </div>
          <div className='flex flex-col gap-1'>
            <div className='flex items-center gap-1'>
              <Block className='h-5 w-5 rounded-full' />
              <Block className='h-3 w-5' />
            </div>
            <Block className='h-3 w-8' />
          </div>
        </div>

        <div className='my-3 h-px w-full bg-gray-100/60' />

        <div className='flex items-center justify-between px-0.5'>
          <Block className='h-3 w-1/4' />
          <div className='flex items-center gap-1'>
            <Block className='h-4 w-16' />
            <Block className='h-3 w-8' />
          </div>
        </div>
      </main>

      <footer className='pt-2'>
        <Block className='h-8 w-full rounded' />
      </footer>
    </article>
  );
}

export default PropertyCardSkeleton;
