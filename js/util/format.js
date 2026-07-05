import { t } from '../i18n.js';

/// Formats a count so huge values never break the layout: exact below a
/// thousand, then "1k+"…"999k+", then "1M+" and beyond.
export function compactCount(n) {
  if (n < 1000) return `${n}`;
  if (n < 1000000) return `${Math.floor(n / 1000)}k+`;
  return `${Math.floor(n / 1000000)}M+`;
}

/// Formats an interval in minutes as the largest unit that divides it
/// evenly: weeks, days, hours or minutes.
export function humanDuration(minutes) {
  const week = 7 * 24 * 60;
  const day = 24 * 60;
  if (minutes % week === 0) return t('humanWeeks', { count: minutes / week });
  if (minutes % day === 0) return t('humanDays', { count: minutes / day });
  if (minutes % 60 === 0) return t('humanHours', { count: minutes / 60 });
  return t('humanMinutes', { count: minutes });
}

/// Relative time until the next review, as shown in the upcoming list.
export function formatTime(timeMs, nowMs = Date.now()) {
  const diffMs = timeMs - nowMs;
  if (diffMs < 0) return t('reviewNow');
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  if (hours < 1) return t('reviewInMinutes', { minutes });
  if (hours < 48) return t('reviewInHours', { hours });
  return t('reviewInDays', { days });
}
