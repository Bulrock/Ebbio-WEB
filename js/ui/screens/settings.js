import { h, createScreen, dialog, confirm, snackbar } from '../dom.js';
import { scaffold, button, listTile, selectMenu } from '../components.js';
import { icon } from '../icons.js';
import { register, nav as globalNav } from '../router.js';
import { Store } from '../../store.js';
import { t, setLocale, currentLocale, resolveUiLocale } from '../../i18n.js';
import { ResetMode } from '../../models.js';
import { Notifications } from '../../services/notifications.js';
import { humanDuration } from '../../util/format.js';
import { encodeBackup, decodeBackup } from '../../logic/backup_codec.js';
import { compactCount } from '../../util/format.js';
import { courseLanguages, uiLanguageNames, languageName, courseLabel } from '../../util/languages.js';

register('settings', (nav, props) => {
  // Local editing state persists across the reactive rebuilds.
  const state = {
    intervals: [],
    resetMode: ResetMode.toStart,
    nativeLang: 'en',
    uiLang: Store.settings.uiLang,
    editedCourseLang: '',
  };

  function loadFrom(course) {
    state.editedCourseLang = course.targetLang;
    state.intervals = [...course.intervalsInMinutes];
    state.resetMode = course.resetMode;
    state.nativeLang = course.nativeLang;
  }
  loadFrom(Store.activeCourse);

  let rerender = () => {};

  async function saveAll() {
    if (state.intervals.length === 0) {
      snackbar(t('needOneStep'));
      return;
    }
    const course = Store.courseByLang(state.editedCourseLang);
    if (course) {
      course.intervalsInMinutes = [...state.intervals].sort((a, b) => a - b);
      course.resetMode = state.resetMode;
      course.nativeLang = state.nativeLang;
      await Store.saveCourse(course);
    }
    await Store.saveSettings({ uiLang: state.uiLang });

    const newLocale = resolveUiLocale(Store.settings, Store.activeCourse.nativeLang);
    if (newLocale !== currentLocale()) {
      setLocale(newLocale);
      globalNav.reset('home');
      snackbar(t('settingsSaved'));
    } else {
      nav.pop();
      snackbar(t('settingsSaved'));
    }
  }

  async function createCourseDialog() {
    const taken = new Set(Store.courses.map((c) => c.targetLang));
    const available = Object.keys(courseLanguages).filter((c) => !taken.has(c));
    if (available.length === 0) {
      snackbar(t('allCoursesCreated'));
      return;
    }
    let target = available[0];
    let native = Store.activeCourse.nativeLang;

    const targetSel = selectMenu({
      value: target,
      options: available.map((c) => ({ value: c, label: languageName(c) })),
      onChange: (v) => (target = v),
    });
    const nativeSel = selectMenu({
      value: native,
      options: Object.keys(courseLanguages).map((c) => ({ value: c, label: languageName(c) })),
      onChange: (v) => (native = v),
    });
    const content = h('div', { class: 'form' }, [
      h('label', { class: 'field' }, [h('span', { class: 'field-label' }, t('learningLanguageLabel')), targetSel]),
      h('label', { class: 'field' }, [h('span', { class: 'field-label' }, t('myLanguageLabel')), nativeSel]),
    ]);
    const ok = await dialog({
      title: t('newCourse'),
      content,
      actions: [
        { label: t('cancel'), value: false, kind: 'text' },
        { label: t('create'), value: true, kind: 'filled' },
      ],
    });
    if (ok) {
      const course = await Store.createCourse(target, native);
      if (course) {
        await Store.setActiveCourse(course.targetLang);
        loadFrom(course);
        rerender();
      }
    }
  }

  async function deleteCourse(course) {
    const yes = await confirm({
      title: t('deleteCourseQuestion', { course: courseLabel(course.targetLang, course.nativeLang) }),
      confirmLabel: t('delete'),
      cancelLabel: t('cancel'),
    });
    if (!yes) return;
    for (const card of Store.courseCards(course.targetLang)) {
      await Notifications.cancelFor(card);
    }
    await Store.deleteCourse(course);
    loadFrom(Store.activeCourse);
    rerender();
  }

  async function editInterval(index) {
    let unit = state.intervals[index] % 60 === 0 ? 60 : 1;
    const input = h('input', {
      class: 'field-input',
      type: 'number',
      min: '1',
      value: String(Math.floor(state.intervals[index] / unit)),
    });
    const minLabel = t('humanMinutes', { count: '' }).trim();
    const hourLabel = t('humanHours', { count: '' }).trim();
    const seg = h('div', { class: 'segmented' });
    const renderSeg = () => {
      seg.replaceChildren(
        h('button', { class: `seg-btn${unit === 1 ? ' seg-active' : ''}`, onClick: () => { unit = 1; renderSeg(); } }, minLabel),
        h('button', { class: `seg-btn${unit === 60 ? ' seg-active' : ''}`, onClick: () => { unit = 60; renderSeg(); } }, hourLabel),
      );
    };
    renderSeg();
    const content = h('div', { class: 'form' }, [
      input,
      h('div', { class: 'field-helper' }, t('stepDurationHelper')),
      seg,
    ]);
    const ok = await dialog({
      title: t('stepDuration', { index: index + 1 }),
      content,
      actions: [
        { label: t('cancel'), value: false, kind: 'text' },
        { label: t('ok'), value: true, kind: 'filled' },
      ],
    });
    if (!ok) return;
    const value = parseInt(input.value, 10);
    if (!Number.isNaN(value) && value > 0) {
      state.intervals[index] = value * unit;
      state.intervals.sort((a, b) => a - b);
      rerender();
    }
  }

  function build(nav_, props_, rr) {
    rerender = rr;
    const courses = Store.courses;
    const editedNative = Store.courseByLang(state.editedCourseLang)?.nativeLang ?? state.nativeLang;
    const editedLabel = courseLabel(state.editedCourseLang, editedNative);

    const children = [];

    // ---- Courses ----
    children.push(h('div', { class: 'settings-title' }, t('courses')));
    for (const course of courses) {
      children.push(
        listTile({
          leading: icon(course.targetLang === state.editedCourseLang ? 'radioOn' : 'radioOff', { cls: 'radio-icon' }),
          title: courseLabel(course.targetLang, course.nativeLang),
          subtitle: t('totalWords', { count: compactCount(Store.courseCards(course.targetLang).length) }),
          trailing:
            courses.length > 1
              ? h('button', { class: 'icon-btn', title: t('delete'), onClick: (e) => { e.stopPropagation(); deleteCourse(course); } }, icon('trash'))
              : null,
          onClick: async () => {
            await Store.setActiveCourse(course.targetLang);
            loadFrom(course);
            rerender();
          },
        }),
      );
    }
    children.push(button({ label: t('newCourse'), iconName: 'add', variant: 'text', onClick: createCourseDialog }));

    children.push(h('hr', { class: 'divider' }));

    // ---- Course settings ----
    children.push(h('div', { class: 'settings-title' }, t('courseSettings', { course: editedLabel })));

    const nativeSel = selectMenu({
      value: state.nativeLang,
      options: Object.keys(courseLanguages).map((c) => ({ value: c, label: languageName(c) })),
      onChange: (v) => (state.nativeLang = v),
    });
    children.push(h('label', { class: 'field' }, [h('span', { class: 'field-label' }, t('myLanguageLabel')), nativeSel]));

    children.push(h('div', { class: 'settings-subtitle' }, t('repetitionSteps')));
    state.intervals.forEach((minutes, i) => {
      children.push(
        listTile({
          leading: h('div', { class: 'step-badge' }, String(i + 1)),
          title: humanDuration(minutes),
          subtitle: t('afterAnswer', { duration: humanDuration(minutes) }),
          onClick: () => editInterval(i),
          trailing:
            state.intervals.length > 1
              ? h('button', { class: 'icon-btn', title: t('deleteStep'), onClick: (e) => { e.stopPropagation(); state.intervals.splice(i, 1); rerender(); } }, icon('trash'))
              : null,
        }),
      );
    });
    children.push(
      button({
        label: t('addStep'),
        iconName: 'add',
        variant: 'text',
        onClick: () => {
          const last = state.intervals[state.intervals.length - 1] || 60;
          state.intervals.push(last * 2);
          rerender();
          editInterval(state.intervals.length - 1);
        },
      }),
    );

    children.push(h('div', { class: 'settings-subtitle' }, t('onMistake')));
    const resetSeg = h('div', { class: 'segmented' }, [
      h('button', { class: `seg-btn${state.resetMode === ResetMode.toStart ? ' seg-active' : ''}`, onClick: () => { state.resetMode = ResetMode.toStart; rerender(); } }, [icon('replay', { size: 18 }), h('span', {}, t('resetToStart'))]),
      h('button', { class: `seg-btn${state.resetMode === ResetMode.toPrevious ? ' seg-active' : ''}`, onClick: () => { state.resetMode = ResetMode.toPrevious; rerender(); } }, [icon('undo', { size: 18 }), h('span', {}, t('resetOneBack'))]),
    ]);
    children.push(resetSeg);

    children.push(h('hr', { class: 'divider' }));

    // ---- UI language ----
    children.push(h('div', { class: 'settings-title' }, t('uiLanguage')));
    const uiSel = selectMenu({
      value: state.uiLang,
      options: [
        { value: '', label: t('uiLangAuto') },
        ...Object.entries(uiLanguageNames).map(([code, name]) => ({ value: code, label: name })),
      ],
      onChange: (v) => (state.uiLang = v),
    });
    children.push(h('label', { class: 'field' }, [uiSel]));

    // ---- data: storage usage stats -------------------------------------
    children.push(h('hr', { class: 'divider' }));
    children.push(h('div', { class: 'settings-title' }, t('dataSection')));
    const statsLine = h('div', { class: 'settings-subtitle' }, '…');
    function renderStats(size) {
      statsLine.textContent = t('storageStats', {
        cards: compactCount(Store.allCards.length),
        courses: compactCount(Store.courses.length),
        size,
      });
    }
    // The size of the backup JSON — the number the user actually gets
    // when exporting (a whole-origin storage estimate includes service
    // worker caches and reads an order of magnitude too big).
    const backupBytes = new Blob([
      encodeBackup({
        courses: Store.courses,
        cards: Store.allCards,
        settings: Store.settings,
        nowMs: Date.now(),
      }),
    ]).size;
    const kb = backupBytes / 1024;
    renderStats(kb < 1024 ? `${kb.toFixed(1)} KB` : `${(kb / 1024).toFixed(1)} MB`);
    children.push(statsLine);

    // Export downloads a JSON file; import reads one and merges it.
    const importInput = h('input', {
      type: 'file',
      accept: 'application/json,.json',
      style: 'display:none',
    });
    importInput.addEventListener('change', async () => {
      const file = importInput.files && importInput.files[0];
      importInput.value = '';
      if (!file) return;
      try {
        const backup = decodeBackup(await file.text());
        const imported = await Store.importBackup(backup);
        snackbar(t('importedCards', { count: imported }));
        rerender();
      } catch {
        snackbar(t('importFailed'));
      }
    });
    children.push(importInput);
    children.push(
      h('div', { class: 'data-actions' }, [
        button({
          label: t('exportData'),
          iconName: 'external',
          variant: 'outlined',
          onClick: () => {
            const json = encodeBackup({
              courses: Store.courses,
              cards: Store.allCards,
              settings: Store.settings,
              nowMs: Date.now(),
            });
            const stamp = new Date().toISOString().slice(0, 10);
            const blob = new Blob([json], { type: 'application/json' });
            const a = h('a', {
              href: URL.createObjectURL(blob),
              download: `ebbio-backup-${stamp}.json`,
            });
            a.click();
            URL.revokeObjectURL(a.href);
          },
        }),
        button({
          label: t('importData'),
          iconName: 'save',
          variant: 'outlined',
          onClick: () => importInput.click(),
        }),
      ]),
    );

    return scaffold({
      nav: nav_,
      title: t('settings'),
      body: h('div', { class: 'settings-body' }, children),
      bottom: button({ label: t('save'), iconName: 'save', variant: 'cta', block: true, onClick: saveAll }),
    });
  }

  return createScreen(nav, props, { build, reactive: true });
});
