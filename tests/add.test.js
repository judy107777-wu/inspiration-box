// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { createAddScreen } from '../src/add.js';

function pasteEvent({ files = [], text = '' }) {
  const ev = new Event('paste', { bubbles: true, cancelable: true });
  ev.clipboardData = {
    files,
    items: files.map((f) => ({ kind: 'file', type: f.type, getAsFile: () => f })),
    getData: (type) => (type === 'text/plain' ? text : ''),
  };
  return ev;
}

let root, queued, screen, saved;
const $ = (sel) => root.querySelector(sel);
const tick = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  document.body.innerHTML = '<main id="root"></main>';
  root = document.getElementById('root');
  queued = [];
  saved = 0;
  screen = createAddScreen(root, {
    queue: { add: async (rec) => { queued.push(rec); } },
    compress: async () => 'data:image/jpeg;base64,SMALL',
    newId: () => 'id-1',
    now: () => '2026-11-03T10:00:00.000Z',
    onQueued: () => { saved++; },
  });
});

describe('新增畫面', () => {
  test('有五個分類按鈕', () => {
    const cats = [...root.querySelectorAll('[data-cat]')].map((b) => b.dataset.cat);
    expect(cats).toEqual(['烘焙', '烹飪', '手作', '金句', '好文']);
  });

  test('貼上一張圖片後出現預覽', async () => {
    const img = new Blob(['x'], { type: 'image/png' });
    $('#paste-zone').dispatchEvent(pasteEvent({ files: [img] }));
    await tick();
    expect($('#photo-preview').hidden).toBe(false);
    expect($('#photo-preview').getAttribute('src')).toBe('data:image/jpeg;base64,SMALL');
  });

  test('在貼上框貼上一段含網址的文字 → 帶入連結欄', async () => {
    $('#paste-zone').dispatchEvent(pasteEvent({ text: '看看這個 https://www.instagram.com/reel/abc/?x=1 很棒' }));
    await tick();
    expect($('#link-input').value).toBe('https://www.instagram.com/reel/abc/?x=1');
  });

  test('照片和連結都沒有 → 儲存按鈕不能按', () => {
    $('[data-cat="烘焙"]').click();
    expect($('#save-btn').disabled).toBe(true);
  });

  test('沒選分類 → 儲存按鈕不能按', () => {
    screen.setLink('https://example.com');
    expect($('#save-btn').disabled).toBe(true);
    $('[data-cat="烹飪"]').click();
    expect($('#save-btn').disabled).toBe(false);
  });

  test('分類一次只會有一個被選中', () => {
    $('[data-cat="烘焙"]').click();
    $('[data-cat="手作"]').click();
    const pressed = [...root.querySelectorAll('[data-cat][aria-pressed="true"]')].map((b) => b.dataset.cat);
    expect(pressed).toEqual(['手作']);
  });

  test('按儲存 → 整筆交給送出佇列，表單清空', async () => {
    await screen.setPhoto(new Blob(['x'], { type: 'image/png' }));
    screen.setLink('https://www.facebook.com/share/r/1AVvYyNLS5/');
    $('[data-cat="烘焙"]').click();
    $('#keywords-input').value = ' 簡易泡芙，酥皮泡芙 ';
    $('#save-btn').click();
    await tick();
    expect(queued).toEqual([{
      id: 'id-1',
      createdAt: '2026-11-03T10:00:00.000Z',
      category: '烘焙',
      keywords: '簡易泡芙，酥皮泡芙',
      link: 'https://www.facebook.com/share/r/1AVvYyNLS5/',
      photo: 'data:image/jpeg;base64,SMALL',
    }]);
    expect(saved).toBe(1);
    expect($('#photo-preview').hidden).toBe(true);
    expect($('#link-input').value).toBe('');
    expect($('#keywords-input').value).toBe('');
    expect(root.querySelector('[data-cat][aria-pressed="true"]')).toBeNull();
  });

  test('沒有連結、只有照片也能存', async () => {
    await screen.setPhoto(new Blob(['x'], { type: 'image/jpeg' }));
    $('[data-cat="手作"]').click();
    expect($('#save-btn').disabled).toBe(false);
  });

  test('連結欄手動貼上一段文字時，只留下網址', () => {
    const input = $('#link-input');
    input.value = '分享 https://www.threads.com/@a/post/xyz';
    input.dispatchEvent(new Event('change'));
    expect(input.value).toBe('https://www.threads.com/@a/post/xyz');
  });
});
