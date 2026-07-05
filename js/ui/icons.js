// Self-contained line-icon set (Feather-style, offline). Each entry is the
// inner markup of a 24x24 stroke SVG; `icon(name)` wraps it. Keeps the app
// free of any external font or CDN, so it works offline and inside the CSP.

const PATHS = {
  add: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  close: '<line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/>',
  back: '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 5 5 12 12 19"/>',
  forward: '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
  chevronRight: '<polyline points="9 6 15 12 9 18"/>',
  chevronDown: '<polyline points="6 9 12 15 18 9"/>',
  // Symmetric 8-tooth cog with a cut-out centre (even-odd). Generated to be
  // perfectly regular so it never reads as a sun or looks lopsided.
  settings: {
    fill: true,
    inner:
      '<path fill-rule="evenodd" d="M 9.26,1.76 L 14.74,1.76 L 14.07,4.27 L 16.0,5.07 L 17.3,2.82 L 21.18,6.7 L 18.93,8.0 L 19.73,9.93 L 22.24,9.26 L 22.24,14.74 L 19.73,14.07 L 18.93,16.0 L 21.18,17.3 L 17.3,21.18 L 16.0,18.93 L 14.07,19.73 L 14.74,22.24 L 9.26,22.24 L 9.93,19.73 L 8.0,18.93 L 6.7,21.18 L 2.82,17.3 L 5.07,16.0 L 4.27,14.07 L 1.76,14.74 L 1.76,9.26 L 4.27,9.93 L 5.07,8.0 L 2.82,6.7 L 6.7,2.82 L 8.0,5.07 L 9.93,4.27 Z M 8.3,12.0 a 3.7,3.7 0 1,0 7.4,0 a 3.7,3.7 0 1,0 -7.4,0 Z"/>',
  },
  school:
    '<path d="M2 9l10-5 10 5-10 5-10-5z"/><path d="M6 11v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/><line x1="22" y1="9" x2="22" y2="14"/>',
  play: '<polygon points="7 4 20 12 7 20 7 4"/>',
  dumbbell:
    '<line x1="3" y1="8" x2="3" y2="16"/><line x1="6.5" y1="6" x2="6.5" y2="18"/><line x1="17.5" y1="6" x2="17.5" y2="18"/><line x1="21" y1="8" x2="21" y2="16"/><line x1="6.5" y1="12" x2="17.5" y2="12"/>',
  book: '<path d="M12 6C10 4.5 6.5 4.5 3 5v13c3.5-.5 7-.5 9 1 2-1.5 5.5-1.5 9-1V5c-3.5-.5-7-.5-9 1z"/><line x1="12" y1="6" x2="12" y2="20"/>',
  hourglass:
    '<path d="M7 4h10M7 20h10M8 4v3l4 5 4-5V4M8 20v-3l4-5 4 5v3"/>',
  volume:
    '<polygon points="4 9 8 9 12 5 12 19 8 15 4 15 4 9"/><path d="M15.5 9a3.5 3.5 0 010 6"/>',
  thumbUp:
    '<path d="M7 11v9H3v-9z"/><path d="M7 11l4.2-8a2 2 0 013 2.4L13 10h5.5a2 2 0 011.95 2.45l-1.4 6A2 2 0 0117.1 22H7"/>',
  thumbDown:
    '<path d="M17 13V4h4v9z"/><path d="M17 13l-4.2 8a2 2 0 01-3-2.4L11 14H5.5a2 2 0 01-1.95-2.45l1.4-6A2 2 0 016.9 2H17"/>',
  eye: '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><polyline points="8 3 8 8 15 8"/><rect x="8" y="13" width="8" height="8"/>',
  wand: '<path d="M4 20l10-10"/><path d="M14 4l1.2 2.4L18 8l-2.8 1.6L14 12l-1.2-2.4L10 8l2.8-1.6z"/><line x1="19" y1="13" x2="19" y2="16"/><line x1="17.5" y1="14.5" x2="20.5" y2="14.5"/>',
  trash:
    '<polyline points="4 7 20 7"/><path d="M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  clock: '<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 16 14"/>',
  shuffle:
    '<polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/>',
  sortAlpha:
    '<line x1="4" y1="6" x2="13" y2="6"/><line x1="4" y1="12" x2="11" y2="12"/><line x1="4" y1="18" x2="9" y2="18"/><polyline points="16 6 19 3 22 6"/><polyline points="16 18 19 21 22 18"/><line x1="19" y1="3" x2="19" y2="21"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>',
  quiz: '<circle cx="12" cy="12" r="9"/><path d="M9.2 9a2.8 2.8 0 015.3 1.2c0 1.8-2.5 2-2.5 3.8"/><line x1="12" y1="17" x2="12" y2="17.01"/>',
  hearing:
    '<path d="M8 8a4 4 0 018 0c0 2.5-2.5 3-3 5a2 2 0 01-4 .3"/><path d="M6 16.5A3.5 3.5 0 009.5 20"/>',
  keyboard:
    '<rect x="2" y="6" width="20" height="12" rx="2"/><line x1="6" y1="10" x2="6" y2="10.01"/><line x1="10" y1="10" x2="10" y2="10.01"/><line x1="14" y1="10" x2="14" y2="10.01"/><line x1="18" y1="10" x2="18" y2="10.01"/><line x1="8" y1="14" x2="16" y2="14"/>',
  party:
    '<line x1="12" y1="2" x2="12" y2="5"/><line x1="12" y1="19" x2="12" y2="22"/><line x1="2" y1="12" x2="5" y2="12"/><line x1="19" y1="12" x2="22" y2="12"/><line x1="5" y1="5" x2="7" y2="7"/><line x1="17" y1="17" x2="19" y2="19"/><line x1="19" y1="5" x2="17" y2="7"/><line x1="7" y1="17" x2="5" y2="19"/><circle cx="12" cy="12" r="2.5"/>',
  check: '<polyline points="20 6 9 17 4 12"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><line x1="3" y1="12" x2="21" y2="12"/><path d="M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18"/>',
  radioOn: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
  radioOff: '<circle cx="12" cy="12" r="9"/>',
  replay:
    '<polyline points="3 4 3 10 9 10"/><path d="M3.5 13a8.5 8.5 0 102-6.9L3 10"/>',
  undo: '<polyline points="9 14 4 9 9 4"/><path d="M4 9h10a6 6 0 010 12h-3"/>',
  external: '<path d="M14 4h6v6"/><line x1="20" y1="4" x2="11" y2="13"/><path d="M18 14v5H5V6h5"/>',
  person: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  chart: '<polyline points="3 17 9 11 13 15 21 6"/><polyline points="15 6 21 6 21 12"/>',
};

/// Returns an <svg> element for [name]. Falls back to a small dot.
/// An entry may be a stroke-markup string (default) or an object
/// {viewBox, inner, fill} for icons that need their own box or a solid fill.
export function icon(name, { size = 24, cls = '' } = {}) {
  const entry = PATHS[name];
  const isObj = entry && typeof entry === 'object';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', isObj && entry.viewBox ? entry.viewBox : '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  if (isObj && entry.fill) {
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('stroke', 'none');
  } else {
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
  }
  svg.setAttribute('aria-hidden', 'true');
  if (cls) svg.setAttribute('class', cls);
  svg.innerHTML = isObj ? entry.inner : entry || '<circle cx="12" cy="12" r="2"/>';
  return svg;
}
