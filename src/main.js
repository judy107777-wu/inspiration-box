// 把各模組接起來：分頁切換、狀態列、設定、分享進來的內容、service worker。

import { createApi } from './api.js';
import { createQueue } from './queue.js';
import { compressImage } from './image.js';
import { createAddScreen } from './add.js';
import { createListScreen } from './list.js';
import { openDetail } from './detail.js';
import { getSettings, saveSettings, isConfigured } from './settings.js';
import { takeSharedInbox } from './share.js';

const $ = (sel) => document.querySelector(sel);

const api = createApi({ getSettings });
const queue = createQueue({ send: (record) => api.save(record) });

// 狀態列：排隊中（琥珀）／已存入（綠）
const status = $('#status');
let pending = 0;
let flashTimer = null;
function showStatus() {
  if (flashTimer) return;
  status.className = pending ? 'status warn' : 'status';
  status.textContent = pending ? `排隊中 ${pending} 筆` : '';
}
function flashSaved() {
  clearTimeout(flashTimer);
  status.className = 'status ok';
  status.textContent = '已存入 😊';
  flashTimer = setTimeout(() => { flashTimer = null; showStatus(); }, 2500);
}

const list = createListScreen($('#list-view'), {
  api,
  onOpen: (record) => openDetail($('#detail-host'), record, {
    api,
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
});

queue.onChange((n) => { pending = n; showStatus(); });
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
  $('#settings-msg').textContent = '';
  settingsHost.hidden = false;
}
$('#settings-btn').addEventListener('click', openSettings);
$('#settings-close').addEventListener('click', () => { settingsHost.hidden = true; });
$('#settings-form').addEventListener('submit', (e) => {
  e.preventDefault();
  saveSettings({ endpoint: $('#endpoint-input').value, passcode: $('#passcode-input').value });
  if (!isConfigured()) {
    $('#settings-msg').textContent = '兩項都要填';
    return;
  }
  settingsHost.hidden = true;
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
