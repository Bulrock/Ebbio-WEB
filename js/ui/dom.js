// Tiny DOM helpers — a hyperscript `h`, screen scaffolding, and the
// overlay primitives (dialogs, snackbars) shared by every screen.
import { Store } from '../store.js';

/// h('div', {class:'x', onClick:fn}, child, [children], 'text')
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function')
        el.addEventListener(k.slice(2).toLowerCase(), v);
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
  }
  append(el, children);
  return el;
}

function append(el, children) {
  for (const c of children) {
    if (c == null || c === false) continue;
    if (Array.isArray(c)) append(el, c);
    else if (c instanceof Node) el.appendChild(c);
    else el.appendChild(document.createTextNode(String(c)));
  }
}

export function clear(el) {
  el.replaceChildren();
}

/// Builds a screen root that can rebuild itself. `build(nav, props, rerender)`
/// returns the content element. Reactive screens rebuild on any Store change;
/// tickMs rebuilds on a timer (due counters advance as time passes).
export function createScreen(nav, props, { build, reactive = false, tickMs = 0 }) {
  const root = h('div', { class: 'screen' });
  const rerender = () => {
    const y = root.scrollTop;
    root.replaceChildren(build(nav, props, rerender));
    root.scrollTop = y;
  };
  rerender();
  let unsub = null;
  let timer = null;
  if (reactive) unsub = Store.subscribe(rerender);
  if (tickMs) timer = setInterval(rerender, tickMs);
  root._dispose = () => {
    if (unsub) unsub();
    if (timer) clearInterval(timer);
  };
  return root;
}

// ---- overlays --------------------------------------------------------

/// A modal dialog. `actions` is a list of {label, value, kind}. Resolves
/// with the chosen value (or null if dismissed via the scrim/Escape).
export function dialog({ title, content, actions, dismissible = true }) {
  return new Promise((resolve) => {
    const close = (value) => {
      scrim.classList.remove('open');
      scrim.addEventListener('transitionend', () => scrim.remove(), { once: true });
      resolve(value);
    };
    const btns = (actions || []).map((a) =>
      h(
        'button',
        {
          class: `btn ${a.kind === 'filled' ? 'btn-filled' : 'btn-text'}`,
          onClick: () => close(a.value),
        },
        a.label,
      ),
    );
    const card = h('div', { class: 'dialog', onClick: (e) => e.stopPropagation() }, [
      title ? h('h2', { class: 'dialog-title' }, title) : null,
      content ? h('div', { class: 'dialog-body' }, content) : null,
      h('div', { class: 'dialog-actions' }, btns),
    ]);
    const scrim = h(
      'div',
      {
        class: 'scrim',
        onClick: () => {
          if (dismissible) close(null);
        },
      },
      card,
    );
    document.body.appendChild(scrim);
    requestAnimationFrame(() => scrim.classList.add('open'));
    if (dismissible) {
      const onKey = (e) => {
        if (e.key === 'Escape') {
          window.removeEventListener('keydown', onKey);
          close(null);
        }
      };
      window.addEventListener('keydown', onKey);
    }
  });
}

/// Convenience yes/no confirm. Resolves true when the primary action taken.
export function confirm({ title, confirmLabel, cancelLabel }) {
  return dialog({
    title,
    actions: [
      { label: cancelLabel, value: false, kind: 'text' },
      { label: confirmLabel, value: true, kind: 'filled' },
    ],
  }).then((v) => v === true);
}

let _snackTimer = null;
export function snackbar(text) {
  let bar = document.getElementById('snackbar');
  if (!bar) {
    bar = h('div', { id: 'snackbar', class: 'snackbar' });
    document.body.appendChild(bar);
  }
  bar.textContent = text;
  bar.classList.add('show');
  clearTimeout(_snackTimer);
  _snackTimer = setTimeout(() => bar.classList.remove('show'), 3200);
}
