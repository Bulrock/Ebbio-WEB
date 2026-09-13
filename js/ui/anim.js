// Transition plumbing that survives iOS.
//
// Safari on iOS abandons a running CSS transition whenever the page is
// disturbed mid-flight — the software keyboard shifting the viewport, the
// app being suspended, a gesture taking over compositing — and then never
// fires `transitionend` for it. Anything that waits only on that event can
// therefore hang forever: a screen frozen halfway through its slide, or an
// invisible scrim left on top of the app swallowing every tap. Here the
// event is only an optimization; the timer is the guarantee.

/// Runs `fn` once: on the first `transitionend`, or after `ms` regardless.
export function afterTransition(el, ms, fn) {
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.removeEventListener('transitionend', finish);
    clearTimeout(timer);
    fn();
  };
  el.addEventListener('transitionend', finish);
  // Slack over the CSS duration: a backgrounded page delivers the timer
  // late, but it does deliver it.
  const timer = setTimeout(finish, ms + 150);
  return finish;
}

/// Commits `el`'s current styles so the class change that follows animates
/// from them. Deliberately synchronous: requestAnimationFrame does not run
/// on a hidden or throttled page, which would strand the element in its
/// start state — offscreen, for good.
export function commitStyles(el) {
  void el.offsetWidth;
}

/// Jumps `el` to the end state of whatever transition is in flight.
export function snapTransition(el) {
  const prev = el.style.transition;
  el.style.transition = 'none';
  void el.offsetWidth;
  el.style.transition = prev;
}

/// Focuses `el` without disturbing a screen slide that is still running:
/// on iOS the keyboard shifts the viewport out from under a transforming
/// element and the transition dies where it stands.
export function focusWhenSettled(screen, el) {
  if (screen.isConnected && !screen.classList.contains('screen-animating')) {
    requestAnimationFrame(() => el.focus());
    return;
  }
  screen.addEventListener('screen-entered', () => el.focus(), { once: true });
}
