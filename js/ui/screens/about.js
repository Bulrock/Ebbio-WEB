import { h } from '../dom.js';
import { scaffold, listTile, glassPanel } from '../components.js';
import { icon } from '../icons.js';
import { register } from '../router.js';
import { t } from '../../i18n.js';

const FORGETTING_CURVE_URL = 'https://en.wikipedia.org/wiki/Forgetting_curve';
const EBBINGHAUS_URL = 'https://en.wikipedia.org/wiki/Hermann_Ebbinghaus';

const CURVE_COLOR = '#34d399';
const DECAY_COLOR = 'rgba(255,255,255,0.45)';
const REVIEW_COLOR = '#fbbf24';

// Draws the classic spaced-repetition picture: a steep dashed decay curve
// without reviews and a sawtooth curve where each review resets retention
// and flattens the following decline. Ported from the mobile CustomPainter.
function drawCurve(canvas) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const hpx = canvas.clientHeight;
  if (w === 0 || hpx === 0) return;
  canvas.width = w * dpr;
  canvas.height = hpx * dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, hpx);
  const h_ = hpx;

  const retention = (x, x0, rate) => 0.1 * h_ + 0.8 * h_ * (1 - Math.exp((-(x - x0) * rate) / w));

  // Dashed "no reviews" curve.
  ctx.strokeStyle = DECAY_COLOR;
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.moveTo(0, retention(0, 0, 6));
  for (let x = 0; x <= w; x += 2) ctx.lineTo(x, retention(x, 0, 6));
  ctx.stroke();
  ctx.setLineDash([]);

  // Sawtooth curve with reviews: each segment decays slower.
  const reviewsX = [0, 0.22 * w, 0.48 * w, 0.78 * w];
  const rates = [6, 3.5, 2, 1.1];
  ctx.strokeStyle = CURVE_COLOR;
  ctx.lineWidth = 3.5;
  ctx.lineCap = 'round';
  for (let i = 0; i < reviewsX.length; i++) {
    const start = reviewsX[i];
    const end = i + 1 < reviewsX.length ? reviewsX[i + 1] : w;
    ctx.beginPath();
    ctx.moveTo(start, 0.1 * h_);
    for (let x = start; x <= end; x += 2) ctx.lineTo(x, retention(x, start, rates[i]));
    ctx.stroke();
    if (i > 0) {
      ctx.strokeStyle = 'rgba(52,211,153,0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(start, retention(start, reviewsX[i - 1], rates[i - 1]));
      ctx.lineTo(start, 0.1 * h_);
      ctx.stroke();
      ctx.fillStyle = REVIEW_COLOR;
      ctx.beginPath();
      ctx.arc(start, 0.1 * h_, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = CURVE_COLOR;
      ctx.lineWidth = 3.5;
    }
  }

  // Baseline.
  ctx.strokeStyle = DECAY_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 0.92 * h_);
  ctx.lineTo(w, 0.92 * h_);
  ctx.stroke();
}

function linkTile(iconName, label, url) {
  return listTile({
    leading: icon(iconName),
    title: label,
    trailing: icon('external'),
    onClick: () => window.open(url, '_blank', 'noopener'),
  });
}

register('about', (nav) => {
  const canvas = h('canvas', { class: 'curve-canvas' });

  const body = h('div', { class: 'about-body' }, [
    h('h2', { class: 'about-headline' }, t('aboutHeadline')),
    glassPanel(canvas, { cls: 'curve-panel' }),
    h('p', { class: 'about-para' }, t('aboutIntro')),
    h('p', { class: 'about-para' }, t('aboutCurveText')),
    h('p', { class: 'about-para' }, t('aboutSpacingText')),
    h('p', { class: 'about-para' }, t('aboutEbbioText')),
    h('div', { class: 'settings-title' }, t('learnMore')),
    linkTile('chart', t('wikiForgettingCurve'), FORGETTING_CURVE_URL),
    linkTile('person', t('wikiEbbinghaus'), EBBINGHAUS_URL),
  ]);

  const el = h('div', { class: 'screen' }, scaffold({ nav, title: t('aboutMethodTitle'), body }));

  const redraw = () => drawCurve(canvas);
  // Draw once laid out, and keep it crisp on resize.
  requestAnimationFrame(() => requestAnimationFrame(redraw));
  window.addEventListener('resize', redraw);
  el._dispose = () => window.removeEventListener('resize', redraw);
  return el;
});
