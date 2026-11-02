import { describe, test, expect } from 'vitest';
import { createApi } from '../src/api.js';

function fakeFetch(reply = { ok: true }) {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return { ok: true, json: async () => reply };
  };
  return { fetchImpl, calls };
}

const settings = () => ({ endpoint: 'https://example.test/exec', passcode: 'secret' });

describe('連線層', () => {
  test('save 用 text/plain POST，帶通行碼與整筆資料', async () => {
    const { fetchImpl, calls } = fakeFetch({ ok: true, record: { id: 'r1', photoId: 'f1' } });
    const api = createApi({ getSettings: settings, fetchImpl });
    const rec = await api.save({ id: 'r1', category: '烘焙' });
    expect(rec).toEqual({ id: 'r1', photoId: 'f1' });
    expect(calls[0].url).toBe('https://example.test/exec');
    expect(calls[0].init.method).toBe('POST');
    expect(calls[0].init.headers['Content-Type']).toMatch(/^text\/plain/);
    expect(calls[0].body).toEqual({ action: 'save', passcode: 'secret', record: { id: 'r1', category: '烘焙' } });
  });

  test('list、update、delete 送出的格式正確', async () => {
    const { fetchImpl, calls } = fakeFetch({ ok: true, records: [{ id: 'a' }], record: { id: 'a' } });
    const api = createApi({ getSettings: settings, fetchImpl });
    expect(await api.list()).toEqual([{ id: 'a' }]);
    await api.update('a', { keywords: 'x' });
    await api.remove('a');
    expect(calls.map((c) => c.body)).toEqual([
      { action: 'list', passcode: 'secret' },
      { action: 'update', passcode: 'secret', id: 'a', patch: { keywords: 'x' } },
      { action: 'delete', passcode: 'secret', id: 'a' },
    ]);
  });

  test('雲端回錯誤時拋出錯誤，且只送一次（不自行重試）', async () => {
    const { fetchImpl, calls } = fakeFetch({ ok: false, error: '通行碼不正確' });
    const api = createApi({ getSettings: settings, fetchImpl });
    await expect(api.list()).rejects.toThrow('通行碼不正確');
    expect(calls).toHaveLength(1);
  });

  test('連線失敗時拋出錯誤', async () => {
    const api = createApi({ getSettings: settings, fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
    await expect(api.list()).rejects.toThrow();
  });

  test('沒設定網址或通行碼時，提示先到設定頁', async () => {
    const { fetchImpl, calls } = fakeFetch();
    const api = createApi({ getSettings: () => ({ endpoint: '', passcode: '' }), fetchImpl });
    await expect(api.list()).rejects.toThrow('請先到設定頁');
    expect(calls).toHaveLength(0);
  });
});
