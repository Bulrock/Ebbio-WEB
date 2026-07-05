import { h, createScreen } from '../dom.js';
import { scaffold, button, iconButton, glassPanel, listTile, selectMenu } from '../components.js';
import { icon } from '../icons.js';
import { register } from '../router.js';
import { Store } from '../../store.js';
import { t } from '../../i18n.js';
import { compactCount, formatTime } from '../../util/format.js';
import { courseLabel } from '../../util/languages.js';

function statCard(label, value, color) {
  return h('div', { class: 'stat-card' }, [
    h('div', { class: 'stat-value', style: { color } }, value),
    h('div', { class: 'stat-label' }, label),
  ]);
}

function build(nav) {
  const course = Store.activeCourse;
  const all = Store.courseCards();
  const due = Store.dueCards();
  const learned = all.filter((c) => c.isLearned).length;
  const courses = Store.courses;

  const children = [h('p', { class: 'slogan' }, t('slogan'))];

  if (courses.length > 1) {
    const select = selectMenu({
      value: course.targetLang,
      variant: 'plain',
      options: courses.map((c) => ({
        value: c.targetLang,
        label: courseLabel(c.targetLang, c.nativeLang),
      })),
      onChange: (lang) => Store.setActiveCourse(lang),
    });
    children.push(
      glassPanel([icon('globe', { cls: 'course-select-icon' }), select], {
        cls: 'course-switcher',
      }),
    );
  }

  children.push(
    h('div', { class: 'stat-row' }, [
      statCard(t('statDue'), compactCount(due.length), '#FFB74D'),
      statCard(t('statLearning'), compactCount(all.length - learned), '#82B1FF'),
      statCard(t('statLearned'), compactCount(learned), '#B9F6CA'),
    ]),
  );

  children.push(
    button({
      label: due.length === 0 ? t('nothingToReview') : t('reviewBySchedule', { count: compactCount(due.length) }),
      iconName: 'play',
      variant: 'cta',
      block: true,
      disabled: due.length === 0,
      onClick: () => nav.push('training', {}),
    }),
  );

  children.push(
    h('div', { class: 'row-2' }, [
      button({
        label: t('modes'),
        iconName: 'dumbbell',
        variant: 'outlined',
        disabled: all.length === 0,
        onClick: () => nav.push('modes', {}),
      }),
      button({
        label: t('dictionary'),
        iconName: 'book',
        variant: 'outlined',
        disabled: all.length === 0,
        onClick: () => nav.push('wordList', {}),
      }),
    ]),
  );

  if (due.length > 0) {
    const now = Date.now();
    children.push(h('hr', { class: 'divider' }));
    children.push(h('div', { class: 'section-title' }, t('upcomingReviews')));
    children.push(
      h(
        'div',
        { class: 'upcoming-list' },
        due.map((card) =>
          listTile({
            dense: true,
            leading: icon('hourglass', { cls: 'hourglass-icon' }),
            title: card.word,
            subtitle: `${t('stepBadge', { step: card.status + 1 })} · ${formatTime(card.nextReviewTime, now)}`,
          }),
        ),
      ),
    );
  }

  return scaffold({
    nav,
    title: t('appTitle'),
    actions: [
      iconButton('school', () => nav.push('about', {}), { title: t('aboutMethodTitle') }),
      iconButton('settings', () => nav.push('settings', {}), { title: t('settings') }),
    ],
    bottom: button({
      label: t('addWord'),
      iconName: 'add',
      variant: 'cta',
      block: true,
      onClick: () => nav.push('addCard', {}),
    }),
    body: h('div', { class: 'home-body' }, children),
  });
}

register('home', (nav, props) =>
  createScreen(nav, props, { build, reactive: true, tickMs: 15000 }),
);
