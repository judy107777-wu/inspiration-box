import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

// backend/logic.js 是要貼進 Apps Script 的純腳本（沒有 import/export），這裡直接載入它的函式
const source = readFileSync('backend/logic.js', 'utf8');
const { handleRequest, HEADERS } = new Function(`${source}; return { handleRequest, HEADERS };`)();

function memoryStore() {
  const rows = [];
  return {
    rows,
    all: () => rows.map((r) => ({ ...r })),
    find: (id) => {
      const index = rows.findIndex((r) => r.id === id);
      return index < 0 ? null : { index, record: { ...rows[index] } };
    },
    append: (rec) => rows.push({ ...rec }),
    replace: (index, rec) => { rows[index] = { ...rec }; },
    remove: (index) => rows.splice(index, 1),
  };
}

function memoryFiles() {
  const saved = [];
  const trashed = [];
  let n = 0;
  return {
    saved,
    trashed,
    save: (dataUrl, name) => { saved.push({ dataUrl, name }); return 'file-' + (++n); },
    trash: (id) => trashed.push(id),
  };
}

const NOW = '2026-11-03T10:00:00.000Z';
let deps;
const call = (req) => handleRequest({ passcode: 'secret', ...req }, deps);
const record = (extra = {}) => ({
  id: 'r1',
  createdAt: '2026-11-03T09:59:00.000Z',
  category: '烘焙',
  keywords: '萬聖，擠花奶酥',
  link: 'https://www.instagram.com/reel/abc/',
  photo: 'data:image/jpeg;base64,AAAA',
  ...extra,
});

beforeEach(() => {
  deps = { passcode: 'secret', store: memoryStore(), files: memoryFiles(), now: () => NOW };
});

describe('雲端小程式', () => {
  test('欄位順序固定', () => {
    expect(HEADERS).toEqual(['id', 'createdAt', 'updatedAt', 'category', 'keywords', 'link', 'photoId']);
  });

  test('通行碼錯誤時回錯誤，不寫入任何東西', () => {
    const res = handleRequest({ passcode: 'wrong', action: 'save', record: record() }, deps);
    expect(res.ok).toBe(false);
    expect(deps.store.rows).toHaveLength(0);
    expect(deps.files.saved).toHaveLength(0);
  });

  test('雲端沒設定通行碼時一律拒絕', () => {
    deps.passcode = '';
    const res = handleRequest({ passcode: '', action: 'list' }, deps);
    expect(res.ok).toBe(false);
  });

  test('save 新的一筆：新增一列並建立照片檔，列裡不存照片內容', () => {
    const res = call({ action: 'save', record: record() });
    expect(res.ok).toBe(true);
    expect(deps.files.saved).toHaveLength(1);
    expect(deps.store.rows).toHaveLength(1);
    expect(deps.store.rows[0]).toEqual({
      id: 'r1',
      createdAt: '2026-11-03T09:59:00.000Z',
      updatedAt: NOW,
      category: '烘焙',
      keywords: '萬聖，擠花奶酥',
      link: 'https://www.instagram.com/reel/abc/',
      photoId: 'file-1',
    });
    expect(res.record.photoId).toBe('file-1');
  });

  test('save 已存在的 id：不重複新增，直接回成功', () => {
    call({ action: 'save', record: record() });
    const res = call({ action: 'save', record: record() });
    expect(res.ok).toBe(true);
    expect(deps.store.rows).toHaveLength(1);
    expect(deps.files.saved).toHaveLength(1);
    expect(res.record.photoId).toBe('file-1');
  });

  test('沒有照片只有連結也能存', () => {
    const res = call({ action: 'save', record: record({ photo: null }) });
    expect(res.ok).toBe(true);
    expect(deps.store.rows[0].photoId).toBe('');
  });

  test('照片和連結都沒有、或沒有分類、分類太長，拒絕儲存', () => {
    expect(call({ action: 'save', record: record({ photo: null, link: '' }) }).ok).toBe(false);
    expect(call({ action: 'save', record: record({ category: '' }) }).ok).toBe(false);
    expect(call({ action: 'save', record: record({ category: '   ' }) }).ok).toBe(false);
    expect(call({ action: 'save', record: record({ category: '一二三四五六七八九十一二三四五六七八九十一' }) }).ok).toBe(false);
    expect(deps.store.rows).toHaveLength(0);
  });

  test('自訂的分類名稱也能存（分類由手機的設定頁決定）', () => {
    expect(call({ action: 'save', record: record({ category: '文句' }) }).ok).toBe(true);
    expect(call({ action: 'save', record: record({ id: 'r2', category: '蠟燭' }) }).ok).toBe(true);
    expect(deps.store.rows.map((r) => r.category)).toEqual(['文句', '蠟燭']);
  });

  test('update 只改分類、關鍵字和修改時間', () => {
    call({ action: 'save', record: record() });
    const res = call({ action: 'update', id: 'r1', patch: { category: '烹飪', keywords: '新關鍵字', link: 'https://evil', photoId: 'x' } });
    expect(res.ok).toBe(true);
    expect(deps.store.rows[0]).toMatchObject({
      category: '烹飪',
      keywords: '新關鍵字',
      link: 'https://www.instagram.com/reel/abc/',
      photoId: 'file-1',
      updatedAt: NOW,
    });
  });

  test('update 找不到該筆時回錯誤', () => {
    expect(call({ action: 'update', id: 'nope', patch: { keywords: 'x' } }).ok).toBe(false);
  });

  test('delete 刪除該列，照片丟進垃圾桶', () => {
    call({ action: 'save', record: record() });
    const res = call({ action: 'delete', id: 'r1' });
    expect(res.ok).toBe(true);
    expect(deps.store.rows).toHaveLength(0);
    expect(deps.files.trashed).toEqual(['file-1']);
  });

  test('delete 已經不存在的 id 也回成功（重送不出錯）', () => {
    expect(call({ action: 'delete', id: 'gone' }).ok).toBe(true);
  });

  test('list 回傳全部列', () => {
    call({ action: 'save', record: record() });
    call({ action: 'save', record: record({ id: 'r2', photo: null }) });
    const res = call({ action: 'list' });
    expect(res.ok).toBe(true);
    expect(res.records.map((r) => r.id)).toEqual(['r1', 'r2']);
  });

  test('未知的動作回錯誤', () => {
    expect(call({ action: 'hack' }).ok).toBe(false);
  });
});
