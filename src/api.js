// 連線層：用固定格式呼叫雲端小程式。不重試，重試交給送出佇列。
// 用 text/plain 送出，瀏覽器就不會先發跨網域預檢，Apps Script 才收得到。

export function createApi({ getSettings, fetchImpl = (...args) => fetch(...args) }) {
  async function call(action, payload = {}) {
    const { endpoint, passcode } = getSettings();
    if (!endpoint || !passcode) throw new Error('請先到設定頁填好雲端網址和通行碼');
    if (!/\/exec\/?$/.test(endpoint)) throw new Error('雲端網址要用部署後拿到的網址，結尾是 /exec');

    let res;
    try {
      res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, passcode, ...payload }),
        redirect: 'follow',
      });
    } catch {
      // 沒網路，或部署時存取權不是「所有人」（被導去 Google 登入頁），瀏覽器都只會說連不上
      throw new Error('連不上雲端小程式：可能沒網路，或部署時「誰可以存取」不是「所有人」');
    }
    if (!res.ok) throw new Error(`雲端回應錯誤（${res.status}）`);

    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error('雲端回的不是資料：請確認網址結尾是 /exec，且部署時「誰可以存取」選「所有人」');
    }
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
