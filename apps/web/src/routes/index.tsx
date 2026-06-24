// src/routes/index.tsx
import { Button } from '@kws/design/ui/button';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <div className='p-2'>
      <h3>Welcome Home!!!</h3>
      <Button variant='default'>I am a button</Button>
    </div>
  );
}
