// 雲端小程式的入口（貼進 Apps Script 的第二個檔案）。
// 負責把 Google 試算表、雲端硬碟包成 logic.js 需要的 store / files。

function setup() {
  var props = PropertiesService.getScriptProperties();

  if (!props.getProperty('FOLDER_ID')) {
    props.setProperty('FOLDER_ID', DriveApp.createFolder('靈感收藏').getId());
  }

  if (!props.getProperty('SHEET_ID')) {
    var ss = SpreadsheetApp.create('靈感收藏資料庫');
    var sheet = ss.getSheets()[0];
    sheet.setName('資料');
    sheet.getRange('A:G').setNumberFormat('@'); // 全部存成文字，避免被自動轉成日期或數字
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
    DriveApp.getFileById(ss.getId()).moveTo(DriveApp.getFolderById(props.getProperty('FOLDER_ID')));
    props.setProperty('SHEET_ID', ss.getId());
  }

  if (!props.getProperty('PASSCODE')) {
    props.setProperty('PASSCODE', Utilities.getUuid().replace(/-/g, '').slice(0, 12));
  }

  Logger.log('設定完成。');
  Logger.log('試算表：' + SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getUrl());
  Logger.log('通行碼（請抄到手機的設定頁）：' + props.getProperty('PASSCODE'));
}

function doGet() {
  return ContentService.createTextOutput('靈感收藏雲端小程式運作中');
}

function doPost(e) {
  var result;
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    var req = JSON.parse(e.postData.contents);
    result = handleRequest(req, buildDeps_());
  } catch (err) {
    result = { ok: false, error: String(err && err.message || err) };
  } finally {
    lock.releaseLock();
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildDeps_() {
  var props = PropertiesService.getScriptProperties();
  return {
    passcode: props.getProperty('PASSCODE') || '',
    store: sheetStore_(SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheetByName('資料')),
    files: driveFiles_(DriveApp.getFolderById(props.getProperty('FOLDER_ID'))),
    now: function () { return new Date().toISOString(); },
  };
}

// 試算表：第 1 列是欄位名稱，第 2 列起一筆一列；index 是實際列號
function sheetStore_(sheet) {
  function rows() {
    var last = sheet.getLastRow();
    if (last < 2) return [];
    return sheet.getRange(2, 1, last - 1, HEADERS.length).getValues();
  }
  function toRecord(row) {
    var rec = {};
    HEADERS.forEach(function (key, i) { rec[key] = String(row[i]); });
    return rec;
  }
  function toRow(rec) {
    return HEADERS.map(function (key) { return rec[key] == null ? '' : String(rec[key]); });
  }
  return {
    all: function () { return rows().map(toRecord); },
    find: function (id) {
      var data = rows();
      for (var i = 0; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) return { index: i + 2, record: toRecord(data[i]) };
      }
      return null;
    },
    append: function (rec) { sheet.appendRow(toRow(rec)); },
    replace: function (index, rec) { sheet.getRange(index, 1, 1, HEADERS.length).setValues([toRow(rec)]); },
    remove: function (index) { sheet.deleteRow(index); },
  };
}

// 雲端硬碟：照片設「知道連結的人可檢視」，工具才能顯示小圖；刪除只丟垃圾桶（紅線 7）
function driveFiles_(folder) {
  return {
    save: function (dataUrl, name) {
      var match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
      if (!match) throw new Error('照片格式不正確');
      var blob = Utilities.newBlob(Utilities.base64Decode(match[2]), match[1], name);
      var file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      return file.getId();
    },
    trash: function (id) {
      try { DriveApp.getFileById(id).setTrashed(true); } catch (err) { /* 已經不在就算了 */ }
    },
  };
}
