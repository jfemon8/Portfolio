import { useEffect } from 'react';

// Locks body scroll while preserving scroll position so the page doesn't jump on unlock (iOS/Android); use for modals, drawers, overlays.
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked) return;

    const scrollY = window.scrollY;
    const lockedOnPath = window.location.pathname;
    const { body } = document;
    const original = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';

    return () => {
      body.style.overflow = original.overflow;
      body.style.position = original.position;
      body.style.top = original.top;
      body.style.left = original.left;
      body.style.right = original.right;
      body.style.width = original.width;
      // Only restore scroll position if still on the same page — otherwise a stale scrollY would apply the OLD page's offset to the NEW page.
      if (window.location.pathname === lockedOnPath) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [locked]);
}
