// Runs both requests (definition + translation) in parallel. A failure
// of one source does not affect the other: the fields simply stay empty
// for manual input, never blocking saving.
//
// Returns { definition, translation, sourceUrl, lookupFailed }:
// lookupFailed is true when the definition is missing because of a
// network problem rather than a missing article — the UI words the
// message differently.
import { fetchDefinition } from './dictionary.js';
import { translate } from './translation.js';
import {
  cacheLookup,
  cacheStore,
  isFresh,
  toEntry,
} from './wiktionary_cache.js';

export async function autofill(word, targetLang, nativeLang) {
  const translationPromise = translate(word, targetLang, nativeLang).catch(
    () => null,
  );
  const dictionary = await lookupDefinition(word, targetLang);
  const translation = await translationPromise;

  if (dictionary.status === 'success') {
    return {
      definition: dictionary.entry.definition,
      translation,
      sourceUrl: dictionary.entry.sourceUrl,
      lookupFailed: false,
    };
  }
  return {
    definition: null,
    translation,
    sourceUrl: null,
    lookupFailed: dictionary.status !== 'notFound',
  };
}

/// Cache-first lookup: a fresh cache entry skips the network, a stale
/// one is refreshed, and when the refresh fails on a network problem
/// the stale entry is still better than nothing.
async function lookupDefinition(word, targetLang) {
  const now = Date.now();
  const cached = await cacheLookup(word, targetLang, now).catch(() => null);
  if (cached && isFresh(cached, now)) {
    return { status: 'success', entry: toEntry(cached) };
  }

  const result = await fetchDefinition(word, targetLang).catch(() => ({
    status: 'networkError',
  }));
  if (result.status === 'success') {
    await cacheStore(word, targetLang, result.entry, now).catch(() => {});
  } else if (result.status !== 'notFound' && cached) {
    return { status: 'success', entry: toEntry(cached) };
  }
  return result;
}
