import { h, dialog } from '../dom.js';
import { scaffold, button } from '../components.js';
import { register } from '../router.js';
import { Store } from '../../store.js';
import { t } from '../../i18n.js';
import { speak } from '../../services/tts.js';
import { compactCount } from '../../util/format.js';

// props: { pairs }
register('spelling', (nav, props) => {
  const root = h('div', { class: 'screen' });
  let queue;
  let state = 'pending'; // pending | correct | wrong
  let correctCount = 0;
  let value = '';

  function start() {
    queue = [...props.pairs];
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
    correctCount = 0;
    state = 'pending';
    value = '';
  }

  function check() {
    const pair = queue[0];
    if (!pair || state !== 'pending') return;
    const answer = value.trim().toLowerCase();
    if (answer === '') return;
    if (answer === pair.word.trim().toLowerCase()) {
      state = 'correct';
      correctCount++;
    } else {
      state = 'wrong';
    }
    speak(pair.word, Store.activeCourse.targetLang);
    render();
  }

  function next() {
    queue.shift();
    state = 'pending';
    value = '';
    if (queue.length === 0) {
      setTimeout(showFinished, 0);
    }
    render();
  }

  async function showFinished() {
    const restart = await dialog({
      title: t('allRepeated'),
      content: t('correctOutOf', {
        correct: compactCount(correctCount),
        total: compactCount(props.pairs.length),
      }),
      dismissible: false,
      actions: [
        { label: t('exit'), value: false, kind: 'text' },
        { label: t('restart'), value: true, kind: 'filled' },
      ],
    });
    if (restart) {
      start();
      render();
    } else {
      nav.pop();
    }
  }

  function render() {
    const pair = queue[0];
    if (!pair) {
      root.replaceChildren(scaffold({ nav, title: t('spellingMode'), body: h('div') }));
      return;
    }
    const input = h('input', {
      class: 'field-input spelling-input',
      type: 'text',
      value,
      autocomplete: 'off',
      autocapitalize: 'off',
      spellcheck: 'false',
      disabled: state !== 'pending' ? true : null,
    });
    input.addEventListener('input', () => {
      value = input.value;
    });
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        check();
      }
    });

    let feedback = null;
    if (state === 'correct') feedback = h('div', { class: 'spelling-correct' }, t('correctAnswer'));
    else if (state === 'wrong')
      feedback = h('div', { class: 'spelling-wrong' }, t('rightAnswerWas', { word: pair.word }));

    const action =
      state === 'pending'
        ? button({ label: t('check'), variant: 'filled', block: true, onClick: check })
        : button({ label: t('next'), variant: 'filled', block: true, onClick: next });

    const body = h('div', { class: 'spelling-body' }, [
      h('div', { class: 'spelling-prompt' }, pair.translation),
      h('label', { class: 'field' }, [
        h('span', { class: 'field-label' }, t('wordField', { lang: Store.activeCourse.targetLang })),
        input,
      ]),
      h('div', { class: 'spelling-feedback' }, feedback),
      action,
    ]);

    root.replaceChildren(
      scaffold({
        nav,
        title: `${t('spellingMode')} · ${t('leftCount', { count: compactCount(queue.length) })}`,
        body,
      }),
    );
    if (state === 'pending') requestAnimationFrame(() => input.focus());
  }

  start();
  render();
  return root;
});
