// 連線層：用固定格式呼叫雲端小程式。不重試，重試交給送出佇列。
// 用 text/plain 送出，瀏覽器就不會先發跨網域預檢，Apps Script 才收得到。

export function createApi({ getSettings, fetchImpl = (...args) => fetch(...args) }) {
  async function call(action, payload = {}) {
    const { endpoint, passcode } = getSettings();
    if (!endpoint || !passcode) throw new Error('請先到設定頁填好雲端網址和通行碼');
    const res = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, passcode, ...payload }),
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`雲端回應錯誤（${res.status}）`);
    const data = await res.json();
    if (!data.ok) throw new Error(data.error || '雲端回應錯誤');
    return data;
  }

  return {
    save: async (record) => (await call('save', { record })).record,
    list: async () => (await call('list')).records,
    update: async (id, patch) => (await call('update', { id, patch })).record,
    remove: async (id) => { await call('delete', { id }); },
  };
}
