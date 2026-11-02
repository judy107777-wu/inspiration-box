// 設定：雲端小程式網址與通行碼只存在這支手機（紅線 5：不進原始碼）。

const KEY = 'inspiration.settings';

export function getSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { endpoint: saved.endpoint || '', passcode: saved.passcode || '' };
  } catch {
    return { endpoint: '', passcode: '' };
  }
}

export function saveSettings({ endpoint = '', passcode = '' }) {
  localStorage.setItem(KEY, JSON.stringify({ endpoint: endpoint.trim(), passcode: passcode.trim() }));
}

export function isConfigured() {
  const { endpoint, passcode } = getSettings();
  return Boolean(endpoint && passcode);
}

// 分類：設定頁可自訂，最多 6 個（新增畫面 2×3 格剛好排滿）
const CATEGORY_KEY = 'inspiration.categories';
export const DEFAULT_CATEGORIES = ['烘焙', '烹飪', '手作', '文句', '其它'];
export const MAX_CATEGORIES = 6;

function cleanCategories(list) {
  const out = [];
  for (const raw of list || []) {
    const name = String(raw ?? '').trim();
    if (name && !out.includes(name)) out.push(name);
  }
  return out.slice(0, MAX_CATEGORIES);
}

export function getCategories() {
  try {
    const saved = cleanCategories(JSON.parse(localStorage.getItem(CATEGORY_KEY) || '[]'));
    return saved.length ? saved : [...DEFAULT_CATEGORIES];
  } catch {
    return [...DEFAULT_CATEGORIES];
  }
}

export function saveCategories(list) {
  localStorage.setItem(CATEGORY_KEY, JSON.stringify(cleanCategories(list)));
}
