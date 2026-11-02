// 共用的小工具：分類、照片網址、連結網域、日期。

export const CATEGORIES = ['烘焙', '烹飪', '手作', '金句', '好文'];

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

export function categoryButtons(attr) {
  return CATEGORIES.map((c) => `<button type="button" class="cat" ${attr}="${c}" aria-pressed="false">${c}</button>`).join('');
}
