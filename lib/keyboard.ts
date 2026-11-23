'use client';

import { Keyboard } from '@capacitor/keyboard';
import { isNative } from './native-permissions';

/**
 * Universal keyboard detection for both Capacitor Native Android/iOS and Web/PWA.
 * Automatically notifies when the virtual keyboard is open or when any text input is focused.
 */
export function listenToKeyboardState(onChange: (visible: boolean) => void): () => void {
  if (typeof window === 'undefined') return () => {};

  const cleanups: Array<() => void> = [];

  // 1. Native Capacitor Keyboard Events (Android APK / iOS)
  if (isNative()) {
    try {
      const willShow = Keyboard.addListener('keyboardWillShow', () => onChange(true));
      const didShow = Keyboard.addListener('keyboardDidShow', () => onChange(true));
      const willHide = Keyboard.addListener('keyboardWillHide', () => onChange(false));
      const didHide = Keyboard.addListener('keyboardDidHide', () => onChange(false));

      cleanups.push(() => {
        willShow.then((h) => h.remove()).catch(() => {});
        didShow.then((h) => h.remove()).catch(() => {});
        willHide.then((h) => h.remove()).catch(() => {});
        didHide.then((h) => h.remove()).catch(() => {});
      });
    } catch (err) {
      console.warn('[Keyboard] Native listener registration:', err);
    }
  }

  // 2. DOM Focus Event Listeners (Universal Web / Mobile Browsers)
  const isInputElement = (el: HTMLElement | null): boolean => {
    if (!el) return false;
    const tag = el.tagName.toUpperCase();
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      el.isContentEditable ||
      el.getAttribute('contenteditable') === 'true'
    );
  };

  const handleFocusIn = (e: FocusEvent) => {
    const target = e.target as HTMLElement | null;
    if (isInputElement(target)) {
      onChange(true);
    }
  };

  const handleFocusOut = () => {
    // Brief delay to check if focus transitioned directly to another input
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      if (!isInputElement(active)) {
        onChange(false);
      }
    }, 120);
  };

  window.addEventListener('focusin', handleFocusIn);
  window.addEventListener('focusout', handleFocusOut);
  cleanups.push(() => {
    window.removeEventListener('focusin', handleFocusIn);
    window.removeEventListener('focusout', handleFocusOut);
  });

  // 3. Visual Viewport Resize (Detects Soft Keyboard shrinkage in Android Chrome / Safari)
  if (window.visualViewport) {
    const vv = window.visualViewport;
    const baseHeight = window.innerHeight;

    const handleViewportResize = () => {
      const heightLoss = baseHeight - vv.height;
      if (heightLoss > 140) {
        onChange(true);
      } else {
        const active = document.activeElement as HTMLElement | null;
        if (!isInputElement(active)) {
          onChange(false);
        }
      }
    };

    vv.addEventListener('resize', handleViewportResize);
    cleanups.push(() => {
      vv.removeEventListener('resize', handleViewportResize);
    });
  }

  // 4. Custom App-Wide Keyboard Event Dispatcher
  const handleCustomState = (e: any) => {
    onChange(Boolean(e?.detail?.visible));
  };
  window.addEventListener('statxam_keyboard_state', handleCustomState);
  cleanups.push(() => {
    window.removeEventListener('statxam_keyboard_state', handleCustomState);
  });

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
