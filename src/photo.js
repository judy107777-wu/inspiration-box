// 共用的小工具：分類按鈕與顏色、照片網址、連結網域、日期。

// 依分類在清單中的位置配色；不在清單裡的舊分類用中性灰
const CATEGORY_COLORS = ['#A9744F', '#6F8A4E', '#5F74A8', '#9A6A88', '#4F8C8C', '#8C7A4F'];
const OTHER_COLOR = '#8FA3B3';

export function categoryColor(name, categories) {
  const i = categories.indexOf(name);
  return i < 0 ? OTHER_COLOR : CATEGORY_COLORS[i % CATEGORY_COLORS.length];
}

// 分類名稱是使用者自己打的，用 DOM 建立按鈕，不拼 HTML
export function categoryButtons(attr, categories) {
  return categories.map((name) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cat';
    btn.setAttribute(attr, name);
    btn.setAttribute('aria-pressed', 'false');
    btn.textContent = name;
    return btn;
  });
}

// 雲端硬碟照片已設「知道連結的人可檢視」，用縮圖網址直接顯示
export function photoSrc(photoId, width = 200) {
  return photoId ? `https://drive.google.com/thumbnail?id=${encodeURIComponent(photoId)}&sz=w${width}` : '';
}

export function hostOf(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function shortDate(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}
