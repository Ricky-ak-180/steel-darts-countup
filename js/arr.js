function initArr() { _renderArrBest(); _renderArrHist(); }

/* ============================================================
   アレンジトレーニング
   ============================================================ */
var _TRAIN_HINT_HIDE = 3;
var _TRAIN_MASTER    = 3;
var _TRAIN_PERFECT   = 5;

var _TRAIN_SCORES = (function() {
  var arr = [];
  for (var i = 2; i <= 40; i++) arr.push(i);
  for (var n = 41; n <= 170; n++) {
    if (CHECKOUT[n] || BOGEY_NUMS.indexOf(n) >= 0) arr.push(n);
  }
  return arr;
})();

var _trainCurrent = null;
var _trainHintVis  = false;
var _trainWeakQueue = [];
var _trainSession = { correct: 0, attempts: 0, combo: 0 };

var _TRAIN_DIFF = [
  { key:'beginner', label:'⬜ 入門',   color:'#66bb6a', from:2,   to:40  },
  { key:'easy',     label:'🟦 初級',   color:'#4fc3f7', from:41,  to:60  },
  { key:'normal',   label:'🟨 中級',   color:'#ffd54f', from:61,  to:100 },
  { key:'hard',     label:'🟧 上級',   color:'#ff9800', from:101, to:130 },
  { key:'vhard',    label:'🟥 難しい', color:'#ef5350', from:131, to:160 },
  { key:'expert',   label:'🟣 超難',   color:'#ab47bc', from:161, to:170 }
];
function _trainDiff(score) {
  for (var i = 0; i < _TRAIN_DIFF.length; i++) {
    if (score >= _TRAIN_DIFF[i].from && score <= _TRAIN_DIFF[i].to) return _TRAIN_DIFF[i];
  }
  return _TRAIN_DIFF[0];
}

function _trainLoad() {
  try { return JSON.parse(localStorage.getItem('arr_train_v1') || '{}'); } catch(e) { return {}; }
}
function _trainSave(d) { localStorage.setItem('arr_train_v1', JSON.stringify(d)); }
function _trainEntry(score, d) {
  var e = d[score] || {c:0, a:0};
  if (typeof e.a !== 'number') e.a = e.c || 0;  // 旧データ移行
  return e;
}
function _trainIsBogey(score) { return BOGEY_NUMS.indexOf(score) >= 0; }

function _trainUnlocked(idx, d) {
  if (idx === 0) return true;
  var prev = _TRAIN_SCORES[idx - 1];
  if (_trainIsBogey(prev)) return _trainUnlocked(idx - 1, d);
  return (_trainEntry(prev, d).c >= 1);
}

function _trainTileClass(score, idx, d) {
  if (!_trainUnlocked(idx, d)) return 'locked';
  if (_trainIsBogey(score)) return 'bogey';
  var c = _trainEntry(score, d).c;
  if (c >= _TRAIN_PERFECT) return 'perfect';
  if (c >= _TRAIN_MASTER)  return 'mastered';
  if (c >= 1)              return 'started';
  return 'unstarted';
}

function _trainRateText(entry) {
  if (!entry.a) return '';
  var rate = Math.round(entry.c / entry.a * 100);
  return '成功率 ' + rate + '% (' + entry.c + '/' + entry.a + ')';
}

function _trainNextScore(current) {
  var idx = _TRAIN_SCORES.indexOf(current);
  for (var i = idx + 1; i < _TRAIN_SCORES.length; i++) {
    if (!_trainIsBogey(_TRAIN_SCORES[i])) return _TRAIN_SCORES[i];
  }
  return null;
}

function showTraining() {
  document.getElementById('arr-setup').style.display = 'none';
  document.getElementById('arr-hist-wrap').style.display = 'none';
  document.getElementById('arr-train-home').style.display = 'flex';
  document.getElementById('arr-train-prac').style.display = 'none';
  _renderTrainMap();
}

function trainBackToMap() {
  document.getElementById('arr-train-prac').style.display = 'none';
  document.getElementById('arr-train-home').style.display = 'flex';
  _renderTrainMap();
}

function trainContinue() {
  var d = _trainLoad();
  for (var i = 0; i < _TRAIN_SCORES.length; i++) {
    if (!_trainUnlocked(i, d)) break;
    var s = _TRAIN_SCORES[i];
    if (!_trainIsBogey(s) && _trainEntry(s, d).c < _TRAIN_MASTER) { trainStart(s); return; }
  }
  trainStart(_TRAIN_SCORES[_TRAIN_SCORES.length - 1]);
}

function trainWeakMode() {
  var d = _trainLoad();
  // 3回以上試行して成功率60%未満のスコアを抽出
  var weak = _TRAIN_SCORES.filter(function(s){
    if (_trainIsBogey(s)) return false;
    var e = _trainEntry(s, d);
    return e.a >= 1 && (e.c / e.a) < 0.6;
  }).sort(function(a, b){
    var ea = _trainEntry(a, d), eb = _trainEntry(b, d);
    return (ea.c/ea.a) - (eb.c/eb.a); // 成功率が低い順
  });
  if (weak.length === 0) {
    alert('苦手スコアが見つかりません。もっとトレーニングを積んでから試してみましょう！');
    return;
  }
  // 苦手スコアキューをセットして最初のスコアからスタート
  _trainWeakQueue = weak.slice();
  trainStart(_trainWeakQueue[0]);
  // 練習画面に苦手リストを表示
  setTimeout(function(){
    var info = document.getElementById('arr-train-weak-info');
    if (info) {
      info.innerHTML = '🎯 苦手スコア集中モード (' + weak.length + '個) ｜ 次: ' +
        weak.slice(1, 4).join(' → ') + (weak.length > 4 ? ' …' : '');
      info.style.display = 'block';
    }
  }, 100);
}

function trainStart(score) {
  score = parseInt(score, 10);
  if (_trainIsBogey(score)) return;
  _trainCurrent = score;
  var d = _trainLoad();
  var entry = _trainEntry(score, d);
  _trainHintVis = entry.c < _TRAIN_HINT_HIDE;
  document.getElementById('arr-train-home').style.display = 'none';
  document.getElementById('arr-train-prac').style.display = 'flex';
  var okBtn = document.getElementById('arr-tp-ok-btn');
  var ngBtn = document.getElementById('arr-tp-ng-btn');
  if (okBtn) okBtn.style.opacity = '1';
  if (ngBtn) ngBtn.style.opacity = '1';
  _renderTrainPrac(score, entry);
}

function trainToggleHint() {
  _trainHintVis = !_trainHintVis;
  _applyTrainHintVis();
}

function _applyTrainHintVis() {
  var box = document.getElementById('arr-tp-hint-box');
  var btn = document.getElementById('arr-tp-hint-btn');
  box.style.display = _trainHintVis ? '' : 'none';
  if (btn) btn.textContent = _trainHintVis ? '🙈 ヒントを隠す' : '👁 ヒントを見る';
}

function _renderTrainPrac(score, entry) {
  if (!entry) { var d = _trainLoad(); entry = _trainEntry(score, d); }
  var c = entry.c;
  document.getElementById('arr-tp-header-score').textContent = score;
  document.getElementById('arr-tp-header-clears').textContent = c + '回クリア';
  document.getElementById('arr-tp-score-big').textContent = score;
  var stars = '';
  for (var i = 0; i < _TRAIN_MASTER; i++) stars += (i < Math.min(c, _TRAIN_MASTER)) ? '★' : '☆';
  if (c >= _TRAIN_PERFECT) stars = '🌟 PERFECT';
  document.getElementById('arr-tp-stars').textContent = stars;
  document.getElementById('arr-tp-rate').textContent = _trainRateText(entry);
  var streakEl = document.getElementById('arr-tp-streak');
  if (streakEl) streakEl.textContent = '';
  var diff = _trainDiff(score);
  var badge = document.getElementById('arr-tp-diff-badge');
  if (badge) badge.innerHTML = '<span class="arr-diff-chip" style="background:' + diff.color + '22;color:' + diff.color + ';border:1px solid ' + diff.color + '44;">' + diff.label + '</span>';
  var path = (_userRoutes && _userRoutes[score] && _userRoutes[score].length > 0)
    ? _userRoutes[score][0]
    : (CHECKOUT[score] || (score % 2 === 0 && score <= 40 ? ['D' + (score / 2)] : null));
  document.getElementById('arr-tp-hint-box').innerHTML = _pathHtml(path);
  var hintBtn = document.getElementById('arr-tp-hint-btn');
  hintBtn.style.display = c >= _TRAIN_HINT_HIDE ? '' : 'none';
  _applyTrainHintVis();
  var tip = document.getElementById('arr-tp-tip');
  if (CHECKOUT_TIPS[score]) { tip.textContent = CHECKOUT_TIPS[score]; tip.style.display = ''; }
  else { tip.style.display = 'none'; }
  var prevBtn = document.getElementById('arr-tp-prev-btn');
  if (prevBtn) {
    var curIdx = _TRAIN_SCORES.indexOf(score);
    prevBtn.style.display = curIdx > 0 ? '' : 'none';
  }
  document.getElementById('arr-tp-result-row').style.display = 'none';
}

function trainResult(ok) {
  ok = (parseInt(ok, 10) === 1);
  var d = _trainLoad();
  if (!d[_trainCurrent]) d[_trainCurrent] = {c:0, a:0};
  if (typeof d[_trainCurrent].a !== 'number') d[_trainCurrent].a = d[_trainCurrent].c || 0;
  d[_trainCurrent].a++;
  if (ok) d[_trainCurrent].c++;
  _trainSave(d);
  _trainSession.attempts++;
  if (ok) { _trainSession.correct++; _trainSession.combo++; }
  else _trainSession.combo = 0;
  var entry = d[_trainCurrent];
  var c = entry.c;
  var stars = '';
  for (var i = 0; i < _TRAIN_MASTER; i++) stars += (i < Math.min(c, _TRAIN_MASTER)) ? '★' : '☆';
  if (c >= _TRAIN_PERFECT) stars = '🌟 PERFECT';
  document.getElementById('arr-tp-stars').textContent = stars;
  document.getElementById('arr-tp-header-clears').textContent = c + '回クリア';
  document.getElementById('arr-tp-rate').textContent = _trainRateText(entry);
  var streakEl = document.getElementById('arr-tp-streak');
  if (streakEl) {
    if (_trainSession.combo >= 5) streakEl.textContent = '⚡ ' + _trainSession.combo + '連続！！';
    else if (_trainSession.combo >= 3) streakEl.textContent = '🔥 ' + _trainSession.combo + '連続！';
    else streakEl.textContent = '';
  }
  var body = document.getElementById('arr-tp-body');
  if (body) {
    body.classList.remove('train-flash-ok','train-flash-ng');
    void body.offsetWidth;
    body.classList.add(ok ? 'train-flash-ok' : 'train-flash-ng');
  }
  var okBtn = document.getElementById('arr-tp-ok-btn');
  var ngBtn = document.getElementById('arr-tp-ng-btn');
  if (okBtn) okBtn.style.opacity = ok ? '1' : '0.4';
  if (ngBtn) ngBtn.style.opacity = ok ? '0.4' : '1';
  if (ok && c === _TRAIN_HINT_HIDE) {
    _trainHintVis = false;
    document.getElementById('arr-tp-hint-btn').style.display = '';
    _applyTrainHintVis();
  }
  var unlockEl = document.getElementById('arr-tp-unlock-msg');
  var next = _trainNextScore(_trainCurrent);
  if (ok && c === 1 && next) unlockEl.textContent = '🔓 ' + next + ' をアンロック！';
  else if (ok && c === _TRAIN_HINT_HIDE) unlockEl.textContent = '✨ ヒントが自動非表示に';
  else if (ok && c >= _TRAIN_PERFECT && c === _TRAIN_PERFECT) unlockEl.textContent = '🌟 PERFECTマスター！';
  else unlockEl.textContent = '';
  document.getElementById('arr-tp-next-btn').textContent = next ? '次のスコアへ →' : '一覧へ戻る';
  var prevBtn = document.getElementById('arr-tp-prev-btn');
  if (prevBtn) prevBtn.style.display = _TRAIN_SCORES.indexOf(_trainCurrent) > 0 ? '' : 'none';
  document.getElementById('arr-tp-result-row').style.display = '';
}

function trainNext() {
  if (_trainWeakQueue.length > 0) {
    // 苦手モード中: キューを進める
    _trainWeakQueue.shift();
    if (_trainWeakQueue.length > 0) {
      trainStart(_trainWeakQueue[0]);
      return;
    }
    // キューが空になった → 通常マップへ
    trainBackToMap();
    return;
  }
  var next = _trainNextScore(_trainCurrent);
  if (next) trainStart(next);
  else trainBackToMap();
}

function trainRetry() {
  var okBtn = document.getElementById('arr-tp-ok-btn');
  var ngBtn = document.getElementById('arr-tp-ng-btn');
  if (okBtn) okBtn.style.opacity = '1';
  if (ngBtn) ngBtn.style.opacity = '1';
  document.getElementById('arr-tp-result-row').style.display = 'none';
  document.getElementById('arr-tp-unlock-msg').textContent = '';
}

function trainRandom() {
  var d = _trainLoad();
  var pool = _TRAIN_SCORES.filter(function(s, idx) {
    return !_trainIsBogey(s) && _trainUnlocked(idx, d);
  });
  if (!pool.length) return;
  _trainWeakQueue = [];
  trainStart(pool[Math.floor(Math.random() * pool.length)]);
}

function trainPrev() {
  var idx = _TRAIN_SCORES.indexOf(_trainCurrent);
  for (var i = idx - 1; i >= 0; i--) {
    if (!_trainIsBogey(_TRAIN_SCORES[i])) { trainStart(_TRAIN_SCORES[i]); return; }
  }
}

function _renderTrainMap() {
  var d = _trainLoad();
  var total = 0, mastered = 0;
  _TRAIN_SCORES.forEach(function(s) {
    if (!_trainIsBogey(s)) { total++; if (_trainEntry(s, d).c >= _TRAIN_MASTER) mastered++; }
  });
  var pct = total > 0 ? Math.round(mastered / total * 100) : 0;
  document.getElementById('arr-train-progress').textContent = mastered + ' / ' + total + ' マスター (' + pct + '%)';
  var fill = document.getElementById('arr-total-prog-fill');
  if (fill) fill.style.width = pct + '%';
  var strip = document.getElementById('arr-session-strip');
  if (strip && _trainSession.attempts > 0) {
    var sRate = Math.round(_trainSession.correct / _trainSession.attempts * 100);
    strip.innerHTML = '📊 本日: ' + _trainSession.attempts + '回試行　' + _trainSession.correct + '回成功　' + sRate + '%';
    strip.style.display = 'flex';
  }
  var continueScore = null;
  for (var j = 0; j < _TRAIN_SCORES.length; j++) {
    if (!_trainUnlocked(j, d)) break;
    var sc = _TRAIN_SCORES[j];
    if (!_trainIsBogey(sc) && _trainEntry(sc, d).c < _TRAIN_MASTER) { continueScore = sc; break; }
  }
  var contWrap = document.getElementById('arr-train-continue-wrap');
  if (continueScore !== null) {
    document.getElementById('arr-train-continue-score').textContent = continueScore;
    contWrap.style.display = '';
  } else {
    contWrap.style.display = 'none';
  }
  var html = '';
  _TRAIN_DIFF.forEach(function(diff) {
    var tiles = [];
    for (var k = 0; k < _TRAIN_SCORES.length; k++) {
      var s = _TRAIN_SCORES[k];
      if (s >= diff.from && s <= diff.to) tiles.push({s:s, idx:k});
    }
    if (!tiles.length) return;
    var secTotal = 0, secMastered = 0;
    tiles.forEach(function(t){
      if (!_trainIsBogey(t.s)) { secTotal++; if (_trainEntry(t.s, d).c >= _TRAIN_MASTER) secMastered++; }
    });
    var secPct = secTotal > 0 ? Math.round(secMastered / secTotal * 100) : 0;
    html += '<div class="arr-train-section">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">';
    html += '<div style="font-size:10px;color:' + diff.color + ';letter-spacing:1.5px;font-weight:700;">' + diff.label + ' <span style="color:var(--mut);font-weight:400;">' + diff.from + '〜' + diff.to + '</span></div>';
    html += '<div style="font-size:10px;color:var(--mut);">' + secMastered + '/' + secTotal + ' (' + secPct + '%)</div>';
    html += '</div>';
    html += '<div class="arr-sec-prog"><div class="arr-sec-prog-fill" style="width:' + secPct + '%;background:' + diff.color + ';"></div></div>';
    html += '<div class="arr-train-grid">';
    tiles.forEach(function(t) {
      var cls = _trainTileClass(t.s, t.idx, d);
      var diffCls = ' diff-' + diff.key;
      var fn = (cls !== 'locked' && cls !== 'bogey') ? ' data-fn="trainStart" data-arg="' + t.s + '"' : '';
      var c = _trainEntry(t.s, d).c;
      var sub = '';
      if (cls === 'bogey') sub = '<div class="t-sub">×</div>';
      else if (cls === 'locked') sub = '<div class="t-sub">🔒</div>';
      else if (c > 0) {
        var e2 = _trainEntry(t.s, d);
        var rate = e2.a ? Math.round(e2.c / e2.a * 100) + '%' : '';
        sub = '<div class="t-sub">' + (c >= _TRAIN_PERFECT ? '★' : c + '/' + _TRAIN_MASTER) + ' ' + rate + '</div>';
      }
      html += '<div class="arr-train-tile ' + cls + diffCls + '"' + fn + '><div class="t-num">' + t.s + '</div>' + sub + '</div>';
    });
    html += '</div></div>';
  });
  document.getElementById('arr-train-map').innerHTML = html;

  // 現在の進捗位置に自動スクロール
  if (continueScore !== null) {
    setTimeout(function(){
      var map = document.getElementById('arr-train-map');
      var tile = map && map.querySelector('[data-arg="' + continueScore + '"]');
      if (tile && map) {
        tile.scrollIntoView({block: 'center', behavior: 'smooth'});
      }
    }, 100);
  }
}

/* ====================== 01 GAME ====================== */
var _z01 = {
  mode: 501, legs: 1, inRule: 0, outRule: 0, players: 1, cpuLevel: 4,
  names: ['Player 1', 'Player 2'],
  remain: [501, 501], legWins: [0, 0], currentPlayer: 0, currentLeg: 1,
  stats: null, _buf: '', log: [], _pendingFinish: null,
  roundScores: [[], []], checkoutAttempts: [[], []]
};
var _Z01_CPU_AVG = [0, 12, 22, 32, 42, 52, 62, 72, 81, 90, 98, 107, 116];
var _Z01_CPU_SD  = [0, 10, 12, 14, 15, 17, 18, 17, 16, 15, 13, 11,  9];

function _z01Norm() {
  var u = 1 - Math.random(), v = 1 - Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function _z01CpuScore(remain) {
  if (remain <= 170 && CHECKOUT[remain]) {
    var hp = [0, 0.01, 0.02, 0.04, 0.07, 0.11, 0.17, 0.25, 0.35, 0.46, 0.58, 0.70, 0.82][_z01.cpuLevel];
    if (Math.random() < hp) return remain;
  }
  var sc = Math.round(_Z01_CPU_AVG[_z01.cpuLevel] + _Z01_CPU_SD[_z01.cpuLevel] * _z01Norm());
  sc = Math.max(0, Math.min(180, sc));
  if (_z01.outRule === 0) {
    if (remain - sc < 0 || remain - sc === 1) sc = Math.max(0, remain - 2);
    if (remain - sc < 0 || remain - sc === 1) sc = 0;
  } else {
    if (remain - sc < 0) sc = 0;
  }
  return sc;
}

function _z01InitStats(n) {
  var a = [];
  for (var i = 0; i < n; i++)
    a.push({rounds:0, total:0, first9:[], c100:0, c140:0, c180:0, hiFin:0, bestLeg:999, worstLeg:0, legRounds:0, finishDarts:0, totalFinishDarts:0});
  return a;
}

function z01SetMode(arg) {
  _z01.mode = arg;
  document.querySelectorAll('#z01-setup-wrap [data-fn="z01SetMode"]').forEach(function(el){
    el.classList.toggle('on', parseInt(el.getAttribute('data-arg'),10)===arg);
  });
  document.getElementById('z01-custom-row').style.display = (arg===0)?'':'none';
}
function z01SetLegs(arg) {
  _z01.legs = arg;
  document.querySelectorAll('#z01-setup-wrap [data-fn="z01SetLegs"]').forEach(function(el){
    el.classList.toggle('on', parseInt(el.getAttribute('data-arg'),10)===arg);
  });
  var customRow = document.getElementById('z01-legs-custom-row');
  if (customRow) customRow.style.display = (arg===0) ? '' : 'none';
}
function z01SetIn(arg) {
  _z01.inRule = arg;
  document.querySelectorAll('#z01-setup-wrap [data-fn="z01SetIn"]').forEach(function(el){
    el.classList.toggle('on', parseInt(el.getAttribute('data-arg'),10)===arg);
  });
}
function z01SetOut(arg) {
  _z01.outRule = arg;
  document.querySelectorAll('#z01-setup-wrap [data-fn="z01SetOut"]').forEach(function(el){
    el.classList.toggle('on', parseInt(el.getAttribute('data-arg'),10)===arg);
  });
}
function z01SetPlayers(arg) {
  _z01.players = arg;
  document.querySelectorAll('#z01-setup-wrap [data-fn="z01SetPlayers"]').forEach(function(el){
    el.classList.toggle('on', parseInt(el.getAttribute('data-arg'),10)===arg);
  });
  var n2wrap = document.getElementById('z01-name2-wrap');
  if (n2wrap) n2wrap.style.display = (arg===2)?'':'none';
  else document.getElementById('z01-name2').style.display = (arg===2)?'':'none';
  document.getElementById('z01-cpu-section').style.display = (arg===3)?'':'none';
}
var _Z01_CPU_NAMES = ['','入門','初心者','初級','中初級','アマチュア','中級','中級+','上級','上級+','準プロ','プロ','エリート'];
function z01SetCpu(arg) {
  _z01.cpuLevel = arg;
  document.querySelectorAll('#z01-setup-wrap [data-fn="z01SetCpu"]').forEach(function(el){
    el.classList.toggle('on', parseInt(el.getAttribute('data-arg'),10)===arg);
  });
  var desc = document.getElementById('z01-cpu-desc');
  if (desc) desc.textContent = 'LV'+arg+' '+_Z01_CPU_NAMES[arg]+' — AVG '+_Z01_CPU_AVG[arg];
}

function _z01SaveDefaults() {
  try {
    var d = {
      mode: _z01.mode, legs: _z01.legs, inRule: _z01.inRule, outRule: _z01.outRule, players: _z01.players,
      customVal: document.getElementById('z01-custom-val').value,
      legsCustomVal: document.getElementById('z01-legs-custom-val').value,
      name1: document.getElementById('z01-name1').value.trim(),
      name2: document.getElementById('z01-name2').value.trim()
    };
    localStorage.setItem('z01_defaults', JSON.stringify(d));
  } catch(e){}
}
function _z01LoadDefaults() {
  try {
    var d = JSON.parse(localStorage.getItem('z01_defaults')||'null');
    if (!d) return;
    if (d.mode !== undefined) z01SetMode(d.mode);
    if (d.customVal) document.getElementById('z01-custom-val').value = d.customVal;
    if (d.legs !== undefined) z01SetLegs(d.legs);
    if (d.legsCustomVal) document.getElementById('z01-legs-custom-val').value = d.legsCustomVal;
    if (d.inRule !== undefined) z01SetIn(d.inRule);
    if (d.outRule !== undefined) z01SetOut(d.outRule);
    if (d.players !== undefined) z01SetPlayers(d.players);
    if (d.name1) document.getElementById('z01-name1').value = d.name1;
    if (d.name2) document.getElementById('z01-name2').value = d.name2;
  } catch(e){}
}
function z01Start() {
  var m = _z01.mode;
  if (m === 0) { m = parseInt(document.getElementById('z01-custom-val').value,10)||501; _z01.mode = m; }
  var legs = _z01.legs;
  if (legs === 0) { legs = parseInt(document.getElementById('z01-legs-custom-val').value,10)||9; _z01.legs = legs; }
  _z01.names[0] = document.getElementById('z01-name1').value.trim()||'Player 1';
  _z01.names[1] = document.getElementById('z01-name2').value.trim()||(_z01.players===3?'CPU':'Player 2');
  _z01SaveDefaults();
  _z01.remain = [m, m];
  _z01.legWins = [0, 0];
  _z01.currentPlayer = 0;
  _z01.currentLeg = 1;
  _z01.roundScores = [[], []];
  _z01.checkoutAttempts = [[], []];
  _z01._buf = '';
  _z01.stats = _z01InitStats(_z01.players===1?1:2);
  document.getElementById('z01-setup-wrap').style.display = 'none';
  document.getElementById('z01-result-wrap').style.display = 'none';
  document.getElementById('z01-game-wrap').style.display = 'flex';
  _z01BuildPresets();
  _z01InitLog();
  _z01Render();
  _z01HintUpdate();
  _z01LogRender();
  if (_z01.players===3 && _z01.currentPlayer===1) _z01CpuTurn();
}

function _z01BuildPresets() {
  var sc = getSC();
  var h = '';
  sc.forEach(function(v) {
    h += '<div class="z01-pre" data-fn="z01Pre" data-arg="' + v + '">' + v + '</div>';
  });
  document.getElementById('z01-presets').innerHTML = h;
}

function _z01PlayerName(idx) {
  return (_z01.players===3 && idx===1) ? ('CPU Lv.'+_z01.cpuLevel) : _z01.names[idx];
}

function _z01Render() {
  var cp = _z01.currentPlayer;
  var st = _z01.stats[cp];
  var avg = st.rounds>0 ? (st.total/st.rounds).toFixed(1) : '-';
  var turnEl = document.getElementById('z01-turn-info');
  if (turnEl) {
    var nameStr = _z01PlayerName(cp);
    turnEl.innerHTML = '<span style="color:var(--acc);font-size:15px;font-weight:700;letter-spacing:1px;">' + nameStr + '</span><span style="color:var(--mut);font-size:11px;margin-left:6px;">AVG <b style="color:var(--txt);">' + avg + '</b></span>';
  }
  var legEl = document.getElementById('z01-leg-info');
  if (_z01.legs > 1) {
    var winsNeeded = Math.ceil(_z01.legs / 2);
    var dots0 = '', dots1 = '';
    for (var d = 0; d < winsNeeded; d++) {
      dots0 += d < _z01.legWins[0] ? '<span style="color:var(--acc);">●</span>' : '<span style="color:var(--bdr);">○</span>';
      dots1 += d < _z01.legWins[1] ? '<span style="color:var(--acc);">●</span>' : '<span style="color:var(--bdr);">○</span>';
    }
    legEl.innerHTML = dots0 + '<span style="margin:0 5px;color:var(--mut);font-size:10px;">Leg ' + _z01.currentLeg + '</span>' + dots1;
  } else {
    legEl.textContent = 'Leg 1';
  }
  var isCpu = _z01.players===3 && _z01.currentPlayer===1;
  document.getElementById('z01-cpu-area').style.display = isCpu ? 'flex' : 'none';
  document.getElementById('z01-input-area').style.opacity = isCpu ? '0.25' : '';
  document.getElementById('z01-input-area').style.pointerEvents = isCpu ? 'none' : '';
  _z01BufUpdate('');
}

function _z01HintUpdate() {
  var el = document.getElementById('z01-checkout-hint');
  var rem = _z01.remain[_z01.currentPlayer];
  var coPath = _getPath(rem);
  if (_z01HintOn && rem > 0 && coPath) {
    el.textContent = '🎯 ' + coPath.join(' → ');
    el.classList.add('show');
  } else {
    el.classList.remove('show');
  }
  // Update Finish button state
  var finBtn = document.getElementById('z01-bb-finish');
  if (finBtn) {
    var canFinish = rem > 0 && rem <= 170 && !!coPath;
    finBtn.classList.toggle('z01-bb-dim', !canFinish);
    finBtn.classList.toggle('finish-ready', canFinish);
  }
}

function _z01BufUpdate(v) {
  _z01._buf = v;
  var enter = document.getElementById('z01-enter');
  var liveS = document.getElementById('z01-log-live');
  var liveT = document.getElementById('z01-log-live-togo');
  if (liveS) {
    liveS.textContent = v || '';
    liveS.classList.remove('typing', 'bust', 'finish');
    if (v) {
      var n = parseInt(v, 10), rem = _z01.remain[_z01.currentPlayer];
      var after = rem - n;
      var bust = _z01.outRule===0 ? (after<0||after===1) : (after<0);
      if (bust) {
        liveS.classList.add('bust');
        if (liveT) liveT.innerHTML = '<span style="color:#ff4757;font-size:11px;">BUST</span>';
      } else if (after === 0) {
        liveS.classList.add('finish');
        if (liveT) liveT.textContent = '🎯';
      } else {
        liveS.classList.add('typing');
        if (liveT) liveT.textContent = n >= 0 && n <= 180 ? String(after) : '';
      }
    } else {
      if (liveT) liveT.textContent = String(_z01.remain[_z01.currentPlayer]);
    }
  }
  if (!enter) return;
  if (!v) { enter.className = 'z01-tk enter'; return; }
  var nv = parseInt(v, 10), rv = _z01.remain[_z01.currentPlayer];
  if (isNaN(nv) || nv < 0 || nv > 180) { enter.className = 'z01-tk enter'; return; }
  var bv = _z01.outRule===0 ? (rv-nv<0||rv-nv===1) : (rv-nv<0);
  enter.className = 'z01-tk enter ready' + (bv ? ' bust' : '');
}

function z01Pre(arg) { _z01BufUpdate(String(arg)); z01Ok(); }

function z01Kp(arg) {
  var v = _z01._buf + String(arg);
  if (v.length > 3 || parseInt(v,10) > 180) return;
  _z01BufUpdate(v); soundTap();
}
function z01Kd() { if (!_z01._buf) return; _z01BufUpdate(_z01._buf.slice(0,-1)); soundDel(); }

function z01Ok() {
  if (_z01._buf === '') return;
  var sc = parseInt(_z01._buf, 10);
  if (isNaN(sc) || sc < 0 || sc > 180) return;
  if (sc === 180) { sound180(); show180(); setTimeout(launchConfetti, 150); }
  else { soundCommit(sc); }
  _z01Commit(sc);
}

function _z01Commit(sc) {
  var p = _z01.currentPlayer, st = _z01.stats[p];
  var n = _z01.players === 1 ? 1 : 2;
  var rem = _z01.remain[p], after = rem - sc;
  var bust = _z01.outRule===0 ? (after<0||after===1) : (after<0);
  if (_z01.inRule === 1 && st.rounds === 0 && sc === 0) {
    (function(){
      var t = document.createElement('div'); t.className = 'z01-event-toast bogey';
      t.textContent = 'ダブルインが必要です'; document.body.appendChild(t);
      setTimeout(function(){ t.parentNode && t.parentNode.removeChild(t); }, 1800);
    })();
    _z01BufUpdate(''); return;
  }
  if (bust) {
    if (rem <= 170 && _z01.checkoutAttempts) _z01.checkoutAttempts[p].push({score: rem, success: false});
    soundCommit(0);
    var f = document.createElement('div');
    f.className = 'z01-bust-flash';
    document.body.appendChild(f);
    setTimeout(function(){ f.parentNode&&f.parentNode.removeChild(f); }, 500);
    _z01BufUpdate(''); return;
  }
  _z01.remain[p] = after;
  // 演出: 上がり目突入 / ボギーナンバー
  if (after > 0) {
    var justEntered = rem > 170 && after <= 170 && CHECKOUT[after];
    var isBogeyResult = BOGEY_NUMS.indexOf(after) >= 0;
    if (justEntered) {
      (function(score){
        var fl = document.createElement('div'); fl.className = 'z01-agari-flash'; document.body.appendChild(fl);
        setTimeout(function(){ fl.parentNode && fl.parentNode.removeChild(fl); }, 700);
        var t = document.createElement('div'); t.className = 'z01-event-toast agari';
        t.innerHTML = '<div class="agari-label">FINISH RANGE</div><div class="agari-score">▸ ' + score + '</div>';
        document.body.appendChild(t);
        setTimeout(function(){ t.parentNode && t.parentNode.removeChild(t); }, 1800);
      })(after);
    } else if (isBogeyResult) {
      (function(){
        var fl = document.createElement('div'); fl.className = 'z01-bogey-flash'; document.body.appendChild(fl);
        setTimeout(function(){ fl.parentNode && fl.parentNode.removeChild(fl); }, 600);
        var t = document.createElement('div'); t.className = 'z01-event-toast bogey';
        t.textContent = '☠ BOGEY！'; document.body.appendChild(t);
        setTimeout(function(){ t.parentNode && t.parentNode.removeChild(t); }, 1600);
      })();
    }
  }
  if (rem > 170) { if (_z01.roundScores) _z01.roundScores[p].push(sc); }
  else { if (_z01.checkoutAttempts) _z01.checkoutAttempts[p].push({score: rem, success: after === 0}); }
  st.rounds++; st.total += sc; st.legRounds++;
  if (st.legRounds <= 3) st.first9.push(sc);
  if (sc >= 180) st.c180++; else if (sc >= 140) st.c140++; else if (sc >= 100) st.c100++;
  _z01BufUpdate('');
  // Update score log
  var logRow = _z01.log[_z01.log.length - 1];
  logRow.p[p] = {scored: sc, remain: after};
  var rowDone = true;
  for (var i = 0; i < n; i++) { if (logRow.p[i] === null) { rowDone = false; break; } }
  if (rowDone) {
    var nextP = [];
    for (var j = 0; j < n; j++) nextP.push(null);
    _z01.log.push({visit: logRow.visit + 3, p: nextP});
  }
  if (after === 0) {
    if (sc > st.hiFin) st.hiFin = sc;
    if (_z01.players === 3 && p === 1) {
      // CPU: count as 3 darts used
      var ad = (st.legRounds - 1) * 3 + 3;
      st.finishDarts = ad; st.totalFinishDarts += ad;
      if (ad < st.bestLeg) st.bestLeg = ad;
      if (ad > st.worstLeg) st.worstLeg = ad;
      _z01.legWins[p]++;
      _z01LogRender(); _z01LegEnd(p);
    } else {
      _z01._pendingFinish = {player: p};
      _z01LogRender();
      _z01BuildFinishModal(sc);
      document.getElementById('z01-finish-modal').style.display = 'flex';
    }
    return;
  }
  _z01NextTurn();
}

function _z01NextTurn() {
  var n = _z01.players===1 ? 1 : 2;
  _z01.currentPlayer = (_z01.currentPlayer + 1) % n;
  _z01Render(); _z01HintUpdate(); _z01LogRender();
  if (_z01.players===3 && _z01.currentPlayer===1) _z01CpuTurn();
}

function _z01DartLabel(sc) {
  if (sc <= 0) return 'MISS';
  if (sc === 50) return 'D-BULL';
  if (sc === 25) return 'BULL';
  if (sc >= 1 && sc <= 20) return 'S'+sc;
  if (sc % 3 === 0 && sc/3 >= 1 && sc/3 <= 20) return 'T'+(sc/3);
  if (sc % 2 === 0 && sc/2 >= 1 && sc/2 <= 20) return 'D'+(sc/2);
  for (var v = sc-1; v >= 0; v--) {
    if (v === 0) return 'MISS';
    if (v >= 1 && v <= 20) return 'S'+v;
    if (v % 3 === 0 && v/3 >= 1 && v/3 <= 20) return 'T'+(v/3);
    if (v % 2 === 0 && v/2 >= 1 && v/2 <= 20) return 'D'+(v/2);
  }
  return 'MISS';
}
// T19を狙ったときの1本シミュレーション
// ボード: ...17, 3, 19, 7, 16...  隣: T3(左)/T7(右), 2つ先: T17/T16
function _z01SimT19Dart(level) {
  var LB = ['T19','S19','T3','T7','S3','S7','D19','D3','D7','S17','S16','T17','T16'];
  var SC = [  57,   19,   9,  21,   3,   7,   38,   6,  14,   17,   16,   51,   48];
  // T20テーブルと同構造（T19=57でT20=60より若干低い）
  var P = [
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    [0.01,0.09,0.05,0.04,0.10,0.12,0,0,0,0.01,0.01,0,0],
    [0.04,0.13,0.07,0.05,0.11,0.09,0,0,0,0.01,0.01,0,0],
    [0.07,0.17,0.09,0.07,0.10,0.07,0.01,0,0,0.01,0.01,0,0],
    [0.10,0.20,0.10,0.08,0.09,0.06,0.01,0,0,0.01,0.01,0.005,0.005],
    [0.14,0.23,0.11,0.09,0.08,0.05,0.01,0,0,0.01,0.01,0.005,0.005],
    [0.19,0.25,0.12,0.09,0.07,0.04,0.01,0.01,0,0.01,0.01,0.005,0.005],
    [0.25,0.27,0.12,0.09,0.06,0.03,0.01,0.01,0.005,0.008,0.008,0.004,0.004],
    [0.31,0.24,0.13,0.10,0.04,0.02,0.015,0.01,0.005,0.005,0.005,0.002,0.002],
    [0.38,0.24,0.12,0.09,0.03,0.015,0.015,0.008,0.005,0.004,0.004,0.002,0.002],
    [0.44,0.24,0.11,0.08,0.025,0.01,0.015,0.007,0.004,0.003,0.003,0.001,0.001],
    [0.47,0.23,0.10,0.07,0.02,0.008,0.015,0.006,0.004,0.002,0.002,0.001,0.001],
    [0.53,0.22,0.09,0.065,0.015,0.006,0.015,0.005,0.004,0.002,0.002,0.001,0.001]
  ];
  var row = P[level] || P[1];
  var r = Math.random(), cum = 0;
  for (var i = 0; i < row.length; i++) {
    cum += row[i];
    if (r < cum) return {label: LB[i], score: SC[i]};
  }
  return {label: 'MISS', score: 0};
}

// T20を狙ったときの1本シミュレーション（レベル別・物理配置準拠）
// ラベル順: T20, S20, T5, T1, S5, S1, D20, D5, D1, S12, S18, T12, T18, MISS(余り)
// 確率表はレベル別に調整済み（3本合計がCPU_AVGと整合するよう設計）
function _z01SimT20Dart(level) {
  var LB = ['T20','S20','T5','T1','S5','S1','D20','D5','D1','S12','S18','T12','T18'];
  var SC = [  60,   20,  15,   3,   5,   1,   40,  10,   2,   12,   18,   36,   54];
  // 各レベルの確率（13列 = T20〜T18、残りがMISS）
  // ボード隣接順: T20 → S20 → T5(左) → T1(右) → S5 → S1 → D20 → D5 → D1 → S12 → S18 → T12 → T18
  var P = [
    // lv0 dummy
    [0,0,0,0,0,0,0,0,0,0,0,0,0],
    // lv1  avg≈4/dart  3本≈12
    [0.01,0.09,0.05,0.04,0.10,0.12,0,0,0,0.01,0.01,0,0],
    // lv2  avg≈7.1/dart 3本≈21
    [0.04,0.13,0.07,0.05,0.11,0.09,0,0,0,0.01,0.01,0,0],
    // lv3  avg≈10.4/dart 3本≈31
    [0.07,0.17,0.09,0.07,0.10,0.07,0.01,0,0,0.01,0.01,0,0],
    // lv4  avg≈13.4/dart 3本≈40
    [0.10,0.20,0.10,0.08,0.09,0.06,0.01,0,0,0.01,0.01,0.005,0.005],
    // lv5  avg≈16.5/dart 3本≈50
    [0.14,0.23,0.11,0.09,0.08,0.05,0.01,0,0,0.01,0.01,0.005,0.005],
    // lv6  avg≈20.1/dart 3本≈60
    [0.19,0.25,0.12,0.09,0.07,0.04,0.01,0.01,0,0.01,0.01,0.005,0.005],
    // lv7  avg≈23.9/dart 3本≈72
    [0.25,0.27,0.12,0.09,0.06,0.03,0.01,0.01,0.005,0.008,0.008,0.004,0.004],
    // lv8  avg≈26.9/dart 3本≈81
    [0.31,0.24,0.13,0.10,0.04,0.02,0.015,0.01,0.005,0.005,0.005,0.002,0.002],
    // lv9  avg≈30.8/dart 3本≈92 (target90)
    [0.38,0.24,0.12,0.09,0.03,0.015,0.015,0.008,0.005,0.004,0.004,0.002,0.002],
    // lv10 avg≈34.1/dart 3本≈102 (target98)
    [0.44,0.24,0.11,0.08,0.025,0.01,0.015,0.007,0.004,0.003,0.003,0.001,0.001],
    // lv11 avg≈35.4/dart 3本≈106 (target107)
    [0.47,0.23,0.10,0.07,0.02,0.008,0.015,0.006,0.004,0.002,0.002,0.001,0.001],
    // lv12 avg≈38.6/dart 3本≈116
    [0.53,0.22,0.09,0.065,0.015,0.006,0.015,0.005,0.004,0.002,0.002,0.001,0.001]
  ];
  var row = P[level] || P[1];
  var r = Math.random(), cum = 0;
  for (var i = 0; i < row.length; i++) {
    cum += row[i];
    if (r < cum) return {label: LB[i], score: SC[i]};
  }
  return {label: 'MISS', score: 0};
}
function _z01ShowCpuDart(i, label) {
  var el = document.getElementById('z01-cpud-'+i);
  if (!el) return;
  el.textContent = label;
  var cls = label==='—' ? 'dash' : label==='MISS' ? 'miss' : 'hit';
  el.className = 'z01-cpu-dart ' + cls;
  if (cls === 'hit') {
    el.style.transform = 'scale(1.12)';
    setTimeout(function(){ el.style.transform = ''; }, 180);
  }
}
// チェックアウト失敗時の戦略的1本シミュレーション
// 残り点数に応じて「次のビジットに向けた最適セグメント」を狙う
function _z01CheckoutSimDart(lv, remain) {
  var outRule = _z01.outRule;
  var hitRate;

  // ── 残り2〜40（偶数, D-out）: ダブル狙い ──
  if (outRule === 0 && remain % 2 === 0 && remain >= 2 && remain <= 40) {
    var dbl = remain / 2;
    hitRate = [0,0.04,0.06,0.09,0.13,0.18,0.23,0.30,0.37,0.45,0.54,0.63,0.72][lv];
    if (Math.random() < hitRate) return {label:'D'+dbl, score:remain};
    var r = Math.random();
    if (r < 0.45) return {label:'S'+dbl, score:dbl};   // インナーワイヤー外れ
    if (r < 0.72) return {label:'MISS', score:0};       // 完全ミス
    var adj = (dbl >= 2 && dbl <= 19) ? dbl + (Math.random()<0.5?1:-1) : (dbl===1?18:5);
    return {label:'S'+Math.max(1,Math.min(20,adj)), score:Math.max(1,Math.min(20,adj))};
  }

  // ── 残り奇数≤39（D-out）: S1でパリティ修正 ──
  if (outRule === 0 && remain % 2 !== 0 && remain >= 3 && remain <= 39) {
    hitRate = [0,0.35,0.42,0.49,0.56,0.63,0.69,0.75,0.80,0.84,0.88,0.91,0.94][lv];
    if (Math.random() < hitRate) return {label:'S1', score:1};
    return {label:'MISS', score:0};
  }

  // ── 残り41〜60: S(remain-40)でD20(40)を残す ──
  if (remain >= 41 && remain <= 60) {
    var tgt = remain - 40;  // S1〜S20
    hitRate = [0,0.30,0.38,0.46,0.53,0.60,0.67,0.73,0.78,0.83,0.87,0.90,0.93][lv];
    if (Math.random() < hitRate) return {label:'S'+tgt, score:tgt};
    var mis = tgt + (Math.random() < 0.5 ? 1 : -1);
    return {label:'S'+Math.max(1,Math.min(20,mis)), score:Math.max(1,Math.min(20,mis))};
  }

  // ── 残り61〜170: T20/T19のうち好ましいleaveになる方を選択 ──
  if (remain >= 61 && remain <= 170) {
    var PREF = [40,32,36,38,24,20,16,8,4,2,50,34,28,26,22,18,12,6,10,14,30];
    var a20 = remain - 60, a19 = remain - 57;
    var i20 = PREF.indexOf(a20), i19 = PREF.indexOf(a19);
    if (i19 >= 0 && (i20 < 0 || i19 < i20)) return _z01SimT19Dart(lv);
    return _z01SimT20Dart(lv);
  }

  return _z01SimT20Dart(lv);
}

function _z01CpuCommentary(text, cls) {
  var el = document.createElement('div');
  el.className = 'z01-cpu-commentary ' + cls;
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(function(){ el.parentNode && el.parentNode.removeChild(el); }, 1900);
}

function _z01CpuTurn() {
  var cpuArea = document.getElementById('z01-cpu-area');
  cpuArea.style.display = 'flex';
  var remain = _z01.remain[1];
  var lv = _z01.cpuLevel;
  var isCheckout = remain <= 170 && remain >= 2 && CHECKOUT[remain];

  // パネル初期化
  [0,1,2].forEach(function(i){ _z01ShowCpuDart(i,'—'); });
  var lvBadge = document.getElementById('z01-cpu-lv-badge');
  var nameLabel = document.getElementById('z01-cpu-name-label');
  var remainNum = document.getElementById('z01-cpu-remain-num');
  var targetRow = document.getElementById('z01-cpu-target-row');
  var totalEl = document.getElementById('z01-cpu-total');
  if (lvBadge) lvBadge.textContent = 'CPU Lv.' + lv;
  if (nameLabel) nameLabel.textContent = _Z01_CPU_NAMES[lv] || 'CPU';
  if (remainNum) remainNum.textContent = remain;
  if (totalEl) { totalEl.textContent = ''; totalEl.className = 'z01-cpu-total'; }

  // チェックアウト演出
  cpuArea.classList.toggle('checkout-mode', !!isCheckout);
  var targetText = isCheckout ? '⚠ チェックアウト挑戦！' : '— T20 狙い —';
  if (targetRow) {
    targetRow.innerHTML = targetText + (isCheckout ? '' : '<span class="z01-cpu-thinking-dots" id="z01-cpu-dots"></span>');
    targetRow.className = 'z01-cpu-target-row' + (isCheckout ? ' checkout' : '');
  }

  // 思考中ドットアニメーション
  var dotPhase = 0, dotTimer = null;
  if (!isCheckout) {
    dotTimer = setInterval(function(){
      var dotsEl = document.getElementById('z01-cpu-dots');
      if (dotsEl) dotsEl.textContent = ['.','..','...'][dotPhase % 3];
      dotPhase++;
    }, 300);
  }

  var labels, total;

  if (isCheckout) {
    var hp = [0,0.01,0.02,0.04,0.07,0.11,0.17,0.25,0.35,0.46,0.58,0.70,0.82][lv];
    if (Math.random() < hp) {
      total = remain;
      var path = CHECKOUT[remain];
      labels = path.map(function(l){ return /^\d+$/.test(l) ? 'S'+l : l; });
      while (labels.length < 3) labels.push('—');
      labels = labels.slice(0, 3);
    } else {
      var accum = 0, lbs = [], busted = false;
      for (var di = 0; di < 3; di++) {
        var dart = _z01CheckoutSimDart(lv, remain - accum);
        var newRem = remain - accum - dart.score;
        var isBust = (_z01.outRule === 0) ? (newRem < 0 || newRem === 1) : (newRem < 0);
        if (isBust) { lbs.push('MISS'); busted = true; break; }
        lbs.push(dart.label);
        accum += dart.score;
        if (remain - accum === 0) break;
      }
      while (lbs.length < 3) lbs.push('—');
      total = busted ? 0 : accum;
      labels = busted ? ['MISS','MISS','MISS'] : lbs;
    }
  } else {
    var simDart = (Math.random() < 0.10) ? _z01SimT19Dart : _z01SimT20Dart;
    var d0 = simDart(lv);
    var d1 = simDart(lv);
    var d2 = simDart(lv);
    total = d0.score + d1.score + d2.score;
    labels = [d0.label, d1.label, d2.label];
    var isBust2 = (_z01.outRule === 0) ?
      (remain - total < 0 || remain - total === 1) : (remain - total < 0);
    if (isBust2) { total = 0; labels = ['MISS','MISS','MISS']; }
  }

  // スコア計算（ラベルから）
  function _scoreFromLabel(lbl) {
    if (!lbl || lbl === '—' || lbl === 'MISS') return 0;
    if (lbl === 'BULL' || lbl === 'D-BULL') return lbl === 'D-BULL' ? 50 : 25;
    var m = lbl.match(/^([TDS]?)(\d+)$/);
    if (!m) return 0;
    var n = parseInt(m[2], 10);
    return m[1] === 'T' ? n*3 : m[1] === 'D' ? n*2 : n;
  }

  var t = 700 + Math.random()*400;
  var gap = 520 + Math.random()*160;

  setTimeout(function(){
    if (dotTimer) clearInterval(dotTimer);
    var cumScore = 0;
    if (targetRow) { targetRow.textContent = isCheckout ? '⚠ チェックアウト挑戦！' : ''; targetRow.className = 'z01-cpu-target-row' + (isCheckout?' checkout':''); }

    _z01ShowCpuDart(0, labels[0]);
    cumScore += _scoreFromLabel(labels[0]);
    if (totalEl && labels[0] !== '—') { totalEl.textContent = cumScore > 0 ? '+' + cumScore : ''; }

    setTimeout(function(){
      _z01ShowCpuDart(1, labels[1]);
      cumScore += _scoreFromLabel(labels[1]);
      if (totalEl && labels[1] !== '—') { totalEl.textContent = cumScore > 0 ? '+' + cumScore : ''; }

      setTimeout(function(){
        _z01ShowCpuDart(2, labels[2]);
        cumScore += _scoreFromLabel(labels[2]);

        // スコアコメンタリー
        if (total === 180) {
          _z01CpuCommentary('🤖 CPU 180!', 'great');
        } else if (total >= 140) {
          _z01CpuCommentary('🤖 CPU ' + total + '!', 'great');
        } else if (isCheckout && total === remain) {
          _z01CpuCommentary('🤖 CPU CHECKOUT!', 'checkout');
        }

        if (totalEl) {
          totalEl.textContent = total > 0 ? total + ' pts' : labels[0]==='MISS' ? 'BUST' : '';
          totalEl.className = 'z01-cpu-total' + (total >= 100 ? ' high' : '');
        }

        setTimeout(function(){ _z01Commit(total); }, 850);
      }, gap);
    }, gap);
  }, t);
}

function _z01LegEnd(winner) {
  var winsNeeded = Math.ceil(_z01.legs / 2);
  var matchOver = _z01.legWins[winner] >= winsNeeded;
  // 勝利・敗北・レッグ勝利の音
  var humanWon = (winner === 0);
  if (matchOver) {
    if (humanWon) { soundFinish(false); setTimeout(launchConfetti, 200); }
    else { soundLose(); }
  } else {
    soundLegWin();
  }
  document.getElementById('z01-leg-title').textContent = matchOver ? 'MATCH WIN!' : 'LEG WIN!';
  document.getElementById('z01-leg-winner-name').textContent = _z01PlayerName(winner) + ' の勝利！';
  document.getElementById('z01-leg-stats').textContent = (_z01.stats[winner].finishDarts || (_z01.stats[winner].legRounds * 3)) + ' 本';
  var btn = document.getElementById('z01-leg-btn');
  if (matchOver) { btn.setAttribute('data-fn','z01ShowResult'); btn.textContent = '結果を見る →'; }
  else { btn.setAttribute('data-fn','z01NextLeg'); btn.textContent = '次のLegへ →'; }
  document.getElementById('z01-leg-overlay').style.display = 'flex';
  _z01Render();
}

function z01NextLeg() {
  document.getElementById('z01-leg-overlay').style.display = 'none';
  _z01.currentLeg++;
  if (_z01.players !== 1) _z01.currentPlayer = (_z01.currentLeg - 1) % 2;
  else _z01.currentPlayer = 0;
  var m = _z01.mode;
  _z01.remain = [m, m];
  for (var i = 0; i < _z01.stats.length; i++) { _z01.stats[i].legRounds = 0; _z01.stats[i].finishDarts = 0; }
  _z01InitLog();
  _z01Render(); _z01HintUpdate(); _z01LogRender();
  if (_z01.players===3 && _z01.currentPlayer===1) _z01CpuTurn();
}

function z01ShowResult() {
  _z01SaveH(_z01BuildHistEntry());
  document.getElementById('z01-leg-overlay').style.display = 'none';
  document.getElementById('z01-game-wrap').style.display = 'none';
  document.getElementById('z01-result-wrap').style.display = '';
  var winner = -1;
  if (_z01.legWins[0] > _z01.legWins[1]) winner = 0;
  else if (_z01.legWins[1] > _z01.legWins[0]) winner = 1;
  var titleEl = document.getElementById('z01-result-title');
  var winnerEl = document.getElementById('z01-result-winner');
  if (_z01.players === 3) {
    // vs CPU
    if (winner === 0) {
      titleEl.textContent = 'YOU WIN!';
      titleEl.style.color = 'var(--acc)';
      winnerEl.textContent = '';
    } else if (winner === 1) {
      titleEl.textContent = 'YOU LOSE...';
      titleEl.style.color = 'rgba(255,100,100,0.9)';
      winnerEl.innerHTML = '🤖 CPU Lv.' + _z01.cpuLevel + ' の勝利';
    } else {
      titleEl.textContent = 'DRAW'; titleEl.style.color = '';
      winnerEl.textContent = '';
    }
  } else if (_z01.players === 1) {
    titleEl.textContent = 'FINISH'; titleEl.style.color = '';
    winnerEl.textContent = '';
  } else if (winner >= 0) {
    titleEl.textContent = _z01PlayerName(winner); titleEl.style.color = 'var(--acc)';
    winnerEl.innerHTML = '🏆&nbsp;WINNER';
  } else {
    titleEl.textContent = 'DRAW'; titleEl.style.color = '';
    winnerEl.textContent = '';
  }
  var rows = [
    ['3ダーツ平均', function(s,i){ return s.rounds>0?(s.total/s.rounds).toFixed(1):'-'; }],
    ['First 9 avg', function(s){ if(!s.first9.length)return'-'; var t=0; for(var j=0;j<s.first9.length;j++)t+=s.first9[j]; return(t/s.first9.length).toFixed(1); }],
    ['100+', function(s){ return s.c100; }],
    ['140+', function(s){ return s.c140; }],
    ['180s', function(s){ return s.c180; }],
    ['ハイフィニッシュ', function(s){ return s.hiFin||'-'; }],
    ['ベストレグ', function(s){ return s.bestLeg<999?s.bestLeg+' 本':'-'; }],
    ['ワーストレグ', function(s){ return s.worstLeg>0?s.worstLeg+' 本':'-'; }],
    ['Legs Won', function(s,i){ return _z01.legWins[i]; }]
  ];
  var n = _z01.stats.length;
  var h = '';
  if (n === 2) {
    h += '<div class="z01-stats-hdr" style="grid-template-columns:2fr 1fr 1fr;">';
    h += '<div></div><div style="text-align:center;color:var(--txt);font-weight:700;">'+_z01PlayerName(0)+'</div>';
    h += '<div style="text-align:center;color:var(--txt);font-weight:700;">'+_z01PlayerName(1)+'</div></div>';
  }
  for (var k = 0; k < rows.length; k++) {
    var lbl = rows[k][0], fn = rows[k][1];
    if (n === 1) {
      h += '<div class="z01-stats-row" style="grid-template-columns:2fr 1fr;">';
      h += '<div class="z01-stats-label">'+lbl+'</div>';
      h += '<div class="z01-stats-val" style="text-align:right;">'+fn(_z01.stats[0],0)+'</div></div>';
    } else {
      var v0=fn(_z01.stats[0],0), v1=fn(_z01.stats[1],1);
      h += '<div class="z01-stats-row" style="grid-template-columns:2fr 1fr 1fr;">';
      h += '<div class="z01-stats-label">'+lbl+'</div>';
      h += '<div class="z01-stats-val'+((winner===0)?' hl':'')+'">'+v0+'</div>';
      h += '<div class="z01-stats-val'+((winner===1)?' hl':'')+'">'+v1+'</div></div>';
    }
  }
  document.getElementById('z01-stats-table').innerHTML = h;
  _z01RenderAvgGraph();
}

// ---- 01 History Render ----
function renderZ01Hist() {
  var wrap = document.getElementById('z01-hist-content');
  if (!wrap) return;
  var h = _z01GetH();
  if (!h.length) {
    wrap.innerHTML = '<div class="hempty"><div class="ei">🎮</div>まだ記録がありません。<br>ゲームを完了すると自動で保存されます。</div>';
    return;
  }
  // --- Compute cumulative stats (solo + vs CPU/2P すべて対象) ---
  var soloGames = h; // Player 1のデータはdata[0]で統一 solo/2P問わず集計
  var allAvgs = soloGames.map(function(g){ return g.data[0].avg; }).filter(function(v){return v>0;});
  var bestAvgVal = allAvgs.length ? Math.max.apply(null,allAvgs) : 0;
  var bestAvgStr = bestAvgVal > 0 ? bestAvgVal.toFixed(2) : '-';
  var all180 = h.reduce(function(acc,g){ return acc+g.data.reduce(function(a,p){return a+p.c180;},0); },0);
  var all140 = h.reduce(function(acc,g){ return acc+g.data.reduce(function(a,p){return a+p.c140;},0); },0);
  var bestLegs = soloGames.map(function(g){return g.data[0].bestLeg;}).filter(function(v){return v>0;});
  var bestLeg = bestLegs.length ? Math.min.apply(null,bestLegs) : 0;
  // Find index of best game in full h array
  var bestHIdx = -1;
  if (bestAvgVal > 0) { for (var bi=0;bi<h.length;bi++) { if (h[bi].data[0].avg===bestAvgVal){ bestHIdx=bi; break; } } }
  // --- Today's stats ---
  var todayStr = localDateStr(new Date());
  var todayGames = h.filter(function(g){ return g.date && localDateStr(new Date(g.date))===todayStr; });
  var todaySolo = todayGames; // 全ゲーム対象
  // --- Recent 30G AVG ---
  var recent30 = soloGames.slice(0,30);
  var r30avgs = recent30.map(function(g){return g.data[0].avg;}).filter(function(v){return v>0;});
  var avgRecent = r30avgs.length ? (r30avgs.reduce(function(a,b){return a+b;},0)/r30avgs.length).toFixed(2) : '-';
  var prev30avgs = soloGames.slice(1,31).map(function(g){return g.data[0].avg;}).filter(function(v){return v>0;});
  var avgPrev = prev30avgs.length ? (prev30avgs.reduce(function(a,b){return a+b;},0)/prev30avgs.length) : null;
  var arrow = '';
  if (avgPrev !== null && avgRecent !== '-') {
    if (parseFloat(avgRecent) > avgPrev) arrow = '<span style="color:#ff6b35;font-size:16px;font-weight:900;"> ▲</span>';
    else if (parseFloat(avgRecent) < avgPrev) arrow = '<span style="color:#4fc3f7;font-size:16px;font-weight:900;"> ▼</span>';
  }
  var f9recent = soloGames.slice(0,30).map(function(g){return g.data[0].f9avg;}).filter(function(v){return v>0;});
  var avgF9 = f9recent.length ? (f9recent.reduce(function(a,b){return a+b;},0)/f9recent.length).toFixed(2) : '-';
  // AVG trend chart data
  var trend30 = recent30.map(function(g){return g.data[0].avg;}).reverse();
  var html = '';
  // === 1. Profile card ===
  html += '<div class="pcard">';
  html += '<div class="pcard-brand"><span class="pcard-badge">🎮 累計成績</span><span class="pcard-app">Steel Darts Pro</span></div>';
  html += '<div class="pcard-score">' + bestAvgStr + '</div>';
  html += '<div class="pcard-score-label">Personal Best AVG</div>';
  html += '<hr class="pcard-divider">';
  html += '<div class="pcard-stats">';
  html += '<div class="pcard-stat"><div class="pcard-stat-val" style="color:rgba(255,255,255,0.7);">' + h.length + '</div><div class="pcard-stat-lbl">Total Games</div></div>';
  html += '<div class="pcard-stat"><div class="pcard-stat-val" style="color:#ffd700;">×' + all180 + '</div><div class="pcard-stat-lbl">通算 180</div></div>';
  html += '<div class="pcard-stat"><div class="pcard-stat-val" style="color:#b47fff;">×' + all140 + '</div><div class="pcard-stat-lbl">140+ 累計</div></div>';
  html += '<div class="pcard-stat"><div class="pcard-stat-val" style="color:var(--grn);font-size:' + (bestLeg?'22px':'28px') + ';">' + (bestLeg ? bestLeg+' 本' : '-') + '</div><div class="pcard-stat-lbl">Best Leg</div></div>';
  html += '</div></div>';
  // === 2. Today's card ===
  if (todayGames.length > 0) {
    var todayAvgs = todayGames.map(function(g){return g.data[0].avg;}).filter(function(v){return v>0;});
    var todayBestAvg = todayAvgs.length ? Math.max.apply(null,todayAvgs).toFixed(2) : '-';
    var today180 = todayGames.reduce(function(acc,g){return acc+g.data.reduce(function(a,p){return a+p.c180;},0);},0);
    var todayBestLegs = todayGames.map(function(g){return g.data[0].bestLeg;}).filter(function(v){return v>0;});
    var todayBL = todayBestLegs.length ? Math.min.apply(null,todayBestLegs)+' 本' : '-';
    var todayF9s = todayGames.map(function(g){return g.data[0].f9avg;}).filter(function(v){return v>0;});
    var todayBestF9 = todayF9s.length ? Math.max.apply(null,todayF9s).toFixed(2) : '-';
    html += '<div class="tcard">';
    html += '<div class="tcard-brand"><span class="tcard-badge">📅 今日の成績</span><span class="tcard-date">' + todayStr + '</span></div>';
    html += '<div class="tcard-score">' + todayBestAvg + '</div>';
    html += '<div class="tcard-score-label">Today\'s Best AVG</div>';
    html += '<hr class="tcard-divider">';
    html += '<div class="tcard-stats">';
    html += '<div class="tcard-stat"><div class="tcard-stat-val" style="color:rgba(255,255,255,0.7);">' + todayGames.length + '</div><div class="tcard-stat-lbl">Games</div></div>';
    html += '<div class="tcard-stat"><div class="tcard-stat-val" style="color:#ffd700;">×' + today180 + '</div><div class="tcard-stat-lbl">180</div></div>';
    html += '<div class="tcard-stat"><div class="tcard-stat-val" style="color:var(--grn);font-size:18px;">' + todayBL + '</div><div class="tcard-stat-lbl">Best Leg</div></div>';
    html += '<div class="tcard-stat"><div class="tcard-stat-val" style="color:#b47fff;">' + todayBestF9 + '</div><div class="tcard-stat-lbl">F9 AVG</div></div>';
    html += '</div></div>';
  }
  // === 3. Recent 30G stats ===
  if (recent30.length > 0) {
    html += '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:14px;">';
    html += '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">';
    html += '<div style="text-align:center;background:var(--bg);border-radius:8px;padding:12px 4px;position:relative;">';
    if (arrow) html += '<div style="position:absolute;top:6px;right:8px;line-height:1;">' + arrow + '</div>';
    html += '<div style="font-family:\'Bebas Neue\',cursive;font-size:32px;color:#fff;">' + avgRecent + '</div>';
    html += '<div style="font-size:9px;color:var(--mut);letter-spacing:1px;">直近' + recent30.length + 'G AVG</div></div>';
    html += '<div style="text-align:center;background:var(--bg);border-radius:8px;padding:12px 4px;">';
    html += '<div style="font-family:\'Bebas Neue\',cursive;font-size:32px;color:#b47fff;">' + avgF9 + '</div>';
    html += '<div style="font-size:9px;color:var(--mut);letter-spacing:1px;">直近' + (f9recent.length||recent30.length) + 'G F9 AVG</div></div>';
    html += '</div></div>';
  }
  // === 4. AVG trend chart ===
  if (trend30.length > 1) {
    html += '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:14px;">';
    html += '<div style="font-size:10px;color:var(--mut);letter-spacing:2px;margin-bottom:8px;">AVG 推移（直近' + trend30.length + 'G）</div>';
    html += '<canvas id="z01-hist-chart" height="80" style="width:100%;display:block;"></canvas>';
    html += '</div>';
  }
  // === 4b. 削りスコア分布 ===
  (function(){
    var allRounds = [];
    soloGames.slice(0, 30).forEach(function(g){
      if (g.data[0].rounds && g.data[0].rounds.length) allRounds = allRounds.concat(g.data[0].rounds);
    });
    if (!allRounds.length) return;
    var bands = [
      {label:'180', min:180, max:180, color:'#e8ff47'},
      {label:'140+', min:140, max:179, color:'#47ffb4'},
      {label:'100+', min:100, max:139, color:'#4fc3f7'},
      {label:'60+', min:60, max:99, color:'#9575cd'},
      {label:'59-', min:0, max:59, color:'rgba(255,255,255,0.2)'}
    ];
    var total = allRounds.length;
    html += '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;padding:14px;">';
    html += '<div style="font-size:10px;color:var(--mut);letter-spacing:2px;margin-bottom:2px;">削りスコア分布（直近30G / ' + total + 'ラウンド）</div>';
    html += '<div style="font-size:10px;color:rgba(255,255,255,0.25);margin-bottom:10px;">残り171以上のラウンドのみ集計（上がり目が出たラウンドは除く）</div>';
    bands.forEach(function(b){
      var cnt = allRounds.filter(function(s){ return s>=b.min && s<=b.max; }).length;
      var pct = total > 0 ? Math.round(cnt/total*100) : 0;
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
      html += '<div style="font-size:11px;color:var(--mut);min-width:60px;text-align:right;">' + b.label + '</div>';
      html += '<div style="flex:1;background:rgba(255,255,255,0.06);border-radius:4px;height:20px;overflow:hidden;">';
      html += '<div style="width:' + pct + '%;height:100%;background:' + b.color + ';border-radius:4px;transition:width 0.3s;"></div>';
      html += '</div>';
      html += '<div style="font-size:12px;font-weight:700;color:' + b.color + ';min-width:38px;text-align:right;">' + pct + '%</div>';
      html += '<div style="font-size:10px;color:var(--mut);min-width:30px;">(' + cnt + ')</div>';
      html += '</div>';
    });
    html += '</div>';
  })();
  // === 4c. チェックアウト成功率 ===
  (function(){
    var allCOs = [];
    soloGames.forEach(function(g){
      if (g.data[0].checkouts && g.data[0].checkouts.length) allCOs = allCOs.concat(g.data[0].checkouts);
    });
    var cats = [
      {min:161, max:170, label:'161〜170', stars:5, desc:'トリプル2本 ＋ ダブルブル必須　最高難易度'},
      {min:131, max:160, label:'131〜160', stars:4, desc:'トリプル2本 → ダブルで上がれる'},
      {min:101, max:130, label:'101〜130', stars:3, desc:'トリプル1〜2本 → ダブルでフィニッシュ'},
      {min:61,  max:100, label:'61〜100',  stars:2, desc:'トリプルが外れても、シングル2本 → ダブルで上がれる'},
      {min:41,  max:60,  label:'41〜60',   stars:1, desc:'シングル＋ダブルの2本フィニッシュ'},
      {min:2,   max:40,  label:'2〜40',    stars:1, desc:'偶数はダブル1投、奇数はシングル→ダブルの2本'}
    ];
    html += '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;overflow:hidden;">';
    html += '<div style="padding:10px 12px 4px;font-size:10px;color:var(--mut);letter-spacing:2px;">チェックアウト成功率（難易度別）</div>';
    html += '<div style="padding:0 12px 8px;font-size:10px;color:rgba(255,255,255,0.25);border-bottom:1px solid var(--bdr);">残り170以下（上がり目あり）になったラウンドを全データ集計</div>';
    cats.forEach(function(c){
      var attempts = allCOs.filter(function(a){ return a.score>=c.min && a.score<=c.max; });
      var wins = attempts.filter(function(a){ return a.success; }).length;
      var n = attempts.length;
      var pct = n ? Math.round(wins/n*100) : 0;
      var noData = n === 0;
      var fewData = n > 0 && n < 5;
      var barColor = noData ? 'rgba(255,255,255,0.15)' : pct>=70 ? '#66bb6a' : pct>=40 ? '#ffd54f' : '#ff6b6b';
      var stars = '★'.repeat(c.stars) + '☆'.repeat(5 - c.stars);
      html += '<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);' + (noData?'opacity:0.45;':'') + '">';
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">';
      html += '<div style="font-family:\'Bebas Neue\',cursive;font-size:18px;color:var(--acc);min-width:70px;">' + c.label + '</div>';
      html += '<div style="font-size:9px;color:#ffd54f;letter-spacing:1px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:1px;"><span style="font-size:8px;color:var(--mut);letter-spacing:0.5px;">難易度</span>' + stars + '</div>';
      html += '<div style="font-size:10px;color:var(--mut);flex:1;line-height:1.4;">' + c.desc + '</div>';
      if (noData) {
        html += '<div style="font-size:10px;color:rgba(255,255,255,0.25);letter-spacing:1px;">未挑戦</div>';
      } else {
        html += '<div style="display:flex;align-items:center;gap:5px;">';
        if (fewData) html += '<span style="font-size:9px;color:#ff8a65;background:rgba(255,138,101,0.12);border:1px solid rgba(255,138,101,0.3);border-radius:4px;padding:1px 5px;letter-spacing:0.5px;">⚠ 少</span>';
        html += '<div style="font-size:14px;font-weight:700;color:' + barColor + ';">' + pct + '%</div>';
        html += '<div style="font-size:10px;color:var(--mut);">(' + wins + '/' + n + ')</div>';
        html += '</div>';
      }
      html += '</div>';
      html += '<div style="background:rgba(255,255,255,0.06);border-radius:4px;height:7px;overflow:hidden;">';
      html += '<div style="width:' + (noData?100:pct) + '%;height:100%;background:' + (noData?'repeating-linear-gradient(90deg,rgba(255,255,255,0.08) 0px,rgba(255,255,255,0.08) 4px,transparent 4px,transparent 8px)':barColor) + ';border-radius:4px;' + (noData?'':('transition:width 0.6s;')) + '"></div>';
      html += '</div></div>';
    });
    html += '</div>';
  })();
  // === 5. 期間別成績 ===
  (function(){
    var bk = {};
    for (var i=0;i<h.length;i++) {
      var d2=new Date(h[i].date), k=d2.getFullYear()+'/'+('0'+(d2.getMonth()+1)).slice(-2)+'/'+('0'+d2.getDate()).slice(-2);
      if (!bk[k]) bk[k]=[];
      bk[k].push(h[i]);
    }
    var days = Object.keys(bk).sort(function(a,b){return b.localeCompare(a);}).slice(0,14);
    if (!days.length) return;
    html += '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;overflow:hidden;">';
    html += '<div style="padding:10px 12px;font-size:10px;color:var(--mut);letter-spacing:2px;border-bottom:1px solid var(--bdr);">期間別成績（直近14日）</div>';
    days.forEach(function(day){
      var games = bk[day];
      var avgs2 = games.map(function(g){return g.data[0].avg;}).filter(function(v){return v>0;});
      var dayAvg = avgs2.length ? (avgs2.reduce(function(a,b){return a+b;},0)/avgs2.length).toFixed(2) : '-';
      var day180 = games.reduce(function(acc,g){return acc+g.data.reduce(function(a,p){return a+p.c180;},0);},0);
      var bestLegDay = games.map(function(g){return g.data[0].bestLeg;}).filter(function(v){return v>0;});
      var blDay = bestLegDay.length ? Math.min.apply(null,bestLegDay) : 0;
      html += '<div style="display:flex;align-items:center;padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);gap:8px;">';
      html += '<div style="font-size:11px;color:var(--mut);min-width:80px;">' + day + '</div>';
      html += '<div style="font-size:10px;color:var(--mut);min-width:28px;">' + games.length + 'G</div>';
      html += '<div style="font-family:\'Bebas Neue\',cursive;font-size:20px;color:var(--acc);flex:1;">' + dayAvg + '</div>';
      html += '<div style="font-size:10px;color:var(--mut);">AVG</div>';
      if (blDay) html += '<div style="font-size:10px;color:var(--grn);margin-left:8px;">' + blDay + ' 本</div>';
      if (day180) html += '<div style="font-size:10px;color:#e8ff47;margin-left:8px;">×' + day180 + ' 180</div>';
      html += '</div>';
    });
    html += '</div>';
  })();
  // === 5b. 対戦成績 ===
  (function(){
    var twoP = h.filter(function(g){return g.players===2 && g.winner>=0;});
    if (!twoP.length) return;
    var records = {};
    twoP.forEach(function(g){
      var p0=g.data[0].name, p1=g.data[1].name;
      var key = [p0,p1].sort().join(' vs ');
      if (!records[key]) records[key]={key:key,games:0,wins:{}};
      records[key].games++;
      var wName = g.data[g.winner].name;
      records[key].wins[wName] = (records[key].wins[wName]||0) + 1;
    });
    var keys = Object.keys(records);
    if (!keys.length) return;
    html += '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;overflow:hidden;">';
    html += '<div style="padding:10px 12px;font-size:10px;color:var(--mut);letter-spacing:2px;border-bottom:1px solid var(--bdr);">対戦成績</div>';
    keys.forEach(function(key){
      var rec = records[key];
      var names = rec.key.split(' vs ');
      html += '<div style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.04);">';
      html += '<div style="font-size:11px;color:var(--acc);margin-bottom:6px;">' + rec.key + ' (' + rec.games + '戦)</div>';
      html += '<div style="display:flex;gap:8px;">';
      names.forEach(function(name){
        var w = rec.wins[name]||0;
        var pct = Math.round(w/rec.games*100);
        html += '<div style="flex:1;text-align:center;background:var(--bg);border-radius:8px;padding:6px;">';
        html += '<div style="font-size:11px;color:var(--mut);margin-bottom:2px;">' + name + '</div>';
        html += '<div style="font-family:\'Bebas Neue\',cursive;font-size:26px;color:' + (w===Math.max.apply(null,names.map(function(n){return rec.wins[n]||0;}))&&w>0?'var(--acc)':'var(--txt)') + ';">' + w + 'W</div>';
        html += '<div style="font-size:9px;color:var(--mut);">' + pct + '%</div>';
        html += '</div>';
      });
      html += '</div></div>';
    });
    html += '</div>';
  })();
  // === 5c. カウントアップ × 01 相関 ===
  (function(){
    var cuH = getH(); // カウントアップ履歴 { score, date, ... }
    var z01H2P = h.filter(function(g){ return g.players === 2 && g.winner >= 0; });
    if (!cuH.length || !z01H2P.length) return;
    // 日付文字列でカウントアップAVGをマップ化（同日複数ある場合は平均）
    var cuByDay = {};
    cuH.forEach(function(r){
      if (!r.date) return;
      var dk = localDateStr(new Date(r.date));
      if (!cuByDay[dk]) cuByDay[dk] = { sum: 0, cnt: 0 };
      cuByDay[dk].sum += r.score / 8; // ラウンドAVG
      cuByDay[dk].cnt++;
    });
    // カテゴリ定義
    var cats = [
      { label: '〜399（低）', min: 0,   max: 399 },
      { label: '400〜599（中）', min: 400, max: 599 },
      { label: '600〜（高）',  min: 600, max: Infinity }
    ];
    var buckets = cats.map(function(){ return { wins: 0, total: 0 }; });
    z01H2P.forEach(function(g){
      if (!g.date) return;
      var dk = localDateStr(new Date(g.date));
      var cu = cuByDay[dk];
      if (!cu) return;
      var avg = cu.sum / cu.cnt;
      for (var ci = 0; ci < cats.length; ci++) {
        if (avg >= cats[ci].min && avg <= cats[ci].max) {
          buckets[ci].total++;
          if (g.winner === 0) buckets[ci].wins++;
          break;
        }
      }
    });
    // データがあるか確認
    var hasData = buckets.some(function(b){ return b.total > 0; });
    if (!hasData) return;
    html += '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;overflow:hidden;">';
    html += '<div style="padding:10px 12px;font-size:10px;color:var(--mut);letter-spacing:2px;border-bottom:1px solid var(--bdr);">📈 カウントアップ × 01 相関</div>';
    html += '<div style="padding:8px 12px;font-size:10px;color:rgba(255,255,255,0.4);border-bottom:1px solid rgba(255,255,255,0.04);">同じ日のカウントアップAVGと01勝率（Player 1）の相関</div>';
    cats.forEach(function(cat, ci){
      var b = buckets[ci];
      if (b.total === 0) {
        html += '<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);opacity:0.35;">';
        html += '<div style="font-size:12px;color:var(--mut);">CU ' + cat.label + '</div>';
        html += '<div style="font-size:10px;color:var(--mut);">データなし</div>';
        html += '</div>';
      } else {
        var pct = Math.round(b.wins / b.total * 100);
        var barColor = pct >= 60 ? '#66bb6a' : pct >= 40 ? '#ffd54f' : '#ff6b6b';
        html += '<div style="padding:8px 12px;border-bottom:1px solid rgba(255,255,255,0.04);">';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">';
        html += '<div style="font-size:12px;color:var(--mut);">CU ' + cat.label + '</div>';
        html += '<div style="font-size:12px;font-weight:700;color:' + barColor + ';">' + pct + '%</div>';
        html += '</div>';
        html += '<div style="font-size:10px;color:var(--mut);margin-bottom:4px;">01 勝率: ' + b.wins + '勝/' + b.total + '戦</div>';
        html += '<div style="background:rgba(255,255,255,0.06);border-radius:4px;height:6px;overflow:hidden;">';
        html += '<div style="width:' + pct + '%;height:100%;background:' + barColor + ';border-radius:4px;transition:width 0.4s;"></div>';
        html += '</div></div>';
      }
    });
    html += '</div>';
  })();
  // === 6. Export / Import ===
  html += '<div class="exp-row">';
  html += '<button class="bexp" id="btn-z01-export">📤 エクスポート</button>';
  html += '<button class="bexp" id="btn-z01-import">📥 インポート</button>';
  html += '</div>';
  // === 7. Game list ===
  html += '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:12px;overflow:hidden;">';
  html += '<div style="padding:10px 12px;font-size:10px;color:var(--mut);letter-spacing:2px;border-bottom:1px solid var(--bdr);">ゲーム履歴</div>';
  h.forEach(function(g, idx) {
    var d = new Date(g.date);
    var dateStr = d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2);
    var outStr = g.outRule===0 ? 'ダブル' : 'シングル';
    var legsStr = g.legs > 1 ? 'BO'+g.legs : '1 Leg';
    var isBest = (idx === bestHIdx);
    html += '<div style="padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
    html += '<div style="font-size:10px;color:var(--mut);">' + dateStr + (isBest ? ' <span style="color:#ffd700;font-size:10px;">★ BEST</span>' : '') + '</div>';
    html += '<div style="font-size:10px;color:var(--acc);font-weight:700;">' + g.mode + ' | ' + outStr + ' | ' + legsStr + '</div>';
    html += '</div>';
    if (g.players === 2) {
      var wName = (g.winner >= 0 && g.winner < g.data.length) ? g.data[g.winner].name : '-';
      html += '<div style="font-size:11px;color:var(--acc);font-weight:700;margin-bottom:6px;">🏆 ' + wName + '</div>';
      html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
      g.data.forEach(function(p) {
        var isW = g.winner >= 0 && g.data[g.winner] === p;
        html += '<div style="background:var(--bg);border-radius:8px;padding:8px;border:1px solid ' + (isW?'rgba(232,255,71,0.3)':'transparent') + ';">';
        html += '<div style="font-size:11px;color:' + (isW?'var(--acc)':'var(--mut)') + ';font-weight:700;margin-bottom:4px;">' + p.name + ' ' + p.legWins + 'W</div>';
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;">';
        html += '<div style="text-align:center;"><div style="font-family:\'Bebas Neue\',cursive;font-size:20px;color:var(--acc);">' + (p.avg>0?p.avg.toFixed(2):'-') + '</div><div style="font-size:8px;color:var(--mut);">AVG</div></div>';
        html += '<div style="text-align:center;"><div style="font-family:\'Bebas Neue\',cursive;font-size:18px;color:var(--grn);">' + (p.bestLeg>0?p.bestLeg+' 本':'-') + '</div><div style="font-size:8px;color:var(--mut);">Best Leg</div></div>';
        html += '</div></div>';
      });
      html += '</div>';
    } else {
      var p = g.data[0];
      html += '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:4px;">';
      [
        ['font-size:24px;color:var(--acc);', p.avg>0?p.avg.toFixed(2):'-', 'AVG'],
        ['font-size:18px;color:#b47fff;', p.f9avg>0?p.f9avg.toFixed(2):'-', 'F9 AVG'],
        ['font-size:16px;color:var(--grn);', p.bestLeg>0?p.bestLeg:'-', 'Best Leg'],
        ['font-size:18px;color:rgba(255,255,255,0.7);', p.c140, '140+'],
        ['font-size:18px;color:#ffd700;', p.c180, '180s']
      ].forEach(function(c){
        html += '<div style="text-align:center;background:var(--bg);border-radius:6px;padding:6px 2px;">';
        html += '<div style="font-family:\'Bebas Neue\',cursive;' + c[0] + '">' + c[1] + '</div>';
        html += '<div style="font-size:8px;color:var(--mut);">' + c[2] + '</div></div>';
      });
      html += '</div>';
    }
    html += '<div style="text-align:right;margin-top:4px;"><button style="background:transparent;border:none;color:var(--mut);font-size:10px;cursor:pointer;padding:2px 4px;" data-fn="_z01DelH" data-arg="' + idx + '">削除</button></div>';
    html += '</div>';
  });
  html += '</div>';
  wrap.innerHTML = html;
  // Draw trend chart
  if (trend30.length > 1) {
    var canvas = document.getElementById('z01-hist-chart');
    if (canvas) {
      var ctx = canvas.getContext('2d');
      var W = canvas.offsetWidth || 300, H = 80;
      canvas.width = W; canvas.height = H;
      var mn = Math.min.apply(null,trend30)-5, mx = Math.max.apply(null,trend30)+5;
      if (mn < 0) mn = 0;
      ctx.clearRect(0,0,W,H);
      ctx.beginPath();
      trend30.forEach(function(v,i){
        var x = i/(trend30.length-1)*W, y = H-(v-mn)/(mx-mn)*H*0.85-H*0.05;
        i===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
      });
      ctx.strokeStyle = 'rgba(232,255,71,0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineTo(W,H); ctx.lineTo(0,H); ctx.closePath();
      ctx.fillStyle = 'rgba(232,255,71,0.08)';
      ctx.fill();
    }
  }
}
// ---- end 01 History Render ----
// ---- 01 History Storage ----
function _z01GetH() { try { return JSON.parse(localStorage.getItem('dh01')||'[]'); } catch(e){ return []; } }
function _z01SaveH(entry) {
  try {
    var h = _z01GetH();
    h.unshift(entry);
    localStorage.setItem('dh01', JSON.stringify(h.slice(0, 500)));
  } catch(ex) { console.warn('_z01SaveH failed:', ex); }
}
function _z01DelH(idx) {
  try {
    var h = _z01GetH();
    h.splice(idx, 1);
    localStorage.setItem('dh01', JSON.stringify(h));
  } catch(ex) {}
  renderZ01Hist();
}
function _z01BuildHistEntry() {
  var n = _z01.players === 1 ? 1 : 2;
  var players = [];
  for (var i = 0; i < n; i++) {
    var st = _z01.stats[i];
    var avg = st.rounds > 0 ? parseFloat((st.total / st.rounds).toFixed(2)) : 0;
    var f9avg = st.first9.length ? parseFloat((st.first9.reduce(function(a,b){return a+b;},0)/st.first9.length).toFixed(2)) : 0;
    players.push({
      name: _z01PlayerName(i),
      avg: avg, f9avg: f9avg,
      c100: st.c100, c140: st.c140, c180: st.c180,
      hiFin: st.hiFin, bestLeg: st.bestLeg < 999 ? st.bestLeg : 0,
      worstLeg: st.worstLeg > 0 ? st.worstLeg : 0,
      legWins: _z01.legWins[i],
      rounds: (_z01.roundScores && _z01.roundScores[i]) ? _z01.roundScores[i].slice() : [],
      checkouts: (_z01.checkoutAttempts && _z01.checkoutAttempts[i]) ? _z01.checkoutAttempts[i].slice() : []
    });
  }
  var winner = n > 1 ? (_z01.legWins[0] > _z01.legWins[1] ? 0 : (_z01.legWins[1] > _z01.legWins[0] ? 1 : -1)) : 0;
  return {
    date: new Date().toISOString(),
    mode: _z01.mode, legs: _z01.legs,
    inRule: _z01.inRule, outRule: _z01.outRule,
    players: n, winner: winner,
    data: players
  };
}
// ---- AVG推移グラフ ----
function _z01RenderAvgGraph() {
  var el = document.getElementById('z01-avg-graph');
  if (!el) return;
  var hist = _z01GetH();
  // player0のavgを時系列順（古い→新しい）で最大20件取得
  var pts = [];
  for (var i = hist.length - 1; i >= 0; i--) {
    var g = hist[i];
    if (g.data && g.data[0] && g.data[0].avg > 0) pts.push(g.data[0].avg);
  }
  pts = pts.slice(-30);
  if (pts.length < 2) {
    el.innerHTML = '<div class="z01-avg-graph-hdr"><span class="z01-avg-graph-label">AVG推移</span></div>' +
      '<div class="z01-avg-graph-empty">あと' + (2 - pts.length) + 'ゲームでグラフが表示されます</div>';
    return;
  }
  var n = pts.length;
  var minV = Math.min.apply(null, pts), maxV = Math.max.apply(null, pts);
  var span = Math.max(maxV - minV, 15);
  var yMin = Math.max(0, minV - span * 0.25), yMax = maxV + span * 0.25;
  var W = 300, H = 100, pL = 30, pR = 8, pT = 14, pB = 18;
  var gW = W - pL - pR, gH = H - pT - pB;
  function xp(i) { return pL + (n < 2 ? 0 : i / (n - 1)) * gW; }
  function yp(v) { return pT + gH - ((v - yMin) / (yMax - yMin)) * gH; }
  // ライン・エリアパス
  var line = '', area = 'M' + xp(0) + ',' + (pT + gH);
  for (var i = 0; i < n; i++) {
    var x = xp(i).toFixed(1), y = yp(pts[i]).toFixed(1);
    line += (i ? 'L' : 'M') + x + ',' + y + ' ';
    area += ' L' + x + ',' + y;
  }
  area += ' L' + xp(n - 1).toFixed(1) + ',' + (pT + gH) + ' Z';
  // 全体平均
  var mean = pts.reduce(function(a,b){return a+b;},0) / n;
  var meanY = yp(mean).toFixed(1);
  // トレンド（最新 vs 最古）
  var diff = pts[n-1] - pts[0];
  var trendTxt = (diff > 0 ? '↗ +' : diff < 0 ? '↘ ' : '→ ') + diff.toFixed(1);
  var trendCol = diff > 1 ? '#4ade80' : diff < -1 ? '#f87171' : '#94a3b8';
  // 最新点のラベル位置
  var lastX = xp(n-1).toFixed(1), lastY = yp(pts[n-1]).toFixed(1);
  var lblAnchor = n > 3 ? 'end' : 'middle';
  // Y軸ラベル用の目盛り（2本）
  var yTickTop = yMax.toFixed(0), yTickBot = yMin.toFixed(0);
  var svg =
    '<svg viewBox="0 0 ' + W + ' ' + H + '" style="width:100%;display:block;" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><linearGradient id="z01ag" x1="0" y1="0" x2="0" y2="1">' +
    '<stop offset="0%" stop-color="var(--acc)" stop-opacity="0.5"/>' +
    '<stop offset="100%" stop-color="var(--acc)" stop-opacity="0"/>' +
    '</linearGradient></defs>' +
    // ベースライン
    '<line x1="' + pL + '" y1="' + (pT+gH) + '" x2="' + (pL+gW) + '" y2="' + (pT+gH) + '" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>' +
    // 平均破線
    '<line x1="' + pL + '" y1="' + meanY + '" x2="' + (pL+gW) + '" y2="' + meanY + '" stroke="rgba(255,255,255,0.18)" stroke-width="1" stroke-dasharray="4,3"/>' +
    // エリア塗り
    '<path d="' + area + '" fill="url(#z01ag)"/>' +
    // メインライン
    '<path d="' + line + '" fill="none" stroke="var(--acc)" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
    // 各データ点（小）
    pts.slice(0,-1).map(function(v,i){
      return '<circle cx="' + xp(i).toFixed(1) + '" cy="' + yp(v).toFixed(1) + '" r="2.5" fill="rgba(255,255,255,0.35)"/>';
    }).join('') +
    // 最新点（大・強調）
    '<circle cx="' + lastX + '" cy="' + lastY + '" r="5" fill="var(--acc)"/>' +
    '<circle cx="' + lastX + '" cy="' + lastY + '" r="8" fill="var(--acc)" opacity="0.25"/>' +
    // 最新AVGラベル
    '<text x="' + (parseFloat(lastX) - 2) + '" y="' + (parseFloat(lastY) - 10) + '" fill="var(--acc)" font-size="11" font-weight="700" text-anchor="' + lblAnchor + '">' + pts[n-1].toFixed(1) + '</text>' +
    // Y軸ラベル
    '<text x="' + (pL-4) + '" y="' + (pT+5) + '" fill="rgba(255,255,255,0.35)" font-size="8.5" text-anchor="end">' + yTickTop + '</text>' +
    '<text x="' + (pL-4) + '" y="' + (pT+gH) + '" fill="rgba(255,255,255,0.35)" font-size="8.5" text-anchor="end">' + yTickBot + '</text>' +
    // 平均ラベル
    '<text x="' + (pL+4) + '" y="' + (parseFloat(meanY)-3) + '" fill="rgba(255,255,255,0.3)" font-size="8" text-anchor="start">avg ' + mean.toFixed(1) + '</text>' +
    '</svg>';
  el.innerHTML =
    '<div class="z01-avg-graph-hdr">' +
      '<span class="z01-avg-graph-label">AVG推移（直近' + n + 'ゲーム）</span>' +
      '<span class="z01-avg-graph-trend" style="color:' + trendCol + ';">' + trendTxt + '</span>' +
    '</div>' + svg;
}
// ---- end AVG推移グラフ ----
// ---- end 01 History Storage ----
function z01Again() {
  var m = _z01.mode;
  _z01.remain = [m, m]; _z01.legWins = [0, 0];
  _z01.currentPlayer = 0; _z01.currentLeg = 1; _z01._buf = '';
  _z01.roundScores = [[], []];
  _z01.checkoutAttempts = [[], []];
  _z01.stats = _z01InitStats(_z01.players===1?1:2);
  document.getElementById('z01-result-wrap').style.display = 'none';
  document.getElementById('z01-game-wrap').style.display = 'flex';
  _z01InitLog();
  _z01Render(); _z01HintUpdate(); _z01LogRender();
  if (_z01.players===3 && _z01.currentPlayer===1) _z01CpuTurn();
}
function z01BackSetup() {
  document.getElementById('z01-result-wrap').style.display = 'none';
  document.getElementById('z01-game-wrap').style.display = 'none';
  document.getElementById('z01-setup-wrap').style.display = '';
}
function z01ConfirmExit() {
  document.getElementById('z01-exit-confirm').style.display = 'flex';
}
function z01ExitNo() {
  document.getElementById('z01-exit-confirm').style.display = 'none';
}
function z01ExitYes() {
  document.getElementById('z01-exit-confirm').style.display = 'none';
  z01BackSetup();
}
function z01FinishBtn() {
  var p = _z01.currentPlayer, rem = _z01.remain[p];
  var finEl = document.getElementById('z01-bb-finish');
  if (!finEl || finEl.classList.contains('z01-bb-dim')) return;
  _z01BufUpdate(String(rem));
  z01Ok();
}
var _z01HintOn = false;
function z01ToggleHint() {
  _z01HintOn = !_z01HintOn;
  var btn = document.getElementById('z01-hint-toggle');
  if (btn) {
    btn.classList.toggle('on', _z01HintOn);
    btn.textContent = _z01HintOn ? 'ヒント OFF' : 'ヒント ON';
  }
  _z01HintUpdate();
}
// Score edit state
var _z01EditState = {rowIdx: 0, colIdx: 0, buf: ''};
function z01EditScore(arg) {
  var rowIdx = Math.floor(arg / 10), colIdx = arg % 10;
  var log = _z01.log;
  if (rowIdx < 0 || rowIdx >= log.length) return;
  var data = log[rowIdx].p[colIdx];
  if (!data) return;
  _z01EditState = {rowIdx: rowIdx, colIdx: colIdx, buf: String(data.scored)};
  var cur = document.getElementById('z01-edit-cur');
  if (cur) cur.textContent = String(data.scored);
  document.getElementById('z01-edit-modal').style.display = 'flex';
}
function z01EditKp(arg) {
  var v = _z01EditState.buf + String(arg);
  if (v.length > 3 || parseInt(v,10) > 180) return;
  _z01EditState.buf = v;
  var cur = document.getElementById('z01-edit-cur');
  if (cur) cur.textContent = v || '—';
}
function z01EditKd() {
  _z01EditState.buf = _z01EditState.buf.slice(0,-1);
  var cur = document.getElementById('z01-edit-cur');
  if (cur) cur.textContent = _z01EditState.buf || '—';
}
function z01EditOk() {
  var v = parseInt(_z01EditState.buf, 10);
  if (isNaN(v) || v < 0 || v > 180) return;
  document.getElementById('z01-edit-modal').style.display = 'none';
  var rIdx = _z01EditState.rowIdx, cIdx = _z01EditState.colIdx;
  var log = _z01.log;
  // Recalculate remains from this row forward
  // Find previous remain for this player
  var prevRemain;
  if (rIdx === 0) {
    prevRemain = _z01.mode;
  } else {
    var prevData = log[rIdx-1].p[cIdx];
    prevRemain = prevData ? prevData.remain : _z01.mode;
  }
  // Check if new score busts at edit point
  var outDbl = _z01.outRule === 0;
  var newRemain = prevRemain - v;
  if (outDbl ? (newRemain < 0 || newRemain === 1) : (newRemain < 0)) return; // invalid
  log[rIdx].p[cIdx].scored = v;
  log[rIdx].p[cIdx].remain = newRemain;
  // Recalculate subsequent rows for this player
  for (var i = rIdx + 1; i < log.length; i++) {
    var d = log[i].p[cIdx];
    if (!d) break;
    var pr = log[i-1].p[cIdx];
    if (!pr) break;
    var nr = pr.remain - d.scored;
    if (outDbl ? (nr < 0 || nr === 1) : (nr < 0)) { d.remain = pr.remain; } // bust — keep scored but correct remain
    else d.remain = nr;
  }
  // Update final remain in _z01.remain
  var lastRow = log[log.length-1];
  if (lastRow.p[cIdx]) {
    _z01.remain[cIdx] = lastRow.p[cIdx].remain;
  }
  _z01LogRender(); _z01HintUpdate();
}
function z01EditCancel() {
  document.getElementById('z01-edit-modal').style.display = 'none';
}

function _z01UndoStats(p, sc) {
  var st = _z01.stats[p];
  st.rounds = Math.max(0, st.rounds - 1);
  st.total = Math.max(0, st.total - sc);
  st.legRounds = Math.max(0, st.legRounds - 1);
  if (sc >= 180) st.c180 = Math.max(0, st.c180 - 1);
  else if (sc >= 140) st.c140 = Math.max(0, st.c140 - 1);
  else if (sc >= 100) st.c100 = Math.max(0, st.c100 - 1);
}
function _z01UndoCheckout(p, prevRemain) {
  // prevRemain is what remain was BEFORE that shot (data.scored + data.remain)
  if (!_z01.checkoutAttempts || !_z01.checkoutAttempts[p]) return;
  if (!_z01.roundScores || !_z01.roundScores[p]) return;
  if (prevRemain <= 170) {
    // The shot was a checkout attempt; remove the last entry
    if (_z01.checkoutAttempts[p].length > 0) _z01.checkoutAttempts[p].pop();
  } else {
    // The shot was a scoring round (remain > 170)
    if (_z01.roundScores[p].length > 0) _z01.roundScores[p].pop();
  }
}
function z01Undo() {
  // Find what would be undone and show confirmation
  var log = _z01.log;
  var n = _z01.players === 1 ? 1 : 2;
  var scored = null, playerName = null;
  if (n === 1) {
    if (log.length < 2) return;
    var prev = log[log.length - 2];
    if (!prev.p[0]) return;
    scored = prev.p[0].scored;
    playerName = _z01PlayerName(0);
  } else {
    var cp = _z01.currentPlayer, other = 1 - cp;
    var curRow = log[log.length - 1];
    if (curRow.p[other] !== null) {
      scored = curRow.p[other].scored;
      playerName = _z01PlayerName(other);
    } else if (log.length >= 2) {
      var prev = log[log.length - 2];
      for (var pi = n - 1; pi >= 0; pi--) {
        if (prev.p[pi] !== null) { scored = prev.p[pi].scored; playerName = _z01PlayerName(pi); break; }
      }
    }
  }
  if (scored === null) return;
  var sub = document.getElementById('z01-undo-sub');
  if (sub) sub.textContent = playerName + ' の ' + scored + ' 点を取り消します';
  document.getElementById('z01-undo-confirm').style.display = 'flex';
}
function z01UndoNo() {
  document.getElementById('z01-undo-confirm').style.display = 'none';
}
function _z01UndoExec() {
  var log = _z01.log;
  var n = _z01.players === 1 ? 1 : 2;
  if (n === 1) {
    // Current row is last entry with p[0]=null; prev row is the last scored
    if (log.length < 2) return;
    var prev = log[log.length - 2];
    var data = prev.p[0];
    if (!data) return;
    var prevRem0 = data.scored + data.remain;
    _z01.remain[0] = prevRem0;
    _z01UndoStats(0, data.scored);
    _z01UndoCheckout(0, prevRem0);
    log.pop();
    prev.p[0] = null;
  } else {
    var cp = _z01.currentPlayer;
    var other = 1 - cp;
    var curRow = log[log.length - 1];
    if (curRow.p[other] !== null) {
      // Other player just scored in current row
      var data = curRow.p[other];
      var prevRemOther = data.scored + data.remain;
      _z01.remain[other] = prevRemOther;
      _z01UndoStats(other, data.scored);
      _z01UndoCheckout(other, prevRemOther);
      curRow.p[other] = null;
      _z01.currentPlayer = other;
    } else if (log.length >= 2) {
      // Both null → undo last completed row
      var prev = log[log.length - 2];
      // Find last scored player in prev row (player 1 first, then 0)
      for (var pi = n - 1; pi >= 0; pi--) {
        if (prev.p[pi] !== null) {
          var data = prev.p[pi];
          var prevRemPi = data.scored + data.remain;
          _z01.remain[pi] = prevRemPi;
          _z01UndoStats(pi, data.scored);
          _z01UndoCheckout(pi, prevRemPi);
          log.pop();
          prev.p[pi] = null;
          _z01.currentPlayer = pi;
          break;
        }
      }
    }
  }
  _z01Render(); _z01HintUpdate(); _z01LogRender();
}
function z01UndoYes() {
  document.getElementById('z01-undo-confirm').style.display = 'none';
  _z01UndoExec();
}
function _z01InitLog() {
  var n = _z01.players === 1 ? 1 : 2;
  var p = [];
  for (var i = 0; i < n; i++) p.push(null);
  _z01.log = [{visit: 3, p: p}];
}

function _z01LogCell(data, pIdx, isLive, isEditable, rowIdx, colIdx) {
  var sc = 'z01-lc-s' + pIdx, tc = 'z01-lc-t' + pIdx;
  var scId = isLive ? ' id="z01-log-live"' : '';
  var tcId = isLive ? ' id="z01-log-live-togo"' : '';
  if (!data) return '<div class="' + sc + '"' + scId + '></div><div class="' + tc + '"' + tcId + '></div>';
  var hiCls = data.scored >= 140 ? ' gold' : '';
  var scoredHtml = data.scored >= 100 ? '<span class="z01-lc-hi' + hiCls + '">' + data.scored + '</span>' : String(data.scored);
  var editAttr = isEditable ? ' data-fn="z01EditScore" data-arg="' + (rowIdx * 10 + colIdx) + '"' : '';
  var editCls = isEditable ? ' editable' : '';
  return '<div class="' + sc + editCls + '"' + scId + editAttr + '>' + scoredHtml + '</div><div class="' + tc + '"' + tcId + '>' + data.remain + '</div>';
}
// For 1P layout (scored | visit | togo): output scored and togo separately
function _z01LogCellS(data, pIdx, isLive, isEditable, rowIdx) {
  var sc = 'z01-lc-s' + pIdx;
  var scId = isLive ? ' id="z01-log-live"' : '';
  if (!data) return '<div class="' + sc + '"' + scId + '></div>';
  var hiCls = data.scored >= 140 ? ' gold' : '';
  var scoredHtml = data.scored >= 100 ? '<span class="z01-lc-hi' + hiCls + '">' + data.scored + '</span>' : String(data.scored);
  var editAttr = isEditable ? ' data-fn="z01EditScore" data-arg="' + (rowIdx * 10) + '"' : '';
  var editCls = isEditable ? ' editable' : '';
  return '<div class="' + sc + editCls + '"' + scId + editAttr + '>' + scoredHtml + '</div>';
}
function _z01LogCellT(data, pIdx, isLive) {
  var tc = 'z01-lc-t' + pIdx;
  var tcId = isLive ? ' id="z01-log-live-togo"' : '';
  if (!data) return '<div class="' + tc + '"' + tcId + '></div>';
  return '<div class="' + tc + '"' + tcId + '>' + data.remain + '</div>';
}

function _z01LogRender() {
  var logEl = document.getElementById('z01-log');
  if (!logEl) return;
  var n = _z01.players === 1 ? 1 : 2;
  var isP2 = n === 2;
  logEl.className = 'z01-log ' + (isP2 ? 'p2' : 'p1');
  var h = '';
  // Player names row (2P)
  if (isP2) {
    var cp = _z01.currentPlayer;
    var n0 = _z01PlayerName(0) + (_z01.legs>1?' ('+_z01.legWins[0]+'W)':'');
    var n1 = _z01PlayerName(1) + (_z01.legs>1?' ('+_z01.legWins[1]+'W)':'');
    h += '<div class="z01-log-names"><div class="z01-log-name-l' + (cp===0?' z01-log-name-act':'') + '">' + n0 + '</div><div></div><div class="z01-log-name-r' + (cp===1?' z01-log-name-act':'') + '">' + n1 + '</div></div>';
    h += '<div class="z01-log-hdr"><div>点数</div><div>残り</div><div></div><div>点数</div><div>残り</div></div>';
  } else {
    h += '<div class="z01-log-hdr"><div>点数</div><div></div><div>残り</div></div>';
  }
  // Initial remaining row
  var startR = _z01.mode;
  if (isP2) {
    h += '<div class="z01-log-row"><div class="z01-lc-s0"></div><div class="z01-lc-t0 init">' + startR + '</div><div class="z01-lc-v"></div><div class="z01-lc-s1"></div><div class="z01-lc-t1 init">' + startR + '</div></div>';
  } else {
    h += '<div class="z01-log-row"><div class="z01-lc-s0"></div><div class="z01-lc-v"></div><div class="z01-lc-t0 init">' + startR + '</div></div>';
  }
  // Data rows
  var log = _z01.log, cp2 = _z01.currentPlayer;
  for (var i = 0; i < log.length; i++) {
    var row = log[i];
    var isCur = i === log.length - 1;
    var cls = '';
    if (isCur) { cls = isP2 ? (row.p[0]===null&&cp2===0?' cur0':(row.p[1]===null&&cp2===1?' cur1':'')) : ' cur0'; }
    if (isP2) {
      var live0 = isCur && cp2===0 && row.p[0]===null;
      var live1 = isCur && cp2===1 && row.p[1]===null;
      h += '<div class="z01-log-row' + cls + '">';
      h += _z01LogCell(row.p[0], 0, live0, !isCur && row.p[0]!==null, i, 0);
      h += '<div class="z01-lc-v">' + row.visit + '</div>';
      h += _z01LogCell(row.p[1], 1, live1, !isCur && row.p[1]!==null, i, 1);
      h += '</div>';
    } else {
      h += '<div class="z01-log-row' + cls + '">';
      h += _z01LogCellS(row.p[0], 0, isCur, !isCur && row.p[0]!==null, i);
      h += '<div class="z01-lc-v">' + row.visit + '</div>';
      h += _z01LogCellT(row.p[0], 0, isCur);
      h += '</div>';
    }
  }
  // Future padding rows (15 rounds = 45 darts ahead)
  var lastVisit = log[log.length - 1].visit;
  for (var k = 1; k <= 4; k++) {
    var fv = lastVisit + k * 3;
    if (isP2) {
      h += '<div class="z01-log-row"><div class="z01-lc-s0"></div><div class="z01-lc-t0"></div><div class="z01-lc-v">' + fv + '</div><div class="z01-lc-s1"></div><div class="z01-lc-t1"></div></div>';
    } else {
      h += '<div class="z01-log-row"><div class="z01-lc-s0"></div><div class="z01-lc-v">' + fv + '</div><div class="z01-lc-t0"></div></div>';
    }
  }
  logEl.innerHTML = h;
  // Update live cell with current input
  _z01BufUpdate(_z01._buf);
  var wrap = document.getElementById('z01-log-wrap');
  if (wrap) {
    // Scroll so current row is near bottom, keeping ~4 previous rows visible above
    var liveEl = document.getElementById('z01-log-live');
    if (liveEl) {
      var row = liveEl.closest('.z01-log-row');
      if (row) {
        var rowRect = row.getBoundingClientRect();
        var wrapRect = wrap.getBoundingClientRect();
        var rowRelTop = rowRect.top - wrapRect.top + wrap.scrollTop;
        var rowH = row.offsetHeight || 52;
        // Scroll so current row is fully visible at the bottom
        wrap.scrollTop = Math.max(0, rowRelTop + rowH - wrap.offsetHeight);
      } else {
        wrap.scrollTop = wrap.scrollHeight;
      }
    } else {
      wrap.scrollTop = wrap.scrollHeight;
    }
  }
}

function _z01BuildFinishModal(finishedScore) {
  var inner = document.querySelector('.z01-finish-inner');
  if (!inner) return;
  var dbl = _z01.outRule === 0;
  // Determine which dart options are valid
  // 1 dart: score must be reachable in 1 dart
  //   double-out: must be a valid double (2,4,...,40,50) or single-out: ≤20 or 25 or 50
  // 2 dart: CHECKOUT_2H table or score ≤ 99 (rough heuristic)
  // 3 dart: always valid if score ≤ 170
  var can1, can2;
  if (dbl) {
    var doubles = [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36,38,40,50];
    can1 = doubles.indexOf(finishedScore) >= 0;
    can2 = finishedScore <= 110; // rough: most 2-dart doubles exist up to ~110
    if (CHECKOUT_2H && CHECKOUT_2H[finishedScore]) can2 = true;
    if (finishedScore > 110 && !(CHECKOUT_2H && CHECKOUT_2H[finishedScore])) can2 = false;
  } else {
    can1 = finishedScore <= 20 || finishedScore === 25 || finishedScore === 50;
    can2 = finishedScore <= 60;
  }
  var h = '<div class="z01-finish-title">何本目で上がりましたか？</div>';
  if (can1) h += '<button class="z01-finish-btn" data-fn="z01FinishDart" data-arg="1"><span class="z01-finish-btn-main">1本目で上がり</span><span class="z01-finish-btn-sub">Ace finish</span></button>';
  if (can2) h += '<button class="z01-finish-btn" data-fn="z01FinishDart" data-arg="2"><span class="z01-finish-btn-main">2本目で上がり</span><span class="z01-finish-btn-sub">2-dart finish</span></button>';
  h += '<button class="z01-finish-btn" data-fn="z01FinishDart" data-arg="3"><span class="z01-finish-btn-main">3本目で上がり</span><span class="z01-finish-btn-sub">3-dart finish</span></button>';
  inner.innerHTML = h;
}
function z01FinishDart(dartNo) {
  document.getElementById('z01-finish-modal').style.display = 'none';
  var pf = _z01._pendingFinish;
  if (!pf) return;
  var p = pf.player, st = _z01.stats[p];
  var actualDarts = (st.legRounds - 1) * 3 + dartNo;
  st.finishDarts = actualDarts;
  st.totalFinishDarts += actualDarts;
  if (actualDarts < st.bestLeg) st.bestLeg = actualDarts;
  if (actualDarts > st.worstLeg) st.worstLeg = actualDarts;
  _z01._pendingFinish = null;
  _z01.legWins[p]++;
  _z01LegEnd(p);
}

function z01OpenStats() {
  var n = _z01.players === 1 ? 1 : 2;
  var h = '';
  if (n === 2) {
    h += '<div class="z01-midstats-pnames"><div>' + _z01PlayerName(0) + '</div><div class="r">' + _z01PlayerName(1) + '</div></div>';
  } else {
    h += '<div style="font-size:14px;font-weight:700;color:var(--txt);margin-bottom:8px;">' + _z01PlayerName(0) + '</div>';
  }
  h += '<div class="z01-midstats-sect">Totals</div>';
  var totRows = [
    ['Legs', function(s,i){ return _z01.legWins[i]; }],
    ['100+', function(s){ return s.c100; }],
    ['140+', function(s){ return s.c140; }],
    ["180's", function(s){ return s.c180; }],
    ['High Out', function(s){ return s.hiFin||0; }],
    ['Best Leg', function(s){ return s.bestLeg<999?s.bestLeg+' 本':'-'; }],
    ['Worst Leg', function(s){ return s.worstLeg>0?s.worstLeg+' 本':'-'; }]
  ];
  var avgRows = [
    ['Darts', function(s,i){ var w=_z01.legWins[i]; return w>0?((s.totalFinishDarts/w).toFixed(2)):'-'; }],
    ['Score', function(s){ return s.rounds>0?(s.total/s.rounds).toFixed(2):'-'; }],
    ['First 9', function(s){ if(!s.first9.length)return'-'; var t=0; for(var j=0;j<s.first9.length;j++)t+=s.first9[j]; return(t/s.first9.length).toFixed(2); }]
  ];
  function makeRow(lbl, fn) {
    if (n === 2) {
      return '<div class="z01-midstats-row"><div class="z01-midstats-lv">' + fn(_z01.stats[0],0) + '</div><div class="z01-midstats-mk">' + lbl + '</div><div class="z01-midstats-rv">' + fn(_z01.stats[1],1) + '</div></div>';
    }
    return '<div class="z01-midstats-row"><div class="z01-midstats-lv">' + fn(_z01.stats[0],0) + '</div><div class="z01-midstats-mk">' + lbl + '</div><div class="z01-midstats-rv"></div></div>';
  }
  for (var k=0;k<totRows.length;k++) h += makeRow(totRows[k][0], totRows[k][1]);
  h += '<div class="z01-midstats-sect">Averages</div>';
  for (var m=0;m<avgRows.length;m++) h += makeRow(avgRows[m][0], avgRows[m][1]);
  document.getElementById('z01-midstats-body').innerHTML = h;
  document.getElementById('z01-midstats').style.display = 'flex';
}

function z01CloseStats() {
  document.getElementById('z01-midstats').style.display = 'none';
}

/* ── クエストモード ──────────────────────────────────── */
/* _questMissMode removed — replaced by animation-based random outcome */

var _QUEST_WORLDS = [
  { id:'w0', label:'WORLD 1', subtitle:'入門の丘', color:'#66bb6a', icon:'🌱',
    desc:'ダブルアウトの基礎を学ぶ', unlockReq:null,
    stages:[
      { id:'w0s0', label:'D20をきめろ', sub:'40点スタート・1本フィニッシュ',
        pool:[40], cond:{type:'clear'}, isBoss:false },
      { id:'w0s1', label:'ダブルを狙え', sub:'ランダムダブル 3連続クリア',
        pool:'double_easy', cond:{type:'streak',n:3}, isBoss:false },
      { id:'w0s2', label:'🔥 BOSS: ダブル全制覇', sub:'ランダムダブル 10問 / 80%以上',
        pool:'double_all', cond:{type:'count',n:10,minAcc:0.8}, isBoss:true }
    ]
  },
  { id:'w1', label:'WORLD 2', subtitle:'2本の城', color:'#4fc3f7', icon:'🏰',
    desc:'2本フィニッシュをマスター', unlockReq:'w0s2',
    stages:[
      { id:'w1s0', label:'100点を上がれ', sub:'T20→D20の2本フィニッシュ',
        pool:[100], cond:{type:'clear'}, isBoss:false },
      { id:'w1s1', label:'2本コンボ', sub:'2本フィニッシュ 5問 / 70%以上',
        pool:'two_dart_easy', cond:{type:'count',n:5,minAcc:0.7}, isBoss:false },
      { id:'w1s2', label:'🔥 BOSS: 2本チャレンジ', sub:'2本フィニッシュ 15問 / 75%以上',
        pool:'two_dart_all', cond:{type:'count',n:15,minAcc:0.75}, isBoss:true }
    ]
  },
  { id:'w2', label:'WORLD 3', subtitle:'3本の要塞', color:'#ff9800', icon:'⚔️',
    desc:'3本フィニッシュを攻略せよ', unlockReq:'w1s2',
    stages:[
      { id:'w2s0', label:'160点を上がれ', sub:'T20→T20→D20の3本フィニッシュ',
        pool:[160], cond:{type:'clear'}, isBoss:false },
      { id:'w2s1', label:'定番ルート制覇', sub:'3本フィニッシュ 10問 / 60%以上',
        pool:'three_dart_common', cond:{type:'count',n:10,minAcc:0.6}, isBoss:false },
      { id:'w2s2', label:'🔥 BOSS: 170チャレンジ', sub:'上級スコア 20問 / 55%以上',
        pool:'three_dart_hard', cond:{type:'count',n:20,minAcc:0.55}, isBoss:true }
    ]
  },
  { id:'w3', label:'👑 FINAL', subtitle:'最終試練', color:'#ef5350', icon:'👑',
    desc:'全スコアランダム総合チャレンジ', unlockReq:'w2s2',
    stages:[
      { id:'w3s0', label:'最終試練', sub:'全スコアランダム 20問 / 75%以上',
        pool:'all', cond:{type:'count',n:20,minAcc:0.75}, isBoss:true }
    ]
  },
  { id:'w4', label:'💀 裏ボス', subtitle:'削り戦術', color:'#9c27b0', icon:'💀',
    desc:'フィニッシュ不可点数から活路を切り開く削り戦術', unlockReq:'w3s0',
    stages:[
      { id:'w4s0', label:'170超えの削り方', sub:'171〜180点から残り120へ削る 5問 / 60%以上',
        pool:'skezuri_high', cond:{type:'count',n:5,minAcc:0.6}, isSkezuri:true },
      { id:'w4s1', label:'不可能スコア突破', sub:'169/168/166/165/163/162点の対処 8問 / 60%以上',
        pool:'skezuri_impossible', cond:{type:'count',n:8,minAcc:0.6}, isSkezuri:true },
      { id:'w4s2', label:'💀 裏ボス: 削り完全制覇', sub:'全削りシナリオ 15問 / 70%以上',
        pool:'skezuri_all', cond:{type:'count',n:15,minAcc:0.7}, isBoss:true, isSkezuri:true }
    ]
  }
];

var _questG = {
  worldIdx:0, stageIdx:0,
  currentScore:0, dartNum:1,
  path:[], chain:[],
  thisWrong:0, thisMiss:0,
  totalWrong:0, totalMiss:0,
  qCount:0, qCorrect:0, qStreak:0,
  stageCleared:false,
  pool:[], poolIdx:0,
  skezuriSetup:null,
  skipUnlockReq:null,
  wrongCorrect:null,
  weaknessMode:false,
  realThrowMode:false,
  realDart:null,
  qThrowAttempts:0, qThrowHit:0
};

/* 削り戦術データ: フィニッシュ不可点数 → 最善の1本目 & 残り点 */
var _SKEZURI_DATA = {
  171:{shot:'T17',leaves:120}, 172:{shot:'T20',leaves:112},
  173:{shot:'T19',leaves:116}, 174:{shot:'T18',leaves:120},
  175:{shot:'T19',leaves:118}, 176:{shot:'T20',leaves:116},
  177:{shot:'T19',leaves:120}, 178:{shot:'T20',leaves:118},
  179:{shot:'T19',leaves:122}, 180:{shot:'T20',leaves:120},
  162:{shot:'T20',leaves:102}, 163:{shot:'T19',leaves:106},
  165:{shot:'T19',leaves:108}, 166:{shot:'T20',leaves:106},
  168:{shot:'T20',leaves:108}, 169:{shot:'T20',leaves:109}
};

function _questLoadData() {
  try { return JSON.parse(localStorage.getItem('arr_quest_v1') || '{}'); } catch(e) { return {}; }
}
function _questGetProgress(sid) {
  var d = _questLoadData();
  return d[sid] || { stars:0, clears:0 };
}
function _questSaveProgress(sid, stars) {
  var d = _questLoadData();
  if (!d[sid]) d[sid] = { stars:0, clears:0 };
  d[sid].clears++;
  if (stars > d[sid].stars) d[sid].stars = stars;
  localStorage.setItem('arr_quest_v1', JSON.stringify(d));
}
function _questIsUnlocked(sid) {
  for (var wi=0;wi<_QUEST_WORLDS.length;wi++) {
    var w = _QUEST_WORLDS[wi];
    for (var si=0;si<w.stages.length;si++) {
      if (w.stages[si].id !== sid) continue;
      if (si === 0) return !w.unlockReq || _questGetProgress(w.unlockReq).clears > 0;
      return _questGetProgress(w.stages[si-1].id).clears > 0;
    }
  }
  return false;
}

function _questPool(poolType) {
  if (Array.isArray(poolType)) return poolType.slice();
  var r = [];
  if (poolType === 'double_easy') return [40,32,36,20,28,16,24,30,40,36,32];
  if (poolType === 'double_all') {
    for (var i=2;i<=40;i+=2) r.push(i);
    r.push(50); return r;
  }
  if (poolType === 'two_dart_easy') return [100,98,96,60,56,52,48,44,41];
  if (poolType === 'two_dart_all') {
    for (var i=2;i<=170;i++) { var p=_getPath(i); if(p&&p.length===2) r.push(i); }
    return r;
  }
  if (poolType === 'three_dart_common') return [160,156,150,140,130,121,120,110,104,102];
  if (poolType === 'three_dart_hard') return [170,167,164,161,160,158,157,156,155,154,153,152,151];
  if (poolType === 'all') {
    for (var i=2;i<=170;i++) if(_isCheckable(i)) r.push(i);
    return r;
  }
  if (poolType === 'skezuri_high') return [171,172,173,174,175,176,177,178,179,180];
  if (poolType === 'skezuri_impossible') return [162,163,165,166,168,169];
  if (poolType === 'skezuri_all') return Object.keys(_SKEZURI_DATA).map(Number);
  return [40];
}

function _questDartVal(d) {
  if (d==='Bull'||d==='D-BULL') return 50;
  if (d==='S-BULL'||d==='25') return 25;
  var m = d.match(/^([TDS]?)(\d+)$/);
  if (!m) return 0;
  var ring=m[1], n=parseInt(m[2],10);
  return ring==='T'?n*3:ring==='D'?n*2:n;
}
/* ランダム着弾判定 */
function _questThrow(dartStr) {
  var r = Math.random();
  if (dartStr==='Bull'||dartStr==='D-BULL') {
    if (r<0.52) return {land:'Bull', value:50, hit:true};
    if (r<0.88) return {land:'S-BULL', value:25, hit:false};
    return {land:'S20', value:20, hit:false};
  }
  if (dartStr==='S-BULL') {
    if (r<0.68) return {land:'S-BULL', value:25, hit:true};
    if (r<0.90) return {land:'Bull', value:50, hit:false};
    return {land:'S20', value:20, hit:false};
  }
  var m = dartStr.match(/^([TDS]?)(\d+)$/);
  if (!m) return {land:dartStr, value:_questDartVal(dartStr), hit:true};
  var ring=m[1], n=parseInt(m[2],10);
  var idx=_BOARD_SEGS.indexOf(n);
  var adj = idx>=0 ? _BOARD_SEGS[(idx+(Math.random()<0.5?19:1))%20] : n;
  if (ring==='T') {
    if (r<0.68) return {land:dartStr, value:n*3, hit:true};
    if (r<0.88) return {land:'S'+n, value:n, hit:false};
    return {land:'T'+adj, value:adj*3, hit:false};
  }
  if (ring==='D') {
    if (r<0.58) return {land:dartStr, value:n*2, hit:true};
    if (r<0.85) return {land:'S'+n, value:n, hit:false};
    return {land:null, value:0, hit:false};
  }
  if (r<0.82) return {land:dartStr, value:n, hit:true};
  return {land:'S'+adj, value:adj, hit:false};
}

/* 狙いのセグメント座標を返す（240×240 SVG 内ピクセル） */
function _questDartPos(dartStr) {
  var cx=120, cy=120;
  if (dartStr==='Bull'||dartStr==='D-BULL') return {x:cx, y:cy};
  if (dartStr==='S-BULL') return {x:cx, y:cy-11};
  var m = dartStr.match(/^([TDS]?)(\d+)$/);
  if (!m) return {x:cx, y:cy};
  var ring=m[1], n=parseInt(m[2],10);
  var idx=_BOARD_SEGS.indexOf(n);
  if (idx<0) return {x:cx, y:cy};
  var deg = -99 + (idx + 0.5) * 18;
  var rad = deg * Math.PI / 180;
  var r = ring==='T' ? 58 : ring==='D' ? 96 : 77;
  return {
    x: Math.round(cx + r * Math.cos(rad)),
    y: Math.round(cy + r * Math.sin(rad))
  };
}

/* 投球アニメーション表示 — 着弾先へ正確に飛ぶ */
function _questShowThrow(dartStr) {
  var overlay = document.getElementById('quest-throw-overlay');
  var isWrongThrow = !!_questG.wrongCorrect;
  document.getElementById('quest-throw-label').textContent = dartStr + (isWrongThrow ? ' を投げた...' : ' を狙う！');
  document.getElementById('quest-throw-result-text').textContent = '';
  document.getElementById('quest-throw-pts').textContent = '';
  document.getElementById('quest-throw-hint').textContent = '';

  // 先に結果を決定してから着弾座標へ飛ばす
  var result = _questThrow(dartStr);
  var landStr = result.land; // null = アウト
  // アウト（landStr=null）の場合はダブル外側の座標へ飛ばす
  var pos;
  if (!landStr) {
    // ダブル枠のさらに外 → radius 110 (R=100 の外) の方向
    var m2 = dartStr.match(/^([TDS]?)(\d+)$/);
    if (m2) {
      var idx2 = _BOARD_SEGS.indexOf(parseInt(m2[2],10));
      var deg2 = (-99 + (idx2 + 0.5) * 18) * Math.PI / 180;
      pos = { x: Math.round(120 + 110 * Math.cos(deg2)), y: Math.round(120 + 110 * Math.sin(deg2)) };
    } else { pos = _questDartPos(dartStr); }
  } else {
    pos = _questDartPos(landStr);
  }

  var box = document.getElementById('quest-board-box');
  // アニメーション中：狙いのみ黄色ハイライト
  box.innerHTML = _buildBoardSVG(dartStr, null) +
    '<div class="quest-dart-dot" id="quest-dart-dot" style="left:'+pos.x+'px;top:'+pos.y+'px;"></div>';

  overlay.classList.remove('hide');

  // ダーツ飛行アニメーション開始
  requestAnimationFrame(function(){
    var dot = document.getElementById('quest-dart-dot');
    if (dot) { void dot.offsetWidth; dot.classList.add('flying'); }
  });

  // 着弾後：ボードに着弾点を表示して結果テキスト
  setTimeout(function(){
    sfxImpact();
    // ボード更新：狙い(黄) + 着弾(緑) + 光点を同座標に残す
    box.innerHTML = _buildBoardSVG(dartStr, landStr) +
      '<div class="quest-dart-dot" style="left:'+pos.x+'px;top:'+pos.y+'px;opacity:1;transform:translateY(0) scale(1);"></div>';

    var rEl = document.getElementById('quest-throw-result-text');
    var pEl = document.getElementById('quest-throw-pts');
    var hEl = document.getElementById('quest-throw-hint');
    if (result.hit) {
      rEl.innerHTML = '<span style="color:#66bb6a;font-size:28px;font-family:Bebas Neue,cursive;letter-spacing:3px;">HIT!</span><br><span style="color:#66bb6a;font-size:14px;">' + dartStr + '</span>';
      pEl.style.color = '#66bb6a';
      pEl.textContent = '−' + result.value;
    } else if (!landStr) {
      rEl.innerHTML = '<span style="color:#ef5350;font-size:28px;font-family:Bebas Neue,cursive;letter-spacing:3px;">OUT!</span><br><span style="color:#ef5350;font-size:12px;">ボード外（0点）</span>';
      pEl.textContent = '';
    } else {
      var landType = landStr[0]==='T'?'TRIPLE':landStr[0]==='D'?'DOUBLE':'SINGLE';
      rEl.innerHTML = '<span style="color:#ff9800;font-size:24px;font-family:Bebas Neue,cursive;letter-spacing:2px;">'+landType+'...</span><br><span style="color:#ff9800;font-size:14px;">' + landStr + ' に外れた</span>';
      pEl.style.color = '#ff9800';
      pEl.textContent = result.value > 0 ? '−' + result.value : '';
    }
    // 不正解時: 正解を表示してリセット
    if (_questG.wrongCorrect) {
      hEl.textContent = '正解は ' + _questG.wrongCorrect + ' でした';
      _questG.wrongCorrect = null;
    }

    setTimeout(function(){
      overlay.classList.add('hide');
      _questOutcome(dartStr, result);
    }, 1700);
  }, 680);
}

function showQuestHome() {
  document.getElementById('arr-setup').style.display = 'none';
  document.getElementById('arr-hist-wrap').style.display = 'none';
  document.getElementById('arr-train-home').style.display = 'none';
  document.getElementById('arr-quest-play').style.display = 'none';
  document.getElementById('arr-quest-weakness').style.display = 'none';
  document.getElementById('arr-quest-home').style.display = 'flex';
  _questUpdateRealToggleUI();
  _renderQuestWorlds();
}

function _renderQuestWorlds() {
  var el = document.getElementById('arr-quest-worlds');
  var html = '';
  _QUEST_WORLDS.forEach(function(w, wi) {
    var wUnlocked = !w.unlockReq || _questGetProgress(w.unlockReq).clears > 0;
    var wColor = wUnlocked ? w.color : 'rgba(255,255,255,0.15)';
    html += '<div class="arr-quest-world-card" style="border-color:'+wColor+'44;">';
    html += '<div class="arr-quest-world-hdr" style="border-left:3px solid '+wColor+';padding-left:13px;">';
    html += '<div class="arr-quest-world-icon">'+(wUnlocked?w.icon:'🔒')+'</div>';
    html += '<div class="arr-quest-world-info">';
    html += '<div class="arr-quest-world-label" style="color:'+wColor+';">'+w.label+'<span style="opacity:0.45;font-size:14px;margin:0 7px;">／</span>'+w.subtitle+'</div>';
    html += '<div class="arr-quest-world-desc">'+w.desc+'</div>';
    html += '</div></div>';
    html += '<div class="arr-quest-stage-list">';
    w.stages.forEach(function(stage, si) {
      var unlocked = _questIsUnlocked(stage.id);
      var prog = _questGetProgress(stage.id);
      var stars = prog.clears>0 ? prog.stars : 0;
      var starsHtml = (stars>=3?'⭐':'☆')+(stars>=2?'⭐':'☆')+(stars>=1?'⭐':'☆');
      // reverse order for display: leftmost=3rd star
      starsHtml = (stars>=1?'⭐':'☆')+(stars>=2?'⭐':'☆')+(stars>=3?'⭐':'☆');
      var icon = !unlocked?'🔒':prog.clears>0?(stars>=3?'⭐':'✓'):(stage.isBoss?'🔥':'▷');
      var cls = 'arr-quest-stage'+(stage.isBoss?' boss':'')+(unlocked?'':' locked');
      html += '<div class="'+cls+'" onclick="startQuestStage('+wi+','+si+')">';
      html += '<div class="arr-quest-stage-icon">'+icon+'</div>';
      html += '<div class="arr-quest-stage-info">';
      html += '<div class="arr-quest-stage-label">'+stage.label+'</div>';
      html += '<div class="arr-quest-stage-sub">'+stage.sub+'</div>';
      html += '</div>';
      html += '<div class="arr-quest-stage-stars">'+starsHtml+'</div>';
      html += '</div>';
    });
    // ロック中のワールドには飛び級ボタンを表示
    if (!wUnlocked && w.unlockReq && !w.isSkezuri) {
      html += '<div class="arr-quest-skip-wrap">';
      html += '<button class="arr-quest-skip-btn" onclick="startQuestSkipChallenge('+wi+')">⚡ 飛び級に挑戦（5問 / 80%以上でこのワールド解放）</button>';
      html += '</div>';
    }
    // F: ワールドプログレスバー
    if (wUnlocked) {
      var totalStars = 0, maxStars = w.stages.length * 3;
      w.stages.forEach(function(s){ totalStars += _questGetProgress(s.id).stars; });
      var pct = maxStars > 0 ? Math.round(totalStars / maxStars * 100) : 0;
      var isPerfect = totalStars === maxStars && maxStars > 0;
      html += '<div class="quest-world-progress">';
      html += '<div class="quest-world-progress-track"><div class="quest-world-progress-fill" style="width:'+pct+'%;background:'+wColor+';"></div></div>';
      html += '<span class="quest-world-progress-label" style="color:'+wColor+';">'+totalStars+'/'+maxStars+'⭐</span>';
      if (isPerfect) html += '<span class="quest-world-perfect">PERFECT</span>';
      html += '</div>';
    }
    html += '</div></div>';
  });
  el.innerHTML = html;
}

function startQuestSkipChallenge(wi) {
  var w = _QUEST_WORLDS[wi];
  if (!w.unlockReq) return;
  // 最初のステージのプールで5問テスト
  var testStage = w.stages[0];
  _questG.worldIdx=wi; _questG.stageIdx=0;
  _questG.thisWrong=0; _questG.thisMiss=0;
  _questG.totalWrong=0; _questG.totalMiss=0;
  _questG.qCount=0; _questG.qCorrect=0; _questG.qStreak=0;
  _questG.stageCleared=false; _questG.chain=[];
  _questG.skezuriSetup=null;
  _questG.skipUnlockReq = w.unlockReq;
  _questG.weaknessMode=false;
  _questG.realThrowMode = _questRealThrowEnabled();
  _questG.realDart=null; _questG.qThrowAttempts=0; _questG.qThrowHit=0;
  _questG.pool = _arrShuffle(_questPool(testStage.pool));
  _questG.poolIdx = 0;

  document.getElementById('arr-quest-home').style.display = 'none';
  var playEl = document.getElementById('arr-quest-play');
  playEl.style.display = 'flex';
  var titleEl = document.getElementById('arr-quest-play-title');
  titleEl.textContent = '⚡ 飛び級: '+w.label;
  titleEl.style.color = w.color;
  var hdrEl = playEl.querySelector('.arr-quest-play-hdr');
  hdrEl.classList.remove('boss-hdr'); titleEl.classList.remove('boss-title');
  document.getElementById('quest-throw-overlay').classList.add('hide');
  document.getElementById('quest-real-overlay').classList.add('hide');
  document.getElementById('arr-quest-result').className = 'arr-quest-result hide';
  document.getElementById('quest-boss-intro').classList.add('hide');
  document.getElementById('quest-boss-defeated').className = 'quest-boss-defeated hide';
  _updateModeBadge();
  _questNextScore();
}

function startQuestStage(wi, si) {
  if (!_questIsUnlocked(_QUEST_WORLDS[wi].stages[si].id)) return;
  _questG.worldIdx=wi; _questG.stageIdx=si;
  _questG.thisWrong=0; _questG.thisMiss=0;
  _questG.totalWrong=0; _questG.totalMiss=0;
  _questG.qCount=0; _questG.qCorrect=0; _questG.qStreak=0;
  _questG.stageCleared=false; _questG.chain=[];
  _questG.skezuriSetup=null; _questG.skipUnlockReq=null; _questG.wrongCorrect=null;
  _questG.weaknessMode = false;
  _questG.realThrowMode = _questRealThrowEnabled();
  _questG.realDart=null; _questG.qThrowAttempts=0; _questG.qThrowHit=0;
  var stage = _QUEST_WORLDS[wi].stages[si];
  _questG.pool = _arrShuffle(_weaknessWeightedPool(_questPool(stage.pool)));
  _questG.poolIdx = 0;

  document.getElementById('arr-quest-home').style.display = 'none';
  var playEl = document.getElementById('arr-quest-play');
  playEl.style.display = 'flex';
  var titleEl = document.getElementById('arr-quest-play-title');
  titleEl.textContent = _QUEST_WORLDS[wi].label+' / '+stage.label;
  // A: ワールドテーマカラーをタイトルに適用
  titleEl.style.color = _QUEST_WORLDS[wi].color;
  // D: ボス戦ヘッダー演出
  var hdrEl = playEl.querySelector('.arr-quest-play-hdr');
  if (stage.isBoss) { hdrEl.classList.add('boss-hdr'); titleEl.classList.add('boss-title'); }
  else { hdrEl.classList.remove('boss-hdr'); titleEl.classList.remove('boss-title'); }
  document.getElementById('quest-throw-overlay').classList.add('hide');
  document.getElementById('quest-real-overlay').classList.add('hide');
  document.getElementById('arr-quest-result').className = 'arr-quest-result hide';
  document.getElementById('quest-boss-intro').classList.add('hide');
  document.getElementById('quest-boss-defeated').className = 'quest-boss-defeated hide';
  _updateModeBadge();
  // D: ボス戦イントロ
  if (stage.isBoss) {
    var introEl = document.getElementById('quest-boss-intro');
    document.getElementById('quest-boss-intro-sub').textContent = stage.label;
    introEl.classList.remove('hide');
    setTimeout(function(){ introEl.classList.add('hide'); _questNextScore(); }, 1800);
  } else {
    _questNextScore();
  }
}

function _questNextScore() {
  var stage = _QUEST_WORLDS[_questG.worldIdx].stages[_questG.stageIdx];
  var cond = _questG.weaknessMode ? {type:'count',n:20,minAcc:0}
    : _questG.skipUnlockReq ? {type:'count',n:5,minAcc:0.8} : stage.cond;
  // Check completion
  if (cond.type==='clear' && _questG.stageCleared) { _questShowResult(true); return; }
  if (cond.type==='streak' && _questG.qStreak>=cond.n) { _questShowResult(true); return; }
  if (cond.type==='count' && _questG.qCount>=cond.n) {
    var acc = _questG.qCount>0 ? _questG.qCorrect/_questG.qCount : 0;
    _questShowResult(acc>=(cond.minAcc||0)); return;
  }
  // Pick score
  if (_questG.poolIdx >= _questG.pool.length) {
    _questG.pool = _questG.weaknessMode
      ? _arrShuffle(_questG.pool.slice())
      : _arrShuffle(_weaknessWeightedPool(_questPool(stage.pool)));
    _questG.poolIdx = 0;
  }
  var score = _questG.pool[_questG.poolIdx++];
  var path = _getPath(score);
  if (!path) {
    if (stage.isSkezuri && _SKEZURI_DATA[score]) {
      // 削りラウンド: フィニッシュ不可点数のセットアップ問題
      _questG.currentScore = score;
      _questG.dartNum = 1;
      _questG.chain = [];
      _questG.thisWrong = 0;
      _questG.thisMiss = 0;
      _questG.skezuriSetup = _SKEZURI_DATA[score];
      document.getElementById('arr-quest-score-num').textContent = score;
      document.getElementById('arr-quest-score-num').style.color = '#ff9800';
      document.getElementById('arr-quest-chain').innerHTML = '';
      document.getElementById('quest-throw-overlay').classList.add('hide');
      document.getElementById('arr-quest-bogey-msg').className = 'arr-quest-bogey-msg hide';
      document.getElementById('arr-quest-q-area').style.display = '';
      _questUpdateProgress();
      _questShowSkezuriQ();
      return;
    }
    _questNextScore(); return;
  }

  _questG.currentScore = score;
  _questG.dartNum = 1;
  _questG.chain = [];
  _questG.thisWrong = 0;
  _questG.thisMiss = 0;
  _questG.skezuriSetup = null;

  document.getElementById('arr-quest-score-num').textContent = score;
  document.getElementById('arr-quest-score-num').style.color = '';
  document.getElementById('arr-quest-chain').innerHTML = '';
  document.getElementById('quest-throw-overlay').classList.add('hide');
  document.getElementById('arr-quest-bogey-msg').className = 'arr-quest-bogey-msg hide';
  document.getElementById('arr-quest-q-area').style.display = '';
  _questUpdateProgress();
  _questShowDartQ();
}

function _questUpdateProgress() {
  var stage = _QUEST_WORLDS[_questG.worldIdx].stages[_questG.stageIdx];
  var cond = _questG.skipUnlockReq ? {type:'count',n:5,minAcc:0.8} : stage.cond;
  var wrap = document.getElementById('quest-progress-bar-wrap');
  var pct = 0, label = '', accTxt = '';
  if (cond.type==='streak') {
    pct = cond.n > 0 ? Math.min(100, Math.round(_questG.qStreak / cond.n * 100)) : 0;
    label = '連続 ' + _questG.qStreak + '/' + cond.n;
  } else if (cond.type==='count') {
    pct = cond.n > 0 ? Math.min(100, Math.round(_questG.qCount / cond.n * 100)) : 0;
    label = _questG.qCount + '/' + cond.n + '問';
    var acc = _questG.qCount > 0 ? Math.round(_questG.qCorrect / _questG.qCount * 100) : 0;
    var accColor = acc >= 80 ? '#66bb6a' : acc >= 60 ? '#ff9800' : '#ef5350';
    accTxt = '<span class="quest-progress-acc" style="color:'+accColor+';">' + (_questG.qCount>0 ? acc+'%' : '-') + '</span>';
  } else {
    pct = _questG.stageCleared ? 100 : 50;
    label = _questG.stageCleared ? '✓ クリア' : '挑戦中';
  }
  var fillCls = pct >= 70 ? 'high' : pct >= 40 ? 'mid' : 'low';
  wrap.innerHTML = '<div class="quest-progress-bar">'
    + '<span class="quest-progress-txt">' + label + '</span>'
    + '<div class="quest-progress-bar-track"><div class="quest-progress-bar-fill '+fillCls+'" style="width:'+pct+'%;"></div></div>'
    + accTxt + '</div>';
}

function _questShowDartQ() {
  var path = _getPath(_questG.currentScore);
  if (!path) {
    // Bogey or no checkout
    document.getElementById('arr-quest-q-area').style.display = 'none';
    var bogeyEl = document.getElementById('arr-quest-bogey-msg');
    bogeyEl.textContent = '残り '+_questG.currentScore+' — チェックアウト不可！';
    bogeyEl.className = 'arr-quest-bogey-msg';
    _questG.qCount++;
    _questG.qStreak = 0;
    setTimeout(function() {
      bogeyEl.className = 'arr-quest-bogey-msg hide';
      document.getElementById('arr-quest-q-area').style.display = '';
      _questG.chain = []; _questG.thisWrong = 0; _questG.thisMiss = 0;
      _questNextScore();
    }, 1500);
    return;
  }
  _questG.path = path;
  var nLeft = path.length;
  var label = _questG.dartNum+'本目は何を狙う？';
  if (nLeft===1) label = _questG.dartNum+'本目でフィニッシュ！何を狙う？';
  else label = _questG.dartNum+'本目は？（あと'+nLeft+'本でフィニッシュ可能）';
  document.getElementById('arr-quest-q-label').textContent = label;

  var correct = path[0];
  var pool;
  if (correct==='Bull'||correct==='D-BULL') pool=["Bull","T20","T19","T18","D20","S-BULL"];
  else if (correct[0]==='T') pool=_ARR_TRIPLE_POOL;
  else if (correct[0]==='D') pool=_ARR_DOUBLE_POOL;
  else pool=_ARR_SINGLE_POOL;
  var decoys = _arrShuffle(pool.filter(function(d){return d!==correct;})).slice(0,3);
  var choices = _arrShuffle([correct].concat(decoys));

  var el = document.getElementById('arr-quest-choices');
  el.innerHTML = '';
  choices.forEach(function(val) {
    var btn = document.createElement('button');
    // A: タイプ別ボーダー色
    var tc = val==='Bull'||val==='D-BULL'||val==='S-BULL' ? 'type-bull'
      : val[0]==='T' ? 'type-t' : val[0]==='D' ? 'type-d' : 'type-s';
    btn.className = 'arr-quest-choice ' + tc;
    btn.textContent = val;
    btn.onclick = function() { _questChoose(val, correct); };
    el.appendChild(btn);
  });
}

function _questChoose(chosen, correct) {
  var isCorrect = chosen === correct;
  // ボタンの視覚フィードバック
  document.querySelectorAll('.arr-quest-choice').forEach(function(b) {
    b.classList.add('disabled');
    if (b.textContent===correct) b.classList.add('correct');
    else if (b.textContent===chosen && !isCorrect) b.classList.add('wrong-ans');
  });
  if (!isCorrect) {
    _questG.thisWrong++;
    _questG.totalWrong++;
  }
  _weaknessRecord(_questG.currentScore, isCorrect);
  _questG.wrongCorrect = isCorrect ? null : correct;
  if (!isCorrect) sfxWrong();
  if (_questG.realThrowMode) {
    // 実投モード: 正解ダーツを表示して投げさせる
    var delay = isCorrect ? 250 : 700;
    setTimeout(function(){ _questShowRealThrow(correct, isCorrect); }, delay);
    return;
  }
  setTimeout(function() { _questShowThrow(chosen); }, isCorrect ? 250 : 600);
}

function _questOutcome(dartStr, result) {
  // 削りラウンド: カウント済み（_questChooseSkezuri内）→ メッセージ表示して次へ
  if (_questG.skezuriSetup) {
    var sk = _questG.skezuriSetup;
    _questG.skezuriSetup = null;
    var newScore = _questG.currentScore - result.value;
    if (!result.hit) { _questG.thisMiss++; _questG.totalMiss++; }
    _questG.chain.push({dart:dartStr, val:result.value, hit:result.hit, land:result.land});
    var chainEl = document.getElementById('arr-quest-chain');
    chainEl.innerHTML = _questG.chain.map(function(c){
      var cls='arr-quest-chain-dart '+(c.hit?'hit':'miss');
      var lbl=c.hit?c.dart:(c.dart+'→'+(c.land||'0'));
      return '<span class="'+cls+'">'+lbl+'</span>';
    }).join('');
    var msg = document.getElementById('arr-quest-bogey-msg');
    var leavesPath = newScore>0 ? _getPath(newScore) : null;
    var routeStr = leavesPath ? '（'+leavesPath.slice(0,3).join('→')+'）' : '';
    if (result.hit) {
      msg.textContent = '✓ → 残り '+newScore+'点！'+routeStr;
      msg.style.color = 'var(--acc)';
    } else if (newScore > 0 && leavesPath) {
      msg.textContent = '△ → 残り '+newScore+'点 '+routeStr+' ／ 本来 '+sk.leaves+'点に削る';
      msg.style.color = 'var(--mut)';
    } else {
      msg.textContent = '→ 残り '+(newScore>0?newScore:_questG.currentScore)+'点';
      msg.style.color = 'var(--mut)';
    }
    msg.className = 'arr-quest-bogey-msg';
    document.getElementById('arr-quest-q-area').style.display = 'none';
    _questUpdateProgress();
    setTimeout(function() {
      msg.className = 'arr-quest-bogey-msg hide';
      msg.style.color = '';
      document.getElementById('arr-quest-q-area').style.display = '';
      _questG.chain=[]; _questG.thisWrong=0; _questG.thisMiss=0;
      _questNextScore();
    }, 1800);
    return;
  }

  var prevScore = _questG.currentScore;
  var newScore = prevScore - result.value;
  if (!result.hit) { _questG.thisMiss++; _questG.totalMiss++; }

  // チェーン更新
  _questG.chain.push({ dart:dartStr, val:result.value, hit:result.hit, land:result.land });
  var chainEl = document.getElementById('arr-quest-chain');
  chainEl.innerHTML = _questG.chain.map(function(c){
    var cls = 'arr-quest-chain-dart '+(c.hit?'hit':'miss');
    var lbl = c.hit ? c.dart : (c.dart+'→'+(c.land||'0'));
    return '<span class="'+cls+'">'+lbl+'</span>';
  }).join('');

  _questG.currentScore = newScore;
  _questG.dartNum++;
  var scoreEl = document.getElementById('arr-quest-score-num');

  // B: スコアカウントダウンアニメーション（バスト時はマイナスまで突き抜ける）
  if (newScore > 1 || newScore === 0) {
    _questAnimateScore(prevScore, newScore, scoreEl, 380);
  } else {
    // バスト: マイナス（または1）まで流してからBUST表示
    _questAnimateScore(prevScore, newScore, scoreEl, 450);
  }

  // Success
  if (newScore === 0) {
    _questG.qCount++;
    _questG.qCorrect++;
    var clean = _questG.thisWrong===0 && (_questG.realThrowMode || _questG.thisMiss===0);
    var prevStreak = _questG.qStreak;
    _questG.qStreak = clean ? _questG.qStreak+1 : 0;
    _questG.stageCleared = true;
    setTimeout(function(){
      scoreEl.style.color = '#66bb6a';
      sfxCheckout();
      // A: CHECKOUTフラッシュ
      var fl = document.getElementById('arr-quest-checkout-flash');
      fl.classList.remove('hide','show'); void fl.offsetWidth; fl.classList.add('show');
      setTimeout(function(){ fl.classList.add('hide'); }, 1900);
      // D: ストリークバナー
      if (clean && _questG.qStreak >= 3) { _questShowStreakBanner(_questG.qStreak); sfxStreak(); }
    }, 200);
    _questUpdateProgress();
    setTimeout(function(){
      scoreEl.style.color = '';
      _questG.chain=[]; _questG.thisWrong=0; _questG.thisMiss=0;
      _questNextScore();
    }, 1800);
    return;
  }

  // Bust / negative
  if (newScore < 0 || newScore === 1) {
    _questG.qCount++;
    _questG.qStreak = 0;
    // アニメーション完了後にBUST表示（タメを作る）
    setTimeout(function(){
      scoreEl.style.color = '#ef5350';
      scoreEl.textContent = 'BUST';
    }, 500);
    _questUpdateProgress();
    setTimeout(function(){
      scoreEl.style.color = '';
      _questG.chain=[]; _questG.thisWrong=0; _questG.thisMiss=0;
      _questNextScore();
    }, 1400);
    return;
  }

  // C: 危険スコア（上がれない数字）シェイク
  setTimeout(function(){
    if (newScore > 1 && !_isCheckable(newScore)) {
      scoreEl.classList.remove('score-danger'); void scoreEl.offsetWidth;
      scoreEl.classList.add('score-danger');
      setTimeout(function(){ scoreEl.classList.remove('score-danger'); scoreEl.style.color=''; }, 600);
    }
  }, 350);

  // Continue
  _questUpdateProgress();
  setTimeout(function(){
    document.getElementById('arr-quest-choices').innerHTML = '';
    _questShowDartQ();
  }, 380);
}

function _questCalcStars(cleared) {
  if (!cleared) return 0;
  var stage = _QUEST_WORLDS[_questG.worldIdx].stages[_questG.stageIdx];
  var cond = _questG.skipUnlockReq ? {type:'count',n:5,minAcc:0.8} : stage.cond;
  if (cond.type==='clear') {
    if (_questG.thisWrong===0 && (_questG.realThrowMode || _questG.thisMiss===0)) return 3;
    if (_questG.totalWrong<=1) return 2;
    return 1;
  }
  var acc = _questG.qCount>0 ? _questG.qCorrect/_questG.qCount : 0;
  if (acc >= 0.9) return 3;
  if (acc >= (cond.minAcc||0.7)) return 2;
  return 1;
}

function _questShowResult(cleared) {
  var isSkip = !!_questG.skipUnlockReq;
  var stars = _questCalcStars(cleared);
  var stage = _QUEST_WORLDS[_questG.worldIdx].stages[_questG.stageIdx];

  if (isSkip) {
    // 飛び級チャレンジ結果
    if (cleared) _questSaveProgress(_questG.skipUnlockReq, 1);
    _questG.skipUnlockReq = null;
    var acc = _questG.qCount>0 ? Math.round(_questG.qCorrect/_questG.qCount*100) : 0;
    var w = _QUEST_WORLDS[_questG.worldIdx];
    var icon = cleared ? '⚡' : '💪';
    var titleText = cleared ? '飛び級成功！' : 'あと少し！';
    var titleColor = cleared ? 'var(--acc)' : '#ff9800';
    var sub = _questG.qCount+'問 ／ 正解 '+_questG.qCorrect+'問（'+acc+'%）';
    var html = '<div class="arr-quest-result-icon">'+icon+'</div>';
    html += '<div class="arr-quest-result-title" style="color:'+titleColor+';">'+titleText+'</div>';
    if (cleared) html += '<div class="arr-quest-result-sub" style="color:var(--acc);font-weight:700;">'+w.label+' が解放されました！</div>';
    html += '<div class="arr-quest-result-sub">'+sub+'</div>';
    html += '<div class="arr-quest-result-btns">';
    if (cleared) html += '<button class="arr-step-btn arr-step-btn-primary" onclick="showQuestHome()">ワールドを選ぶ →</button>';
    html += '<button class="arr-step-btn" onclick="startQuestSkipChallenge('+_questG.worldIdx+')">もう一度</button>';
    html += '<button class="arr-step-btn" style="border-color:var(--mut);color:var(--mut);" onclick="showQuestHome()">戻る</button>';
    html += '</div>';
    var el = document.getElementById('arr-quest-result');
    el.innerHTML = html;
    el.className = 'arr-quest-result';
    return;
  }

  if (cleared && !_questG.weaknessMode) _questSaveProgress(stage.id, stars);

  // D: ボスクリア時 BOSS DEFEATED フラッシュ
  if (cleared && stage.isBoss && !_questG.weaknessMode) {
    var bdf = document.getElementById('quest-boss-defeated');
    bdf.className = 'quest-boss-defeated'; void bdf.offsetWidth; bdf.classList.add('show');
    setTimeout(function(){ bdf.className = 'quest-boss-defeated hide'; }, 2200);
  }

  // E: 星アニメーションHTML生成
  var starsHtml = '';
  if (!_questG.weaknessMode) {
    for (var si=1; si<=3; si++) {
      starsHtml += '<span class="quest-result-star'+(si<=stars?'':' empty')+'">'+(si<=stars?'⭐':'☆')+'</span>';
    }
  }
  var acc = _questG.qCount>0 ? Math.round(_questG.qCorrect/_questG.qCount*100) : 0;
  var icon = _questG.weaknessMode ? '🎯' : cleared?(stage.isBoss?'👑':'🎉'):'💪';
  var titleText = _questG.weaknessMode ? '特訓終了！' : cleared?(stage.isBoss?'BOSS DEFEATED!':'クリア！'):'あと少し！';
  var titleColor = _questG.weaknessMode ? '#42a5f5' : cleared?(stage.isBoss?'#ffc107':'#66bb6a'):'#ff9800';
  var sub = _questG.qCount+'問 ／ 正解 '+_questG.qCorrect+'問（'+acc+'%）';
  if (_questG.totalMiss>0) sub += '<br>ミス '+_questG.totalMiss+'回';
  if (_questG.totalWrong>0) sub += '<br>間違い '+_questG.totalWrong+'回';

  // E: ワールドコンプリート検出
  var worldComplete = false;
  if (cleared && !_questG.weaknessMode) {
    var w = _QUEST_WORLDS[_questG.worldIdx];
    worldComplete = w.stages.every(function(s){ return _questGetProgress(s.id).clears > 0; });
  }

  var next = _questNextStage(_questG.worldIdx, _questG.stageIdx);
  var html = '';
  // E: 紙吹雪（3つ星 or ワールドコンプリート）
  if (cleared && (stars >= 3 || worldComplete) && !_questG.weaknessMode) {
    html += '<div class="quest-confetti-wrap" id="quest-confetti-wrap"></div>';
  }
  html += '<div class="arr-quest-result-icon">'+icon+'</div>';
  html += '<div class="arr-quest-result-title" style="color:'+titleColor+';">'+titleText+'</div>';
  html += '<div class="arr-quest-result-stars">'+starsHtml+'</div>';
  // E: WORLD COMPLETE テキスト
  if (worldComplete) {
    html += '<div style="font-family:Bebas Neue,cursive;font-size:24px;letter-spacing:3px;color:#ffc107;margin-bottom:8px;">WORLD COMPLETE!</div>';
  }
  html += '<div class="arr-quest-result-sub">'+sub+'</div>';
  html += '<div class="arr-quest-result-btns">';
  if (_questG.weaknessMode) {
    html += '<button class="arr-step-btn arr-step-btn-primary" onclick="startWeaknessTraining()">もう一度特訓</button>';
    html += '<button class="arr-step-btn" style="border-color:var(--mut);color:var(--mut);" onclick="showQuestWeakness()">弱点分析へ戻る</button>';
  } else {
    if (cleared && next) {
      html += '<button class="arr-step-btn arr-step-btn-primary" onclick="startQuestStage('+next.wi+','+next.si+')">次のステージへ →</button>';
    }
    html += '<button class="arr-step-btn" onclick="startQuestStage('+_questG.worldIdx+','+_questG.stageIdx+')">もう一度</button>';
    html += '<button class="arr-step-btn" style="border-color:var(--mut);color:var(--mut);" onclick="showQuestHome()">ワールド選択へ</button>';
  }
  html += '</div>';

  var el = document.getElementById('arr-quest-result');
  el.innerHTML = html;
  el.className = 'arr-quest-result';
  // E: 紙吹雪スポーン
  if (cleared && (stars >= 3 || worldComplete) && !_questG.weaknessMode) {
    _questSpawnConfetti();
  }
}

/* E: 紙吹雪エフェクト */
function _questSpawnConfetti() {
  var wrap = document.getElementById('quest-confetti-wrap');
  if (!wrap) return;
  var colors = ['#ffc107','#66bb6a','#42a5f5','#ef5350','#e8ff47','#ff9800','#ab47bc'];
  for (var i = 0; i < 40; i++) {
    var c = document.createElement('div');
    c.className = 'quest-confetti';
    c.style.left = Math.random()*100 + '%';
    c.style.background = colors[Math.floor(Math.random()*colors.length)];
    c.style.animationDuration = (1.5 + Math.random()*2) + 's';
    c.style.animationDelay = (Math.random()*0.8) + 's';
    c.style.width = (5 + Math.random()*6) + 'px';
    c.style.height = (5 + Math.random()*6) + 'px';
    wrap.appendChild(c);
  }
}

function _questNextStage(wi, si) {
  if (si+1 < _QUEST_WORLDS[wi].stages.length) return {wi:wi, si:si+1};
  if (wi+1 < _QUEST_WORLDS.length) return {wi:wi+1, si:0};
  return null;
}

/* ===== 実投モード ===== */
function _questRealThrowEnabled() {
  return localStorage.getItem('arr_quest_realthrow') === '1';
}
function setQuestRealThrow(on) {
  localStorage.setItem('arr_quest_realthrow', on ? '1' : '0');
  _questUpdateRealToggleUI();
}
function toggleQuestRealThrow() { setQuestRealThrow(!_questRealThrowEnabled()); }
function _questUpdateRealToggleUI() {
  var on = _questRealThrowEnabled();
  var simBtn = document.getElementById('arr-quest-mode-sim');
  var realBtn = document.getElementById('arr-quest-mode-real');
  if (simBtn) simBtn.className = on ? '' : 'active-sim';
  if (realBtn) realBtn.className = on ? 'active-real' : '';
  var sub = document.getElementById('arr-quest-home-sub');
  if (sub) sub.textContent = on
    ? '🎯 実投モード: 実際に投げて結果を入力 — 知識と実力を両方鍛える!'
    : '🎲 シミュモード: ダーツが飛んでランダムに着弾 — ルートを覚えて正確に!';
}
function _updateModeBadge() {
  var badge = document.getElementById('arr-quest-miss-badge');
  if (!badge) return;
  if (_questG.realThrowMode) {
    badge.textContent = '🎯 実投モード';
    badge.style.color = '#42a5f5';
    badge.style.borderColor = '#42a5f5';
  } else {
    badge.textContent = '🎲 着弾ランダム';
    badge.style.color = '';
    badge.style.borderColor = '';
  }
}
function _questShowRealThrow(dartStr, wasCorrect) {
  _questG.realDart = dartStr;
  var titleEl = document.getElementById('quest-real-title');
  var dartEl  = document.getElementById('quest-real-dart-label');
  var subEl   = document.getElementById('quest-real-sub');
  titleEl.textContent = wasCorrect ? '✓ 正解！' : '✗ 不正解...';
  titleEl.className   = 'quest-real-title ' + (wasCorrect ? 'correct' : 'wrong');
  dartEl.textContent  = dartStr;
  dartEl.className    = 'quest-real-dart-label ' + (wasCorrect ? 'correct' : 'wrong');
  subEl.textContent   = wasCorrect ? '実際に狙ってみましょう' : '正解は ' + dartStr + ' — 練習として狙ってみましょう';
  document.getElementById('quest-real-board-box').innerHTML = _buildBoardSVG(dartStr, null);
  document.getElementById('quest-real-overlay').classList.remove('hide');
}
function _questRealNext() {
  var dartStr = _questG.realDart;
  var pts = _questDartVal(dartStr);
  var result = {hit:true, land:dartStr, value:pts};

  // 実投オーバーレイを隠してシミュレーションと同じ投球アニメを流す
  document.getElementById('quest-real-overlay').classList.add('hide');

  var overlay = document.getElementById('quest-throw-overlay');
  document.getElementById('quest-throw-label').textContent = dartStr + ' を狙う！';
  document.getElementById('quest-throw-result-text').textContent = '';
  document.getElementById('quest-throw-pts').textContent = '';
  document.getElementById('quest-throw-hint').textContent = '';

  var pos = _questDartPos(dartStr);
  var box = document.getElementById('quest-board-box');
  box.innerHTML = _buildBoardSVG(dartStr, null) +
    '<div class="quest-dart-dot" id="quest-dart-dot" style="left:'+pos.x+'px;top:'+pos.y+'px;"></div>';
  overlay.classList.remove('hide');

  requestAnimationFrame(function(){
    var dot = document.getElementById('quest-dart-dot');
    if (dot) { void dot.offsetWidth; dot.classList.add('flying'); }
  });

  setTimeout(function(){
    sfxImpact();
    box.innerHTML = _buildBoardSVG(dartStr, dartStr) +
      '<div class="quest-dart-dot" style="left:'+pos.x+'px;top:'+pos.y+'px;opacity:1;transform:translateY(0) scale(1);"></div>';
    var rEl = document.getElementById('quest-throw-result-text');
    var pEl = document.getElementById('quest-throw-pts');
    rEl.innerHTML = '✓ <span style="color:#66bb6a;">' + dartStr + ' ヒット！</span>';
    pEl.style.color = '#66bb6a';
    pEl.textContent = '−' + pts;
    setTimeout(function(){
      overlay.classList.add('hide');
      _questOutcome(dartStr, result);
    }, 1700);
  }, 680);
}

/* ===== 弱点分析 ===== */
function _weaknessLoad() {
  try { return JSON.parse(localStorage.getItem('arr_weakness_v1') || '{}'); } catch(e) { return {}; }
}
function _weaknessRecord(score, isCorrect) {
  var d = _weaknessLoad();
  if (!d[score]) d[score] = {a:0, c:0};
  d[score].a++;
  if (isCorrect) d[score].c++;
  localStorage.setItem('arr_weakness_v1', JSON.stringify(d));
}
function _weaknessAcc(rec) {
  return rec && rec.a > 0 ? rec.c / rec.a : 1;
}
function _weaknessColor(acc) {
  if (acc < 0.5)  return '#ef5350';
  if (acc < 0.75) return '#ff9800';
  return '#66bb6a';
}
function _weaknessWeightedPool(base) {
  var d = _weaknessLoad();
  var result = [];
  base.forEach(function(s) {
    result.push(s);
    var rec = d[s];
    if (rec && rec.a >= 3) {
      var acc = _weaknessAcc(rec);
      if (acc < 0.5)  result.push(s, s); // 3倍
      else if (acc < 0.75) result.push(s); // 2倍
    }
  });
  return result;
}

function showQuestWeakness() {
  document.getElementById('arr-quest-home').style.display = 'none';
  document.getElementById('arr-quest-weakness').style.display = 'flex';
  _renderWeakness();
}
function _renderWeakness() {
  var d = _weaknessLoad();
  var scores = Object.keys(d).map(Number).filter(function(s){ return d[s].a >= 2; });
  scores.sort(function(a,b){ return _weaknessAcc(d[a]) - _weaknessAcc(d[b]); });
  var el = document.getElementById('arr-quest-weakness-body');
  if (scores.length === 0) {
    el.innerHTML = '<div class="wk-empty">まだデータがありません。<br>クエストを練習すると記録されます。</div>';
    return;
  }
  var weak = scores.filter(function(s){ return _weaknessAcc(d[s]) < 0.75; });
  var html = '';
  // 弱点特訓ボタン
  if (weak.length > 0) {
    html += '<button class="wk-train-btn" onclick="startWeaknessTraining()">🎯 弱点スコアで特訓（'+weak.length+'種）</button>';
  }
  // 苦手スコア
  html += '<div class="wk-section-title">正答率（2回以上練習したスコア）</div>';
  scores.forEach(function(s) {
    var rec = d[s]; var acc = _weaknessAcc(rec);
    var pct = Math.round(acc * 100);
    var col = _weaknessColor(acc);
    var route = (_getPath(s) || []).join('→');
    html += '<div class="wk-score-row">';
    html += '<div class="wk-score-num" style="color:'+col+';">'+s+'</div>';
    html += '<div style="flex:1;">';
    html += '<div class="wk-bar-wrap"><div class="wk-bar" style="width:'+pct+'%;background:'+col+';"></div></div>';
    html += '<div class="wk-route">'+route+'　（'+rec.a+'回中'+rec.c+'回正解）</div>';
    html += '</div>';
    html += '<div class="wk-acc" style="color:'+col+';">'+pct+'%</div>';
    html += '</div>';
  });
  el.innerHTML = html;
}

function startWeaknessTraining() {
  var d = _weaknessLoad();
  var pool = Object.keys(d).map(Number).filter(function(s){
    return d[s].a >= 2 && _weaknessAcc(d[s]) < 0.75 && _isCheckable(s);
  });
  if (pool.length === 0) { alert('弱点スコアがまだありません'); return; }
  // 重みづけ（超苦手は3倍）
  var weighted = [];
  pool.forEach(function(s) {
    var acc = _weaknessAcc(d[s]);
    weighted.push(s);
    if (acc < 0.5) weighted.push(s, s);
    else if (acc < 0.65) weighted.push(s);
  });
  _questG.worldIdx=0; _questG.stageIdx=0;
  _questG.thisWrong=0; _questG.thisMiss=0;
  _questG.totalWrong=0; _questG.totalMiss=0;
  _questG.qCount=0; _questG.qCorrect=0; _questG.qStreak=0;
  _questG.stageCleared=false; _questG.chain=[];
  _questG.skezuriSetup=null; _questG.skipUnlockReq=null; _questG.wrongCorrect=null;
  _questG.pool = _arrShuffle(weighted); _questG.poolIdx = 0;
  _questG.weaknessMode = true;
  _questG.realThrowMode = _questRealThrowEnabled();
  _questG.realDart=null; _questG.qThrowAttempts=0; _questG.qThrowHit=0;

  document.getElementById('arr-quest-weakness').style.display = 'none';
  var playEl = document.getElementById('arr-quest-play');
  playEl.style.display = 'flex';
  document.getElementById('arr-quest-play-title').textContent = '🎯 弱点特訓';
  document.getElementById('quest-throw-overlay').classList.add('hide');
  document.getElementById('quest-real-overlay').classList.add('hide');
  document.getElementById('arr-quest-result').className = 'arr-quest-result hide';
  _updateModeBadge();
  _questNextScore();
}

/* B: スコアカウントダウンアニメーション */
function _questAnimateScore(from, to, el, ms) {
  var start = performance.now();
  var diff = from - to;
  function step(now) {
    var t = Math.min((now - start) / ms, 1);
    el.textContent = Math.round(from - diff * t);
    if (t < 1) requestAnimationFrame(step);
    else el.textContent = to;
  }
  requestAnimationFrame(step);
}

/* D: ストリークバナー表示 */
function _questShowStreakBanner(n) {
  var msgs = {3:'🔥 3連続！', 5:'⚡ 5連続！', 7:'🔥🔥 7連続！', 10:'💥 10連続！！', 15:'👑 15連続！！！', 20:'🏆 20連続！！！'};
  var text = msgs[n] || (n+'連続！🔥');
  var el = document.getElementById('arr-quest-streak-banner');
  el.textContent = text;
  el.classList.remove('hide','show'); void el.offsetWidth; el.classList.add('show');
  setTimeout(function(){ el.classList.add('hide'); }, 2100);
}

/* 削りラウンド: 選択肢表示 */
function _questShowSkezuriQ() {
  var sk = _questG.skezuriSetup;
  var correct = sk.shot;
  document.getElementById('arr-quest-q-label').textContent =
    _questG.currentScore+'点 — 1本目で削る！何を狙う？';
  var decoys = _arrShuffle(_ARR_TRIPLE_POOL.filter(function(d){return d!==correct;})).slice(0,3);
  var choices = _arrShuffle([correct].concat(decoys));
  var el = document.getElementById('arr-quest-choices');
  el.innerHTML = '';
  choices.forEach(function(val) {
    var btn = document.createElement('button');
    btn.className = 'arr-quest-choice';
    btn.textContent = val;
    btn.onclick = function() { _questChooseSkezuri(val, correct); };
    el.appendChild(btn);
  });
}

function _questChooseSkezuri(chosen, correct) {
  var isCorrect = chosen === correct;
  document.querySelectorAll('.arr-quest-choice').forEach(function(b) {
    b.classList.add('disabled');
    if (b.textContent===correct) b.classList.add('correct');
    else if (b.textContent===chosen && !isCorrect) b.classList.add('wrong-ans');
  });
  if (!isCorrect) {
    _questG.thisWrong++;
    _questG.totalWrong++;
  }
  _questG.qCount++;
  if (isCorrect) { _questG.qCorrect++; _questG.qStreak++; }
  else { _questG.qStreak = 0; }
  _questUpdateProgress();
  _questG.wrongCorrect = isCorrect ? null : correct;
  setTimeout(function() { _questShowThrow(chosen); }, isCorrect ? 250 : 600);
}

function quitQuestPlay() {
  document.getElementById('arr-quest-play').style.display = 'none';
  showQuestHome();
}

/* 高速タッチ処理 */
var _fns = { kp: kp, kd: kd, doOk: doOk, commit: commit,
  undoRound: undoRound, resetGame: resetGame,
  goTabGame: function(){ goTab('game'); },
  goSubGame: goSubGame, goSubHist: goSubHist,
  goSub01Game: goSub01Game, goSub01Hist: goSub01Hist, goSub01Arr: goSub01Arr, _z01DelH: _z01DelH,
  goTabArr: function(){ goTab('01'); goSub01Arr(); },
  goTab01: function(){ goTab('01'); },
  z01SetMode: z01SetMode, z01SetLegs: z01SetLegs, z01SetIn: z01SetIn,
  z01SetOut: z01SetOut, z01SetPlayers: z01SetPlayers, z01SetCpu: z01SetCpu,
  z01Start: z01Start, z01Pre: z01Pre, z01Kp: z01Kp, z01Kd: z01Kd, z01Ok: z01Ok,
  z01NextLeg: z01NextLeg, z01ShowResult: z01ShowResult,
  z01Again: z01Again, z01BackSetup: z01BackSetup,
  z01ConfirmExit: z01ConfirmExit, z01ExitNo: z01ExitNo, z01ExitYes: z01ExitYes,
  z01FinishBtn: z01FinishBtn, z01ToggleHint: z01ToggleHint, z01Undo: z01Undo, z01UndoNo: z01UndoNo, z01UndoYes: z01UndoYes,
  z01EditScore: z01EditScore, z01EditKp: z01EditKp, z01EditKd: z01EditKd,
  z01EditOk: z01EditOk, z01EditCancel: z01EditCancel,
  z01FinishDart: z01FinishDart, z01FinishCancel: z01FinishCancel, z01OpenStats: z01OpenStats, z01CloseStats: z01CloseStats,
  toggleScEditor: toggleScEditor, saveScEditor: saveScEditor,
  togglePause: togglePause,
  toggleSound: toggleSound,
  setArrMode: setArrMode,
  setQCount: setQCount,
  startArrSession: startArrSession,
  startArrWeakRetry: startArrWeakRetry,
  startKezuriQuiz: startKezuriQuiz,
  goArrSetup: goArrSetup,
  chooseArr: chooseArr,
  advanceArr: advanceArr,
  showTeiseki: showTeiseki,
  hideTeiseki: hideTeiseki,
  filterTeiseki: filterTeiseki,
  _addUserRoute: _addUserRoute,
  _delUserRoute: _delUserRoute,
  showTraining: showTraining,
  trainBackToMap: trainBackToMap,
  trainContinue: trainContinue,
  trainStart: trainStart,
  trainToggleHint: trainToggleHint,
  trainResult: trainResult,
  trainNext: trainNext,
  trainWeakMode: trainWeakMode,
  trainRetry: trainRetry,
  trainRandom: trainRandom,
  trainPrev: trainPrev,
  showQuestHome: showQuestHome,
  quitQuestPlay: quitQuestPlay,
  shareCU: shareCU, shareZ01: shareZ01, shareSim: shareSim
};

function _exec(el) {
  var fn = el.getAttribute('data-fn');
  var arg = el.getAttribute('data-arg');
  if (!fn || !_fns[fn]) return;
  el.classList.add('pressing');
  setTimeout(function(){ el.classList.remove('pressing'); }, 100);
  if (arg !== null) _fns[fn](parseInt(arg, 10));
  else _fns[fn]();
}

// touchstart: 視覚フィードバックのみ（passive:true、sc-editor中は何もしない）
document.addEventListener('touchstart', function(e) {
  var scEd = document.getElementById('sc-editor');
  if (scEd && scEd.classList.contains('show')) return;
  var el = e.target.closest('[data-fn]');
  if (el) {
    el.classList.add('pressing');
    setTimeout(function(){ el.classList.remove('pressing'); }, 100);
  }
}, {passive: true});

// touchend: ゲームボタンの処理
document.addEventListener('touchend', function(e) {
  var scEd = document.getElementById('sc-editor');
  if (scEd && scEd.classList.contains('show')) {
    // sc-editor内のタッチは通過させる（inputの選択・キーボード操作のため）
    return;
  }
  var el = e.target.closest('[data-fn]');
  if (el) {
    e.preventDefault();
    _exec(el);
  }
}, {passive: false});


document.addEventListener('touchcancel', function(e) {
  document.querySelectorAll('.pressing').forEach(function(el){ el.classList.remove('pressing'); });
}, {passive: true});

// Chrome/マウス用: clickでも同じ処理（touchstart後は_lastTouchでスキップ）
let _lastTouch = 0;
document.addEventListener('touchstart', function(){ _lastTouch = Date.now(); }, {passive: true});
document.addEventListener('click', function(e) {
  if (Date.now() - _lastTouch < 500) return; // touchstart直後のclickは無視
  var el = e.target.closest('[data-fn]');
  if (el) _exec(el);
});

/* Onboarding */
var _obStep = 0;
var _obLevel = -1; // -1 = not selected

function obGoStep(n) {
  var cards = document.querySelectorAll('.ob-card');
  var dots = document.querySelectorAll('.ob-dot');
  for (var i = 0; i < cards.length; i++) {
    if (i === _obStep) {
      cards[i].classList.remove('ob-card-active');
      cards[i].classList.add('ob-card-exit');
    } else {
      cards[i].classList.remove('ob-card-active', 'ob-card-exit');
    }
  }
  for (var j = 0; j < dots.length; j++) {
    dots[j].classList.toggle('on', j === n);
  }
  _obStep = n;
  setTimeout(function() {
    for (var k = 0; k < cards.length; k++) {
      cards[k].classList.remove('ob-card-exit');
      cards[k].classList.toggle('ob-card-active', k === n);
    }
  }, 50);
}

function obSelectLevel(lvl) {
  _obLevel = lvl;
  localStorage.setItem('user_level', String(lvl));
  var btns = document.querySelectorAll('.ob-level-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('selected', Number(btns[i].getAttribute('data-level')) === lvl);
  }
  // Update recommendation card
  var recs = [
    { mode: 'CountUp を始めよう', why: 'まずはスコアを記録して\n自分の実力を把握しましょう！', emoji: '📊' },
    { mode: '01 モードを試そう', why: '501でゲーム感覚を磨きましょう。\nCPU対戦もできます！', emoji: '🎮' },
    { mode: 'アレンジトレーニングへ', why: 'アレンジ力を鍛えて\nフィニッシュ精度を上げましょう！', emoji: '🧠' }
  ];
  var rec = recs[lvl];
  document.getElementById('ob-rec-emoji').textContent = rec.emoji;
  document.getElementById('ob-rec-mode').textContent = rec.mode;
  document.getElementById('ob-rec-why').textContent = rec.why;
  // Auto-advance to step 2
  setTimeout(function() { obGoStep(2); }, 400);
}

function obFinish() {
  closeOnboard();
  // Navigate to recommended tab based on level
  if (_obLevel === 0 || _obLevel === -1) {
    goTab('game');
  } else if (_obLevel === 1) {
    goTab('01');
    goSub01Game();
  } else if (_obLevel === 2) {
    goTab('01');
    setTimeout(function() { goSub01Arr(); }, 100);
  }
}

function closeOnboard() {
  document.getElementById('onboard').classList.remove('show');
  localStorage.setItem('ob_done', '1');
}

function gameStart() {
  var gs = document.getElementById('game-start');
  if (gs) gs.classList.add('hide');
  startTimer();
  // 既存ユーザーのXPブートストラップ（初回のみ）
  if (!localStorage.getItem('xp_bootstrapped') && typeof _addXP === 'function') {
    localStorage.setItem('xp_bootstrapped', '1');
    var t = getTotals();
    if (t.games > 0) {
      var bootXP = t.games * 10 + Math.floor((t.best || 0) / 50);
      _addXP(bootXP, 'ブートストラップ');
    }
  }
}

/* Init */
buildScRow();
drawDots();
drawRoundGrid();
updDisp();
(function(){ var btn = document.getElementById('btn-snd'); if (btn) btn.textContent = _sndOn ? '🔊' : '🔇'; })();

// イベントリスナー登録（onclick属性の代替）
document.getElementById('gs-btn').addEventListener('click', gameStart);
document.getElementById('ob-skip').addEventListener('click', function() { closeOnboard(); goTab('game'); });
document.getElementById('ob-next-0').addEventListener('click', function() { obGoStep(1); });
document.getElementById('ob-go').addEventListener('click', obFinish);
(function() {
  var lvlBtns = document.querySelectorAll('.ob-level-btn');
  for (var i = 0; i < lvlBtns.length; i++) {
    lvlBtns[i].addEventListener('click', function() { obSelectLevel(Number(this.getAttribute('data-level'))); });
  }
})();
document.getElementById('ngp-no').addEventListener('click', ngpNo);
document.getElementById('ngp-yes').addEventListener('click', ngpYes);
document.getElementById('ct-score').addEventListener('click', function(){ switchChart('score'); });
document.getElementById('ct-avg').addEventListener('click', function(){ switchChart('avg'); });
document.getElementById('ct-time').addEventListener('click', function(){ switchChart('time'); });
document.getElementById('btn-export').addEventListener('click', exportData);
document.getElementById('btn-import').addEventListener('click', triggerImport);
document.getElementById('btn-clr').addEventListener('click', openCfm);
document.getElementById('rb-new').addEventListener('click', startNew);
document.getElementById('bx-share').addEventListener('click', shareX);
document.getElementById('rb-share-img').addEventListener('click', shareCU);
document.getElementById('rb-hist').addEventListener('click', goHist);
document.getElementById('cfm-cancel').addEventListener('click', closeCfm);
document.getElementById('cfm-ok').addEventListener('click', delAll);
document.getElementById('undo-cancel').addEventListener('click', closeUndo);
document.getElementById('undo-ok').addEventListener('click', doUndo);
document.getElementById('reset-cancel').addEventListener('click', closeReset);
document.getElementById('reset-ok').addEventListener('click', doReset);
// タイマーはゲームスタートボタンで開始
// 初回のみオンボーディング表示
if (!localStorage.getItem('ob_done')) {
  document.getElementById('onboard').classList.add('show');
  // オンボーディング中はゲームスタート画面を隠す
  document.getElementById('game-start').classList.add('hide');
} else {
  // 2回目以降：ゲームスタートボタンを表示（タイマー未開始状態）
}
// インポートinputのchangeイベント設定
var impFile = document.getElementById('imp-file');
if (impFile) {
  impFile.addEventListener('change', function(){ importData(this); });
}
// 01 export/import（innerHTML再生成後も動くようデリゲーション）
var v01hist = document.getElementById('v01-hist-wrap');
if (v01hist) {
  v01hist.addEventListener('click', function(e){
    var t = e.target;
    if (t.id === 'btn-z01-export') exportZ01Data();
    if (t.id === 'btn-z01-import') triggerImportZ01();
  });
}
var impZ01File = document.getElementById('imp-z01-file');
if (impZ01File) impZ01File.addEventListener('change', function(){ importZ01Data(this); });
// 目標スコアをlocalStorageと同期（ピルボタン）
function gsSetGoal(val) {
  localStorage.setItem('cu_goal', String(val));
  document.querySelectorAll('.gs-goal-pill').forEach(function(b){
    b.classList.toggle('on', parseInt(b.getAttribute('data-val'),10) === val);
  });
}
(function(){
  var saved = parseInt(localStorage.getItem('cu_goal') || '0', 10);
  gsSetGoal(saved);
})();
// スタート画面にベストスコアを表示
(function(){
  var gb = document.getElementById('gs-best');
  if (!gb) return;
  try {
    var t = JSON.parse(localStorage.getItem('dh_totals')||'{}');
    var xd = typeof _getXP === 'function' ? _getXP() : {level:1,xp:0};
    var info = '';
    if (t.best) info = 'PERSONAL BEST ' + t.best + ' | ' + t.games + ' GAMES';
    if (xd.level > 1) info += ' | LV.' + xd.level;
    gb.textContent = info;
  } catch(e){}
})();
// Service Worker 登録（新バージョン検出時に自動リロード）
if ('serviceWorker' in navigator && !location.search.includes('nosw')) {
  navigator.serviceWorker.register('./sw.js').then(function(reg) {
    reg.addEventListener('updatefound', function() {
      var newSW = reg.installing;
      if (!newSW) return;
      newSW.addEventListener('statechange', function() {
        if (newSW.state === 'activated') {
          // 新しいSWが有効になったらページをリロードして最新コードを読み込む
          location.reload();
        }
      });
    });
  }).catch(function(){});
}

// ====== 今日の一言（起動時ランダム削り戦術tips）======
(function(){
  var tips = [
    '💡 ボギーナンバー（159・162・163・165・166・168・169）は3本で上がれないスコア。出したら即アレンジし直し！',
    '💡 192・195はT20を狙うよりS-BULL（25）を狙って167・170残しを作ると上がりやすい。',
    '💡 300〜309点台はT20×3本で140点取るとボギー圏に落ちる。1本目からT19かT18に切り替えよう。',
    '💡 275〜271帯はS-BULL（25）でつないで167か170残し。ブルエリアは的が広く期待値が高い！',
    '💡 220〜229帯でT20に入ると（60点取ると）→ 162〜169のボギーナンバーに一直線。注意！',
    '💡 170はT20→T20→D-BULLで上がれる唯一の3桁チェックアウト。会場が沸く最高の一手。',
    '💡 501はT20ファースト。310点まではT20一択。外れてもS20ならボギーにならない。',
    '💡 260〜270帯は1本目で下の桁を調整してT20+S+25で167か170残しを作るのが理想。',
    '💡 296〜300残りのとき、最後の1本でS-BULL（25）を狙えば271〜275帯に収まる。次のターンが楽になる！',
    '💡 上がり目は170以下。でも161〜170はD-BULL必須の最高難度。落ち着いてアレンジを確認しよう。'
  ];
  var today = new Date().toDateString();
  var lastShown = localStorage.getItem('tip_last_date');
  if (lastShown === today) return; // 1日1回のみ
  localStorage.setItem('tip_last_date', today);
  var tip = tips[Math.floor(Math.random() * tips.length)];
  var el = document.getElementById('daily-tip-toast');
  if (!el) return;
  el.innerHTML = tip;
  el.classList.add('show');
  setTimeout(function(){ el.classList.remove('show'); }, 5000);
})();

// ====== PWAインストール促進バナー ======
(function(){
  var deferredPrompt = null;
  var banner = document.getElementById('pwa-banner');
  if (!banner) return;
  var dismissed = localStorage.getItem('pwa_banner_dismissed');
  if (dismissed) return;
  window.addEventListener('beforeinstallprompt', function(e){
    e.preventDefault();
    deferredPrompt = e;
    banner.style.display = 'flex';
  });
  var installBtn = document.getElementById('pwa-install-btn');
  var dismissBtn = document.getElementById('pwa-dismiss-btn');
  if (installBtn) installBtn.addEventListener('click', function(){
    banner.style.display = 'none';
    if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt = null; }
  });
  if (dismissBtn) dismissBtn.addEventListener('click', function(){
    banner.style.display = 'none';
    localStorage.setItem('pwa_banner_dismissed', '1');
  });
})();
