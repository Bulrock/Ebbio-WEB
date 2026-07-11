// JSON backup of all user data. Pure: no IndexedDB access, no clock —
// both sides work on plain objects, so the codec is fully testable and
// the schema is documented in one place. The format is shared with the
// mobile app (dates as ISO strings), so backups travel across platforms.
//
// Format versions:
//   1 — courses + cards + settings (2026-07).
import { ResetMode, makeCard, makeCourse, defaultIntervalsMinutes } from '../models.js';

export const BACKUP_FORMAT_VERSION = 1;

/// Serializes everything the user would cry about losing.
export function encodeBackup({ courses, cards, settings, nowMs }) {
  return JSON.stringify(
    {
      app: 'ebbio',
      version: BACKUP_FORMAT_VERSION,
      exportedAt: new Date(nowMs).toISOString(),
      settings: {
        uiLang: settings.uiLang || '',
        activeCourseLang: settings.activeCourseLang || '',
      },
      courses: courses.map((c) => ({
        targetLang: c.targetLang,
        nativeLang: c.nativeLang,
        intervalsInMinutes: c.intervalsInMinutes,
        resetMode: c.resetMode,
      })),
      cards: cards.map((c) => ({
        word: c.word,
        definition: c.definition,
        translation: c.translation,
        status: c.status,
        nextReviewTime: new Date(c.nextReviewTime).toISOString(),
        isLearned: c.isLearned,
        createdAt: new Date(c.createdAt).toISOString(),
        courseLang: c.courseLang,
        sourceUrl: c.sourceUrl || '',
      })),
    },
    null,
    2,
  );
}

/// Parses a backup produced by encodeBackup (or by the mobile app).
/// Throws when the payload is not an Ebbio backup.
export function decodeBackup(json) {
  let decoded;
  try {
    decoded = JSON.parse(json);
  } catch {
    throw new Error('not valid JSON');
  }
  if (
    !decoded ||
    typeof decoded !== 'object' ||
    decoded.app !== 'ebbio' ||
    !Number.isInteger(decoded.version)
  ) {
    throw new Error('not an Ebbio backup');
  }
  if (decoded.version > BACKUP_FORMAT_VERSION) {
    throw new Error('backup from a newer app version');
  }

  const parseMs = (value) => {
    const ms = Date.parse(value || '');
    return Number.isNaN(ms) ? null : ms;
  };

  const courses = [];
  for (const raw of Array.isArray(decoded.courses) ? decoded.courses : []) {
    if (!raw || typeof raw.targetLang !== 'string') continue;
    const intervals = (Array.isArray(raw.intervalsInMinutes)
      ? raw.intervalsInMinutes
      : []
    ).filter((v) => Number.isInteger(v) && v > 0);
    courses.push(
      makeCourse({
        targetLang: raw.targetLang,
        nativeLang: typeof raw.nativeLang === 'string' ? raw.nativeLang : 'en',
        // A course must keep at least one step.
        intervalsInMinutes: intervals.length > 0 ? intervals : defaultIntervalsMinutes(),
        resetMode:
          raw.resetMode === ResetMode.toPrevious ? ResetMode.toPrevious : ResetMode.toStart,
      }),
    );
  }

  const cards = [];
  for (const raw of Array.isArray(decoded.cards) ? decoded.cards : []) {
    if (!raw || typeof raw.word !== 'string' || raw.word.trim() === '') continue;
    cards.push(
      makeCard({
        word: raw.word,
        definition: typeof raw.definition === 'string' ? raw.definition : '',
        translation: typeof raw.translation === 'string' ? raw.translation : '',
        status: Number.isInteger(raw.status) ? raw.status : 0,
        nextReviewTime: parseMs(raw.nextReviewTime),
        isLearned: raw.isLearned === true,
        createdAt: parseMs(raw.createdAt),
        courseLang: typeof raw.courseLang === 'string' ? raw.courseLang : '',
        sourceUrl: typeof raw.sourceUrl === 'string' ? raw.sourceUrl : '',
      }),
    );
  }

  const settings = decoded.settings && typeof decoded.settings === 'object' ? decoded.settings : {};
  return {
    courses,
    cards,
    uiLang: typeof settings.uiLang === 'string' ? settings.uiLang : '',
    activeCourseLang:
      typeof settings.activeCourseLang === 'string' ? settings.activeCourseLang : '',
  };
}
