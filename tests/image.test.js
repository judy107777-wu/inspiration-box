import { describe, test, expect } from 'vitest';
import { fitSize, compressImage } from '../src/image.js';

describe('fitSize', () => {
  test('橫式大圖縮到長邊 1280', () => {
    expect(fitSize(4000, 3000)).toEqual({ width: 1280, height: 960 });
  });

  test('小圖不放大', () => {
    expect(fitSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  test('直式截圖縮到長邊 1280', () => {
    expect(fitSize(1080, 2400)).toEqual({ width: 576, height: 1280 });
  });
});

describe('compressImage', () => {
  test('輸出 JPEG 的 data URL，並用縮好的尺寸畫圖', async () => {
    const drawn = {};
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({
        drawImage: (_img, x, y, w, h) => Object.assign(drawn, { x, y, w, h }),
      }),
      toDataURL: (type, quality) => `data:${type};base64,FAKE${quality}`,
    };
    const result = await compressImage({ fake: true }, {
      loadImage: async () => ({ width: 1080, height: 2400 }),
      createCanvas: () => fakeCanvas,
    });
    expect(result.startsWith('data:image/jpeg;base64,')).toBe(true);
    expect(fakeCanvas.width).toBe(576);
    expect(fakeCanvas.height).toBe(1280);
    expect(drawn).toEqual({ x: 0, y: 0, w: 576, h: 1280 });
  });
});
