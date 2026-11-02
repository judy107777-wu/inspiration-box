import { describe, test, expect } from 'vitest';
import { extractUrl, linkFromShare } from '../src/share.js';

describe('分享接收', () => {
  test('從一段文字中只取出網址', () => {
    expect(extractUrl('看看這個 https://www.instagram.com/reel/DfFVPdVuLnu/?cplk=emdm 超可愛'))
      .toBe('https://www.instagram.com/reel/DfFVPdVuLnu/?cplk=emdm');
  });

  test('全形標點不會被當成網址的一部分', () => {
    expect(extractUrl('食譜：https://cookpad.com/tw/recipes/123。')).toBe('https://cookpad.com/tw/recipes/123');
  });

  test('沒有網址時回傳空字串', () => {
    expect(extractUrl('只是一段文字')).toBe('');
  });

  test('分享時有 url 欄位就用它', () => {
    expect(linkFromShare({ title: '標題', text: '', url: 'https://youtu.be/abc' })).toBe('https://youtu.be/abc');
  });

  test('IG、FB 常把網址放在 text 裡', () => {
    expect(linkFromShare({ title: '', text: 'https://www.facebook.com/share/r/1AVvYyNLS5/', url: '' }))
      .toBe('https://www.facebook.com/share/r/1AVvYyNLS5/');
    expect(linkFromShare({ title: '某某的貼文', text: '某某的貼文 https://www.threads.com/@a/post/x', url: '' }))
      .toBe('https://www.threads.com/@a/post/x');
  });
});
