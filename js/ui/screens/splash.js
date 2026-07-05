import { h } from '../dom.js';
import { t } from '../../i18n.js';

// Animated warm-up screen shown while storage initializes: the forgetting
// curve draws itself, the icon springs in, then the wordmark and the
// developer credit fade in. Animation is driven by CSS.
export function splashScreen() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'splash-curve');
  svg.setAttribute('viewBox', '0 0 1000 400');
  svg.setAttribute('preserveAspectRatio', 'none');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute(
    'd',
    'M0,140 Q135,270 300,240 L300,140 Q430,250 620,225 L620,140 Q810,235 1000,215',
  );
  path.setAttribute('class', 'splash-curve-path');
  svg.appendChild(path);

  return h('div', { class: 'splash' }, [
    svg,
    h('div', { class: 'splash-center' }, [
      h('img', { class: 'splash-icon', src: 'assets/icon/app_icon.png', alt: 'Ebbio' }),
      h('div', { class: 'splash-wordmark' }, [
        h('div', { class: 'splash-title' }, 'Ebbio'),
        h('div', { class: 'splash-slogan' }, t('slogan')),
      ]),
    ]),
    h('div', { class: 'splash-credit' }, t('developedBy')),
  ]);
}
