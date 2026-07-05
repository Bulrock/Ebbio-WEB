import { h } from '../dom.js';
import { scaffold, button, glassPanel } from '../components.js';
import { icon } from '../icons.js';
import { register } from '../router.js';
import { Store } from '../../store.js';
import { t } from '../../i18n.js';
import { applyRemembered, applyForgot } from '../../logic/review_scheduler.js';
import { Notifications } from '../../services/notifications.js';
import { speak } from '../../services/tts.js';
import { compactCount } from '../../util/format.js';
import { definitionView } from '../definition_view.js';

// props: { cards?: WordCard[], practice?: bool, title?: string }
register('training', (nav, props = {}) => {
  const practice = !!props.practice;
  const baseTitle = props.title || t('training');
  const queue = props.cards ? [...props.cards] : Store.dueCards();

  let flipped = false;
  let translationVisible = false;

  const root = h('div', { class: 'screen' });

  async function answer(remembered) {
    const card = queue[0];
    if (!card) return;
    if (!practice) {
      const course = Store.activeCourse;
      if (remembered) applyRemembered(card, course);
      else applyForgot(card, course);
      await Store.saveCard(card);
      await Notifications.scheduleReview(
        card,
        t('notifTitle', { word: card.word }),
        t('notifBody'),
      );
    }
    queue.shift();
    flipped = false;
    translationVisible = false;
    render();
  }

  function cardFace(card) {
    if (!flipped) {
      return glassPanel(
        [
          h('div', { class: 'flash-word' }, card.word),
          h(
            'button',
            {
              class: 'icon-btn',
              title: t('pronounce'),
              onClick: (e) => {
                e.stopPropagation();
                speak(card.word, Store.activeCourse.targetLang);
              },
            },
            icon('volume'),
          ),
          h('div', { class: 'flash-hint' }, t('tapToFlip')),
        ],
        { cls: 'flash-card' },
      );
    }
    const backChildren = [
      h('div', { class: 'flash-word-small' }, card.word),
      h('hr', { class: 'divider' }),
      h(
        'div',
        { class: 'flash-def-scroll' },
        card.definition === ''
          ? h('div', { class: 'flash-nodef' }, t('noDefinition'))
          : definitionView(card.definition),
      ),
    ];
    if (translationVisible) {
      backChildren.push(
        h(
          'div',
          { class: 'flash-translation' },
          card.translation === '' ? t('noTranslation') : card.translation,
        ),
      );
    } else {
      backChildren.push(
        button({
          label: t('showTranslation'),
          iconName: 'eye',
          variant: 'text',
          onClick: (e) => {
            e.stopPropagation();
            translationVisible = true;
            render();
          },
        }),
      );
    }
    return glassPanel(backChildren, { cls: 'flash-card flash-back' });
  }

  function attachSwipe(cardEl) {
    let startX = 0;
    let dx = 0;
    let dragging = false;
    const threshold = 90;
    const onDown = (e) => {
      dragging = true;
      startX = e.clientX;
      dx = 0;
      cardEl.setPointerCapture?.(e.pointerId);
      cardEl.style.transition = 'none';
    };
    const onMove = (e) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      cardEl.style.transform = `translateX(${dx}px) rotate(${dx / 30}deg)`;
      root.classList.toggle('swipe-yes', dx > 20);
      root.classList.toggle('swipe-no', dx < -20);
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false;
      cardEl.style.transition = '';
      root.classList.remove('swipe-yes', 'swipe-no');
      if (Math.abs(dx) > threshold) {
        answer(dx > 0);
      } else {
        cardEl.style.transform = '';
      }
    };
    cardEl.addEventListener('pointerdown', onDown);
    cardEl.addEventListener('pointermove', onMove);
    cardEl.addEventListener('pointerup', onUp);
    cardEl.addEventListener('pointercancel', onUp);
  }

  function buildDone() {
    return h('div', { class: 'done-screen' }, [
      icon('party', { size: 72, cls: 'done-icon' }),
      h('p', { class: 'done-text' }, practice ? t('allViewed') : t('allReviewed')),
      button({
        label: t('done'),
        iconName: 'check',
        variant: 'cta',
        onClick: () => nav.pop(),
      }),
    ]);
  }

  function buildCard(card) {
    const cardEl = cardFace(card);
    cardEl.addEventListener('click', () => {
      flipped = !flipped;
      render();
    });
    if (!practice) attachSwipe(cardEl);

    const controls = practice
      ? button({
          label: t('next'),
          iconName: 'forward',
          variant: 'filled',
          block: true,
          onClick: () => answer(true),
        })
      : h('div', { class: 'row-2 answer-row' }, [
          button({
            label: t('forgot'),
            iconName: 'thumbDown',
            variant: 'outlined',
            color: '#FF8A80',
            onClick: () => answer(false),
          }),
          button({
            label: t('remember'),
            iconName: 'thumbUp',
            variant: 'filled',
            color: '#22c55e',
            onClick: () => answer(true),
          }),
        ]);

    return h('div', { class: 'flash-layout' }, [
      h('div', { class: 'swipe-hint swipe-hint-yes' }, icon('thumbUp', { size: 48 })),
      h('div', { class: 'swipe-hint swipe-hint-no' }, icon('thumbDown', { size: 48 })),
      h('div', { class: 'flash-card-wrap' }, cardEl),
      h('div', { class: 'answer-controls' }, controls),
    ]);
  }

  function render() {
    const card = queue[0];
    const title = card
      ? `${baseTitle} · ${t('leftCount', { count: compactCount(queue.length) })}`
      : baseTitle;
    root.replaceChildren(
      scaffold({ nav, title, body: card ? buildCard(card) : buildDone() }),
    );
  }

  render();
  return root;
});
