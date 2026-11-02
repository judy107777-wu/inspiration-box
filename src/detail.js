// 單筆檢視：看大圖、開連結、修改分類與關鍵字、刪除（先確認）。

import { categoryButtons, photoSrc, hostOf, shortDate } from './photo.js';

const MARKUP = `
  <div class="detail" role="dialog" aria-modal="true" aria-label="這一筆的內容">
    <div class="detail-bar">
      <button type="button" id="detail-close" class="ghost">‹ 返回</button>
      <span id="detail-date" class="row-meta"></span>
    </div>
    <img class="detail-photo" alt="收藏的照片" hidden>
    <a id="detail-link" class="primary link-btn" target="_blank" rel="noopener" hidden>打開連結</a>
    <div id="detail-cats" class="cats cats-3" role="group" aria-label="分類"></div>
    <input id="detail-keywords" class="field" type="text" placeholder="關鍵字" aria-label="關鍵字" autocomplete="off">
    <p id="detail-msg" class="hint" role="status"></p>
    <button type="button" id="detail-save" class="primary">儲存修改</button>
    <button type="button" id="detail-delete" class="danger-ghost">刪除這一筆</button>
    <div id="detail-confirm" class="confirm" hidden>
      <p>確定要刪除？照片會移到雲端硬碟的垃圾桶。</p>
      <div class="confirm-actions">
        <button type="button" id="detail-confirm-delete" class="danger">刪除</button>
        <button type="button" id="detail-cancel" class="ghost">取消</button>
      </div>
    </div>
  </div>`;

function explain(err) {
  return /fetch|network|load failed/i.test(String(err?.message)) ? '需要網路才能修改，請稍後再試' : err?.message || '沒有成功，請再試一次';
}

export function openDetail(host, record, { api, onUpdated, onDeleted, onClose, categories = [] }) {
  host.innerHTML = MARKUP;
  host.hidden = false;
  const $ = (sel) => host.querySelector(sel);
  const msg = $('#detail-msg');
  let category = record.category;

  const img = $('.detail-photo');
  if (record.photoId) {
    img.src = photoSrc(record.photoId, 1600);
    img.hidden = false;
  }
  const link = $('#detail-link');
  if (record.link) {
    link.href = record.link;
    link.textContent = `打開連結・${hostOf(record.link)}`;
    link.hidden = false;
  }
  $('#detail-date').textContent = shortDate(record.createdAt);
  $('#detail-keywords').value = record.keywords || '';

  // 舊分類（例如改名前的「金句」）不在清單裡時也列出來，才看得出原本是哪一類
  const choices = categories.includes(record.category) || !record.category ? categories : [...categories, record.category];
  const buttons = categoryButtons('data-cat', choices);
  $('#detail-cats').replaceChildren(...buttons);
  const markCategory = () => buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === category)));
  buttons.forEach((btn) => btn.addEventListener('click', () => { category = btn.dataset.cat; markCategory(); }));
  markCategory();

  function close() {
    host.hidden = true;
    host.innerHTML = '';
    onClose?.();
  }

  $('#detail-close').addEventListener('click', close);

  $('#detail-save').addEventListener('click', async () => {
    msg.textContent = '儲存中…';
    try {
      const saved = await api.update(record.id, { category, keywords: $('#detail-keywords').value.trim() });
      msg.textContent = '已更新 😊';
      onUpdated?.(saved);
    } catch (err) {
      msg.textContent = explain(err);
    }
  });

  $('#detail-delete').addEventListener('click', () => { $('#detail-confirm').hidden = false; });
  $('#detail-cancel').addEventListener('click', () => { $('#detail-confirm').hidden = true; });
  $('#detail-confirm-delete').addEventListener('click', async () => {
    msg.textContent = '刪除中…';
    try {
      await api.remove(record.id);
      onDeleted?.(record.id);
      close();
    } catch (err) {
      $('#detail-confirm').hidden = true;
      msg.textContent = explain(err);
    }
  });

  return { close };
}
