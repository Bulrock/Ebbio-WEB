import { h, dialog } from '../dom.js';
import { scaffold } from '../components.js';
import { icon } from '../icons.js';
import { register } from '../router.js';
import { Store } from '../../store.js';
import { t } from '../../i18n.js';
import { MatchingSession } from '../../logic/matching_session.js';
import { speak } from '../../services/tts.js';
import { compactCount } from '../../util/format.js';

// props: { pairs }
register('matching', (nav, props) => {
  const root = h('div', { class: 'screen' });
  let session;
  let selectedLeft = null;
  let selectedRight = null;
  let errorLeft = null;
  let errorRight = null;
  let matched = 0;

  function start() {
    session = new MatchingSession(props.pairs);
    selectedLeft = null;
    selectedRight = null;
    errorLeft = null;
    errorRight = null;
    matched = 0;
  }

  function trySubmit() {
    if (!selectedLeft || !selectedRight) return;
    const left = selectedLeft;
    const right = selectedRight;
    const ok = session.submit(left, right);
    selectedLeft = null;
    selectedRight = null;
    if (ok) {
      matched++;
    } else {
      errorLeft = left;
      errorRight = right;
    }
    render();
    if (session.isFinished) setTimeout(showFinished, 0);
  }

  function pickLeft(pair) {
    speak(pair.word, Store.activeCourse.targetLang);
    selectedLeft = pair;
    errorLeft = null;
    errorRight = null;
    render();
    trySubmit();
  }

  function pickRight(pair) {
    selectedRight = pair;
    errorLeft = null;
    errorRight = null;
    render();
    trySubmit();
  }

  async function showFinished() {
    const restart = await dialog({
      title: t('allRepeated'),
      content: t('matchedAllPairs', { count: compactCount(matched) }),
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

  function tile({ label, iconName, selected, error, onClick }) {
    return h(
      'button',
      {
        class: `match-tile${selected ? ' match-selected' : ''}${error ? ' match-error' : ''}`,
        onClick,
      },
      [iconName ? icon(iconName, { size: 18 }) : null, h('span', {}, label)],
    );
  }

  function render() {
    const left = h(
      'div',
      { class: 'match-col' },
      session.board.map((pair) =>
        tile({
          label: pair.word,
          iconName: 'volume',
          selected: selectedLeft === pair,
          error: errorLeft === pair,
          onClick: () => pickLeft(pair),
        }),
      ),
    );
    const right = h(
      'div',
      { class: 'match-col' },
      session.rightColumn.map((pair) =>
        tile({
          label: pair.translation,
          selected: selectedRight === pair,
          error: errorRight === pair,
          onClick: () => pickRight(pair),
        }),
      ),
    );
    root.replaceChildren(
      scaffold({
        nav,
        title: `${t('matchingMode')} · ${t('leftCount', { count: compactCount(session.remaining) })}`,
        body: h('div', { class: 'match-grid' }, [left, right]),
      }),
    );
  }

  start();
  render();
  return root;
});
