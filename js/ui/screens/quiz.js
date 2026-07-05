import { h, dialog } from '../dom.js';
import { scaffold, button } from '../components.js';
import { icon } from '../icons.js';
import { register } from '../router.js';
import { Store } from '../../store.js';
import { t } from '../../i18n.js';
import { QuizEngine, QuizKind } from '../../logic/quiz_engine.js';
import { speak } from '../../services/tts.js';
import { compactCount } from '../../util/format.js';

// props: { pairs, kind }
register('quiz', (nav, props) => {
  const kind = props.kind;
  const audio = kind === QuizKind.audioToTranslation;
  const root = h('div', { class: 'screen' });

  let engine;
  let question = null;
  let picked = null;
  let correctCount = 0;

  function title() {
    if (kind === QuizKind.wordToTranslation) return t('quizMode');
    if (kind === QuizKind.translationToWord) return t('reverseQuizMode');
    return t('listeningMode');
  }

  function speakCurrent() {
    if (question) speak(question.pair.word, Store.activeCourse.targetLang);
  }

  function start() {
    engine = new QuizEngine(props.pairs, kind);
    correctCount = 0;
    advance();
  }

  function advance() {
    picked = null;
    question = engine.next();
    if (question == null) {
      setTimeout(showFinished, 0);
    } else if (audio) {
      speakCurrent();
    }
    render();
  }

  function pick(option) {
    if (picked != null) return;
    picked = option;
    if (option === question.correct) correctCount++;
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
    if (restart) start();
    else nav.pop();
  }

  function optionButton(option) {
    const answered = picked != null;
    const isCorrect = option === question.correct;
    const isPicked = option === picked;
    let cls = 'quiz-option';
    if (answered && isCorrect) cls += ' quiz-correct';
    else if (answered && isPicked && !isCorrect) cls += ' quiz-wrong';
    return h('button', { class: cls, onClick: () => pick(option) }, option);
  }

  function render() {
    if (question == null) {
      root.replaceChildren(scaffold({ nav, title: title(), body: h('div') }));
      return;
    }
    const total = engine.remaining + 1;
    const promptArea = audio
      ? h(
          'button',
          { class: 'quiz-audio-btn', title: t('listenAgain'), onClick: speakCurrent },
          icon('volume', { size: 96 }),
        )
      : h('div', { class: 'quiz-prompt' }, question.prompt);

    const body = h('div', { class: 'quiz-body' }, [
      h('div', { class: 'quiz-prompt-area' }, promptArea),
      h('div', { class: 'quiz-options' }, question.options.map(optionButton)),
      button({
        label: t('next'),
        variant: 'filled',
        block: true,
        disabled: picked == null,
        onClick: advance,
      }),
    ]);

    root.replaceChildren(
      scaffold({
        nav,
        title: `${title()} · ${t('leftCount', { count: compactCount(total) })}`,
        body,
      }),
    );
  }

  start();
  return root;
});
