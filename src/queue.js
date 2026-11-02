// 送出佇列：按下儲存後先存進手機（IndexedDB），有網路就送，成功才移除。
// 紅線 1：任何錯誤都只會讓資料留在「排隊中」，絕不刪除。

const STORE = 'outbox';
const RETRY_MS = 30_000;

function openDb(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function run(db, mode, fn) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req?.result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function createQueue({
  send,
  dbName = 'inspiration-outbox',
  onlineTarget = typeof window !== 'undefined' ? window : null,
  retryMs = RETRY_MS,
} = {}) {
  const dbPromise = openDb(dbName);
  const changeListeners = [];
  const savedListeners = [];
  let running = null;
  let timer = null;
  let lastError = null; // 最近一次送不出去的原因，讓畫面說明為什麼還在排隊

  const all = async () => run(await dbPromise, 'readonly', (s) => s.getAll());
  const count = async () => run(await dbPromise, 'readonly', (s) => s.count());

  async function notifyChange() {
    const n = await count();
    if (n === 0) lastError = null;
    changeListeners.forEach((fn) => fn(n, lastError));
    if (n > 0 && retryMs && !timer && typeof setTimeout === 'function') {
      timer = setTimeout(() => { timer = null; flush(); }, retryMs);
    }
    return n;
  }

  async function add(item) {
    await run(await dbPromise, 'readwrite', (s) => s.put(item));
    await notifyChange();
  }

  async function sendAll() {
    const items = await all();
    let failure = null;
    for (const item of items) {
      let saved;
      try {
        saved = await send(item);
      } catch (err) {
        failure = err;
        continue; // 留在排隊中，下次再送
      }
      await run(await dbPromise, 'readwrite', (s) => s.delete(item.id));
      savedListeners.forEach((fn) => fn(saved ?? item));
    }
    lastError = failure;
    await notifyChange();
  }

  // 同一時間只跑一輪，避免同一筆被送兩次
  function flush() {
    if (!running) running = sendAll().finally(() => { running = null; });
    return running;
  }

  onlineTarget?.addEventListener?.('online', () => { flush(); });

  return {
    add,
    all,
    count,
    flush,
    idle: () => running ?? Promise.resolve(),
    onChange: (fn) => changeListeners.push(fn),
    onSaved: (fn) => savedListeners.push(fn),
  };
}
