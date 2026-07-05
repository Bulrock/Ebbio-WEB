// A minimal screen-stack router with slide transitions. Screens are
// registered by name; each factory returns a root element (optionally with
// a `_dispose` cleanup, as produced by createScreen).

const registry = {};

export function register(name, factory) {
  registry[name] = factory;
}

export const nav = {
  _container: null,
  _stack: [], // { name, props, el }

  init(container) {
    this._container = container;
  },

  get depth() {
    return this._stack.length;
  },

  push(name, props = {}) {
    const factory = registry[name];
    if (!factory) throw new Error(`Unknown screen: ${name}`);
    // Register the entry BEFORE building so the screen sees the correct
    // depth (a pushed screen must show a back button; the root must not).
    const entry = { name, props, el: null };
    this._stack.push(entry);
    const el = factory(this, props);
    entry.el = el;
    el.classList.add('screen-enter');
    this._container.appendChild(el);
    // Force layout, then animate in.
    requestAnimationFrame(() => {
      el.classList.add('screen-enter-active');
      el.classList.remove('screen-enter');
    });
  },

  pop() {
    if (this._stack.length <= 1) return;
    const top = this._stack.pop();
    top.el.classList.add('screen-exit-active');
    top.el.addEventListener(
      'transitionend',
      () => {
        if (top.el._dispose) top.el._dispose();
        top.el.remove();
      },
      { once: true },
    );
  },

  /// Replace the whole stack with a single screen (used after the splash).
  reset(name, props = {}) {
    for (const s of this._stack) {
      if (s.el._dispose) s.el._dispose();
      s.el.remove();
    }
    this._stack = [];
    this.push(name, props);
  },
};
