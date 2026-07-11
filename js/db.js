// Thin promise wrapper around IndexedDB — the browser's storage built
// for large volumes of structured data (unlike localStorage's ~5 MB cap).
//
// Object stores mirror the mobile app's Hive boxes:
//   cards    — autoIncrement integer keys (the notification id, like Hive)
//   courses  — keyed by target-language code
//   settings — a single record under the key "app"
//
// Every operation opens the database on demand (no manual openDb()
// required), and write operations resolve only when the whole
// transaction commits — request.onsuccess alone does not guarantee
// the data reached disk.
//
// v2 adds indexes on cards: courseLang, normalizedTerm (fast duplicate
// checks and search), nextReviewTime (due queries).
// v3 adds the wiktionaryCache store — dictionary lookups live apart
// from user cards, so refreshing the cache never touches user data.

const DB_NAME = 'ebbio';
const DB_VERSION = 3;

const CARD_INDEXES = ['courseLang', 'normalizedTerm', 'nextReviewTime'];

let _db = null;

export function openDb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const cards = db.objectStoreNames.contains('cards')
        ? req.transaction.objectStore('cards')
        : db.createObjectStore('cards', { keyPath: 'key', autoIncrement: true });
      for (const name of CARD_INDEXES) {
        if (!cards.indexNames.contains(name)) cards.createIndex(name, name);
      }
      if (!db.objectStoreNames.contains('courses')) {
        db.createObjectStore('courses', { keyPath: 'targetLang' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('wiktionaryCache')) {
        db.createObjectStore('wiktionaryCache', { keyPath: 'cacheKey' });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      // If another tab upgrades the schema, drop the handle so the
      // next operation reopens at the new version.
      _db.onversionchange = () => {
        _db.close();
        _db = null;
      };
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

/// Runs [work] on an object store and resolves with the request's
/// result once the transaction completes (not merely on onsuccess).
async function run(store, mode, work) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const txn = db.transaction(store, mode);
    const request = work(txn.objectStore(store));
    let result;
    request.onsuccess = () => {
      result = request.result;
    };
    txn.oncomplete = () => resolve(result);
    txn.onerror = () => reject(txn.error);
    txn.onabort = () => reject(txn.error || new Error('transaction aborted'));
  });
}

/// A single record by primary key, or undefined.
export function get(store, key) {
  return run(store, 'readonly', (s) => s.get(key));
}

export function getAll(store) {
  return run(store, 'readonly', (s) => s.getAll());
}

/// All records matching [query] in the named index (e.g. every card
/// of a course via the courseLang index).
export function getAllFromIndex(store, indexName, query) {
  return run(store, 'readonly', (s) => s.index(indexName).getAll(query));
}

/// Adds a record and returns its generated key (cards store).
export function add(store, value) {
  return run(store, 'readwrite', (s) => s.add(value));
}

/// Inserts or updates a record (used for keyed stores and updates).
export function put(store, value) {
  return run(store, 'readwrite', (s) => s.put(value));
}

export function del(store, key) {
  return run(store, 'readwrite', (s) => s.delete(key));
}
