import { h, createScreen } from '../dom.js';
import { scaffold, listTile } from '../components.js';
import { icon } from '../icons.js';
import { register } from '../router.js';
import { Store } from '../../store.js';
import { t } from '../../i18n.js';
import { QuizKind } from '../../logic/quiz_engine.js';
import { compactCount } from '../../util/format.js';

function pairsOf(cards) {
  return cards
    .filter((c) => c.translation.trim() !== '')
    .map((c) => ({ word: c.word, translation: c.translation }));
}

function shuffled(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function section(title) {
  return h('div', { class: 'modes-section' }, title);
}

function mode({ iconName, title, subtitle, enabled, onClick }) {
  return listTile({
    leading: icon(iconName),
    title,
    subtitle,
    trailing: icon('chevronRight'),
    enabled,
    onClick,
    dense: false,
  });
}

function build(nav) {
  const all = Store.courseCards();
  const due = Store.dueCards();
  const learning = all.filter((c) => !c.isLearned);
  const pairs = pairsOf(all);

  const body = h('div', { class: 'modes-body' }, [
    section(t('intervalSection')),
    mode({
      iconName: 'clock',
      title: t('bySchedule'),
      subtitle: due.length === 0 ? t('nothingToReview') : t('byScheduleReady', { count: compactCount(due.length) }),
      enabled: due.length > 0,
      onClick: () => nav.push('training', {}),
    }),

    section(t('practiceSection')),
    mode({
      iconName: 'shuffle',
      title: t('allWordsRandom'),
      subtitle: t('totalWords', { count: compactCount(all.length) }),
      enabled: all.length > 0,
      onClick: () => nav.push('training', { cards: shuffled(all), practice: true, title: t('practice') }),
    }),
    mode({
      iconName: 'sortAlpha',
      title: t('allWordsAlpha'),
      subtitle: t('totalWords', { count: compactCount(all.length) }),
      enabled: all.length > 0,
      onClick: () =>
        nav.push('training', {
          cards: [...all].sort((a, b) => a.word.toLowerCase().localeCompare(b.word.toLowerCase())),
          practice: true,
          title: t('practice'),
        }),
    }),
    mode({
      iconName: 'hourglass',
      title: t('stillLearningTitle'),
      subtitle: t('stillLearningSubtitle', { count: compactCount(learning.length) }),
      enabled: learning.length > 0,
      onClick: () => nav.push('training', { cards: shuffled(learning), practice: true, title: t('stillLearningTitle') }),
    }),

    section(t('gamesSection')),
    mode({
      iconName: 'grid',
      title: t('matchingMode'),
      subtitle: t('matchingSubtitle', { count: compactCount(pairs.length) }),
      enabled: pairs.length >= 2,
      onClick: () => nav.push('matching', { pairs }),
    }),
    mode({
      iconName: 'quiz',
      title: t('quizMode'),
      subtitle: t('quizSubtitle'),
      enabled: pairs.length >= 2,
      onClick: () => nav.push('quiz', { pairs, kind: QuizKind.wordToTranslation }),
    }),
    mode({
      iconName: 'quiz',
      title: t('reverseQuizMode'),
      subtitle: t('reverseQuizSubtitle'),
      enabled: pairs.length >= 2,
      onClick: () => nav.push('quiz', { pairs, kind: QuizKind.translationToWord }),
    }),
    mode({
      iconName: 'hearing',
      title: t('listeningMode'),
      subtitle: t('listeningSubtitle'),
      enabled: pairs.length >= 2,
      onClick: () => nav.push('quiz', { pairs, kind: QuizKind.audioToTranslation }),
    }),
    mode({
      iconName: 'keyboard',
      title: t('spellingMode'),
      subtitle: t('spellingSubtitle'),
      enabled: pairs.length >= 1,
      onClick: () => nav.push('spelling', { pairs }),
    }),
  ]);

  return scaffold({ nav, title: t('practice'), body });
}

register('modes', (nav, props) =>
  createScreen(nav, props, { build, reactive: true, tickMs: 15000 }),
);
