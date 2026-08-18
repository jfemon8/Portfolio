import { Suspense, type ReactNode } from 'react';
import { PageSkeleton } from '@/components/ui/Skeletons';

// Route-shaped placeholder so a chunk swap keeps the page's silhouette instead of blanking it.
export default function PageTransition({ children }: { children: ReactNode }) {
  return <Suspense fallback={<PageSkeleton />}>{children}</Suspense>;
}
