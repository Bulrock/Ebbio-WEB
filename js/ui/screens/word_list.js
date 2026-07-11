import { h, createScreen, confirm } from '../dom.js';
import { scaffold, button } from '../components.js';
import { icon } from '../icons.js';
import { register } from '../router.js';
import { Store } from '../../store.js';
import { t } from '../../i18n.js';
import { speak } from '../../services/tts.js';
import { Notifications } from '../../services/notifications.js';
import { compactCount } from '../../util/format.js';
import { courseStepCount } from '../../models.js';
import { definitionView } from '../definition_view.js';

// Expansion state survives the reactive rebuilds a delete triggers.
const openLetters = new Set();
const openWords = new Set();
// The search query survives them too.
let searchQuery = '';

function wordItem(card) {
  const summaryChildren = [
    h(
      'button',
      {
        class: 'icon-btn word-speak',
        title: t('pronounce'),
        onClick: (e) => {
          e.stopPropagation();
          speak(card.word, Store.activeCourse.targetLang);
        },
      },
      icon('volume'),
    ),
    h('div', { class: 'word-summary-main' }, [
      h('div', { class: 'word-title' }, card.word),
      h(
        'div',
        { class: `word-status${card.isLearned ? ' word-learned' : ''}` },
        card.isLearned
          ? t('learned')
          : t('stepOfTotal', { step: card.status + 1, total: courseStepCount(Store.activeCourse) }),
      ),
    ]),
    icon('chevronDown', { cls: 'expand-caret' }),
  ];

  const detailChildren = [];
  if (card.definition !== '') {
    detailChildren.push(h('div', { class: 'word-block-label' }, t('definitionHeader')));
    detailChildren.push(definitionView(card.definition));
  }
  if (card.translation !== '') {
    detailChildren.push(h('div', { class: 'word-block-label' }, t('translationHeader')));
    detailChildren.push(h('div', { class: 'word-translation' }, card.translation));
  }
  if (card.definition === '' && card.translation === '') {
    detailChildren.push(h('div', { class: 'word-empty' }, t('noCardContent')));
  }
  detailChildren.push(
    h('div', { class: 'word-actions-row' }, [
      // The full article is one tap away when the definition came from
      // Wiktionary ("Wiktionary" is a proper noun — same in every locale).
      card.sourceUrl
        ? button({
            label: 'Wiktionary',
            iconName: 'external',
            variant: 'text',
            onClick: () => window.open(card.sourceUrl, '_blank', 'noopener'),
          })
        : h('span', {}),
      button({
        label: t('delete'),
        iconName: 'trash',
        variant: 'text',
        onClick: async () => {
          const yes = await confirm({
            title: t('deleteWordQuestion', { word: card.word }),
            confirmLabel: t('delete'),
            cancelLabel: t('cancel'),
          });
          if (yes) {
            await Notifications.cancelFor(card);
            await Store.deleteCard(card);
          }
        },
      }),
    ]),
  );

  const details = h(
    'details',
    { class: 'word-details', open: openWords.has(card.key) ? true : null },
    [h('summary', { class: 'word-summary' }, summaryChildren), h('div', { class: 'word-body' }, detailChildren)],
  );
  details.addEventListener('toggle', () => {
    if (details.open) openWords.add(card.key);
    else openWords.delete(card.key);
  });
  return details;
}

/// Alphabet sections — a letter appears only when at least one word
/// starts with it; sections start collapsed.
function groupedList(cards) {
  const groups = new Map();
  for (const card of cards) {
    const w = card.word.trim();
    const first = w === '' ? '#' : w.substring(0, 1).toUpperCase();
    if (!groups.has(first)) groups.set(first, []);
    groups.get(first).push(card);
  }
  return h(
    'div',
    { class: 'dict-list' },
    [...groups.entries()].map(([letter, group]) => {
      const section = h(
        'details',
        { class: 'letter-section', open: openLetters.has(letter) ? true : null },
        [
          h('summary', { class: 'letter-summary' }, [
            h('span', { class: 'letter-glyph' }, letter),
            h('span', { class: 'letter-count' }, t('totalWords', { count: compactCount(group.length) })),
            icon('chevronDown', { cls: 'expand-caret' }),
          ]),
          h('div', { class: 'letter-body' }, group.map(wordItem)),
        ],
      );
      section.addEventListener('toggle', () => {
        if (section.open) openLetters.add(letter);
        else openLetters.delete(letter);
      });
      return section;
    }),
  );
}

/// Flat result list: words starting with the query first, then words
/// merely containing it.
function searchResults(cards, query) {
  const prefix = [];
  const contains = [];
  for (const card of cards) {
    const w = card.word.toLowerCase();
    if (w.startsWith(query)) prefix.push(card);
    else if (w.includes(query)) contains.push(card);
  }
  const matches = [...prefix, ...contains];
  return matches.length === 0
    ? h('div', { class: 'empty-state' }, t('nothingFound'))
    : h('div', { class: 'dict-list' }, matches.map(wordItem));
}

function build(nav) {
  const cards = Store.courseCards().sort((a, b) =>
    a.word.toLowerCase().localeCompare(b.word.toLowerCase()),
  );

  let body;
  if (cards.length === 0) {
    searchQuery = '';
    body = h('div', { class: 'empty-state' }, t('dictionaryEmpty'));
  } else {
    const list = () => {
      const query = searchQuery.trim().toLowerCase();
      return query === '' ? groupedList(cards) : searchResults(cards, query);
    };
    const searchInput = h('input', {
      class: 'field-input',
      type: 'search',
      placeholder: t('searchWords'),
      value: searchQuery,
    });
    const listHost = h('div', {}, list());
    // Rebuild only the list, keeping the input (and its focus) alive.
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value;
      listHost.replaceChildren(list());
    });
    body = h('div', { class: 'dict-screen' }, [
      h('div', { class: 'dict-search' }, searchInput),
      listHost,
    ]);
  }

  return scaffold({ nav, title: t('dictionary'), body });
}

register('wordList', (nav, props) => createScreen(nav, props, { build, reactive: true }));
