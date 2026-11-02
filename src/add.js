// 新增畫面：貼上照片、連結、點分類、打關鍵字、儲存。
// 按下儲存只交給送出佇列，不直接連雲端。

import { categoryButtons } from './photo.js';
import { extractUrl } from './share.js';

// 左邊是直式截圖框，右邊由上而下：＋照片、連結、分類（兩欄）
const MARKUP = `
  <section class="add">
    <div class="add-top">
      <div class="photo-box">
        <div id="paste-zone" class="paste-zone" contenteditable="true" role="textbox"
             aria-label="長按這裡選「貼上」放入截圖" inputmode="none"></div>
        <img id="photo-preview" class="photo-preview" alt="要存的照片" hidden>
        <button type="button" id="photo-clear" class="photo-clear" aria-label="移除照片" hidden>×</button>
      </div>
      <div class="add-side">
        <label class="ghost file-label">＋照片<input type="file" id="photo-file" accept="image/*" hidden></label>
        <textarea id="link-input" class="field link-field" rows="3" inputmode="url"
                  placeholder="連結（可空白）" aria-label="連結" autocomplete="off" spellcheck="false"></textarea>
        <div id="add-cats" class="cats cats-2" role="group" aria-label="分類"></div>
      </div>
    </div>
    <input id="keywords-input" class="field" type="text" placeholder="關鍵字" aria-label="關鍵字" autocomplete="off">
    <p id="add-hint" class="hint"></p>
    <button type="button" id="save-btn" class="primary save-btn" disabled>儲存</button>
  </section>`;

export function createAddScreen(root, { queue, compress, newId, now, onQueued = () => {}, categories = [] }) {
  root.innerHTML = MARKUP;
  const $ = (sel) => root.querySelector(sel);
  const zone = $('#paste-zone');
  const preview = $('#photo-preview');
  const linkInput = $('#link-input');
  const keywordsInput = $('#keywords-input');
  const saveBtn = $('#save-btn');
  const hint = $('#add-hint');

  let photo = null;
  let category = '';
  let busy = false;

  function refresh() {
    const ok = Boolean((photo || linkInput.value.trim()) && category);
    saveBtn.disabled = !ok || busy;
    if (busy) hint.textContent = '照片處理中…';
    else if (!photo && !linkInput.value.trim()) hint.textContent = '貼上截圖或連結，至少一個';
    else if (!category) hint.textContent = '選一個分類';
    else hint.textContent = '';
    preview.hidden = !photo;
    zone.hidden = Boolean(photo);
    $('#photo-clear').hidden = !photo;
  }

  async function setPhoto(blob) {
    busy = true;
    refresh();
    try {
      photo = await compress(blob);
      preview.src = photo;
    } catch {
      hint.textContent = '這張照片讀不出來，換一張試試';
    } finally {
      busy = false;
      refresh();
    }
  }

  function setLink(text) {
    linkInput.value = extractUrl(text) || String(text ?? '').trim();
    refresh();
  }

  function setCategory(value) {
    category = value;
    root.querySelectorAll('[data-cat]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === value)));
    refresh();
  }

  function reset() {
    photo = null;
    preview.removeAttribute('src');
    linkInput.value = '';
    keywordsInput.value = '';
    zone.textContent = '';
    setCategory('');
  }

  function imageFrom(clipboardData) {
    const items = [...(clipboardData?.items || [])];
    const item = items.find((i) => i.kind === 'file' && i.type.startsWith('image/'));
    if (item) return item.getAsFile();
    return [...(clipboardData?.files || [])].find((f) => f.type.startsWith('image/')) || null;
  }

  zone.addEventListener('paste', (e) => {
    e.preventDefault();
    const image = imageFrom(e.clipboardData);
    if (image) { setPhoto(image); return; }
    const text = e.clipboardData?.getData('text/plain') || '';
    if (extractUrl(text)) setLink(text);
  });

  // 有些鍵盤會直接把圖片插進框框裡，而不是觸發貼上
  zone.addEventListener('input', async () => {
    const img = zone.querySelector('img');
    zone.textContent = '';
    if (!img?.src) return;
    try {
      setPhoto(await (await fetch(img.src)).blob());
    } catch {
      hint.textContent = '讀不到這張圖，請改用「＋照片」';
    }
  });

  $('#photo-file').addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) setPhoto(file);
    e.target.value = '';
  });

  $('#photo-clear').addEventListener('click', () => {
    photo = null;
    preview.removeAttribute('src');
    refresh();
  });

  linkInput.addEventListener('change', () => setLink(linkInput.value));
  linkInput.addEventListener('input', refresh);

  function setCategories(list) {
    const buttons = categoryButtons('data-cat', list);
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => setCategory(category === btn.dataset.cat ? '' : btn.dataset.cat));
    });
    $('#add-cats').replaceChildren(...buttons);
    setCategory(list.includes(category) ? category : '');
  }

  saveBtn.addEventListener('click', async () => {
    if (saveBtn.disabled) return;
    const record = {
      id: newId(),
      createdAt: now(),
      category,
      keywords: keywordsInput.value.trim(),
      link: linkInput.value.trim(),
      photo,
    };
    saveBtn.disabled = true;
    await queue.add(record);
    reset();
    onQueued(record);
  });

  setCategories(categories);
  return { setPhoto, setLink, reset, setCategories };
}
