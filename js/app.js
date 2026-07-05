// Bootstraps the app: shows the animated splash immediately while storage
// and the service worker initialize, then switches to the home screen.
// The splash is kept on screen for its full animation even when init
// finishes earlier — mirrors the mobile EbbioRoot.
import { Store } from './store.js';
import { setLocale, deviceLocale, resolveUiLocale, t } from './i18n.js';
import { nav } from './ui/router.js';
import { splashScreen } from './ui/screens/splash.js';
import { Notifications } from './services/notifications.js';

// Importing the screen modules registers them with the router.
import './ui/screens/home.js';
import './ui/screens/add_card.js';
import './ui/screens/training.js';
import './ui/screens/training_modes.js';
import './ui/screens/matching.js';
import './ui/screens/quiz.js';
import './ui/screens/spelling.js';
import './ui/screens/word_list.js';
import './ui/screens/settings.js';
import './ui/screens/about.js';

// Register the service worker without blocking boot; wire it into the
// notification layer once it becomes available (for showTrigger + periodic
// background sync support).
function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .register('sw.js')
    .then(async (reg) => {
      await Notifications.init(reg);
      await Notifications.enablePeriodicSync(reg);
    })
    .catch(() => {});
}

async function bootstrap() {
  const app = document.getElementById('app');
  nav.init(app);

  // Storage is not open yet, so the splash follows the device locale.
  setLocale(deviceLocale());
  const splash = splashScreen();
  app.appendChild(splash);

  // Critical init must not be blocked by a flaky service worker.
  await Promise.all([Store.init(), new Promise((r) => setTimeout(r, 2100))]);
  registerServiceWorker();

  // Resolve the real UI locale from the saved settings and active course.
  setLocale(resolveUiLocale(Store.settings, Store.activeCourse.nativeLang));

  // Store localized notification text for the service worker to read when it
  // wakes in the background (periodic sync).
  Store.updateNotifMeta(t('appTitle'), t('notifBody'));

  // Re-arm reminders for upcoming reviews: in-page timers do not survive a
  // reload, so reschedule every future, not-yet-learned card. No-ops unless
  // the user has granted notification permission.
  if (Notifications.permission === 'granted') {
    const now = Date.now();
    for (const card of Store.allCards) {
      if (!card.isLearned && card.nextReviewTime > now) {
        Notifications.scheduleReview(card, t('notifTitle', { word: card.word }), t('notifBody'));
      }
    }
  }

  splash.classList.add('splash-out');
  splash.addEventListener('transitionend', () => splash.remove(), { once: true });
  setTimeout(() => splash.remove(), 600);

  nav.reset('home');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
