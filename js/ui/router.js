// A minimal screen-stack router with slide transitions. Screens are
// registered by name; each factory returns a root element (optionally with
// a `_dispose` cleanup, as produced by createScreen).
import { afterTransition, commitStyles, snapTransition } from './anim.js';

const registry = {};

// Must match the .screen transition duration in styles.css.
const SLIDE_MS = 300;

export function register(name, factory) {
  registry[name] = factory;
}

export const nav = {
  _container: null,
  _stack: [], // { name, props, el }

  init(container) {
    this._container = container;
    // A page that was suspended mid-slide comes back with the transition
    // dead and the screen stranded partway across. Put it where it belongs
    // instead of leaving the app looking frozen.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.settle();
    });
    window.addEventListener('pageshow', () => this.settle());
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
    el.classList.add('screen-enter', 'screen-animating');
    this._container.appendChild(el);
    // Commit the offscreen start position, then animate in — synchronously,
    // because a requestAnimationFrame that never runs would park the new
    // screen offscreen while the stack believes it is showing.
    commitStyles(el);
    el.classList.remove('screen-enter');
    el.classList.add('screen-enter-active');
    afterTransition(el, SLIDE_MS, () => {
      el.classList.remove('screen-animating');
      // Screens defer anything that disturbs the viewport — focusing an
      // input pops the iOS keyboard, which kills a running transition —
      // until this lands.
      el.dispatchEvent(new CustomEvent('screen-entered'));
    });
  },

  pop() {
    if (this._stack.length <= 1) return;
    const top = this._stack.pop();
    top.el.classList.add('screen-exit-active', 'screen-animating');
    // The timeout inside afterTransition is what makes this safe: a screen
    // whose slide-out never completes would otherwise stay in the DOM
    // forever, keeping its tick timer and store subscription alive and
    // rebuilding itself on every change for the rest of the session.
    afterTransition(top.el, SLIDE_MS, () => {
      if (top.el._dispose) top.el._dispose();
      top.el.remove();
    });
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

  /// Forces every live screen to its resting position, cancelling any
  /// transition that stalled while the page was away.
  settle() {
    for (const s of this._stack) {
      if (!s.el || !s.el.isConnected) continue;
      s.el.classList.remove('screen-enter');
      s.el.classList.add('screen-enter-active');
      snapTransition(s.el);
    }
  },
};
