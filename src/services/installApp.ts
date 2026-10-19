// "Download app": Driver Hub installs from the browser as a home-screen app.
// Chrome and Edge (Android, desktop) offer an install prompt; iPhone and iPad
// use Share -> Add to Home Screen, which a page cannot trigger itself.
import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installedThisVisit = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());

if (typeof window !== 'undefined') {
  // The browser fires this once per page load, often before React has mounted.
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    installedThisVisit = true;
    deferredPrompt = null;
    notify();
  });
}

const isRunningAsApp = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

const isIosDevice = () =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function useInstallApp() {
  const [, rerender] = useState(0);
  useEffect(() => {
    const listener = () => rerender(count => count + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  return {
    isInstalled: installedThisVisit || isRunningAsApp(),
    canPrompt: deferredPrompt !== null,
    isIos: isIosDevice(),
    async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
      const event = deferredPrompt;
      if (!event) return 'unavailable';
      // A captured prompt can be shown only once.
      deferredPrompt = null;
      await event.prompt();
      const { outcome } = await event.userChoice;
      notify();
      return outcome;
    }
  };
}

export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(error => console.warn('Service worker not registered:', error));
  });
}
