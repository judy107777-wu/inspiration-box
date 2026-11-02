import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('manifest.webmanifest', 'utf8'));
const sw = readFileSync('sw.js', 'utf8');
const appFiles = JSON.parse(
  /const APP_FILES = (\[[\s\S]*?\]);/.exec(sw)[1].replace(/'/g, '"').replace(/,\s*\]/, ']'),
);

describe('App 外殼', () => {
  test('manifest 有安裝到主畫面需要的欄位', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.start_url).toBe('./');
    expect(manifest.display).toBe('standalone');
    const sizes = manifest.icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    for (const icon of manifest.icons) expect(existsSync(icon.src), icon.src).toBe(true);
  });

  test('manifest 有登記分享選單：文字、網址、照片', () => {
    const st = manifest.share_target;
    expect(st.method).toBe('POST');
    expect(st.enctype).toBe('multipart/form-data');
    expect(st.params).toMatchObject({ title: 'title', text: 'text', url: 'url' });
    expect(st.params.files[0].accept).toContain('image/*');
    expect(sw).toContain("endsWith('/share-target')");
  });

  test('離線快取清單包含所有畫面檔，而且每個檔案都存在', () => {
    const srcFiles = readdirSync('src').map((f) => `./src/${f}`);
    for (const f of srcFiles) expect(appFiles, f).toContain(f);
    for (const f of appFiles.filter((p) => p !== './')) expect(existsSync(f.slice(2)), f).toBe(true);
    expect(appFiles).toContain('./index.html');
    expect(appFiles).toContain('./manifest.webmanifest');
  });

  test('安裝與連網時都跳過瀏覽器快取，改版後不會卡在舊畫面', () => {
    expect(sw).toMatch(/new Request\(url, \{ cache: 'reload' \}\)/);
    expect(sw).toMatch(/cache: 'no-cache'/);
  });
});
