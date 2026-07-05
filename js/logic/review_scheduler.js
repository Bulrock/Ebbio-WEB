// Pure spaced-repetition logic. Does not touch storage and never reads
// the clock directly — `nowMs` is passed in so it can be unit-tested.
import { ResetMode, courseStepCount } from '../models.js';

const MINUTE_MS = 60 * 1000;

/// "Remember" answer: advance one step or finish learning.
export function applyRemembered(card, course, nowMs) {
  const moment = nowMs == null ? Date.now() : nowMs;
  const next = card.status + 1;
  const steps = courseStepCount(course);
  if (next >= steps) {
    card.status = steps;
    card.isLearned = true;
  } else {
    card.status = next;
    card.nextReviewTime = moment + course.intervalsInMinutes[next] * MINUTE_MS;
  }
}

/// "Forgot" answer: roll back according to the strictness mode.
export function applyForgot(card, course, nowMs) {
  const moment = nowMs == null ? Date.now() : nowMs;
  const steps = courseStepCount(course);
  if (course.resetMode === ResetMode.toStart) {
    card.status = 0;
  } else {
    card.status = card.status > 0 ? card.status - 1 : 0;
  }
  // If the user shortened the interval list, clamp to the last step.
  if (card.status >= steps) card.status = steps - 1;
  card.isLearned = false;
  card.nextReviewTime = moment + course.intervalsInMinutes[card.status] * MINUTE_MS;
}
