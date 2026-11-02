// 搜尋畫面：搜尋框＋分類按鈕＋一列一筆（左小圖、右分類與關鍵字）。
// 先顯示上次的快取，再向雲端拿最新的。

import { search } from './search.js';
import { categoryButtons, photoSrc, hostOf, shortDate } from './photo.js';

const MARKUP = `
  <section class="list">
    <input id="search-input" class="field search-field" type="search" placeholder="打一兩個字，例如：酥、雞、蠟燭" autocomplete="off">
    <div class="cats" role="group" aria-label="篩選分類">${categoryButtons('data-filter')}</div>
    <p id="list-note" class="hint"></p>
    <ul id="list-rows" class="rows"></ul>
  </section>`;

export function createListScreen(root, { api, onOpen, cacheKey = 'inspiration.cache' }) {
  root.innerHTML = MARKUP;
  const input = root.querySelector('#search-input');
  const ul = root.querySelector('#list-rows');
  const note = root.querySelector('#list-note');

  let items = readCache();
  let filter = '';

  function readCache() {
    try { return JSON.parse(localStorage.getItem(cacheKey) || '[]'); } catch { return []; }
  }
  function writeCache() {
    try { localStorage.setItem(cacheKey, JSON.stringify(items)); } catch { /* 空間不足就算了 */ }
  }

  function rowFor(rec) {
    const li = document.createElement('li');
    li.className = 'row';
    li.dataset.id = rec.id;
    li.tabIndex = 0;

    const thumb = document.createElement('div');
    thumb.className = 'thumb';
    thumb.dataset.cat = rec.category;
    if (rec.photoId) {
      const img = document.createElement('img');
      img.src = photoSrc(rec.photoId, 200);
      img.alt = '';
      img.loading = 'lazy';
      thumb.append(img);
    }

    const body = document.createElement('div');
    body.className = 'row-body';
    const title = document.createElement('p');
    title.className = 'row-title';
    const cat = document.createElement('b');
    cat.textContent = rec.category;
    title.append(cat, document.createTextNode(` ${rec.keywords || ''}`));
    const meta = document.createElement('p');
    meta.className = 'row-meta';
    meta.textContent = [hostOf(rec.link), shortDate(rec.createdAt)].filter(Boolean).join('・');
    body.append(title, meta);

    li.append(thumb, body);
    li.addEventListener('click', () => onOpen(rec));
    li.addEventListener('keydown', (e) => { if (e.key === 'Enter') onOpen(rec); });
    return li;
  }

  function render() {
    const found = search(items, { category: filter, query: input.value });
    ul.replaceChildren(...found.map(rowFor));
    if (!note.dataset.sticky) {
      note.textContent = items.length ? `${found.length} 筆` : '還沒有資料，到「新增」存第一筆吧';
    }
  }

  input.addEventListener('input', render);
  root.querySelectorAll('[data-filter]').forEach((btn) => {
    btn.addEventListener('click', () => {
      filter = filter === btn.dataset.filter ? '' : btn.dataset.filter;
      root.querySelectorAll('[data-filter]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === filter)));
      render();
    });
  });

  async function load() {
    render();
    try {
      items = await api.list();
      writeCache();
      delete note.dataset.sticky;
    } catch {
      note.dataset.sticky = '1';
      note.textContent = '目前離線或連不上雲端，先顯示上次的資料';
    }
    render();
  }

  function upsert(rec) {
    const clean = { ...rec };
    delete clean.photo;
    items = [clean, ...items.filter((r) => r.id !== rec.id)];
    writeCache();
    render();
  }

  function removeItem(id) {
    items = items.filter((r) => r.id !== id);
    writeCache();
    render();
  }

  render();
  return { load, upsert, removeItem, render };
}
