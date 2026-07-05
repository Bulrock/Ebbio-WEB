// Renders a Wiktionary definition with visual structure instead of a wall
// of text: section labels as spaced small caps, pronunciation in italics,
// and numbered senses with the number in a colored pill.
import { h } from './dom.js';
import { parseDefinition, LineType } from '../logic/definition_formatter.js';

export function definitionView(definition) {
  const children = [];
  for (const line of parseDefinition(definition)) {
    switch (line.type) {
      case LineType.header:
        children.push(h('div', { class: 'def-header' }, line.text.toUpperCase()));
        break;
      case LineType.pronunciation:
        children.push(h('div', { class: 'def-pron' }, line.text));
        break;
      case LineType.sense:
        children.push(
          h('div', { class: 'def-sense' }, [
            h('span', { class: 'def-sense-num' }, line.senseNumber),
            h('span', {}, line.text),
          ]),
        );
        break;
      default:
        children.push(h('div', { class: 'def-plain' }, line.text));
    }
  }
  return h('div', { class: 'definition' }, children);
}
