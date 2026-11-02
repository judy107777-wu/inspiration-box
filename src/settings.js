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
