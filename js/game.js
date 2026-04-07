/* ===== GAME LOGIC ===== */
const ROUNDS = 8;
let g = { round: 1, scores: [], total: 0 };
let buf = '';
let _gameStartTime = null;
let _timerInterval = null;
let _pausedElapsed = 0;
let _timerPaused = false;

function startTimer() {
  _pausedElapsed = 0;
  _timerPaused = false;
  _gameStartTime = Date.now();
  if (_timerInterval) clearInterval(_timerInterval);
  _timerInterval = setInterval(function() {
    if (_timerPaused) return;
    var el = document.getElementById('timer-disp');
    if (!el) return;
    var sec = _pausedElapsed + Math.floor((Date.now() - _gameStartTime) / 1000);
    var m = Math.floor(sec / 60), s = sec % 60;
    el.textContent = m + ':' + (s < 10 ? '0' : '') + s;
  }, 1000);
  var pb = document.getElementById('bpause');
  if (pb) { pb.className = 'bpause show'; pb.textContent = '⏸'; }
}

function stopTimer() {
  if (_timerInterval) { clearInterval(_timerInterval); _timerInterval = null; }
  var elapsed = _timerPaused
    ? _pausedElapsed
    : (_gameStartTime ? _pausedElapsed + Math.round((Date.now() - _gameStartTime) / 1000) : 0);
  _gameStartTime = null;
  _timerPaused = false;
  _pausedElapsed = 0;
  var el = document.getElementById('timer-disp');
  if (el) el.textContent = '';
  var pb = document.getElementById('bpause');
  if (pb) { pb.className = 'bpause'; pb.textContent = '⏸'; }
  return elapsed;
}

function togglePause() {
  var pb = document.getElementById('bpause');
  var el = document.getElementById('timer-disp');
  if (_timerPaused) {
    _gameStartTime = Date.now();
    _timerPaused = false;
    if (pb) { pb.className = 'bpause show'; pb.textContent = '⏸'; }
  } else {
    _pausedElapsed += Math.round((Date.now() - _gameStartTime) / 1000);
    _timerPaused = true;
    if (pb) { pb.className = 'bpause show paused'; pb.textContent = '▶'; }
  }
}

/* Round grid */
function drawRoundGrid() {
  var el = document.getElementById('rgrid');
  if (!el) return;
  el.innerHTML = '';
  for (var i = 1; i <= ROUNDS; i++) {
    var cell = document.createElement('div');
    var isDone = i <= g.scores.length;
    var isNow = i === g.round && !isDone;
    cell.className = 'rcell' + (isNow ? ' now-cell' : '');
    var score = isDone ? g.scores[i-1] : '—';
    cell.innerHTML = '<div class="rn">R'+i+'</div><div class="rv'+(isDone?' done':'')+'">'+score+'</div>';
    el.appendChild(cell);
  }
}

/* Dots */
function drawDots() {
  var el = document.getElementById('dots');
  el.innerHTML = '';
  for (var i = 1; i <= ROUNDS; i++) {
    var d = document.createElement('div');
    d.className = 'dot' + (i < g.round ? ' done' : i === g.round ? ' now' : '');
    d.textContent = i;
    el.appendChild(d);
  }
}

/* Commit round */
function commit(total) {
  if (g.scores.length >= ROUNDS) return;
  // タイマーが未開始の場合のみ開始（resetStateで既に開始済みの場合はスキップ）
  if (g.scores.length === 0 && !_gameStartTime) startTimer();
  g.scores.push(total);
  g.total += total;
  buf = '';
  if (total === 180) { sound180(); show180(); setTimeout(launchConfetti, 150); }
  else { soundCommit(total); }
  showRoundPopup(total);
  var el = document.getElementById('total');
  el.textContent = g.total;
  el.classList.add('bump');
  setTimeout(function(){ el.classList.remove('bump'); }, 200);
  drawRoundGrid();
  var cells = document.querySelectorAll('.rcell');
  var justDone = cells[g.scores.length - 1];
  if (justDone) { justDone.classList.add('flash'); setTimeout(function(){ justDone.classList.remove('flash'); }, 600); }
  document.getElementById('bok').className = 'tk enter';
  updDisp();
  // undoボタンを表示（1ラウンド目完了後から）
  var ub = document.getElementById('bundo');
  if (ub) ub.className = g.scores.length >= 1 ? 'bundo show' : 'bundo';

  if (g.round >= ROUNDS) { setTimeout(showResult, 400); return; }
  g.round++;
  var rnEl = document.getElementById('rnum');
  if (g.round === ROUNDS) {
    rnEl.innerHTML = '<span style="color:var(--acc2);animation:pd 1.2s infinite;letter-spacing:1px;">FINAL</span>';
    var tf = document.getElementById('toast-final');
    if (tf) { tf.classList.add('show'); setTimeout(function(){ tf.classList.remove('show'); }, 2200); }
  } else {
    rnEl.innerHTML = g.round + ' <em>/ 8</em>';
  }
  drawDots();
  updatePace();
}

/* Tenkey */
function kp(d) {
  var n = buf + String(d);
  if (n.length > 3 || parseInt(n, 10) > 180) return;
  buf = n; updDisp(); soundTap();
}
function kd() { buf = buf.slice(0, -1); updDisp(); soundDel(); }
function doOk() {
  if (!buf) return;
  var v = parseInt(buf, 10);
  if (isNaN(v) || v < 0 || v > 180) return;
  commit(v);
}
function miss() { buf = ''; commit(0); }
function updDisp() {
  var ve = document.getElementById('tkv');
  var he = document.getElementById('tkh');
  var be = document.getElementById('bok');
  if (!buf) {
    ve.textContent = '—'; ve.className = 'tkv empty';
    he.textContent = '合計点を入力してください';
    be.className = 'tk enter';
  } else {
    var v = parseInt(buf, 10);
    var ok = !isNaN(v) && v >= 0 && v <= 180;
    ve.textContent = buf; ve.className = 'tkv';
    he.textContent = ok ? ('= ' + v + ' pt') : '⚠ 0〜180で入力';
    be.className = ok ? 'tk enter ready' : 'tk enter';
  }
}

/* Undo last round */
function undoRound() {
  if (g.scores.length === 0) return;
  var prevRound = g.scores.length;
  var prevScore = g.scores[g.scores.length - 1];
  var msg = 'R' + prevRound + ' の ' + prevScore + ' pt を取り消して入力し直しますか？';
  document.getElementById('undo-msg').textContent = msg;
  document.getElementById('oundo').classList.add('show');
}
function closeUndo() {
  document.getElementById('oundo').classList.remove('show');
}
function doUndo() {
  closeUndo();
  if (g.scores.length === 0) return;
  var last = g.scores.pop();
  g.total -= last;
  g.round = g.scores.length + 1;
  buf = '';
  var rp = document.getElementById('round-popup');
  if (rp) rp.innerHTML = '';
  document.getElementById('total').textContent = g.total;
  var hint = document.getElementById('total-hint');
  if (hint && g.total > 0) hint.classList.add('hide');
  drawRoundGrid();
  document.getElementById('rnum').innerHTML = g.round + ' <em>/ 8</em>';
  document.getElementById('bok').className = 'tk enter';
  var ub = document.getElementById('bundo');
  if (ub) ub.className = g.scores.length >= 1 ? 'bundo show' : 'bundo';
  updDisp();
  drawDots();
}

/* Rank */
function rank(s) {
  if (s>=1000) return 'S+'; if (s>=800) return 'S'; if (s>=700) return 'A+';
  if (s>=600) return 'A'; if (s>=500) return 'B+'; if (s>=400) return 'B';
  if (s>=300) return 'C'; return 'D';
}

/* Pace */
function updatePace() {
  var pb = document.getElementById('pace-bar');
  if (!pb) return;
  if (g.scores.length < 3) { pb.style.display = 'none'; return; }
  // このペースで行くと最終スコアは？
  var avg = g.total / g.scores.length;
  var pred = Math.round(avg * ROUNDS);
  var predRank = rank(pred);
  // 自己ベストを取得
  var h = getH();
  var best = 0;
  for (var i=0; i<h.length; i++) if(h[i].score > best) best = h[i].score;
  var pbText = 'このペース → 予測 <strong style="color:var(--acc);font-size:13px;">' + pred + '点</strong> <span style="color:var(--mut);">(' + predRank + 'ランク)</span>';
  if (best > 0) {
    if (pred > best) {
      pbText += ' <span style="color:#ff6b35;font-weight:bold;">🔥 自己ベスト更新ペース！</span>';
    } else {
      pbText += ' <span style="color:var(--mut);">自己ベスト:' + best + '点</span>';
    }
  }
  // 目標スコア進捗
  var goal = parseInt(localStorage.getItem('cu_goal') || '0', 10);
  if (goal > 0) {
    var pct = Math.min(100, Math.round(pred / goal * 100));
    var goalColor = pct >= 100 ? '#66bb6a' : pct >= 80 ? '#ffd54f' : '#ff6b6b';
    pbText += '<div style="margin-top:4px;display:flex;align-items:center;gap:6px;">'
      + '<span style="font-size:10px;color:var(--mut);">目標 ' + goal + '点</span>'
      + '<div style="flex:1;background:rgba(255,255,255,0.08);border-radius:4px;height:5px;overflow:hidden;">'
      + '<div style="width:' + pct + '%;height:100%;background:' + goalColor + ';border-radius:4px;transition:width 0.4s;"></div>'
      + '</div>'
      + '<span style="font-size:10px;color:' + goalColor + ';font-weight:700;">' + pct + '%</span>'
      + '</div>';
  }
  pb.innerHTML = pbText;
  pb.style.display = 'block';
}

/* Result */
function showResult() {
  var h = getH();
  var pb = getTotals().best || 0;
  for (var i=0;i<h.length;i++) if(h[i].score>pb) pb=h[i].score;
  var isPB = g.total > pb;
  // 本日のベスト判定（保存前に今日のスコアを取得）
  var todayStr = localDateStr(new Date());
  var todayBest = 0;
  for (var i=0;i<h.length;i++) {
    if (h[i].date && localDateStr(new Date(h[i].date)) === todayStr && h[i].score > todayBest) todayBest = h[i].score;
  }
  var isDB = !isPB && g.total > todayBest; // 自己ベストでないが本日ベスト
  var elapsed = stopTimer();
  saveH({ score: g.total, rounds: g.scores.slice(), date: new Date().toISOString(), duration: elapsed });
  // Score countup animation
  var _scoreTarget = g.total;
  var _scoreEl = document.getElementById('rscore');
  _scoreEl.textContent = '0';
  _scoreEl.classList.remove('animate');
  void _scoreEl.offsetWidth;
  _scoreEl.classList.add('animate');
  var _scStart = Date.now(), _scDur = 700;
  (function _countUp() {
    var p = Math.min((Date.now() - _scStart) / _scDur, 1);
    var e = 1 - Math.pow(1 - p, 3);
    _scoreEl.textContent = Math.round(_scoreTarget * e);
    if (p < 1) requestAnimationFrame(_countUp);
    else { _scoreEl.textContent = _scoreTarget; _scoreEl.classList.remove('animate'); }
  })();
  // Rank-based rbox color
  var _rc = rankColor(_scoreTarget);
  var _rbox = document.querySelector('.rbox');
  if (_rbox) { _rbox.style.borderColor = _rc.b; _rbox.style.boxShadow = '0 0 60px ' + _rc.s + ', 0 0 120px ' + _rc.s.replace(/[\d.]+\)$/, function(m){ return (parseFloat(m)*0.35).toFixed(2)+')'; }); }
  // .rt color
  var _rt = document.querySelector('.rt');
  if (_rt) _rt.style.color = _rc.b;
  // Sound
  soundFinish(isPB);
  var tda = (g.total / 8).toFixed(2);
  document.getElementById('ravg').textContent = tda;
  var ravgSub = document.getElementById('ravg-sub');
  if (ravgSub) ravgSub.textContent = '';
  document.getElementById('rbest').textContent = Math.max.apply(null, g.scores);
  document.getElementById('rrank').textContent = rank(g.total);
  var html = '';
  for (var i=0;i<g.scores.length;i++) html += '<div class="rc"><div class="rv">'+g.scores[i]+'</div><div class="rl">R'+(i+1)+'</div></div>';
  document.getElementById('rrounds').innerHTML = html;
  document.getElementById('rpb').style.display = isPB ? 'block' : 'none';
  document.getElementById('rdb').style.display = isDB ? 'block' : 'none';
  // タイム表示をTOTAL SCOREの下に
  var timeEl = document.querySelector('.ovr-time');
  if (!timeEl) {
    timeEl = document.createElement('div');
    timeEl.className = 'ovr-time';
    timeEl.style.cssText = 'font-size:10px;color:var(--mut);letter-spacing:1px;margin-bottom:6px;';
    var scoreEl = document.querySelector('[style*="TOTAL SCORE"]') || document.getElementById('rscore').nextElementSibling;
    if (scoreEl) scoreEl.after(timeEl);
  }
  var em = Math.floor(elapsed/60), es = elapsed%60;
  timeEl.textContent = 'GAME TIME: ' + em + ':' + (es<10?'0':'') + es;
  // 180フラッシュを閉じてから結果画面を表示
  var f180 = document.getElementById('flash-180');
  if (f180) f180.classList.remove('show');
  if (isPB) setTimeout(launchConfetti, 300);
  // 目標スコア達成時の紙吹雪（PBでない場合のみ、PBは既に発射済み）
  if (!isPB) {
    var cuGoal = parseInt(localStorage.getItem('cu_goal') || '0', 10);
    if (cuGoal > 0 && g.total >= cuGoal) setTimeout(launchConfetti, 300);
  }
  document.getElementById('ovr').classList.add('show');
}
function startNew() {
  document.getElementById('ovr').classList.remove('show');
  var _rbox = document.querySelector('.rbox');
  if (_rbox) { _rbox.style.borderColor = ''; _rbox.style.boxShadow = ''; }
  var _rt = document.querySelector('.rt');
  if (_rt) _rt.style.color = '';
  resetState();
}
function shareX() {
  var score = g.total;
  var rnk = rank(score);
  var appUrl = 'https://ricky-ak-180.github.io/steel-darts-countup/';
  var text = 'スティールダーツ カウントアップ\n' +
    'スコア: ' + score + '点\n' +
    'ランク: ' + rnk + '\n' +
    appUrl + '\n' +
    '#スティールダーツ #ダーツ #カウントアップ';
  var url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text);
  window.open(url, '_blank');
}
function goHist() { document.getElementById('ovr').classList.remove('show'); goTab('game'); goSubHist(); }

/* Reset */
function resetState() {
  g = { round: 1, scores: [], total: 0 }; buf = '';
  document.getElementById('total').textContent = '0';
  var hint = document.getElementById('total-hint');
  if (hint) hint.classList.remove('hide');
  drawRoundGrid();
  document.getElementById('rnum').innerHTML = '1 <em>/ 8</em>';
  document.getElementById('bok').className = 'tk enter';
  document.getElementById('ngp').className = 'ngp';
  var ub = document.getElementById('bundo');
  if (ub) ub.className = 'bundo';
  updDisp(); drawDots();
  var rp = document.getElementById('round-popup');
  if (rp) rp.innerHTML = '';
  var pb = document.getElementById('pace-bar');
  if (pb) pb.style.display = 'none';
  stopTimer();
  // タイマーリセット（次のゲーム・もう一度でも即開始）
  startTimer();
}
function resetGame() {
  if (g.scores.length > 0) {
    document.getElementById('oreset').classList.add('show');
  } else {
    resetState();
  }
}
function closeReset() {
  document.getElementById('oreset').classList.remove('show');
}
function doReset() {
  closeReset();
  resetState();
}

/* Next game prompt */
function ngpYes() { resetState(); }
function ngpNo() {
  document.getElementById('ngp').className = 'ngp';
  var ub = document.getElementById('bundo');
  if (ub) ub.className = 'bundo';
}

/* Tabs */
function goSubGame() {
  document.getElementById('cust-game').className = 'cu-subtab on';
  document.getElementById('cust-hist').className = 'cu-subtab';
  document.getElementById('cu-game-wrap').style.display = 'flex';
  document.getElementById('vhist').style.display = 'none';
}
function goSubHist() {
  document.getElementById('cust-game').className = 'cu-subtab';
  document.getElementById('cust-hist').className = 'cu-subtab on';
  document.getElementById('cu-game-wrap').style.display = 'none';
  document.getElementById('vhist').style.display = 'flex';
  document.getElementById('vhist').style.flexDirection = 'column';
  renderHist();
}
function _sub01ShowOnly(id) {
  ['v01-game-wrap','v01-hist-wrap','varr'].forEach(function(el){ var e=document.getElementById(el); if(e) e.style.display='none'; });
  ['sub01-game','sub01-hist','sub01-arr'].forEach(function(el){ var e=document.getElementById(el); if(e) e.className='cu-subtab'; });
  var show = document.getElementById(id); if(show) show.style.display = (id==='v01-game-wrap') ? 'flex' : 'block';
}
function goSub01Game() {
  _sub01ShowOnly('v01-game-wrap');
  document.getElementById('sub01-game').className = 'cu-subtab on';
}
function goSub01Hist() {
  _sub01ShowOnly('v01-hist-wrap');
  document.getElementById('sub01-hist').className = 'cu-subtab on';
  renderZ01Hist();
}
function goSub01Arr() {
  _sub01ShowOnly('varr');
  document.getElementById('sub01-arr').className = 'cu-subtab on';
  if (!_arrInited) { _arrInited = true; initArr(); }
}
function goTab(tab) {
  var tsim=document.getElementById('tsim'); if(tsim) tsim.className='tab'+(tab==='sim'?' on':'');
  var vsim=document.getElementById('vsim'); if(vsim) vsim.className='view'+(tab==='sim'?'':' hide');
  document.getElementById('tgame').className = 'tab' + (tab==='game'?' on':'');
  document.getElementById('t01').className = 'tab' + (tab==='01'?' on':'');
  document.getElementById('vgame').className = 'view' + (tab==='game'?'':' hide');
  document.getElementById('v01').className = 'view' + (tab==='01'?'':' hide');
  if (tab === 'game') {
    goSubGame();
    var rp = document.getElementById('round-popup');
    if (rp) rp.innerHTML = '';
    if (g.scores.length >= ROUNDS) document.getElementById('ngp').className = 'ngp show';
  }
  if (tab === '01') { goSub01Game(); _z01LoadDefaults(); z01SetCpu(_z01.cpuLevel); }
}

/* Storage */
function getH() { try { return JSON.parse(localStorage.getItem('dh')||'[]'); } catch(e){ return []; } }
function localDateStr(d) { return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function getTotals() { try { var t=JSON.parse(localStorage.getItem('dh_totals')||'{"games":0,"play_time":0,"c180":0,"best":0}'); if(!t.best) t.best=0; return t; } catch(e) { return {games:0,play_time:0,c180:0,best:0}; } }
function saveTotals(t) { try { localStorage.setItem('dh_totals', JSON.stringify(t)); } catch(ex) { console.warn('saveTotals failed:', ex); } }
function migrateTotals() { var ex=localStorage.getItem('dh_totals'); if(ex!==null){ try{ var t=JSON.parse(ex); if(!t.best){ var h=getH(); t.best=h.length?Math.max.apply(null,h.map(function(x){return x.score;})):0; saveTotals(t); } } catch(e){} return; } var h=getH(); if(!h.length) return; var t={games:h.length,play_time:0,c180:0,best:0}; for(var i=0;i<h.length;i++){ t.play_time+=(h[i].duration||0); if(h[i].score>t.best) t.best=h[i].score; var r=h[i].rounds||[]; for(var j=0;j<r.length;j++) if(r[j]===180) t.c180++; } saveTotals(t); }
function saveH(e) { try { var h=getH(); h.unshift(e); localStorage.setItem('dh', JSON.stringify(h.slice(0,200))); var t=getTotals(); t.games+=1; t.play_time+=(e.duration||0); if(e.score>t.best) t.best=e.score; var r=e.rounds||[]; for(var i=0;i<r.length;i++) if(r[i]===180) t.c180++; saveTotals(t); } catch(ex) { console.warn('saveH failed:', ex); } }
function openCfm() { document.getElementById('ocfm').classList.add('show'); }
function closeCfm() { document.getElementById('ocfm').classList.remove('show'); }
function delAll() { localStorage.removeItem('dh'); localStorage.removeItem('dh_totals'); closeCfm(); renderHist(); }
function delOne(i) { var h=getH(); var rem=h.splice(i,1)[0]; localStorage.setItem('dh',JSON.stringify(h)); if(rem){ var t=getTotals(); t.games=Math.max(0,t.games-1); t.play_time=Math.max(0,t.play_time-(rem.duration||0)); var r=rem.rounds||[]; for(var j=0;j<r.length;j++) if(r[j]===180) t.c180=Math.max(0,t.c180-1); if(rem.score>=t.best){ t.best=h.length?Math.max.apply(null,h.map(function(x){return x.score;})):0; } saveTotals(t); } renderHist(); }

/* ============================================================
   ショートカットカスタマイズ
   ============================================================ */
const DEFAULT_SC = [140, 100, 85, 81, 60, 45, 41, 26];

function getSC() {
  try {
    var s = localStorage.getItem('dh_sc');
    if (s) {
      var arr = JSON.parse(s);
      if (Array.isArray(arr) && arr.length === 8) return arr;
    }
  } catch(e) {}
  return DEFAULT_SC.slice();
}

function saveSC(arr) {
  localStorage.setItem('dh_sc', JSON.stringify(arr));
}

function buildScRow() {
  var row = document.getElementById('scrow');
  if (!row) return;
  row.innerHTML = '';
  var sc = getSC();
  sc.forEach(function(v) {
    var d = document.createElement('div');
    d.className = 'sc';
    d.setAttribute('data-fn', 'commit');
    d.setAttribute('data-arg', String(v));
    d.textContent = v;
    row.appendChild(d);
  });
}

function toggleScEditor() {
  var ed = document.getElementById('sc-editor');
  var isec = document.getElementById('isec');
  if (!ed) return;
  if (ed.classList.contains('show')) {
    ed.classList.remove('show');
    // isecを元に戻す
    return;
  }
  var sc = getSC();
  var grid = document.getElementById('sc-edit-grid');
  grid.innerHTML = '';
  sc.forEach(function(v, i) {
    var cell = document.createElement('div');
    cell.className = 'sc-edit-cell';
    var inp = document.createElement('input');
    inp.type = 'number';
    inp.min = '0';
    inp.max = '180';
    inp.value = v;
    inp.id = 'sc-inp-' + i;
    inp.addEventListener('focus', function(){ this.select(); });
    // touchstartでfocusを即座に発火させる（長押し不要）
    inp.addEventListener('touchstart', function(e){ e.stopPropagation(); this.focus(); }, {passive: false});
    cell.appendChild(inp);
    grid.appendChild(cell);
  });
  ed.classList.add('show');
  // isecのsc-editor以外をタッチ無効化
  // sc-editorだけ有効に戻す
  setTimeout(function(){
    var first = document.getElementById('sc-inp-0');
    if (first) first.focus();
  }, 100);
}

function saveScEditor() {
  var sc = [];
  for (var i = 0; i < 8; i++) {
    var inp = document.getElementById('sc-inp-' + i);
    var v = parseInt(inp ? inp.value : '0', 10);
    if (isNaN(v) || v < 0 || v > 180) v = DEFAULT_SC[i];
    sc.push(v);
  }
  saveSC(sc);
  buildScRow();
  _z01BuildPresets();
  document.getElementById('sc-editor').classList.remove('show');
  // isecを元に戻す
  var isec = document.getElementById('isec');
  _fns.commit = commit;
}

/* ============================================================
   サウンド
   ============================================================ */
var _actx = null;
var _sndOn = localStorage.getItem('snd') !== '0';
function toggleSound() {
  _sndOn = !_sndOn;
  localStorage.setItem('snd', _sndOn ? '1' : '0');
  var btn = document.getElementById('btn-snd');
  if (btn) btn.textContent = _sndOn ? '🔊' : '🔇';
}
function _ctx() { if (!_actx) { try { _actx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){} } return _actx; }
function _tone(freq, type, dur, vol, delay) {
  var ctx = _ctx(); if (!ctx) return;
  var osc = ctx.createOscillator(); var gain = ctx.createGain();
  osc.connect(gain); gain.connect(ctx.destination);
  osc.type = type || 'sine'; osc.frequency.value = freq;
  var t = ctx.currentTime + (delay || 0);
  gain.gain.setValueAtTime(vol || 0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t); osc.stop(t + dur);
}
function soundTap() { if (!_sndOn) return; _tone(880, 'sine', 0.04, 0.07); }
function soundDel() { if (!_sndOn) return; _tone(420, 'triangle', 0.06, 0.06); }
function soundCommit(score) {
  if (!_sndOn) return;
  if (score === 0) { _tone(220, 'triangle', 0.18, 0.1); return; }
  _tone(660, 'sine', 0.06, 0.12); _tone(880, 'sine', 0.09, 0.1, 0.05);
}
function sound180() {
  if (!_sndOn) return;
  _tone(880, 'sine', 0.1, 0.16); _tone(1109, 'sine', 0.1, 0.16, 0.08);
  _tone(1320, 'sine', 0.12, 0.18, 0.17); _tone(1760, 'sine', 0.14, 0.2, 0.28);
}
function soundFinish(isPB) {
  if (!_sndOn) return;
  if (isPB) {
    _tone(523, 'sine', 0.14, 0.16); _tone(659, 'sine', 0.14, 0.16, 0.12);
    _tone(784, 'sine', 0.14, 0.16, 0.24); _tone(1047, 'sine', 0.28, 0.22, 0.38);
  } else {
    _tone(659, 'sine', 0.14, 0.14); _tone(784, 'sine', 0.18, 0.14, 0.14);
  }
}
function soundLose() {
  if (!_sndOn) return;
  _tone(440, 'sine', 0.16, 0.14); _tone(370, 'sine', 0.18, 0.12, 0.14);
  _tone(294, 'triangle', 0.28, 0.1, 0.30);
}
function soundLegWin() {
  if (!_sndOn) return;
  _tone(784, 'sine', 0.1, 0.14); _tone(1047, 'sine', 0.16, 0.16, 0.1);
}

/* ============================================================
   180 フラッシュ & ラウンドポップアップ
   ============================================================ */
function show180() {
  var el = document.getElementById('flash-180');
  var txt = document.getElementById('flash-180-text');
  if (!el || !txt) return;
  el.classList.remove('show');
  txt.style.animation = 'none';
  void txt.offsetWidth;
  txt.style.animation = '';
  el.classList.add('show');
  setTimeout(function(){ el.classList.remove('show'); }, 1100);
}
function showRoundPopup(score) {
  var el = document.getElementById('round-popup');
  if (!el) return;
  el.innerHTML = '';
  var sp = document.createElement('span');
  sp.className = 'rp-show' + (score === 180 ? ' rp-180' : '');
  sp.textContent = score === 0 ? 'MISS' : '+' + score;
  el.appendChild(sp);
}
function rankColor(score) {
  if (score >= 1000) return { b: '#e8ff47', s: 'rgba(232,255,71,0.45)' };
  if (score >= 800)  return { b: '#4fc3f7', s: 'rgba(79,195,247,0.4)' };
  if (score >= 700)  return { b: '#47ffb4', s: 'rgba(71,255,180,0.38)' };
  if (score >= 600)  return { b: '#ff6b35', s: 'rgba(255,107,53,0.38)' };
  if (score >= 500)  return { b: '#b47fff', s: 'rgba(180,127,255,0.32)' };
  return { b: 'var(--acc)', s: 'rgba(232,255,71,0.15)' };
}

/* ============================================================
   紙吹雪アニメーション
   ============================================================ */
function launchConfetti() {
  var canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  canvas.style.display = 'block';
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  var ctx = canvas.getContext('2d');
  var pieces = [];
  var colors = ['#e8ff47','#ff6b35','#47ffb4','#ff4757','#ffffff','#4fc3f7'];
  for (var i = 0; i < 120; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      w: Math.random() * 10 + 5,
      h: Math.random() * 6 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      angle: Math.random() * 360,
      va: (Math.random() - 0.5) * 6,
    });
  }
  var frame = 0;
  var MAX = 90;
  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(function(p) {
      ctx.save();
      ctx.translate(p.x + p.w/2, p.y + p.h/2);
      ctx.rotate(p.angle * Math.PI / 180);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, 1 - frame/MAX);
      ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
      ctx.restore();
      p.x += p.vx; p.y += p.vy; p.angle += p.va;
    });
    frame++;
    if (frame < MAX) requestAnimationFrame(draw);
    else { ctx.clearRect(0, 0, canvas.width, canvas.height); canvas.style.display = 'none'; }
  }
  draw();
}

/* ============================================================
   スコア推移グラフ
   ============================================================ */
let _chartMode = 'score';

function switchChart(mode) {
  _chartMode = mode;
  document.getElementById('ct-score').className = 'chart-tab' + (mode === 'score' ? ' on-score' : '');
  document.getElementById('ct-avg').className = 'chart-tab' + (mode === 'avg' ? ' on-avg' : '');
  document.getElementById('ct-time').className = 'chart-tab' + (mode === 'time' ? ' on-time' : '');
  drawChart(getH());
}

function drawChart(hist) {
  var wrap = document.getElementById('chart-wrap');
  var canvas = document.getElementById('schart');
  if (!wrap || !canvas) return;
  if (hist.length < 2) { wrap.style.display = 'none'; return; }
  wrap.style.display = 'block';

  // 練習時間モード: 過去30日の日別合計練習時間
  if (_chartMode === 'time') {
    // 過去30日分の日別合計秒数を集計（ローカル時間で統一）
    var dayMap = {};
    for (var i=0; i<hist.length; i++) {
      if (!hist[i].date) continue;
      var hd = new Date(hist[i].date);
      var dkey = hd.getFullYear()+'-'+('0'+(hd.getMonth()+1)).slice(-2)+'-'+('0'+hd.getDate()).slice(-2);
      if (!dayMap[dkey]) dayMap[dkey] = 0;
      if (hist[i].duration) dayMap[dkey] += hist[i].duration;
    }
    // 過去30日分のキーを古い順に生成
    var days = [];
    for (var d=29; d>=0; d--) {
      var dd = new Date(); dd.setDate(dd.getDate()-d);
      var dk = dd.getFullYear()+'-'+(dd.getMonth()<9?'0':'')+(dd.getMonth()+1)+'-'+(dd.getDate()<10?'0':'')+dd.getDate();
      days.push(dk);
    }
    var scores = days.map(function(dk){ return Math.round((dayMap[dk]||0)/60*10)/10; }); // 分単位
    // データが全て0なら表示しない
    var hasData = scores.some(function(s){ return s>0; });
    if (!hasData) { wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';

    var dpr = window.devicePixelRatio || 1;
    var W = canvas.offsetWidth || 300;
    var H = 120;
    canvas.width = W * dpr; canvas.height = H * dpr;
    var ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    var max = Math.max.apply(null, scores) || 1;
    var pad = { top: 10, right: 10, bottom: 20, left: 36 };
    var gw = W - pad.left - pad.right;
    var gh = H - pad.top - pad.bottom;
    // グリッド
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1;
    for (var gi=0; gi<=4; gi++) {
      var gy = pad.top + (gh/4)*gi;
      ctx.beginPath(); ctx.moveTo(pad.left,gy); ctx.lineTo(pad.left+gw,gy); ctx.stroke();
      var lv = Math.round((max - (max/4)*gi) * 10)/10;
      ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='9px sans-serif'; ctx.textAlign='right';
      ctx.fillText(lv+'分', pad.left-4, gy+3);
    }
    // 棒グラフ
    var barW = Math.max(2, gw/30 - 2);
    scores.forEach(function(s, i) {
      if (s <= 0) return;
      var bh = (s/max)*gh;
      var bx = pad.left + (i/(30-1))*gw - barW/2;
      var by = pad.top + gh - bh;
      ctx.fillStyle = 'rgba(71,255,180,0.7)';
      ctx.fillRect(bx, by, barW, bh);
    });
    // X軸ラベル
    ctx.fillStyle='rgba(255,255,255,0.3)'; ctx.font='9px sans-serif'; ctx.textAlign='center';
    [0, 14, 29].forEach(function(i) {
      var d2 = new Date(); d2.setDate(d2.getDate()-(29-i));
      var lbl = (d2.getMonth()+1)+'/'+(d2.getDate());
      ctx.fillText(lbl, pad.left+(i/(30-1))*gw, H-4);
    });
    return;
  }

  var scores;
  if (_chartMode === 'avg') {
    // 直近30ゲーム分、各ゲーム時点での過去10ゲーム移動平均
    var base = hist.slice(0, 30).reverse(); // 古い順に30ゲーム
    scores = base.map(function(h, i) {
      var window10 = base.slice(Math.max(0, i - 9), i + 1);
      var sum = 0;
      for (var j = 0; j < window10.length; j++) sum += window10[j].score;
      return Math.round(sum / window10.length);
    });
  } else {
    scores = hist.slice(0, 30).reverse().map(function(h){ return h.score; });
  }
  var dpr = window.devicePixelRatio || 1;
  var W = canvas.offsetWidth || 300;
  var H = 120;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  var ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  var min = Math.min.apply(null, scores);
  var max = Math.max.apply(null, scores);
  var range = max - min || 1;
  var pad = { top: 10, right: 10, bottom: 20, left: 36 };
  var gw = W - pad.left - pad.right;
  var gh = H - pad.top - pad.bottom;

  // 背景グリッド
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (var g = 0; g <= 4; g++) {
    var gy = pad.top + (gh / 4) * g;
    ctx.beginPath(); ctx.moveTo(pad.left, gy); ctx.lineTo(pad.left + gw, gy); ctx.stroke();
    var lv = Math.round(max - (range / 4) * g);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(lv, pad.left - 4, gy + 3);
  }

  // グラデーション塗り
  var pts = scores.map(function(s, i) {
    return {
      x: pad.left + (i / (scores.length - 1)) * gw,
      y: pad.top + gh - ((s - min) / range) * gh
    };
  });

  var grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + gh);
  var gc = _chartMode === 'avg' ? '255,255,255' : '232,255,71';
  grad.addColorStop(0, 'rgba('+gc+',0.3)');
  grad.addColorStop(1, 'rgba('+gc+',0)');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.top + gh);
  pts.forEach(function(p){ ctx.lineTo(p.x, p.y); });
  ctx.lineTo(pts[pts.length-1].x, pad.top + gh);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 折れ線
  ctx.beginPath();
  ctx.strokeStyle = _chartMode === 'avg' ? '#ffffff' : '#e8ff47';
  ctx.lineWidth = 2;
  pts.forEach(function(p, i){ if (i===0) ctx.moveTo(p.x,p.y); else ctx.lineTo(p.x,p.y); });
  ctx.stroke();

  // ドット
  pts.forEach(function(p, i) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI*2);
    ctx.fillStyle = _chartMode === 'avg' ? '#ffffff' : '#e8ff47';
    ctx.fill();
  });

  // X軸ラベル（最初・最後・中間）
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.font = '9px sans-serif';
  ctx.textAlign = 'center';
  // X軸ラベル：スコア推移も平均推移も同じく古い順にG1〜G30
  var totalGames = hist.length;
  var shown = scores.length;
  var startIdx = totalGames - shown; // 何ゲーム目から始まるか
  [0, Math.floor(pts.length/2), pts.length-1].forEach(function(i) {
    if (pts[i]) ctx.fillText('G'+(startIdx+i+1), pts[i].x, H - 4);
  });
}

/* Export / Import */
// inputのchangeイベントをJSで設定（iPhoneのSafari対応）
function exportData() {
  var h = getH();
  if (!h.length) { alert('履歴がありません'); return; }
  var json = JSON.stringify({ version: 2, exported: new Date().toISOString(), data: h, totals: getTotals() }, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'darts_history_' + localDateStr(new Date()) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function triggerImport() {
  var input = document.getElementById('imp-file');
  input.value = '';
  input.click();
}

function importData(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var obj = JSON.parse(e.target.result);
      var incoming = obj.data || obj; // 配列直接 or {data:[...]}
      if (!Array.isArray(incoming)) throw new Error('形式が違います');
      var current = getH();
      // 日付で重複チェックしてマージ
      var dates = {};
      current.forEach(function(x){ dates[x.date] = true; });
      var newGames = [];
      incoming.forEach(function(x) {
        if (!dates[x.date]) { current.push(x); newGames.push(x); }
      });
      // 日付順で並べ直す
      current.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
      localStorage.setItem('dh', JSON.stringify(current.slice(0, 200)));
      // totals 更新
      var t = getTotals();
      if (t.games === 0 && obj.totals) {
        // 新端末への完全リストア: エクスポートのtotalsをそのまま使用
        t = { games: obj.totals.games||0, play_time: obj.totals.play_time||0, c180: obj.totals.c180||0, best: obj.totals.best||0 };
      } else {
        // 既存データへの追加: 新規ゲーム分だけインクリメント
        for (var i=0; i<newGames.length; i++) {
          var g=newGames[i]; t.games+=1; t.play_time+=(g.duration||0);
          if(g.score>t.best) t.best=g.score;
          var r=g.rounds||[]; for(var j=0;j<r.length;j++) if(r[j]===180) t.c180++;
        }
      }
      saveTotals(t);
      renderHist();
      alert(newGames.length + '件のデータを追加しました（重複は除外）');
    } catch(err) {
      alert('読み込みに失敗しました: ' + err.message);
    }
    input.value = ''; // リセット
  };
  reader.readAsText(file);
}

/* 01 Export / Import */
function exportZ01Data() {
  var h = _z01GetH();
  if (!h.length) { alert('01の履歴がありません'); return; }
  var json = JSON.stringify({ version: 1, exported: new Date().toISOString(), data: h }, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'darts01_history_' + localDateStr(new Date()) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
function triggerImportZ01() {
  var input = document.getElementById('imp-z01-file');
  input.value = '';
  input.click();
}
function importZ01Data(input) {
  var file = input.files[0];
  if (!file) return;
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var obj = JSON.parse(e.target.result);
      var incoming = obj.data || obj;
      if (!Array.isArray(incoming)) throw new Error('形式が違います');
      var current = _z01GetH();
      var dates = {};
      current.forEach(function(x){ dates[x.date] = true; });
      var newGames = [];
      incoming.forEach(function(x) {
        if (!dates[x.date]) { current.push(x); newGames.push(x); }
      });
      current.sort(function(a,b){ return new Date(b.date) - new Date(a.date); });
      localStorage.setItem('dh01', JSON.stringify(current.slice(0, 500)));
      renderZ01Hist();
      alert(newGames.length + '件のデータを追加しました（重複は除外）');
    } catch(err) {
      alert('読み込みに失敗しました: ' + err.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
}

/* Period stats */
var pTab = 'day';
function pad(n){ return n<10?'0'+n:''+n; }
function getPer(h, u) {
  var bk = {};
  for (var i=0;i<h.length;i++) {
    var d=new Date(h[i].date), k;
    if (u==='day') k=d.getFullYear()+'/'+pad(d.getMonth()+1)+'/'+pad(d.getDate());
    else if (u==='week') {
      var t=new Date(d); t.setHours(0,0,0,0); t.setDate(t.getDate()+4-(t.getDay()||7));
      var y=t.getFullYear(), w=Math.ceil((((t-new Date(y,0,1))/86400000)+1)/7);
      k=y+'-W'+pad(w);
    } else k=d.getFullYear()+'/'+pad(d.getMonth()+1);
    if (!bk[k]) bk[k]=[];
    bk[k].push(h[i]);
  }
  var limit = u === 'month' ? 24 : u === 'week' ? 12 : 30;
  return Object.keys(bk).sort(function(a,b){return b.localeCompare(a);}).slice(0,limit).map(function(k){
    var games=bk[k], sum=0, c180=0;
    for(var i=0;i<games.length;i++){
      sum+=games[i].score;
      var rounds=games[i].rounds||[];
      for(var j=0;j<rounds.length;j++) if(rounds[j]===180) c180++;
    }
    var sc=games.map(function(x){return x.score;});
    var allR=[];
    var durSec=0;
    for(var i=0;i<games.length;i++) { if(games[i].rounds) for(var j=0;j<games[i].rounds.length;j++) allR.push(games[i].rounds[j]); durSec+=(games[i].duration||0); }
    return {label:k, best:Math.max.apply(null,sc), avg:Math.round(sum/games.length), count:games.length, c180:c180, rounds:allR, duration:durSec};
  });
}
function renderPer(h) {
  var w=document.getElementById('hper');
  if (!h.length){w.innerHTML='';return;}
  // トレーニング時間計算（本日・今週・今月）- ローカル時間で統一
  var now = new Date();
  var todayStr3 = now.getFullYear() + '-' + ('0'+(now.getMonth()+1)).slice(-2) + '-' + ('0'+now.getDate()).slice(-2);
  // 今週月曜日のタイムスタンプ（ローカル0:00:00）
  var weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var dow = weekStart.getDay() || 7;
  weekStart.setDate(weekStart.getDate() - dow + 1);
  var weekStartTs = weekStart.getTime();
  // 今月キー
  var monthKey = now.getFullYear() + '/' + ('0'+(now.getMonth()+1)).slice(-2);

  var totalSecDay = 0, totalSecWeek = 0, totalSecMonth = 0;
  for (var i=0; i<h.length; i++) {
    if (!h[i].duration || !h[i].date) continue;
    var hd = new Date(h[i].date);
    var hdStr = hd.getFullYear() + '-' + ('0'+(hd.getMonth()+1)).slice(-2) + '-' + ('0'+hd.getDate()).slice(-2);
    var hdMonth = hd.getFullYear() + '/' + ('0'+(hd.getMonth()+1)).slice(-2);
    var hdDayTs = new Date(hd.getFullYear(), hd.getMonth(), hd.getDate()).getTime();
    if (hdStr === todayStr3) totalSecDay += h[i].duration;
    if (hdDayTs >= weekStartTs) totalSecWeek += h[i].duration;
    if (hdMonth === monthKey) totalSecMonth += h[i].duration;
  }
  function fmtTime(sec) {
    var m = Math.floor(sec/60), s = sec%60;
    return m>0 ? m+'分'+(s>0?s+'秒':'') : (s>0 ? s+'秒' : '—');
  }
  // タブに応じた合計プレイ時間
  var ptMap = { day: { sec: totalSecDay, lbl: '本日' }, week: { sec: totalSecWeek, lbl: '今週' }, month: { sec: totalSecMonth, lbl: '今月' } };
  var ptInfo = ptMap[pTab] || ptMap['day'];
  var ptFooter = '';
  var s=getPer(h,pTab);
  var tabs=[['day','日別'],['week','週別'],['month','月別']].map(function(t){
    return '<div class="ptab'+(pTab===t[0]?' on':'')+'" data-t="'+t[0]+'">'+t[1]+'</div>';
  }).join('');
  var rows=s.length?s.map(function(r, ridx){
    var rr=r.rounds||[];
    var m180=rr.filter(function(v){return v===180;}).length;
    var m140=rr.filter(function(v){return v>=140&&v<180;}).length;
    var m100=rr.filter(function(v){return v>=100&&v<140;}).length;
    var m60=rr.filter(function(v){return v>=60&&v<100;}).length;
    var m59=rr.filter(function(v){return v<60;}).length;
    var mp=[];
    if(m180>0) mp.push('<span style="color:#e8ff47;">180:'+m180+'</span>');
    if(m140>0) mp.push('<span style="color:#47ffb4;">140+:'+m140+'</span>');
    if(m100>0) mp.push('<span style="color:#4fc3f7;">100+:'+m100+'</span>');
    if(m60>0)  mp.push('<span style="color:#9575cd;">60+:'+m60+'</span>');
    if(m59>0)  mp.push('<span style="color:rgba(255,255,255,0.35);">59-:'+m59+'</span>');
    var durM=Math.floor((r.duration||0)/60), durS=(r.duration||0)%60;
    var durStr=r.duration>0?(durM>0?durM+'分'+(durS>0?durS+'秒':''):durS+'秒'):'';
    var timeTag=durStr?'<span style="color:var(--grn);margin-left:auto;">⏱ '+durStr+'</span>':'';
    var mHtml=(mp.length||durStr)?'<div style="grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;align-items:center;padding:3px 6px 4px;border-top:1px solid var(--bdr);font-size:12px;font-weight:700;opacity:0.9;">'+mp.join('')+timeTag+'</div>':'';
    // 3-Dart Avg計算
    var tda = (r.avg / 8).toFixed(2);
    var tdaArrow = '';
    if (ridx + 1 < s.length) {
      var prevAvg = s[ridx+1].avg;
      var prevTda = prevAvg / 8;
      var curTda = r.avg / 8;
      if (curTda > prevTda) tdaArrow = '<span style="color:#ff6b35;font-size:9px;font-weight:900;">▲</span>';
      else if (curTda < prevTda) tdaArrow = '<span style="color:#4fc3f7;font-size:9px;font-weight:900;">▼</span>';
    }
    return '<div class="pr">'+
      '<div class="plbl">'+r.label+'</div>'+
      '<div class="pbest">'+r.best+'</div>'+
      '<div class="pavg">'+r.avg+'</div>'+
      '<div class="pavg" style="color:#b47fff;font-size:24px;font-family:\'Bebas Neue\',cursive;letter-spacing:1px;line-height:1;">'+tda+tdaArrow+'</div>'+
      '<div class="pcnt">'+r.count+'G</div>'+
      '<div class="p180">'+(r.c180>0?r.c180:'—')+'</div>'+
      mHtml+
      '</div>';
  }).join('') : '<div class="pempty">データなし</div>';
  w.innerHTML='<div class="pcrd">'+
    '<div class="ptabs" id="ptabs">'+tabs+'</div>'+
    '<div class="pgrid">'+
    '<div class="phd"><span>期間</span><span>最高点</span><span>平均点</span><span>3ダーツ平均</span><span>回数</span><span>180</span></div>'+
    rows+'</div>'+ptFooter+'</div>';
  document.getElementById('ptabs').addEventListener('click',function(e){
    var t=e.target.getAttribute('data-t');
    if(t){pTab=t;renderPer(getH());}
  });
}

/* スコア分布 */
var _rrateH = [];
var _rrateMode = '30g';
function switchRrate(mode) {
  _rrateMode = mode;
  document.querySelectorAll('.rrate-tab').forEach(function(b) {
    b.classList.toggle('on', b.getAttribute('onclick') === "switchRrate('"+mode+"')");
  });
  renderRrateRows();
}
function renderRrateRows() {
  var h = _rrateH;
  var todayStr = localDateStr(new Date());
  var ago30d = new Date(); ago30d.setDate(ago30d.getDate()-30);
  var games;
  if (_rrateMode === '30g') games = h.slice(0,30);
  else if (_rrateMode === 'today') games = h.filter(function(g){ return g.date && localDateStr(new Date(g.date))===todayStr; });
  else if (_rrateMode === '30d') games = h.filter(function(g){ return g.date && new Date(g.date)>=ago30d; });
  else games = h;
  var rounds = [];
  for(var i=0;i<games.length;i++) if(games[i].rounds) for(var j=0;j<games[i].rounds.length;j++) rounds.push(games[i].rounds[j]);
  var total = rounds.length;
  var rrateRows = document.getElementById('rrate-rows');
  if (!rrateRows) return;
  if (!total) { rrateRows.innerHTML='<div style="text-align:center;color:var(--mut);font-size:12px;padding:8px 0;">データなし</div>'; return; }
  var bands = [
    { lbl:'180',  color:'#e8ff47', fn:function(s){return s===180;} },
    { lbl:'140+', color:'#47ffb4', fn:function(s){return s>=140&&s<180;} },
    { lbl:'100+', color:'#4fc3f7', fn:function(s){return s>=100&&s<140;} },
    { lbl:'60+',  color:'#9575cd', fn:function(s){return s>=60&&s<100;} },
    { lbl:'59-',  color:'rgba(255,255,255,0.2)', fn:function(s){return s<60;} },
  ];
  rrateRows.innerHTML = bands.map(function(b){
    var cnt=rounds.filter(b.fn).length, pct=Math.round(cnt/total*100);
    return '<div class="rrate-row">'+
      '<div class="rrate-lbl" style="color:'+b.color+';">'+b.lbl+'</div>'+
      '<div class="rrate-bar-wrap"><div class="rrate-bar" style="width:'+pct+'%;background:'+b.color+';opacity:0.85;"></div></div>'+
      '<div class="rrate-cnt" style="color:'+b.color+';">'+cnt+'回</div>'+
      '<div class="rrate-pct" style="color:'+b.color+';">'+pct+'%</div>'+
      '</div>';
  }).join('');
}

/* Render history */
function renderHist() {
  migrateTotals();
  var h=getH();
  var s3=document.getElementById('hs3');
  var a3=document.getElementById('ha3');
  var hl=document.getElementById('hlist');
  if (!h.length) {
    s3.innerHTML=''; a3.innerHTML=''; document.getElementById('hper').innerHTML='';
    var cw = document.getElementById('chart-wrap');
    if (cw) cw.style.display = 'none';
    var rc = document.getElementById('rrate-card');
    if (rc) rc.style.display = 'none';
    var sb = document.getElementById('streak-badge');
    if (sb) sb.textContent = '';
    hl.innerHTML='<div class="hempty"><div class="ei">🎯</div>まだ記録がありません。<br>ゲームを完了すると自動で保存されます。</div>';
    return;
  }
  var sc=h.map(function(x){return x.score;});
  var best=Math.max.apply(null,sc);
  var sum=0; for(var i=0;i<sc.length;i++) sum+=sc[i];
  // 自己ベスト達成日を取得
  var bestGame = h[0];
  for (var i=0; i<h.length; i++) if(h[i].score === best) { bestGame = h[i]; break; }
  var bestDate = '';
  if (bestGame && bestGame.date) {
    var bd = new Date(bestGame.date);
    bestDate = '<div style="font-size:9px;color:var(--mut);margin-top:2px;">' + bd.getFullYear() + '/' + (bd.getMonth()+1) + '/' + bd.getDate() + '</div>';
  }
  // 本日の自己ベスト
  var todayStrH = localDateStr(new Date());
  var todayBestScore = 0;
  for (var i=0; i<h.length; i++) {
    if (h[i].date && localDateStr(new Date(h[i].date)) === todayStrH && h[i].score > todayBestScore) todayBestScore = h[i].score;
  }
  var todayBestHtml = todayBestScore > 0
    ? '<div class="sv" style="color:var(--acc);">'+todayBestScore+'</div><div class="sl">本日ベスト</div>'
    : '<div class="sv" style="color:var(--mut);">—</div><div class="sl">本日ベスト</div>';
  // 直近30G平均
  var sl30s=h.slice(0,30), s30s=0;
  for(var i=0;i<sl30s.length;i++) s30s+=sl30s[i].score;
  var avg30s = sl30s.length ? Math.round(s30s/sl30s.length) : 0;
  // 1ゲーム前と比較して↑↓
  var sl30sp=h.slice(1,31), s30sp=0;
  for(var i=0;i<sl30sp.length;i++) s30sp+=sl30sp[i].score;
  var avg30sp = sl30sp.length ? Math.round(s30sp/sl30sp.length) : null;
  var arrow30s = '';
  if (avg30sp !== null) {
    if (avg30s > avg30sp) arrow30s = '<span style="color:#ff6b35;font-size:16px;font-weight:900;"> ▲</span>';
    else if (avg30s < avg30sp) arrow30s = '<span style="color:#4fc3f7;font-size:16px;font-weight:900;"> ▼</span>';
  }
  // 累計統計（dh_totalsから取得 — 200件上限に依存しない真の累計）
  var totals = getTotals();
  var allDurH = Math.floor(totals.play_time/3600), allDurM = Math.floor((totals.play_time%3600)/60);
  var allDurStr = allDurH > 0 ? allDurH+'時間'+allDurM+'分' : allDurM+'分';
  var profileBest = Math.max(totals.best || 0, best);
  var bestRankLabel = rank(profileBest);
  var rankColors = { 'S+': ['#ffd700','#000'], 'S': ['#e8ff47','#000'], 'A': ['#47ffb4','#000'], 'B': ['#4fc3f7','#000'], 'C': ['#ff6b35','#fff'], 'D': ['#6b6b88','#fff'] };
  var rc2 = rankColors[bestRankLabel] || ['#444','#fff'];
  var pc = document.getElementById('profile-card');
  if (pc) {
    pc.style.display = 'block';
    pc.innerHTML =
      '<div class="pcard">' +
        '<div class="pcard-brand"><span class="pcard-badge">🏆 累計成績</span><span class="pcard-app">🎯 Steel Darts Pro</span></div>' +
        '<div class="pcard-score">' + profileBest + '</div>' +
        '<div class="pcard-score-label">Personal Best</div>' +
        '<div class="pcard-rank" style="background:'+rc2[0]+';color:'+rc2[1]+';">' + bestRankLabel + ' RANK</div>' +
        '<hr class="pcard-divider">' +
        '<div class="pcard-stats">' +
          '<div class="pcard-stat"><div class="pcard-stat-val" style="color:rgba(255,255,255,0.7);">' + totals.games + '</div><div class="pcard-stat-lbl">Total Games</div></div>' +
          '<div class="pcard-stat"><div class="pcard-stat-val" style="color:#ffd700;">×' + totals.c180 + '</div><div class="pcard-stat-lbl">通算 180</div></div>' +
          '<div class="pcard-stat"><div class="pcard-stat-val" style="color:var(--grn);font-size:22px;">' + allDurStr + '</div><div class="pcard-stat-lbl">Total Play Time</div></div>' +
        '</div>' +
      '</div>';
  }
  // 今日のカード
  var todayStr2 = localDateStr(new Date());
  var todayGames = h.filter(function(g){ return g.date && localDateStr(new Date(g.date)) === todayStr2; });
  var tc = document.getElementById('today-card');
  if (tc) {
    if (todayGames.length > 0) {
      tc.style.display = 'block';
      var todayBest2 = Math.max.apply(null, todayGames.map(function(g){return g.score;}));
      var todaySum2 = 0; for(var i=0;i<todayGames.length;i++) todaySum2 += todayGames[i].score;
      var todayAvg3da = (todaySum2 / todayGames.length / 8).toFixed(2);
      var today180 = 0;
      for(var i=0;i<todayGames.length;i++){ var r2=todayGames[i].rounds||[]; for(var j=0;j<r2.length;j++) if(r2[j]===180) today180++; }
      var todayDurSec = 0; for(var i=0;i<todayGames.length;i++) todayDurSec += (todayGames[i].duration||0);
      var tdm=Math.floor(todayDurSec/60), tds=todayDurSec%60;
      var todayTimeStr = tdm>0 ? tdm+'分'+(tds>0?tds+'秒':'') : (tds>0?tds+'秒':'—');
      var todayRankLabel = rank(todayBest2);
      var trc = rankColors[todayRankLabel] || ['#444','#fff'];
      tc.innerHTML =
        '<div class="tcard">' +
          '<div class="tcard-brand"><span class="tcard-badge">📅 今日の成績</span><span class="tcard-date">' + todayStr2 + '</span></div>' +
          '<div class="tcard-score">' + todayBest2 + '</div>' +
          '<div class="tcard-score-label">Today\'s Best</div>' +
          '<div class="tcard-rank" style="background:'+trc[0]+';color:'+trc[1]+';">' + todayRankLabel + ' RANK</div>' +
          '<hr class="tcard-divider">' +
          '<div class="tcard-stats">' +
            '<div class="tcard-stat"><div class="tcard-stat-val" style="color:#b47fff;">' + todayAvg3da + '</div><div class="tcard-stat-lbl">3ダーツ平均</div></div>' +
            '<div class="tcard-stat"><div class="tcard-stat-val" style="color:#ffd700;">×' + today180 + '</div><div class="tcard-stat-lbl">180</div></div>' +
            '<div class="tcard-stat"><div class="tcard-stat-val" style="color:rgba(255,255,255,0.7);">' + todayGames.length + '</div><div class="tcard-stat-lbl">Games</div></div>' +
            '<div class="tcard-stat"><div class="tcard-stat-val" style="color:var(--grn);font-size:18px;">' + todayTimeStr + '</div><div class="tcard-stat-lbl">Time</div></div>' +
          '</div>' +
        '</div>';
    } else {
      tc.style.display = 'none';
    }
  }
  s3.style.gridTemplateColumns = 'repeat(2,1fr)';
  s3.innerHTML=
    '<div class="sc3" style="position:relative;">'+(arrow30s?'<div style="position:absolute;top:6px;right:8px;font-size:13px;line-height:1;">'+arrow30s+'</div>':'')+'<div class="sv" style="color:#fff;">'+avg30s+'</div><div class="sl">直近30G 平均</div></div>'+
    '<div class="sc3" style="position:relative;">'+(avg30sp!==null&&avg30s>avg30sp?'<div style="position:absolute;top:6px;right:8px;font-size:13px;line-height:1;color:#ff6b35;font-weight:900;">▲</div>':avg30sp!==null&&avg30s<avg30sp?'<div style="position:absolute;top:6px;right:8px;font-size:13px;line-height:1;color:#4fc3f7;font-weight:900;">▼</div>':'')+'<div class="sv" style="color:#b47fff;font-size:30px;letter-spacing:0;">'+(avg30s?(avg30s/8).toFixed(2):'—')+'</div><div class="sl">直近30G 3ダーツ平均</div></div>';
  // 直近30G平均（1本化）
  var sl30=h.slice(0,30), s30=0;
  for(var j=0;j<sl30.length;j++) s30+=sl30[j].score;
  var avg30 = sl30.length ? Math.round(s30/sl30.length) : null;
  // 1ゲーム前と比較
  var sl30p=h.slice(1,31), s30p=0;
  for(var j=0;j<sl30p.length;j++) s30p+=sl30p[j].score;
  var avg30prev = sl30p.length ? Math.round(s30p/sl30p.length) : null;
  var arrow30 = '';
  if (avg30 !== null && avg30prev !== null) {
    if (avg30 > avg30prev) arrow30 = '<span style="color:#ff6b35;font-size:22px;font-weight:900;line-height:1;"> ▲</span>';
    else if (avg30 < avg30prev) arrow30 = '<span style="color:#4fc3f7;font-size:22px;font-weight:900;line-height:1;"> ▼</span>';
  }
  a3.innerHTML = '<div class="ac"><div class="av">'+(avg30!==null?avg30:'—')+arrow30+'</div><div class="al">直近30G 平均スコア</div></div>';

  // スコア分布
  _rrateH = h;
  var rrateCard = document.getElementById('rrate-card');
  if (rrateCard) rrateCard.style.display = 'block';
  switchRrate(_rrateMode);

  // ストリーク計算
  var streak = 0;
  var today = new Date(); today.setHours(0,0,0,0);
  var checkDay = new Date(today);
  var usedDates = {};
  for (var i=0; i<h.length; i++) {
    var d = new Date(h[i].date); d.setHours(0,0,0,0);
    usedDates[d.getTime()] = true;
  }
  // 今日または昨日からストリーク開始
  if (!usedDates[today.getTime()]) checkDay.setDate(checkDay.getDate()-1);
  while (usedDates[checkDay.getTime()]) {
    streak++;
    checkDay.setDate(checkDay.getDate()-1);
  }
  var sb = document.getElementById('streak-badge');
  if (sb) {
    if (streak >= 2) {
      sb.innerHTML = '<div class="streak-card"><div class="streak-fire">🔥</div><div class="streak-num">'+streak+'</div><div class="streak-lbl">日連続<br>プレー</div></div>';
    } else {
      sb.innerHTML = '';
    }
  }
  // 週次サマリー
  (function(){
    var now = new Date();
    var msDay = 86400000;
    var thisWeekGames = h.filter(function(g){ return g.date && (now - new Date(g.date)) < 7*msDay; });
    var lastWeekGames = h.filter(function(g){ var d=now-new Date(g.date); return g.date && d>=7*msDay && d<14*msDay; });
    var wEl = document.getElementById('weekly-summary');
    if (!wEl) return;
    if (thisWeekGames.length === 0) { wEl.style.display='none'; return; }
    var thisAvg = Math.round(thisWeekGames.reduce(function(a,g){return a+g.score;},0)/thisWeekGames.length);
    var msg = '';
    if (lastWeekGames.length > 0) {
      var lastAvg = Math.round(lastWeekGames.reduce(function(a,g){return a+g.score;},0)/lastWeekGames.length);
      var diff = thisAvg - lastAvg;
      if (diff > 0) msg = '📈 先週より <strong style="color:#66bb6a;">+' + diff + '点アップ ↑</strong>　(今週平均 '+thisAvg+'点)';
      else if (diff < 0) msg = '📉 先週より <strong style="color:#ff9944;">' + Math.abs(diff) + '点ダウン ↓</strong>　(今週平均 '+thisAvg+'点)';
      else msg = '➡ <span style="color:var(--mut);">先週と同じ</span>　(今週平均 '+thisAvg+'点)';
    } else {
      msg = '🎯 今週の平均スコア: <strong style="color:var(--acc);">' + thisAvg + '点</strong>　(' + thisWeekGames.length + 'G)';
    }
    wEl.innerHTML = msg;
    wEl.style.display = 'block';
  })();
  renderPer(h);
  setTimeout(function(){ drawChart(h); }, 50);
  hl.innerHTML = h.map(function(x,idx){
    var isBest=x.score===best;
    var d=new Date(x.date);
    var ds=d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate()+' '+d.getHours()+':'+pad(d.getMinutes());
    var pills=(x.rounds||[]).map(function(r,i){return '<span class="hpill">R'+(i+1)+':'+r+'</span>';}).join('');
    var tda3 = x.score ? (x.score / 8).toFixed(2) : '—';
    // スコア分布ミニ表示
    var rds=x.rounds||[];
    var mini='';
    if(rds.length>0){
      var c180=rds.filter(function(r){return r===180;}).length;
      var c140=rds.filter(function(r){return r>=140&&r<180;}).length;
      var c100=rds.filter(function(r){return r>=100&&r<140;}).length;
      var c60=rds.filter(function(r){return r>=60&&r<100;}).length;
      var c59=rds.filter(function(r){return r<60;}).length;
      var parts=[];
      if(c180>0) parts.push('<span style="color:#e8ff47;">180:'+c180+'</span>');
      if(c140>0) parts.push('<span style="color:#47ffb4;">140+:'+c140+'</span>');
      if(c100>0) parts.push('<span style="color:#4fc3f7;">100+:'+c100+'</span>');
      if(c60>0)  parts.push('<span style="color:#9575cd;">60+:'+c60+'</span>');
      if(c59>0)  parts.push('<span style="color:rgba(255,255,255,0.35);">59-:'+c59+'</span>');
      mini=parts.length?'<div style="font-size:10px;margin-top:3px;display:flex;gap:6px;">'+parts.join('')+'</div>':'';
    }
    return '<div class="hi" data-idx="'+idx+'">'+
      '<div class="hi-del-bg">削除</div>'+
      '<div class="hi-inner">'+
      '<div class="hsc'+(isBest?' best':'')+'">'+x.score+'</div>'+
      '<div class="hinf"><div class="hdate">'+ds+'　'+rank(x.score)+'ランク'+(x.duration?' ⏱'+Math.floor(x.duration/60)+'分'+(x.duration%60>0?x.duration%60+'秒':''):'')+'</div><div class="hpills">'+pills+'<span class="hpill" style="color:#b47fff;background:rgba(180,127,255,0.12);">3ダーツ平均:'+tda3+'</span></div>'+mini+'</div>'+
      (isBest?'<div class="hbdg">BEST</div>':'')+
      '</div>'+
      '</div>';
  }).join('');
  _setupSwipeDelete(hl);
}

function _setupSwipeDelete(hl) {
  var REVEAL = 72;
  hl.querySelectorAll('.hi').forEach(function(el) {
    var inner = el.querySelector('.hi-inner');
    var delBg = el.querySelector('.hi-del-bg');
    var startX = 0, startY = 0, startOffset = 0;
    inner.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      startOffset = parseFloat(inner.style.transform.replace(/[^-\d.]/g,'')) || 0;
      inner.style.transition = 'none';
    }, {passive: true});
    inner.addEventListener('touchmove', function(e) {
      var cx = e.touches[0].clientX - startX;
      var cy = e.touches[0].clientY - startY;
      if (Math.abs(cy) > Math.abs(cx) + 5 && Math.abs(cx) < 10) return;
      var next = Math.max(-REVEAL, Math.min(0, startOffset + cx));
      inner.style.transform = 'translateX(' + next + 'px)';
    }, {passive: true});
    inner.addEventListener('touchend', function() {
      var cur = parseFloat(inner.style.transform.replace(/[^-\d.]/g,'')) || 0;
      inner.style.transition = 'transform 0.2s';
      inner.style.transform = cur < -REVEAL * 0.5 ? 'translateX(-' + REVEAL + 'px)' : '';
    }, {passive: true});
    delBg.addEventListener('click', function() {
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      delOne(idx);
    });
    delBg.addEventListener('touchend', function(e) {
      e.preventDefault();
      var idx = parseInt(el.getAttribute('data-idx'), 10);
      delOne(idx);
    }, {passive: false});
  });
  // 別アイテムタッチ時に開いてる項目を閉じる
  hl.addEventListener('touchstart', function(e) {
    var touched = e.target.closest('.hi');
    hl.querySelectorAll('.hi-inner').forEach(function(inner) {
      if (!touched || inner.parentElement !== touched) {
        inner.style.transition = 'transform 0.2s';
        inner.style.transform = '';
      }
    });
  }, {passive: true});
}

/* Keyboard */
document.addEventListener('keydown', function(e) {
  if (document.getElementById('vhist').style.display !== 'none') return;
  var scEd = document.getElementById('sc-editor');
  if (scEd && scEd.classList.contains('show')) return;
  // 01ゲーム中はz01関数へルーティング
  var v01El = document.getElementById('v01');
  var z01Wrap = document.getElementById('z01-game-wrap');
  if (v01El && v01El.style.display !== 'none' && z01Wrap && z01Wrap.style.display !== 'none') {
    var finMod = document.getElementById('z01-finish-modal');
    if (finMod && finMod.style.display === 'flex') return;
    var legOv = document.getElementById('z01-leg-overlay');
    if (legOv && legOv.style.display === 'flex') return;
    if (e.key >= '0' && e.key <= '9') { z01Kp(parseInt(e.key)); }
    else if (e.key === 'Backspace') { e.preventDefault(); z01Kd(); }
    else if (e.key === 'Enter') { z01Ok(); }
    return;
  }
  if (e.key>='0'&&e.key<='9') kp(parseInt(e.key));
  else if (e.key==='Backspace'){e.preventDefault();kd();}
  else if (e.key==='Enter') doOk();
});

/* ============================================================
   アレンジ練習
   ============================================================ */

/* ===== 01 GAME ===== */
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
      legs: _z01.legs, inRule: _z01.inRule, outRule: _z01.outRule, players: _z01.players,
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
    /* モードは毎回501スタート（保存しない） */
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
    var cur = rem;
    var parts = [];
    coPath.forEach(function(d, i) {
      var isLast = i === coPath.length - 1;
      var lbl = d === 'Bull' ? 'D-BULL' : d === '25' ? 'S-BULL' : d;
      if (i > 0) parts.push('<span class="z01-hint-sep">→</span>');
      if (isLast) {
        parts.push('<span class="z01-hint-finish">' + lbl + '</span>');
      } else {
        cur -= _dartVal(d);
        parts.push('<span class="z01-hint-dart">' + lbl + '</span><span class="z01-hint-rem">(' + cur + ')</span>');
      }
    });
    var n = coPath.length;
    var nLabel = n === 1 ? '1本' : n === 2 ? '2本' : '3本';
    var nColor = n === 1 ? '#47ffb4' : n === 2 ? 'var(--acc)' : '#ff8a65';
    el.innerHTML = '<span class="z01-hint-n" style="color:' + nColor + ';">' + nLabel + '</span>' + parts.join('');
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
      (function(){
        var fl = document.createElement('div'); fl.className = 'z01-agari-flash'; document.body.appendChild(fl);
        setTimeout(function(){ fl.parentNode && fl.parentNode.removeChild(fl); }, 700);
        var t = document.createElement('div'); t.className = 'z01-event-toast agari';
        t.textContent = '🎯 上がり目！'; document.body.appendChild(t);
        setTimeout(function(){ t.parentNode && t.parentNode.removeChild(t); }, 1600);
      })();
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
          sound180(); show180(); setTimeout(launchConfetti, 150);
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
  document.getElementById('z01-leg-title').textContent = matchOver ? 'MATCH WIN!' : 'LEG WIN!';
  document.getElementById('z01-leg-winner-name').textContent = _z01PlayerName(winner) + ' の勝利！';
  document.getElementById('z01-leg-stats').textContent = (_z01.stats[winner].finishDarts || (_z01.stats[winner].legRounds * 3)) + ' 本';
  var btn = document.getElementById('z01-leg-btn');
  if (matchOver) { btn.setAttribute('data-fn','z01ShowResult'); btn.textContent = '結果を見る →'; }
  else { btn.setAttribute('data-fn','z01NextLeg'); btn.textContent = '次のLegへ →'; }
  // 勝利・敗北音
  if (matchOver) {
    var playerWon = (_z01.players === 3) ? (winner === 0) : true;
    if (_z01.players === 3 && winner === 1) { soundLose(); }
    else { soundFinish(false); }
  } else {
    soundLegWin();
  }
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
      html += '<div style="font-size:9px;color:#ffd54f;letter-spacing:1px;flex-shrink:0;">' + stars + '</div>';
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
    var n0 = (cp===0?'▶ ':'') + _z01PlayerName(0) + (_z01.legs>1?' ('+_z01.legWins[0]+'W)':'');
    var n1 = _z01PlayerName(1) + (_z01.legs>1?' ('+_z01.legWins[1]+'W)':'') + (cp===1?' ◀':'');
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
  var p = _z01.currentPlayer, st = _z01.stats[p];
  var legR = st.legRounds; // 今レグの投数（ラウンド単位、このターン含む）
  var baseDarts = (legR - 1) * 3; // このターン前までの投本数
  var path = _getPath(finishedScore);
  var routeStr = path ? path.map(function(d){ return d === 'Bull' ? 'D-BULL' : d === '25' ? 'S-BULL' : d; }).join(' → ') : '';
  var h = '<div class="z01-finish-header">';
  h += '<span class="z01-finish-score-big">' + finishedScore + '</span>';
  h += '<span class="z01-finish-score-label">点フィニッシュ！</span>';
  if (routeStr) h += '<div class="z01-finish-route">推奨: ' + routeStr + '</div>';
  h += '</div>';
  h += '<div class="z01-finish-title">何本目で上がりましたか？</div>';
  if (can1) h += '<button class="z01-finish-btn" data-fn="z01FinishDart" data-arg="1"><span class="z01-finish-btn-main">1本目でフィニッシュ</span><span class="z01-finish-btn-sub">このターン1投目に決めた（計' + (baseDarts + 1) + '本）</span></button>';
  if (can2) h += '<button class="z01-finish-btn" data-fn="z01FinishDart" data-arg="2"><span class="z01-finish-btn-main">2本目でフィニッシュ</span><span class="z01-finish-btn-sub">このターン2投目に決めた（計' + (baseDarts + 2) + '本）</span></button>';
  h += '<button class="z01-finish-btn" data-fn="z01FinishDart" data-arg="3"><span class="z01-finish-btn-main">3本目でフィニッシュ</span><span class="z01-finish-btn-sub">このターン3投フル使用（計' + (baseDarts + 3) + '本）</span></button>';
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

