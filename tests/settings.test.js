// @vitest-environment jsdom
import { describe, test, expect, beforeEach } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getSettings, saveSettings, isConfigured } from '../src/settings.js';

describe('設定', () => {
  beforeEach(() => localStorage.clear());

  test('沒設定時 isConfigured 是 false', () => {
    expect(isConfigured()).toBe(false);
  });

  test('儲存後重新讀取，值還在', () => {
    saveSettings({ endpoint: ' https://script.google.com/macros/s/abc/exec ', passcode: ' 1234 ' });
    expect(getSettings()).toEqual({ endpoint: 'https://script.google.com/macros/s/abc/exec', passcode: '1234' });
    expect(isConfigured()).toBe(true);
  });

  test('只填一項不算設定完成', () => {
    saveSettings({ endpoint: 'https://x', passcode: '' });
    expect(isConfigured()).toBe(false);
  });
});

describe('紅線 5：原始碼裡沒有通行碼或雲端網址', () => {
  test('src 與 index.html 裡找不到 Apps Script 部署網址', () => {
    const files = readdirSync('src').map((f) => join('src', f));
    files.push('index.html');
    for (const f of files) {
      let text;
      try { text = readFileSync(f, 'utf8'); } catch { continue; }
      expect(text, f).not.toMatch(/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{10,}/);
    }
  });
});
