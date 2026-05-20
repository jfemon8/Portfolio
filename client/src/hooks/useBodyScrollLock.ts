import { useEffect } from 'react';

/**
 * Locks body scroll when `locked` is true. Preserves the current scroll
 * position so the page does not jump back to top when the lock is released
 * (iOS/Android). Use for modals, drawers, mobile nav menus, and any other
 * full-screen overlay.
 *
 * Ported from RDSWA; pairs with the new ConfirmModal + future drawer
 * primitives so every overlay shares one body-lock implementation.
 */
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
      // Only restore the previous scroll position if we're still on the same
      // page. If the lock is released because the user navigated away (e.g.
      // sidebar auto-closes on route change), restoring scrollY would apply
      // the OLD page's offset to the NEW page.
      if (window.location.pathname === lockedOnPath) {
        window.scrollTo(0, scrollY);
      }
    };
  }, [locked]);
}
