// 照片處理：長邊縮到 1280px、轉 JPEG，省行動網路和雲端空間。

export const MAX_SIDE = 1280;
const QUALITY = 0.82;

export function fitSize(width, height, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

async function loadImageFromBlob(blob) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(blob);
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// 回傳 data:image/jpeg;base64,... 字串，可以直接存進手機暫存區和送上雲端
export async function compressImage(blob, {
  loadImage = loadImageFromBlob,
  createCanvas = () => document.createElement('canvas'),
} = {}) {
  const img = await loadImage(blob);
  const { width, height } = fitSize(img.width, img.height);
  const canvas = createCanvas();
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(img, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', QUALITY);
}
