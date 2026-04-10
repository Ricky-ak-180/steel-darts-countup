// ============================================================
// Leaderboard Module — Steel Darts Pro
// ============================================================
// Requires: firebase-config.js, Firebase SDK (loaded from CDN)
// ============================================================

var _lb = {
  db: null,
  auth: null,
  uid: null,
  displayName: '',
  initialized: false,
  // Cache to avoid excessive reads
  cache: {},
  cacheTTL: 60000 // 1 minute
};

// ============================================================
// INIT
// ============================================================

function lbInit() {
  if (!FIREBASE_ENABLED) return;
  if (_lb.initialized) return;

  try {
    var app = firebase.initializeApp(FIREBASE_CONFIG);
    _lb.db = firebase.database();
    _lb.auth = firebase.auth();
    _lb.initialized = true;

    // Sign in anonymously
    _lb.auth.signInAnonymously().then(function(cred) {
      _lb.uid = cred.user.uid;
      // Load saved display name
      _lb.displayName = localStorage.getItem('lb_name') || '';
      // クラウド同期を開始
      if (typeof syncInit === 'function') syncInit(_lb.uid);
    }).catch(function(err) {
      console.log('Firebase auth error:', err.message);
    });

    // Listen for auth state changes
    _lb.auth.onAuthStateChanged(function(user) {
      if (user) {
        _lb.uid = user.uid;
      }
    });
  } catch (e) {
    console.log('Firebase init error:', e.message);
    _lb.initialized = false;
  }
}

// ============================================================
// DISPLAY NAME
// ============================================================

function lbSetName(name) {
  name = (name || '').trim().substring(0, 16);
  if (!name) return;
  _lb.displayName = name;
  localStorage.setItem('lb_name', name);
}

function lbGetName() {
  return _lb.displayName || localStorage.getItem('lb_name') || '';
}

// ============================================================
// SUBMIT SCORE
// ============================================================

function lbSubmitScore(mode, score, extra) {
  if (!_lb.initialized || !_lb.uid) return;
  var name = lbGetName();
  if (!name) {
    _lbPromptName(function() { lbSubmitScore(mode, score, extra); });
    return;
  }

  var entry = {
    uid: _lb.uid,
    name: name,
    score: score,
    ts: firebase.database.ServerValue.TIMESTAMP
  };
  if (extra) {
    for (var k in extra) {
      if (extra.hasOwnProperty(k)) entry[k] = extra[k];
    }
  }

  // Write to leaderboard/{mode}/{uid}
  // Only keeps the user's best score per mode
  var ref = _lb.db.ref('leaderboard/' + mode + '/' + _lb.uid);
  ref.once('value').then(function(snap) {
    var existing = snap.val();
    // For CountUp: higher is better
    // For 01 avg: lower is better (handled by caller via negative score trick or separate logic)
    if (!existing || score > existing.score) {
      ref.set(entry).then(function() {
        _toast(t('lb.submitted'));
      }).catch(function(err) {
        console.log('Score submit error:', err.message);
      });
    } else {
      _toast(t('lb.not_pb'));
    }
  });
}

// ============================================================
// FETCH LEADERBOARD
// ============================================================

function lbFetch(mode, limit, callback) {
  if (!_lb.initialized) {
    callback([]);
    return;
  }

  // Check cache
  var cacheKey = mode + '_' + limit;
  var cached = _lb.cache[cacheKey];
  if (cached && (Date.now() - cached.ts < _lb.cacheTTL)) {
    callback(cached.data);
    return;
  }

  var ref = _lb.db.ref('leaderboard/' + mode);
  ref.orderByChild('score').limitToLast(limit || 20).once('value').then(function(snap) {
    var entries = [];
    snap.forEach(function(child) {
      entries.push(child.val());
    });
    // Sort descending (highest first)
    entries.sort(function(a, b) { return b.score - a.score; });

    // Cache result
    _lb.cache[cacheKey] = { data: entries, ts: Date.now() };
    callback(entries);
  }).catch(function(err) {
    console.log('Leaderboard fetch error:', err.message);
    callback([]);
  });
}

// ============================================================
// WEEKLY LEADERBOARD
// ============================================================

function lbSubmitWeekly(mode, score, extra) {
  if (!_lb.initialized || !_lb.uid) return;
  var name = lbGetName();
  if (!name) return;

  // Week key: YYYY-WNN
  var now = new Date();
  var jan1 = new Date(now.getFullYear(), 0, 1);
  var weekNum = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  var weekKey = now.getFullYear() + '-W' + (weekNum < 10 ? '0' : '') + weekNum;

  var entry = {
    uid: _lb.uid,
    name: name,
    score: score,
    ts: firebase.database.ServerValue.TIMESTAMP
  };
  if (extra) {
    for (var k in extra) {
      if (extra.hasOwnProperty(k)) entry[k] = extra[k];
    }
  }

  var ref = _lb.db.ref('weekly/' + weekKey + '/' + mode + '/' + _lb.uid);
  ref.once('value').then(function(snap) {
    var existing = snap.val();
    if (!existing || score > existing.score) {
      ref.set(entry);
    }
  });
}

function lbFetchWeekly(mode, limit, callback) {
  if (!_lb.initialized) {
    callback([]);
    return;
  }

  var now = new Date();
  var jan1 = new Date(now.getFullYear(), 0, 1);
  var weekNum = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  var weekKey = now.getFullYear() + '-W' + (weekNum < 10 ? '0' : '') + weekNum;

  var ref = _lb.db.ref('weekly/' + weekKey + '/' + mode);
  ref.orderByChild('score').limitToLast(limit || 20).once('value').then(function(snap) {
    var entries = [];
    snap.forEach(function(child) {
      entries.push(child.val());
    });
    entries.sort(function(a, b) { return b.score - a.score; });
    callback(entries);
  }).catch(function() {
    callback([]);
  });
}

// ============================================================
// NAME PROMPT UI
// ============================================================

function _lbPromptName(onDone) {
  var ov = document.createElement('div');
  ov.className = 'lb-name-overlay';
  ov.innerHTML = '<div class="lb-name-dialog">' +
    '<h3>' + t('lb.enter_name') + '</h3>' +
    '<input type="text" id="lb-name-input" maxlength="16" placeholder="' + t('lb.name_placeholder') + '" autocomplete="off">' +
    '<div class="lb-name-btns">' +
    '<button id="lb-name-cancel">' + t('lb.cancel') + '</button>' +
    '<button id="lb-name-ok" class="primary">' + t('lb.ok') + '</button>' +
    '</div></div>';
  document.body.appendChild(ov);

  var inp = document.getElementById('lb-name-input');
  inp.value = lbGetName();
  setTimeout(function() { inp.focus(); }, 100);

  document.getElementById('lb-name-ok').onclick = function() {
    var v = inp.value.trim();
    if (v) {
      lbSetName(v);
      ov.remove();
      if (onDone) onDone();
    }
  };
  document.getElementById('lb-name-cancel').onclick = function() {
    ov.remove();
  };
  inp.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') document.getElementById('lb-name-ok').click();
  });
}

// ============================================================
// LEADERBOARD UI
// ============================================================

function lbRenderBoard(containerId, mode, options) {
  var el = document.getElementById(containerId);
  if (!el) return;

  options = options || {};
  var isWeekly = options.weekly || false;
  var limit = options.limit || 20;

  el.innerHTML = '<div class="lb-loading">' + t('lb.loading') + '</div>';

  var fetchFn = isWeekly ? lbFetchWeekly : lbFetch;
  fetchFn(mode, limit, function(entries) {
    if (!entries.length) {
      el.innerHTML = '<div class="lb-empty">' + t('lb.no_scores') + '</div>';
      return;
    }

    var html = '<div class="lb-list">';
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      var isMe = e.uid === _lb.uid;
      var medal = i === 0 ? '🥇' : (i === 1 ? '🥈' : (i === 2 ? '🥉' : ''));
      var rankNum = i + 1;

      html += '<div class="lb-row' + (isMe ? ' lb-me' : '') + '">';
      html += '<span class="lb-rank">' + (medal || rankNum) + '</span>';
      html += '<span class="lb-name">' + _lbEscape(e.name) + (isMe ? ' (' + t('lb.you') + ')' : '') + '</span>';
      html += '<span class="lb-score">' + e.score + '</span>';
      html += '</div>';
    }
    html += '</div>';

    // Show my rank if not in top list
    var myRank = -1;
    for (var j = 0; j < entries.length; j++) {
      if (entries[j].uid === _lb.uid) { myRank = j; break; }
    }
    if (myRank === -1 && _lb.uid) {
      html += '<div class="lb-my-rank">' + t('lb.your_best_not_ranked') + '</div>';
    }

    el.innerHTML = html;
  });
}

function _lbEscape(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ============================================================
// CHALLENGE MODE (No Firebase required)
// ============================================================

function challengeCreate(mode, score, extra) {
  var data = {
    m: mode,
    s: score,
    n: lbGetName() || 'Player',
    d: Date.now()
  };
  if (extra) {
    for (var k in extra) {
      if (extra.hasOwnProperty(k)) data[k] = extra[k];
    }
  }
  // Encode as base64 URL-safe
  var json = JSON.stringify(data);
  var encoded = btoa(unescape(encodeURIComponent(json))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return 'https://ricky-ak-180.github.io/steel-darts-countup/?challenge=' + encoded;
}

function challengeParse() {
  var params = new URLSearchParams(window.location.search);
  var code = params.get('challenge');
  if (!code) return null;

  try {
    var padded = code.replace(/-/g, '+').replace(/_/g, '/');
    while (padded.length % 4) padded += '=';
    var json = decodeURIComponent(escape(atob(padded)));
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function challengeCheck() {
  var c = challengeParse();
  if (!c) return;

  // Remove challenge param from URL
  var url = new URL(window.location);
  url.searchParams.delete('challenge');
  window.history.replaceState({}, '', url);

  // Show challenge banner
  _showChallengeBanner(c);
}

function _showChallengeBanner(c) {
  var modeNames = { cu: 'Count-Up', z01_501: '501', z01_301: '301', ckt: 'Cricket', sim: 'SIM 501' };
  var modeName = modeNames[c.m] || c.m;

  var banner = document.createElement('div');
  banner.className = 'challenge-banner';
  banner.innerHTML = '<div class="challenge-inner">' +
    '<div class="challenge-icon">⚔️</div>' +
    '<div class="challenge-text">' +
    '<div class="challenge-title">' + t('lb.challenge_title') + '</div>' +
    '<div class="challenge-detail">' + _lbEscape(c.n) + ' ' + t('lb.challenge_scored') + ' <strong>' + c.s + '</strong> ' + t('lb.challenge_in') + ' ' + modeName + '</div>' +
    '</div>' +
    '<button class="challenge-accept" onclick="this.parentNode.parentNode.remove()">' + t('lb.challenge_accept') + '</button>' +
    '</div>';
  document.body.appendChild(banner);

  // Store challenge target for result comparison
  localStorage.setItem('_challenge', JSON.stringify(c));

  // Auto-dismiss after 10s
  setTimeout(function() { if (banner.parentNode) banner.remove(); }, 10000);
}

function challengeGetActive() {
  try {
    var c = JSON.parse(localStorage.getItem('_challenge'));
    if (c && (Date.now() - c.d) < 7 * 86400000) return c; // Valid for 7 days
  } catch (e) {}
  localStorage.removeItem('_challenge');
  return null;
}

function challengeClear() {
  localStorage.removeItem('_challenge');
}

// ============================================================
// INTEGRATION: Auto-submit on game end
// ============================================================

function lbOnGameEnd(mode, score, extra) {
  if (!FIREBASE_ENABLED || !_lb.initialized) return;
  lbSubmitScore(mode, score, extra);
  lbSubmitWeekly(mode, score, extra);
}

// ============================================================
// INIT on load
// ============================================================

if (typeof window !== 'undefined') {
  window.addEventListener('load', function() {
    lbInit();
    challengeCheck();
  });
}
