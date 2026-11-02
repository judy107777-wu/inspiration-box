// 分享接收：IG、FB 分享過來的常常是「標題＋網址」一段文字，只取出網址。

const URL_PATTERN = /https?:\/\/[^\s<>"'，。、！？；「」『』（）【】]+/;
const TRAILING = /[).,!?;:'"]+$/;

export function extractUrl(text) {
  const match = URL_PATTERN.exec(String(text ?? ''));
  return match ? match[0].replace(TRAILING, '') : '';
}

export function linkFromShare({ title = '', text = '', url = '' } = {}) {
  return extractUrl(url) || extractUrl(text) || extractUrl(title);
}

// 讀取 sw.js 存進快取的分享內容，讀完就清掉
export async function takeSharedInbox() {
  if (typeof caches === 'undefined') return null;
  const cache = await caches.open('inspiration-share');
  const dataRes = await cache.match('shared-data');
  if (!dataRes) return null;
  const data = await dataRes.json();
  const photoRes = await cache.match('shared-photo');
  const photo = photoRes ? await photoRes.blob() : null;
  await cache.delete('shared-data');
  await cache.delete('shared-photo');
  return { link: linkFromShare(data), photo };
}
