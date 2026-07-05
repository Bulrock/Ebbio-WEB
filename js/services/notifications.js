// Best-effort local review reminders.
//
// The web has no guaranteed OS-scheduled push without a server, so this
// layer degrades gracefully:
//   1. Notification Triggers API (Chrome / installed PWA) fires even when
//      the tab is closed — the closest match to the mobile behaviour.
//   2. Otherwise an in-page timer fires while the tab stays open.
// Every notification is tagged with the card key so it can be replaced or
// cancelled, exactly like the Hive-key notification id on mobile.

let _swReg = null;
const _timers = new Map(); // cardKey -> timeout id

function supportsTriggers() {
  return _swReg && 'showTrigger' in Notification.prototype;
}

export const Notifications = {
  async init(swRegistration) {
    _swReg = swRegistration || null;
  },

  /// Best-effort background reminders without a server: asks the browser to
  /// wake the service worker periodically so it can check for due cards even
  /// when the app is closed. Only installed PWAs on Chrome/Android get the
  /// permission; everywhere else this silently no-ops.
  async enablePeriodicSync(reg) {
    if (!reg || !('periodicSync' in reg)) return;
    try {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync',
      });
      if (status.state !== 'granted') return;
      // The browser decides the real cadence (typically >= 12 h); this is a
      // floor, not a guarantee.
      await reg.periodicSync.register('ebbio-review-check', {
        minInterval: 12 * 60 * 60 * 1000,
      });
    } catch {
      /* not installed / unsupported — best-effort only */
    }
  },

  get permission() {
    return 'Notification' in window ? Notification.permission : 'denied';
  },

  /// Ask the user; must be called from a user gesture for reliability.
  async requestPermission() {
    if (!('Notification' in window)) return 'denied';
    if (Notification.permission === 'default') {
      try {
        return await Notification.requestPermission();
      } catch {
        return Notification.permission;
      }
    }
    return Notification.permission;
  },

  /// Schedules a reminder for card.nextReviewTime. Past times and learned
  /// cards are skipped. Replaces any existing reminder for the same card.
  async scheduleReview(card, title, body) {
    if (card.key == null) return;
    await this.cancelFor(card);
    if (this.permission !== 'granted') return;
    if (card.isLearned || card.nextReviewTime < Date.now()) return;

    const tag = `review-${card.key}`;
    if (supportsTriggers()) {
      try {
        await _swReg.showNotification(title, {
          body,
          tag,
          icon: 'assets/icon/icon-192.png',
          badge: 'assets/icon/icon-192.png',
          // eslint-disable-next-line no-undef
          showTrigger: new TimestampTrigger(card.nextReviewTime),
        });
        return;
      } catch {
        // Fall through to the timer path.
      }
    }

    const delay = card.nextReviewTime - Date.now();
    // setTimeout is capped at ~24.8 days; only arm timers within range.
    if (delay <= 2147483647) {
      const id = setTimeout(() => {
        _timers.delete(card.key);
        this._show(title, body, tag);
      }, Math.max(0, delay));
      _timers.set(card.key, id);
    }
  },

  async _show(title, body, tag) {
    try {
      if (_swReg) {
        await _swReg.showNotification(title, {
          body,
          tag,
          icon: 'assets/icon/icon-192.png',
        });
      } else {
        new Notification(title, { body, tag, icon: 'assets/icon/icon-192.png' });
      }
    } catch {
      /* notifications are best-effort */
    }
  },

  async cancelFor(card) {
    if (card.key == null) return;
    const timer = _timers.get(card.key);
    if (timer != null) {
      clearTimeout(timer);
      _timers.delete(card.key);
    }
    const tag = `review-${card.key}`;
    if (_swReg && _swReg.getNotifications) {
      try {
        const pending = await _swReg.getNotifications({
          tag,
          includeTriggered: true,
        });
        for (const n of pending) n.close();
      } catch {
        /* ignore */
      }
    }
  },
};
