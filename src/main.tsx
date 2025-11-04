import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker for PWA caching and background sync
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered', reg);

      // Listen for messages from SW to trigger sync
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'sync-analytics') {
          // import and run syncAll from supabaseSync
          import('./lib/supabaseSync').then((m) => {
            if (m && typeof m.syncAll === 'function') {
              m.syncAll().catch((err:any) => console.debug('Background sync failed:', err));
            }
          }).catch((err) => console.debug('Failed to import sync module:', err));
        }
      });
    } catch (err) {
      console.warn('Service Worker registration failed:', err);
    }
  });
}
