import { describe, test, expect } from 'vitest';
import { search, splitTerms } from '../src/search.js';

const items = [
  { id: 'a', createdAt: '2026-10-01T00:00:00Z', category: '手作', keywords: '紅色的蠟燭，聖誕' },
  { id: 'b', createdAt: '2026-11-01T00:00:00Z', category: '烘焙', keywords: '簡易泡芙，酥皮泡芙' },
  { id: 'c', createdAt: '2026-10-20T00:00:00Z', category: '烘焙', keywords: '芋泥餡，配方' },
  { id: 'd', createdAt: '2026-09-01T00:00:00Z', category: '烹飪', keywords: '雞胸肉卷，酥脆' },
  { id: 'e', createdAt: '2026-08-01T00:00:00Z', category: '手作', keywords: '黑猩猩，oreo' },
];
const ids = (list) => list.map((x) => x.id);

describe('search', () => {
  test('單一個字也找得到：「蠟」找到「紅色的蠟燭」', () => {
    expect(ids(search(items, { query: '蠟' }))).toEqual(['a']);
  });

  test('部分詞也找得到：「紅色」或「蠟燭」都找到', () => {
    expect(ids(search(items, { query: '紅色' }))).toEqual(['a']);
    expect(ids(search(items, { query: '蠟燭' }))).toEqual(['a']);
  });

  test('多個詞取交集（空白或逗號分隔）', () => {
    expect(ids(search(items, { query: '烘焙 酥皮' }))).toEqual(['b']);
    expect(ids(search(items, { query: '烘焙，酥' }))).toEqual(['b']);
    expect(ids(search(items, { query: '酥' }))).toEqual(['b', 'd']);
  });

  test('分類篩選，且可與查詢同時作用', () => {
    expect(ids(search(items, { category: '烹飪' }))).toEqual(['d']);
    expect(ids(search(items, { category: '烘焙', query: '配方' }))).toEqual(['c']);
    expect(ids(search(items, { category: '烹飪', query: '泡芙' }))).toEqual([]);
  });

  test('全形半形、英文大小寫視為相同', () => {
    expect(ids(search(items, { query: 'OREO' }))).toEqual(['e']);
    expect(ids(search(items, { query: 'ｏｒｅｏ' }))).toEqual(['e']);
  });

  test('查詢空白時回傳全部，新的在前', () => {
    expect(ids(search(items, { query: '   ' }))).toEqual(['b', 'c', 'a', 'd', 'e']);
    expect(ids(search(items, {}))).toEqual(['b', 'c', 'a', 'd', 'e']);
  });

  test('不會改動原本的陣列', () => {
    const copy = items.slice();
    search(items, { query: '' });
    expect(items).toEqual(copy);
  });
});

describe('splitTerms', () => {
  test('用空白、全形與半形逗號、頓號切開，去掉空的', () => {
    expect(splitTerms(' 烘焙，酥皮,萬聖、 餅乾  ')).toEqual(['烘焙', '酥皮', '萬聖', '餅乾']);
  });
});
