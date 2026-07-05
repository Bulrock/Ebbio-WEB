// Thin promise wrapper around IndexedDB — the browser's storage built
// for large volumes of structured data (unlike localStorage's ~5 MB cap).
//
// Three object stores mirror the mobile app's Hive boxes:
//   cards    — autoIncrement integer keys (the notification id, like Hive)
//   courses  — keyed by target-language code
//   settings — a single record under the key "app"

const DB_NAME = 'ebbio';
const DB_VERSION = 1;

let _db = null;

export function openDb() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('cards')) {
        db.createObjectStore('cards', { keyPath: 'key', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('courses')) {
        db.createObjectStore('courses', { keyPath: 'targetLang' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => {
      _db = req.result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function tx(store, mode) {
  return _db.transaction(store, mode).objectStore(store);
}

function wrap(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function getAll(store) {
  return wrap(tx(store, 'readonly').getAll());
}

/// Adds a record and returns its generated key (cards store).
export function add(store, value) {
  return wrap(tx(store, 'readwrite').add(value));
}

/// Inserts or updates a record (used for keyed stores and updates).
export function put(store, value) {
  return wrap(tx(store, 'readwrite').put(value));
}

export function del(store, key) {
  return wrap(tx(store, 'readwrite').delete(key));
}
