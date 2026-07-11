// Plain data factories mirroring the Hive models. Dates are stored as
// epoch milliseconds (numbers) so records survive IndexedDB structured
// cloning and JSON export without timezone surprises.

/// Reset behaviour on a "Forgot" answer.
export const ResetMode = Object.freeze({
  toStart: 'toStart',
  toPrevious: 'toPrevious',
});

/// Default cycle: 3 hours — 3 days — 3 weeks — 3 months (in minutes).
export function defaultIntervalsMinutes() {
  return [180, 4320, 30240, 129600];
}

/// Canonical form used for duplicate checks and search: trimmed,
/// inner whitespace collapsed, lowercased. Stored on every card and
/// indexed in IndexedDB.
export function normalizeTerm(word) {
  return word.trim().replace(/\s+/g, ' ').toLowerCase();
}

/// A flashcard for a single word being learned.
export function makeCard({
  word,
  definition = '',
  translation = '',
  status = 0,
  nextReviewTime = null,
  isLearned = false,
  createdAt = null,
  courseLang = '',
}) {
  const now = Date.now();
  return {
    word,
    normalizedTerm: normalizeTerm(word),
    definition,
    translation,
    status,
    nextReviewTime: nextReviewTime == null ? now : nextReviewTime,
    isLearned,
    createdAt: createdAt == null ? now : createdAt,
    courseLang,
  };
}

/// Whether the card is ready for review at [nowMs].
export function isDue(card, nowMs) {
  return !card.isLearned && card.nextReviewTime <= nowMs;
}

/// A language course. Target language is its identity (one per language).
export function makeCourse({
  targetLang,
  nativeLang,
  intervalsInMinutes = null,
  resetMode = ResetMode.toStart,
}) {
  return {
    targetLang,
    nativeLang,
    intervalsInMinutes: intervalsInMinutes == null
      ? defaultIntervalsMinutes()
      : intervalsInMinutes,
    resetMode,
  };
}

export function courseStepCount(course) {
  return course.intervalsInMinutes.length;
}

/// Global settings singleton.
export function makeSettings({
  resetMode = ResetMode.toStart,
  targetLang = 'en',
  nativeLang = 'en',
  uiLang = '',
  activeCourseLang = '',
} = {}) {
  return {
    id: 'app',
    resetMode,
    targetLang,
    nativeLang,
    uiLang,
    activeCourseLang,
  };
}
