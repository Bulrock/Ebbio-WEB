// Runs both requests (definition + translation) in parallel. A failure of
// one source does not affect the other: the fields simply stay empty for
// manual input, never blocking saving.
import { fetchDefinition } from './dictionary.js';
import { translate } from './translation.js';

export async function autofill(word, targetLang, nativeLang) {
  const [definition, translation] = await Promise.all([
    fetchDefinition(word, targetLang).catch(() => null),
    translate(word, targetLang, nativeLang).catch(() => null),
  ]);
  return { definition, translation };
}
