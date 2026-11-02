// 把各模組接起來：分頁切換、狀態列、設定、分享進來的內容、service worker。

import { createApi } from './api.js';
import { createQueue } from './queue.js';
import { compressImage } from './image.js';
import { createAddScreen } from './add.js';
import { createListScreen } from './list.js';
import { openDetail } from './detail.js';
import { getSettings, saveSettings, isConfigured, getCategories, saveCategories } from './settings.js';
import { takeSharedInbox } from './share.js';

const $ = (sel) => document.querySelector(sel);

const api = createApi({ getSettings });
const queue = createQueue({ send: (record) => api.save(record) });

// 狀態列：排隊中（琥珀）／已存入（綠）
const status = $('#status');
const queueNote = $('#queue-note');
let pending = 0;
let flashTimer = null;
function showStatus() {
  if (flashTimer) return;
  status.className = pending ? 'status warn' : 'status';
  status.textContent = pending ? `排隊中 ${pending} 筆` : '';
}
// 還在排隊時，把送不出去的原因寫在頂端下方
function showQueueError(error) {
  queueNote.hidden = !(pending && error);
  queueNote.textContent = error ? `還沒存進雲端：${error.message}` : '';
}
function flashSaved() {
  clearTimeout(flashTimer);
  status.className = 'status ok';
  status.textContent = '已存入 😊';
  flashTimer = setTimeout(() => { flashTimer = null; showStatus(); }, 2500);
}

const list = createListScreen($('#list-view'), {
  api,
  categories: getCategories(),
  onOpen: (record) => openDetail($('#detail-host'), record, {
    api,
    categories: getCategories(),
    onUpdated: (rec) => list.upsert(rec),
    onDeleted: (id) => list.removeItem(id),
  }),
});

const add = createAddScreen($('#add-view'), {
  queue,
  compress: compressImage,
  newId: () => crypto.randomUUID(),
  now: () => new Date().toISOString(),
  onQueued: () => queue.flush(),
  categories: getCategories(),
});

queue.onChange((n, error) => { pending = n; showStatus(); showQueueError(error); });
queue.onSaved((record) => { flashSaved(); list.upsert(record); });

// 分頁
function showTab(name) {
  $('#add-view').hidden = name !== 'add';
  $('#list-view').hidden = name !== 'list';
  document.querySelectorAll('[data-tab]').forEach((b) => {
    if (b.dataset.tab === name) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  });
  if (name === 'list' && isConfigured()) list.load();
}
document.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));

// 設定
const settingsHost = $('#settings-host');
function openSettings() {
  const { endpoint, passcode } = getSettings();
  $('#endpoint-input').value = endpoint;
  $('#passcode-input').value = passcode;
  const cats = getCategories();
  document.querySelectorAll('#category-inputs input').forEach((input, i) => { input.value = cats[i] || ''; });
  const missing = [!endpoint && '雲端小程式網址', !passcode && '通行碼'].filter(Boolean);
  $('#settings-msg').textContent = missing.length ? `還沒填：${missing.join('、')}。填好後按「儲存設定」` : '';
  settingsHost.hidden = false;
}
$('#settings-btn').addEventListener('click', openSettings);
$('#settings-close').addEventListener('click', () => { settingsHost.hidden = true; });
$('#settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  saveSettings({ endpoint: $('#endpoint-input').value, passcode: $('#passcode-input').value });
  saveCategories([...document.querySelectorAll('#category-inputs input')].map((input) => input.value));
  add.setCategories(getCategories());
  list.setCategories(getCategories());
  if (!isConfigured()) {
    $('#settings-msg').textContent = '雲端小程式網址和通行碼兩項都要填';
    return;
  }
  settingsHost.hidden = true;
  status.className = 'status ok';
  status.textContent = '設定已儲存';
  setTimeout(showStatus, 2000);
  queue.flush();
});

// 從其他 App 分享進來
async function receiveShare() {
  if (!new URLSearchParams(location.search).has('shared')) return;
  history.replaceState(null, '', location.pathname);
  try {
    const shared = await takeSharedInbox();
    if (!shared) return;
    showTab('add');
    if (shared.link) add.setLink(shared.link);
    if (shared.photo) await add.setPhoto(shared.photo);
  } catch {
    /* 讀不到就讓使用者自己貼 */
  }
}

// 回到 App 時順便補傳
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') queue.flush();
});

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* 沒有也能用，只是不能離線開啟 */ });
}

if (!isConfigured()) openSettings();
receiveShare();
queue.flush();
