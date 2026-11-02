// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { createListScreen } from '../src/list.js';

const data = [
  { id: 'a', createdAt: '2026-11-01T00:00:00Z', category: '烘焙', keywords: '簡易泡芙，酥皮泡芙', link: 'https://www.facebook.com/share/r/1', photoId: 'f1' },
  { id: 'b', createdAt: '2026-10-20T00:00:00Z', category: '烘焙', keywords: '芋泥餡，配方', link: '', photoId: 'f2' },
  { id: 'c', createdAt: '2026-10-01T00:00:00Z', category: '金句', keywords: '精神海拔決定包容半徑', link: 'https://www.threads.com/x', photoId: '' },
];

let root, opened;
const rows = () => [...root.querySelectorAll('.row')];
const tick = () => new Promise((r) => setTimeout(r, 0));

function make(api) {
  return createListScreen(root, { api, onOpen: (rec) => opened.push(rec), cacheKey: 'test-cache' });
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<main id="root"></main>';
  root = document.getElementById('root');
  opened = [];
});

describe('搜尋畫面', () => {
  test('給 3 筆資料畫出 3 列，每列有分類與關鍵字', async () => {
    const screen = make({ list: async () => data });
    await screen.load();
    expect(rows()).toHaveLength(3);
    expect(rows()[0].textContent).toContain('烘焙');
    expect(rows()[0].textContent).toContain('簡易泡芙，酥皮泡芙');
    expect(rows()[0].querySelector('img').getAttribute('src')).toContain('f1');
  });

  test('打「酥」清單即時只剩符合的', async () => {
    const screen = make({ list: async () => data });
    await screen.load();
    const input = root.querySelector('#search-input');
    input.value = '酥';
    input.dispatchEvent(new Event('input'));
    expect(rows().map((r) => r.dataset.id)).toEqual(['a']);
  });

  test('點分類只看該類，再點一次取消', async () => {
    const screen = make({ list: async () => data });
    await screen.load();
    root.querySelector('[data-filter="金句"]').click();
    expect(rows().map((r) => r.dataset.id)).toEqual(['c']);
    root.querySelector('[data-filter="金句"]').click();
    expect(rows()).toHaveLength(3);
  });

  test('先顯示上次的快取，拿到新資料後更新', async () => {
    localStorage.setItem('test-cache', JSON.stringify([data[2]]));
    let release;
    const screen = make({ list: () => new Promise((r) => { release = () => r(data); }) });
    const loading = screen.load();
    await tick();
    expect(rows().map((r) => r.dataset.id)).toEqual(['c']);
    release();
    await loading;
    expect(rows()).toHaveLength(3);
  });

  test('連不上雲端時保留快取並顯示提示', async () => {
    localStorage.setItem('test-cache', JSON.stringify(data));
    const screen = make({ list: async () => { throw new Error('Failed to fetch'); } });
    await screen.load();
    expect(rows()).toHaveLength(3);
    expect(root.querySelector('#list-note').textContent).toContain('離線');
  });

  test('沒有照片的資料用分類色塊代替小圖', async () => {
    const screen = make({ list: async () => data });
    await screen.load();
    const row = root.querySelector('[data-id="c"]');
    expect(row.querySelector('img')).toBeNull();
    expect(row.querySelector('.thumb').dataset.cat).toBe('金句');
  });

  test('點一列會打開那一筆', async () => {
    const screen = make({ list: async () => data });
    await screen.load();
    root.querySelector('[data-id="b"]').click();
    expect(opened.map((r) => r.id)).toEqual(['b']);
  });

  test('新存入、修改、刪除會同步到清單與快取', async () => {
    const screen = make({ list: async () => data });
    await screen.load();
    screen.upsert({ id: 'd', createdAt: '2026-11-03T00:00:00Z', category: '手作', keywords: '熱縮片', link: '', photoId: '' });
    expect(rows()[0].dataset.id).toBe('d');
    screen.upsert({ ...data[0], keywords: '改過了' });
    expect(root.querySelector('[data-id="a"]').textContent).toContain('改過了');
    screen.removeItem('b');
    expect(root.querySelector('[data-id="b"]')).toBeNull();
    expect(JSON.parse(localStorage.getItem('test-cache')).map((r) => r.id).sort()).toEqual(['a', 'c', 'd']);
  });
});
