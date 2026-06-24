import { Toaster } from '@kws/design/ui/sonner';
import { TooltipProvider } from '@kws/design/ui/tooltip';

export default function ApplicationProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TooltipProvider>{children}</TooltipProvider>
      <Toaster id='global' position='top-center' />
      <Toaster id='feature' position='bottom-right' />
    </>
  );
}
