import { Suspense, type ReactNode } from 'react';
import { Spinner } from '@/components/ui/States';

export default function PageTransition({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-[60vh] place-items-center">
          <Spinner />
        </div>
      }
    >
      {children}
    </Suspense>
  );
}
