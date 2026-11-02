// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { openDetail } from '../src/detail.js';

const rec = { id: 'a', createdAt: '2026-11-01T00:00:00Z', category: '烘焙', keywords: '簡易泡芙', link: 'https://www.facebook.com/share/r/1', photoId: 'f1' };

let host, calls, updated, deleted, closed;
const $ = (sel) => host.querySelector(sel);
const tick = () => new Promise((r) => setTimeout(r, 0));

function open(api = {}) {
  return openDetail(host, rec, {
    api: {
      update: async (id, patch) => { calls.push(['update', id, patch]); return { ...rec, ...patch }; },
      remove: async (id) => { calls.push(['delete', id]); },
      ...api,
    },
    onUpdated: (r) => updated.push(r),
    onDeleted: (id) => deleted.push(id),
    onClose: () => { closed++; },
  });
}

beforeEach(() => {
  document.body.innerHTML = '<div id="host"></div>';
  host = document.getElementById('host');
  calls = []; updated = []; deleted = []; closed = 0;
});

describe('單筆檢視', () => {
  test('顯示大圖與可點的連結', () => {
    open();
    expect($('.detail-photo').getAttribute('src')).toContain('f1');
    const link = $('#detail-link');
    expect(link.getAttribute('href')).toBe(rec.link);
    expect(link.getAttribute('target')).toBe('_blank');
  });

  test('修改分類與關鍵字後儲存 → 呼叫 update 並通知清單', async () => {
    open();
    $('[data-cat="烹飪"]').click();
    $('#detail-keywords').value = '改過的關鍵字';
    $('#detail-save').click();
    await tick();
    expect(calls).toEqual([['update', 'a', { category: '烹飪', keywords: '改過的關鍵字' }]]);
    expect(updated[0].keywords).toBe('改過的關鍵字');
  });

  test('按刪除先出現確認；取消就不動', async () => {
    open();
    $('#detail-delete').click();
    expect($('#detail-confirm').hidden).toBe(false);
    $('#detail-cancel').click();
    await tick();
    expect(calls).toEqual([]);
    expect($('#detail-confirm').hidden).toBe(true);
  });

  test('確認刪除 → 呼叫 delete、通知清單並關閉', async () => {
    open();
    $('#detail-delete').click();
    $('#detail-confirm-delete').click();
    await tick();
    expect(calls).toEqual([['delete', 'a']]);
    expect(deleted).toEqual(['a']);
    expect(closed).toBe(1);
  });

  test('沒網路時修改失敗會顯示原因，資料不變', async () => {
    open({ update: async () => { throw new Error('Failed to fetch'); } });
    $('#detail-keywords').value = 'x';
    $('#detail-save').click();
    await tick();
    expect($('#detail-msg').textContent).toContain('網路');
    expect(updated).toEqual([]);
  });
});
