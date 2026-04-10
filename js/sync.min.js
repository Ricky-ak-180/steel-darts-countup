// ============================================================
// Cloud Sync Module — Steel Darts Pro
// Requires: firebase-config.js, leaderboard.js (for _lb.db, _lb.uid)
// ============================================================

var _sync = {
  enabled: false,
  uploading: false,
  uploadTimer: null,
  uploadDelay: 5000,  // 5秒デバウンス
  statusEl: null,
  // 同期対象のlocalStorageキー
  KEYS: [
    'dh',           // CountUp履歴
    'dh01',         // 01履歴
    'arr_train_v1', // アレンジトレーニング進捗
    'arr_best',     // アレンジベストスコア
    'arr_quiz_v1',  // アレンジクイズ成績
    'player_xp',    // XP
    'daily_streak', // デイリーストリーク
    'user_level',   // ユーザーレベル
    'lang'          // 言語設定
  ]
};

// ============================================================
// SYNC STATUS UI
// ============================================================

function _syncShowStatus(msg, type) {
  // type: 'ok' | 'uploading' | 'error' | 'info'
  var el = document.getElementById('sync-status');
  if (!el) return;
  el.textContent = msg;
  el.className = 'sync-status sync-' + (type || 'info');
  el.style.display = 'flex';
  if (type === 'ok') {
    setTimeout(function() {
      if (el) el.style.display = 'none';
    }, 3000);
  }
}

// ============================================================
// UPLOAD — ローカル → Firebase
// ============================================================

function syncUpload(immediate) {
  if (!_sync.enabled || !_lb.uid || !_lb.db) return;
  if (_sync.uploadTimer) clearTimeout(_sync.uploadTimer);

  var delay = immediate ? 0 : _sync.uploadDelay;
  _sync.uploadTimer = setTimeout(function() {
    _syncDoUpload();
  }, delay);
}

function _syncDoUpload() {
  if (!_sync.enabled || !_lb.uid || !_lb.db) return;
  if (_sync.uploading) return;
  _sync.uploading = true;
  _syncShowStatus('☁ 同期中…', 'uploading');

  var data = { _ts: Date.now() };
  for (var i = 0; i < _sync.KEYS.length; i++) {
    var key = _sync.KEYS[i];
    var val = localStorage.getItem(key);
    if (val !== null) data[key] = val;
  }

  _lb.db.ref('users/' + _lb.uid + '/sync').set(data)
    .then(function() {
      _sync.uploading = false;
      localStorage.setItem('sync_ts', String(data._ts));
      _syncShowStatus('✓ 同期完了', 'ok');
    })
    .catch(function(err) {
      _sync.uploading = false;
      console.log('Sync upload error:', err.message);
      _syncShowStatus('⚠ 同期エラー', 'error');
    });
}

// ============================================================
// DOWNLOAD — Firebase → ローカル
// ============================================================

function syncDownload(callback) {
  if (!_sync.enabled || !_lb.uid || !_lb.db) {
    if (callback) callback(false);
    return;
  }

  _lb.db.ref('users/' + _lb.uid + '/sync').once('value')
    .then(function(snap) {
      var remote = snap.val();
      if (!remote || !remote._ts) {
        // クラウドにデータなし → ローカルをアップロード
        syncUpload(true);
        if (callback) callback(false);
        return;
      }

      var localTs = parseInt(localStorage.getItem('sync_ts') || '0', 10);
      if (remote._ts > localTs) {
        // クラウドが新しい → ローカルを上書き
        _syncApplyRemote(remote);
        if (callback) callback(true); // データを復元した
      } else {
        // ローカルが新しい → クラウドにアップロード
        syncUpload(true);
        if (callback) callback(false);
      }
    })
    .catch(function(err) {
      console.log('Sync download error:', err.message);
      if (callback) callback(false);
    });
}

function _syncApplyRemote(remote) {
  for (var i = 0; i < _sync.KEYS.length; i++) {
    var key = _sync.KEYS[i];
    if (remote[key] !== undefined && remote[key] !== null) {
      localStorage.setItem(key, remote[key]);
    }
  }
  localStorage.setItem('sync_ts', String(remote._ts));
  _syncShowStatus('☁ データを復元しました', 'ok');
  // UIを再描画（言語・履歴等が変わった可能性）
  setTimeout(function() {
    if (typeof applyLang === 'function') applyLang();
    if (typeof renderHist === 'function') renderHist();
    if (typeof _renderXP === 'function') _renderXP();
  }, 200);
}

// ============================================================
// 引き継ぎコード — 端末移行用
// ============================================================

function syncGetTransferCode() {
  if (!_lb.uid) return null;
  // UIDをBase64エンコードして短縮
  return btoa(_lb.uid).replace(/=/g, '').substring(0, 12).toUpperCase();
}

function syncShowTransferUI() {
  var code = syncGetTransferCode();
  if (!code) {
    _toast('ログイン中…しばらくお待ちください');
    return;
  }
  var el = document.getElementById('sync-transfer-code');
  if (el) {
    el.textContent = code;
    el.style.display = 'block';
  }
  // クリップボードにコピー
  if (navigator.clipboard) {
    navigator.clipboard.writeText(_lb.uid).then(function() {
      _toast('引き継ぎコードをコピーしました');
    });
  }
}

// ============================================================
// localStorageの変更を監視してアップロードをトリガー
// ============================================================

var _syncOrigSetItem = localStorage.setItem.bind(localStorage);
localStorage.setItem = function(key, value) {
  _syncOrigSetItem(key, value);
  if (_sync.enabled && _sync.KEYS.indexOf(key) >= 0) {
    syncUpload(false); // デバウンスあり
  }
};

// ============================================================
// INIT — lbInit()のサインイン完了後に呼び出す
// ============================================================

function syncInit(uid) {
  if (!FIREBASE_ENABLED || !uid || !_lb.db) return;
  _sync.enabled = true;
  _syncUpdatePanel('connecting');

  // 起動時にダウンロード確認
  syncDownload(function(restored) {
    _syncUpdatePanel('ok');
    if (restored) {
      console.log('[Sync] Remote data restored');
    } else {
      console.log('[Sync] Local data is up to date');
    }
  });
}

// ============================================================
// パネルステータス更新
// ============================================================

function _syncUpdatePanel(status) {
  var badge = document.getElementById('sync-status-badge');
  var transferRow = document.getElementById('sync-transfer-row');
  var codeEl = document.getElementById('sync-transfer-code');
  if (!badge) return;

  if (status === 'ok') {
    badge.textContent = '✓ 有効';
    badge.className = 'sync-panel-status sync-ok';
    if (transferRow) transferRow.style.display = 'flex';
    if (codeEl && _lb.uid) {
      // UID先頭12文字を引き継ぎコードとして表示
      codeEl.textContent = _lb.uid.substring(0, 12).toUpperCase();
    }
  } else if (status === 'connecting') {
    badge.textContent = '接続中…';
    badge.className = 'sync-panel-status';
  } else {
    badge.textContent = '無効';
    badge.className = 'sync-panel-status';
  }
}

// ============================================================
// STATUS バッジHTML（設定画面等で使用）
// ============================================================

function syncGetStatusHTML() {
  if (!FIREBASE_ENABLED) return '';
  var uid = _lb && _lb.uid ? _lb.uid : null;
  return '<div class="sync-info-row">' +
    '<span class="sync-info-label">☁ クラウド同期</span>' +
    '<span class="sync-info-val" id="sync-uid-disp">' +
    (uid ? '✓ 有効' : '接続中…') + '</span>' +
    '</div>';
}
