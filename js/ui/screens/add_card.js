import { h, snackbar } from '../dom.js';
import { scaffold, button } from '../components.js';
import { icon } from '../icons.js';
import { register } from '../router.js';
import { Store } from '../../store.js';
import { t } from '../../i18n.js';
import { makeCard } from '../../models.js';
import { autofill } from '../../services/autofill.js';
import { Notifications } from '../../services/notifications.js';
import { humanDuration } from '../../util/format.js';

register('addCard', (nav) => {
  const course = Store.activeCourse;

  let loading = false;
  let lastAutofilledWord = '';
  let autoDefinition = null;
  let autoTranslation = null;
  // Wiktionary article link for the last successful lookup; saved on
  // the card so the full article stays one tap away.
  let sourceUrl = '';

  const wordInput = h('input', {
    class: 'field-input',
    type: 'text',
    autofocus: true,
    autocomplete: 'off',
  });
  const defInput = h('textarea', { class: 'field-input def-input' });
  const transInput = h('input', { class: 'field-input', type: 'text', autocomplete: 'off' });

  const spinner = h('span', { class: 'field-spinner' });
  const wandBtn = h(
    'button',
    { class: 'icon-btn field-affix', title: t('autofillTooltip'), onClick: () => runAutofill() },
    icon('wand'),
  );
  const affix = h('div', { class: 'field-affix-slot' }, wandBtn);

  const saveBtn = button({
    label: t('saveCard'),
    iconName: 'save',
    variant: 'cta',
    block: true,
    disabled: true,
    onClick: () => save(),
  });

  function warnIfDuplicate(word) {
    // Normalized match (trim, collapse spaces, lowercase) against the
    // course, backed by the store's normalizedTerm field.
    if (!Store.hasWord(word, course.targetLang)) return false;
    snackbar(t('wordAlreadyAdded', { word }));
    return true;
  }

  function setLoading(v) {
    loading = v;
    affix.replaceChildren(v ? spinner : wandBtn);
  }

  // Writes value into a field unless the user edited it: overwritable while
  // empty or still holding exactly what the previous autofill put there.
  function applyAutofill(input, value, lastAuto) {
    const current = input.value.trim();
    const untouched = current === '' || current === (lastAuto || '').trim();
    if (!untouched) return lastAuto;
    input.value = value || '';
    return value;
  }

  async function runAutofill() {
    const word = wordInput.value.trim();
    if (word === '' || word === lastAutofilledWord) return;
    if (warnIfDuplicate(word)) return;
    lastAutofilledWord = word;

    setLoading(true);
    let result;
    try {
      result = await autofill(word, course.targetLang, course.nativeLang);
    } catch {
      result = { definition: null, translation: null, sourceUrl: null, lookupFailed: true };
    }
    if (wordInput.value.trim() !== word) {
      setLoading(false);
      return;
    }
    setLoading(false);
    autoDefinition = applyAutofill(defInput, result.definition, autoDefinition);
    autoTranslation = applyAutofill(transInput, result.translation, autoTranslation);
    sourceUrl = result.sourceUrl || '';
    // Silence would read as "still searching" — say the lookup came
    // back empty. A network problem is worded differently from a
    // missing article.
    if (result.definition == null) {
      snackbar(result.lookupFailed ? t('lookupFailed') : t('definitionNotFound', { word }));
    }
  }

  async function save() {
    // Collapse inner whitespace; the case is kept as typed — proper
    // nouns are legitimate vocabulary.
    const word = wordInput.value.trim().replace(/\s+/g, ' ');
    if (word === '') {
      snackbar(t('enterWord'));
      return;
    }
    if (warnIfDuplicate(word)) return;

    const card = makeCard({
      word,
      definition: defInput.value.trim(),
      translation: transInput.value.trim(),
      nextReviewTime: Date.now() + course.intervalsInMinutes[0] * 60000,
      courseLang: course.targetLang,
      // Keep the link only when the definition actually came from
      // the article (the user may have replaced it — still useful).
      sourceUrl: defInput.value.trim() === '' ? '' : sourceUrl,
    });
    await Store.addCard(card);
    await Notifications.requestPermission();
    await Notifications.scheduleReview(card, t('notifTitle', { word }), t('notifBody'));

    nav.pop();
    snackbar(t('cardAdded', { word, duration: humanDuration(course.intervalsInMinutes[0]) }));
  }

  wordInput.addEventListener('input', () => {
    saveBtn.disabled = wordInput.value.trim() === '';
  });
  wordInput.addEventListener('blur', () => runAutofill());
  wordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runAutofill();
    }
  });

  function fieldRow(labelText, input, withAffix = false) {
    return h('label', { class: 'field' }, [
      h('span', { class: 'field-label' }, labelText),
      withAffix
        ? h('div', { class: 'field-with-affix' }, [input, affix])
        : input,
    ]);
  }

  // The definition is the largest content — its row (and the textarea
  // inside) stretches to take all the height the screen has to offer.
  const defRow = fieldRow(t('definitionField', { lang: course.targetLang }), defInput);
  defRow.classList.add('field-grow');
  const body = h('div', { class: 'form form-fill' }, [
    fieldRow(t('wordField', { lang: course.targetLang }), wordInput, true),
    defRow,
    fieldRow(t('translationField', { lang: course.nativeLang }), transInput),
  ]);

  // Save stays pinned to the bottom (like the mobile app), never scrolling
  // away with the form fields.
  const el = h(
    'div',
    { class: 'screen' },
    scaffold({ nav, title: t('newWord'), body, bottom: saveBtn }),
  );
  requestAnimationFrame(() => wordInput.focus());
  return el;
});
