// In-memory working set backed by IndexedDB. Mirrors AppStorage from
// the mobile app: synchronous reads over a cached copy, async writes
// that persist and then notify listeners so the UI re-renders.
import { openDb, getAll, add, put, del } from './db.js';
import {
  ResetMode,
  makeCourse,
  makeSettings,
  defaultIntervalsMinutes,
  courseStepCount,
  isDue,
} from './models.js';

const _cards = new Map(); // key(int) -> card
const _courses = new Map(); // targetLang -> course
let _settings = null;
const _listeners = new Set();

export const Store = {
  async init() {
    await openDb();
    for (const c of await getAll('cards')) _cards.set(c.key, c);
    for (const c of await getAll('courses')) _courses.set(c.targetLang, c);
    const settingsRows = await getAll('settings');
    _settings = settingsRows[0] || null;
    if (!_settings) {
      _settings = makeSettings();
      await put('settings', _settings);
    }
    await this._migrate();
  },

  // Fresh installs get a default course; orphan cards are adopted, and
  // any course missing minute-intervals is repaired (kept sorted).
  async _migrate() {
    if (_courses.size === 0) {
      const course = makeCourse({
        targetLang: _settings.targetLang || 'en',
        nativeLang: _settings.nativeLang || 'en',
        intervalsInMinutes: defaultIntervalsMinutes(),
        resetMode: _settings.resetMode || ResetMode.toStart,
      });
      _courses.set(course.targetLang, course);
      await put('courses', course);
    }
    if (!_courses.has(_settings.activeCourseLang)) {
      _settings.activeCourseLang = _courses.values().next().value.targetLang;
      await put('settings', _settings);
    }
    for (const card of _cards.values()) {
      if (!card.courseLang) {
        card.courseLang = _settings.activeCourseLang;
        await put('cards', card);
      }
    }
    for (const course of _courses.values()) {
      if (!course.intervalsInMinutes || course.intervalsInMinutes.length === 0) {
        course.intervalsInMinutes = defaultIntervalsMinutes();
        await put('courses', course);
      }
      const sorted = [...course.intervalsInMinutes].sort((a, b) => a - b);
      if (sorted.join(',') !== course.intervalsInMinutes.join(',')) {
        course.intervalsInMinutes = sorted;
        await put('courses', course);
      }
    }
  },

  // ---- listeners -----------------------------------------------------
  subscribe(fn) {
    _listeners.add(fn);
    return () => _listeners.delete(fn);
  },
  _notify() {
    for (const fn of _listeners) fn();
  },

  // ---- reads ---------------------------------------------------------
  get settings() {
    return _settings;
  },
  get courses() {
    return [..._courses.values()];
  },
  courseByLang(lang) {
    return _courses.get(lang) || null;
  },
  get activeCourse() {
    return (
      _courses.get(_settings.activeCourseLang) ||
      _courses.values().next().value
    );
  },
  get allCards() {
    return [..._cards.values()];
  },
  /// Cards of a course (defaults to the active one).
  courseCards(targetLang) {
    const lang = targetLang || this.activeCourse.targetLang;
    return [..._cards.values()].filter((c) => c.courseLang === lang);
  },
  /// Active-course cards due for review right now, earliest first.
  dueCards(nowMs) {
    const moment = nowMs == null ? Date.now() : nowMs;
    return this.courseCards()
      .filter((c) => isDue(c, moment))
      .sort((a, b) => a.nextReviewTime - b.nextReviewTime);
  },

  // ---- writes --------------------------------------------------------
  async setActiveCourse(targetLang) {
    _settings.activeCourseLang = targetLang;
    await put('settings', _settings);
    this._notify();
  },

  async saveSettings(patch) {
    Object.assign(_settings, patch);
    await put('settings', _settings);
    this._notify();
  },

  /// Persists the localized notification strings on the settings record so
  /// the service worker (periodic background sync) can show reminders in the
  /// user's language without loading the i18n module. Does not notify the UI.
  async updateNotifMeta(title, body) {
    _settings.notifTitle = title;
    _settings.notifBody = body;
    await put('settings', _settings);
  },

  /// One course per target language; returns null when taken.
  async createCourse(targetLang, nativeLang) {
    if (_courses.has(targetLang)) return null;
    const course = makeCourse({ targetLang, nativeLang });
    _courses.set(targetLang, course);
    await put('courses', course);
    this._notify();
    return course;
  },

  async saveCourse(course) {
    _courses.set(course.targetLang, course);
    await put('courses', course);
    this._notify();
  },

  async deleteCourse(course) {
    // Delete its cards first, then the course, then repoint active.
    for (const card of this.courseCards(course.targetLang)) {
      await this.deleteCard(card, { silent: true });
    }
    _courses.delete(course.targetLang);
    await del('courses', course.targetLang);
    if (_settings.activeCourseLang === course.targetLang) {
      _settings.activeCourseLang = _courses.values().next().value.targetLang;
      await put('settings', _settings);
    }
    this._notify();
  },

  /// Adds a new card, assigning the IndexedDB-generated integer key.
  async addCard(card) {
    const key = await add('cards', card);
    card.key = key;
    // Persist again so the record carries its own key field too.
    await put('cards', card);
    _cards.set(key, card);
    this._notify();
    return card;
  },

  async saveCard(card) {
    await put('cards', card);
    _cards.set(card.key, card);
    this._notify();
  },

  async deleteCard(card, { silent = false } = {}) {
    _cards.delete(card.key);
    await del('cards', card.key);
    if (!silent) this._notify();
  },

  // Convenience re-exports so screens import one module.
  stepCount(course) {
    return courseStepCount(course);
  },
};
