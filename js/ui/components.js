// Reusable UI atoms shared by the screens: buttons, glass panels, list
// tiles and the app-bar scaffold. Styling lives in css/styles.css.
import { h } from './dom.js';
import { icon } from './icons.js';

export function iconButton(name, onClick, { title = '', cls = '' } = {}) {
  return h(
    'button',
    { class: `icon-btn ${cls}`, title, 'aria-label': title, onClick },
    icon(name),
  );
}

/// variant: 'cta' | 'filled' | 'outlined' | 'text'
export function button({
  label,
  iconName = null,
  onClick,
  variant = 'filled',
  disabled = false,
  block = false,
  color = null,
}) {
  // Always attach the handler; the native `disabled` attribute gates it, so
  // a button that starts disabled still works once it is enabled later.
  const el = h(
    'button',
    {
      class: `btn btn-${variant}${block ? ' btn-block' : ''}`,
      disabled: disabled ? true : null,
      onClick,
    },
    [iconName ? icon(iconName) : null, label ? h('span', {}, label) : null],
  );
  if (color) el.style.setProperty('--btn-accent', color);
  return el;
}

export function glassPanel(children, { cls = '', onClick = null } = {}) {
  return h('div', { class: `glass-panel ${cls}`, onClick }, children);
}

export function listTile({
  leading = null,
  title,
  subtitle = null,
  trailing = null,
  onClick = null,
  enabled = true,
  dense = false,
}) {
  return h(
    'div',
    {
      class: `tile${dense ? ' tile-dense' : ''}${enabled ? '' : ' tile-disabled'}${onClick ? ' tile-tappable' : ''}`,
      onClick: enabled && onClick ? onClick : null,
    },
    [
      leading ? h('div', { class: 'tile-leading' }, leading) : null,
      h('div', { class: 'tile-main' }, [
        h('div', { class: 'tile-title' }, title),
        subtitle != null ? h('div', { class: 'tile-subtitle' }, subtitle) : null,
      ]),
      trailing ? h('div', { class: 'tile-trailing' }, trailing) : null,
    ],
  );
}

/// A custom dropdown styled in the app's glass/emerald language, replacing
/// the OS-native <select> popup. `options` is [{value, label}].
/// variant: 'field' (bordered box) | 'plain' (transparent, e.g. inside the
/// course switcher panel).
export function selectMenu({ value, options, onChange, variant = 'field', placeholder = '' }) {
  const labelOf = (v) => {
    const o = options.find((x) => x.value === v);
    return o ? o.label : placeholder;
  };
  const valueEl = h('span', { class: 'select-value' }, labelOf(value));
  const trigger = h(
    'button',
    { class: `select-trigger select-${variant}`, onClick: () => open() },
    [valueEl, icon('chevronDown', { cls: 'select-caret' })],
  );

  let current = value;

  function open() {
    const close = (picked) => {
      scrim.classList.remove('open');
      scrim.addEventListener('transitionend', () => scrim.remove(), { once: true });
      window.removeEventListener('keydown', onKey);
      if (picked !== undefined) {
        current = picked;
        valueEl.textContent = labelOf(picked);
        onChange(picked);
      }
    };
    const list = h(
      'div',
      { class: 'menu-list' },
      options.map((o) =>
        h(
          'button',
          {
            class: `menu-option${o.value === current ? ' menu-option-active' : ''}`,
            onClick: () => close(o.value),
          },
          [h('span', { class: 'menu-option-label' }, o.label), o.value === current ? icon('check', { size: 18 }) : null],
        ),
      ),
    );
    const panel = h('div', { class: 'menu-panel', onClick: (e) => e.stopPropagation() }, list);
    const scrim = h('div', { class: 'scrim', onClick: () => close() }, panel);
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.body.appendChild(scrim);
    window.addEventListener('keydown', onKey);
    requestAnimationFrame(() => {
      scrim.classList.add('open');
      const active = list.querySelector('.menu-option-active');
      if (active) active.scrollIntoView({ block: 'center' });
    });
  }

  return trigger;
}

/// The glass card + emerald gradient shell every screen sits on.
export function scaffold({ nav, title, actions = [], body, bottom = null, back = true }) {
  const leading =
    back && nav && nav.depth > 1
      ? iconButton('back', () => nav.pop(), { title: 'Back' })
      : h('div', { class: 'appbar-spacer' });
  const header = h('header', { class: 'appbar' }, [
    leading,
    h('h1', { class: 'appbar-title' }, title || ''),
    h('div', { class: 'appbar-actions' }, actions),
  ]);
  return h('div', { class: 'scaffold' }, [
    header,
    h('main', { class: 'scaffold-body' }, body),
    bottom ? h('div', { class: 'scaffold-bottom' }, bottom) : null,
  ]);
}
