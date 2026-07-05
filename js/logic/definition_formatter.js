// Splits a plain-text Wiktionary extract into typed lines so the UI can
// style section headers, pronunciation and numbered senses. Pure: no I/O,
// no localization — works for any article language.

export const LineType = Object.freeze({
  header: 'header',
  pronunciation: 'pronunciation',
  sense: 'sense',
  plain: 'plain',
});

const _headerPattern = /^[\p{L}][\p{L} ]{0,30}:…?$/u;
const _sensePattern = /^\((\d+(?:\.\d+)?(?:\s*[-–]\s*\d+(?:\.\d+)?)?)\)\s*(.+)$/;
const _hasContent = /[\p{L}\d]/u;

/// Parses [text] into typed lines and drops empty sections.
export function parseDefinition(text) {
  const lines = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '') continue;
    // Markup leftovers / truncation debris: no letters or digits at all.
    if (!_hasContent.test(line)) continue;

    if (_headerPattern.test(line)) {
      const label = line.substring(0, line.indexOf(':'));
      lines.push({ type: LineType.header, text: label });
      continue;
    }
    const sense = _sensePattern.exec(line);
    if (sense) {
      const body = sense[2];
      if (!_hasContent.test(body)) continue; // sense text cut away entirely
      lines.push({ type: LineType.sense, text: body, senseNumber: sense[1] });
      continue;
    }
    if (line.includes('IPA')) {
      lines.push({ type: LineType.pronunciation, text: line });
      continue;
    }
    lines.push({ type: LineType.plain, text: line });
  }

  // Remove headers whose section carries no content lines.
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.type === LineType.header &&
      (i + 1 === lines.length || lines[i + 1].type === LineType.header)
    ) {
      continue;
    }
    result.push(line);
  }
  return result;
}
