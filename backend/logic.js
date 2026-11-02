// 雲端小程式的判斷邏輯（貼進 Apps Script 的第一個檔案）。
// 這裡不直接碰 Google 服務；試算表與雲端硬碟由 Code.gs 包成 store / files 傳進來，方便測試。

var HEADERS = ['id', 'createdAt', 'updatedAt', 'category', 'keywords', 'link', 'photoId'];
var CATEGORIES = ['烘焙', '烹飪', '手作', '金句', '好文'];

function fail_(message) {
  return { ok: false, error: message };
}

function pickRecord_(rec) {
  var out = {};
  HEADERS.forEach(function (key) {
    out[key] = rec[key] == null ? '' : String(rec[key]);
  });
  return out;
}

function saveRecord_(input, deps) {
  if (!input || !input.id) return fail_('缺少 id');
  // 紅線 3：同一個 id 重送時直接回成功，不重複建立
  var existing = deps.store.find(input.id);
  if (existing) return { ok: true, record: existing.record };
  if (CATEGORIES.indexOf(input.category) < 0) return fail_('分類不正確');
  if (!input.photo && !input.link) return fail_('照片和連結至少要有一個');

  var photoId = '';
  if (input.photo) {
    photoId = deps.files.save(input.photo, input.createdAt + '_' + input.category + '.jpg');
  }
  var rec = pickRecord_({
    id: input.id,
    createdAt: input.createdAt || deps.now(),
    updatedAt: deps.now(),
    category: input.category,
    keywords: input.keywords || '',
    link: input.link || '',
    photoId: photoId,
  });
  deps.store.append(rec);
  return { ok: true, record: rec };
}

function updateRecord_(id, patch, deps) {
  var found = deps.store.find(id);
  if (!found) return fail_('找不到這一筆');
  patch = patch || {};
  var rec = found.record;
  if (patch.category != null) {
    if (CATEGORIES.indexOf(patch.category) < 0) return fail_('分類不正確');
    rec.category = patch.category;
  }
  if (patch.keywords != null) rec.keywords = String(patch.keywords);
  rec.updatedAt = deps.now();
  rec = pickRecord_(rec);
  deps.store.replace(found.index, rec);
  return { ok: true, record: rec };
}

function deleteRecord_(id, deps) {
  var found = deps.store.find(id);
  if (!found) return { ok: true };
  if (found.record.photoId) deps.files.trash(found.record.photoId);
  deps.store.remove(found.index);
  return { ok: true };
}

function handleRequest(req, deps) {
  if (!deps.passcode || !req || req.passcode !== deps.passcode) return fail_('通行碼不正確');
  switch (req.action) {
    case 'save': return saveRecord_(req.record, deps);
    case 'list': return { ok: true, records: deps.store.all() };
    case 'update': return updateRecord_(req.id, req.patch, deps);
    case 'delete': return deleteRecord_(req.id, deps);
    default: return fail_('不認得的動作');
  }
}
