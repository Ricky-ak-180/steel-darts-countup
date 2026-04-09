// ============================================================
// cricket.js — Cricket ゲームモード
// ============================================================

var CKT_NUMBERS = [20, 19, 18, 17, 16, 15, 25]; // 25=Bull

var _ckt = {
  players: 3,       // 2=2P local, 3=vs CPU (matches z01 convention)
  cpuLevel: 4,
  names: ['Player 1', 'CPU'],
  marks: [[0,0,0,0,0,0,0], [0,0,0,0,0,0,0]],
  points: [0, 0],
  currentPlayer: 0,
  currentDart: 0,    // 0,1,2 within turn
  round: 1,
  stats: [{totalMarks:0,rounds:0}, {totalMarks:0,rounds:0}],
  log: [],           // [{player, numberIdx, mult, marks, scored}]
  _selectedNumber: -1,
  _busy: false,
  _undoStack: []     // snapshots for undo
};

// CPU hit rate per level — 期待MPR = h×(1+2t+d)×3
// Index 0 unused; levels 1-12 (最強 LV12 = MPR ~7.0)
var _CKT_CPU_HIT    = [0, 0.25, 0.38, 0.50, 0.60, 0.68, 0.74, 0.79, 0.83, 0.87, 0.90, 0.93, 0.94];
var _CKT_CPU_TRIPLE = [0, 0.02, 0.03, 0.05, 0.08, 0.12, 0.17, 0.22, 0.28, 0.35, 0.43, 0.53, 0.62];
var _CKT_CPU_DOUBLE = [0, 0.05, 0.07, 0.10, 0.12, 0.15, 0.18, 0.20, 0.22, 0.23, 0.25, 0.27, 0.24];

// CPU level descriptions
var _CKT_CPU_DESC = [
  '', 'MPR ~0.8', 'MPR ~1.3', 'MPR ~1.8', 'MPR ~2.3', 'MPR ~2.8',
  'MPR ~3.4', 'MPR ~3.9', 'MPR ~4.4', 'MPR ~5.0', 'MPR ~5.7', 'MPR ~6.5', 'MPR ~7.0'
];
var _CKT_CPU_NAME = [
  '', '入門', '初心者', '初級', '中初級', 'アマチュア',
  '中級', '中級+', '上級', '上級+', 'エキスパート', 'セミプロ', 'プロ'
];

// ============================================================
// SETUP FUNCTIONS
// ============================================================

function cktSetPlayers(arg) {
  _ckt.players = arg;
  document.querySelectorAll('#ckt-setup-wrap [data-fn="cktSetPlayers"]').forEach(function(el) {
    el.classList.toggle('on', parseInt(el.getAttribute('data-arg'), 10) === arg);
  });
  document.getElementById('ckt-cpu-section').style.display = (arg === 3) ? '' : 'none';
  document.getElementById('ckt-name2-wrap').style.display = (arg === 2) ? '' : 'none';
}

function cktSetCpu(arg) {
  _ckt.cpuLevel = arg;
  var slider = document.getElementById('ckt-cpu-slider');
  if (slider) slider.value = arg;
  var disp = document.getElementById('ckt-cpu-level-disp');
  if (disp) disp.textContent = 'LV' + arg + ' ' + (_CKT_CPU_NAME[arg] || '');
  var desc = document.getElementById('ckt-cpu-desc');
  if (desc) desc.textContent = _CKT_CPU_DESC[arg] || '';
}

function _cktShowSetup() {
  document.getElementById('ckt-setup-wrap').style.display = '';
  document.getElementById('ckt-game-screen').style.display = 'none';
  document.getElementById('ckt-result-wrap').style.display = 'none';
}

function cktStart() {
  var n1 = (document.getElementById('ckt-name1').value || '').trim() || 'Player 1';
  var n2;
  if (_ckt.players === 3) {
    n2 = 'CPU';
  } else {
    n2 = (document.getElementById('ckt-name2').value || '').trim() || 'Player 2';
  }
  _ckt.names = [n1, n2];
  _ckt.marks = [[0,0,0,0,0,0,0], [0,0,0,0,0,0,0]];
  _ckt.points = [0, 0];
  _ckt.currentPlayer = 0;
  _ckt.currentDart = 0;
  _ckt.round = 1;
  _ckt.stats = [{totalMarks:0, rounds:0}, {totalMarks:0, rounds:0}];
  _ckt.log = [];
  _ckt._selectedNumber = -1;
  _ckt._busy = false;
  _ckt._undoStack = [];
  _ckt._turnDarts = []; // 現在ターンの投球履歴 [{numberIdx, mult}]
  _cktBoardCache = null; // Invalidate board cache

  document.getElementById('ckt-setup-wrap').style.display = 'none';
  var gs = document.getElementById('ckt-game-screen');
  gs.style.display = 'flex';
  document.getElementById('ckt-result-wrap').style.display = 'none';

  _cktRefreshBoard();
  _cktRefreshInput();
  if (typeof sfxImpact === 'function') sfxImpact();
}

// ============================================================
// BOARD RENDERING
// ============================================================

// ダーツ投球結果のラベル (例: T20, D19, 15, BULL, ×)
function _cktDartLabel(numberIdx, mult) {
  if (numberIdx < 0) return '×';
  var num = CKT_NUMBERS[numberIdx];
  if (numberIdx === 6) { // BULL
    return mult >= 2 ? 'BULL' : '25';
  }
  if (mult === 3) return 'T' + num;
  if (mult === 2) return 'D' + num;
  return '' + num;
}

function _cktMarkStr(count) {
  if (count === 0) return '<span class="ckt-mark-empty"></span>';
  if (count === 1) return '<span class="ckt-mark-slash"></span>';
  if (count === 2) return '<span class="ckt-mark-x"></span>';
  return '<span class="ckt-mark-closed"></span>';
}

var _cktBoardCache = null; // Cached board element references
function _cktInitializeBoard() {
  var el = document.getElementById('ckt-board');
  if (!el) return false;

  var h = '';
  h += '<div class="ckt-header">';
  h += '<div class="ckt-hdr-p0"></div>';
  h += '<div class="ckt-hdr-mid"><div style="font-size:9px;color:var(--mut);letter-spacing:1px;">ROUND</div><div class="ckt-round-disp"></div></div>';
  h += '<div class="ckt-hdr-p1"></div>';
  h += '</div>';

  h += '<div class="ckt-points-row">';
  h += '<div class="ckt-points-p0"></div>';
  h += '<div class="ckt-pts-mid">PTS</div>';
  h += '<div class="ckt-points-p1"></div>';
  h += '</div>';

  for (var i = 0; i < 7; i++) {
    var numLabel = i === 6 ? 'BULL' : String(CKT_NUMBERS[i]);
    h += '<div class="ckt-row" data-idx="' + i + '">';
    h += '<div class="ckt-marks ckt-marks-p0"></div>';
    h += '<div class="ckt-number">' + numLabel + '</div>';
    h += '<div class="ckt-marks ckt-marks-p1"></div>';
    h += '</div>';
  }

  h += '<div class="ckt-mpr-row">';
  h += '<div class="ckt-mpr ckt-mpr-p0"></div>';
  h += '<div class="ckt-mpr-mid"></div>';
  h += '<div class="ckt-mpr ckt-mpr-p1"></div>';
  h += '</div>';

  el.innerHTML = h;

  // Cache element references for fast updates
  _cktBoardCache = {
    board: el,
    hdrP0: el.querySelector('.ckt-hdr-p0'),
    hdrP1: el.querySelector('.ckt-hdr-p1'),
    roundDisp: el.querySelector('.ckt-round-disp'),
    pointsP0: el.querySelector('.ckt-points-p0'),
    pointsP1: el.querySelector('.ckt-points-p1'),
    rows: el.querySelectorAll('[data-idx]'),
    mprP0: el.querySelector('.ckt-mpr-p0'),
    mprP1: el.querySelector('.ckt-mpr-p1')
  };

  return true;
}

function _cktRefreshBoard() {
  var el = document.getElementById('ckt-board');
  if (!el) return;

  // Initialize board if not yet cached
  if (!_cktBoardCache || !_cktBoardCache.board) {
    _cktInitializeBoard();
  }

  // Update board class
  el.className = 'ckt-board' + (_ckt.currentPlayer === 1 ? ' ckt-board-p2' : '');

  var p0 = _ckt.currentPlayer === 0 ? ' ckt-active-player' : '';
  var p1 = _ckt.currentPlayer === 1 ? ' ckt-active-player' : '';

  // Update header names and classes
  _cktBoardCache.hdrP0.className = 'ckt-hdr-name ckt-hdr-p0' + p0;
  _cktBoardCache.hdrP0.textContent = _ckt.names[0];
  _cktBoardCache.hdrP1.className = 'ckt-hdr-name ckt-hdr-p1' + p1;
  _cktBoardCache.hdrP1.textContent = _ckt.names[1];

  // Update round
  _cktBoardCache.roundDisp.style.cssText = 'font-size:22px;font-weight:700;color:var(--acc);line-height:1.1;';
  _cktBoardCache.roundDisp.textContent = _ckt.round;

  // Update points
  _cktBoardCache.pointsP0.className = 'ckt-points' + p0;
  _cktBoardCache.pointsP0.textContent = _ckt.points[0];
  _cktBoardCache.pointsP1.className = 'ckt-points' + p1;
  _cktBoardCache.pointsP1.textContent = _ckt.points[1];

  // Update marks for each number
  for (var i = 0; i < 7; i++) {
    var m0 = _ckt.marks[0][i];
    var m1 = _ckt.marks[1][i];
    var closed = m0 >= 3 && m1 >= 3;
    var row = _cktBoardCache.rows[i];

    row.className = 'ckt-row' + (closed ? ' ckt-row-closed' : '');
    row.querySelector('.ckt-marks-p0').innerHTML = _cktMarkStr(m0);
    row.querySelector('.ckt-marks-p1').innerHTML = _cktMarkStr(m1);
  }

  // Update MPR
  var r0 = _ckt.stats[0].rounds + (_ckt.currentPlayer === 0 && _ckt.currentDart > 0 ? 1 : 0);
  var r1 = _ckt.stats[1].rounds + (_ckt.currentPlayer === 1 && _ckt.currentDart > 0 ? 1 : 0);
  var mpr0 = r0 >= 3 ? (_ckt.stats[0].totalMarks / r0).toFixed(1) : '---';
  var mpr1 = r1 >= 3 ? (_ckt.stats[1].totalMarks / r1).toFixed(1) : '---';
  _cktBoardCache.mprP0.textContent = 'MPR: ' + mpr0;
  _cktBoardCache.mprP1.textContent = 'MPR: ' + mpr1;
}

function _esc(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ============================================================
// INPUT RENDERING
// ============================================================

function _cktRefreshInput() {
  // Dart indicator
  var ind = document.getElementById('ckt-dart-ind');
  if (ind) {
    var cur = _ckt.currentDart; // 0/1/2
    var slots = '';
    for (var d = 0; d < 3; d++) {
      var thrown = _ckt._turnDarts[d];
      if (thrown) {
        // 投げた結果を表示
        var label = _cktDartLabel(thrown.numberIdx, thrown.mult);
        slots += '<span class="ckt-dart-slot used">' + label + '</span>';
      } else if (d === cur) {
        slots += '<span class="ckt-dart-slot active">●</span>';
      } else {
        slots += '<span class="ckt-dart-slot empty">○</span>';
      }
    }
    ind.innerHTML = '<span class="ckt-dart-name">' + _ckt.names[_ckt.currentPlayer] + '</span><span class="ckt-dart-slots">' + slots + '</span>';
    ind.className = 'ckt-dart-ind' + (_ckt.currentPlayer === 1 ? ' ckt-p2' : '');
  }

  // CPU area
  var cpuArea = document.getElementById('ckt-cpu-area');
  var inputArea = document.getElementById('ckt-input-area');
  var isCpu = _ckt.players === 3 && _ckt.currentPlayer === 1;
  if (cpuArea) cpuArea.style.display = isCpu ? 'flex' : 'none';
  if (inputArea) inputArea.style.display = isCpu ? 'none' : '';

  // Update compact grid: gray out fully closed number groups
  for (var i = 0; i < 7; i++) {
    var grp = document.getElementById('ckt-cgn-' + i);
    if (!grp) continue;
    var closed = _ckt.marks[0][i] >= 3 && _ckt.marks[1][i] >= 3;
    grp.classList.toggle('ckt-cg-closed', closed);
  }
}

// ============================================================
// CORE GAME LOGIC
// ============================================================

function _cktSaveSnapshot() {
  _ckt._undoStack.push({
    marks: [_ckt.marks[0].slice(), _ckt.marks[1].slice()],
    points: _ckt.points.slice(),
    currentPlayer: _ckt.currentPlayer,
    currentDart: _ckt.currentDart,
    round: _ckt.round,
    stats: [
      {totalMarks: _ckt.stats[0].totalMarks, rounds: _ckt.stats[0].rounds},
      {totalMarks: _ckt.stats[1].totalMarks, rounds: _ckt.stats[1].rounds}
    ],
    logLen: _ckt.log.length,
    turnDarts: (_ckt._turnDarts || []).slice()
  });
  // Keep at most 20 undo snapshots
  if (_ckt._undoStack.length > 20) _ckt._undoStack.shift();
}

// 1-tap: number + multiplier in one action
function cktHit(numberIdx, multiplier) {
  if (_ckt._busy) return;
  // Check if closed
  if (_ckt.marks[0][numberIdx] >= 3 && _ckt.marks[1][numberIdx] >= 3) return;
  _cktCommitDart(numberIdx, multiplier);
}

function cktSelectNumber(idx) {
  if (_ckt._busy) return;
  _ckt._selectedNumber = idx;
  _cktRefreshInput();
}

function cktSelectMult(mult) {
  if (_ckt._busy) return;
  if (_ckt._selectedNumber === -1) return;
  _cktCommitDart(_ckt._selectedNumber, mult);
}

function cktMiss() {
  if (_ckt._busy) return;
  _cktSaveSnapshot();
  _ckt.log.push({player: _ckt.currentPlayer, numberIdx: -1, mult: 0, marks: 0, scored: 0});
  _ckt._turnDarts.push({numberIdx: -1, mult: 0});
  _ckt._selectedNumber = -1;
  if (typeof sfxWrong === 'function') sfxWrong();
  _cktAdvanceDart();
}

// Core point calculation logic (used by both player and CPU)
function _cktCalculateScoring(p, numberIdx, multiplier) {
  var opp = 1 - p;
  var before = _ckt.marks[p][numberIdx];
  var newMarks = before + multiplier;
  var extraMarks = before >= 3 ? multiplier : Math.max(0, newMarks - 3);

  _ckt.marks[p][numberIdx] = newMarks;

  var scored = 0;
  if (newMarks > 3 && _ckt.marks[opp][numberIdx] < 3) {
    scored = extraMarks * CKT_NUMBERS[numberIdx];
    // オーバーキル判定: 点差200超は加点キャップ
    var maxAllowed = Math.max(0, 200 - (_ckt.points[p] - _ckt.points[opp]));
    if (scored > maxAllowed) {
      scored = maxAllowed;
      _cktTriggerOverkill();
    }
    _ckt.points[p] += scored;
  }

  _ckt.stats[p].totalMarks += multiplier;
  return {before: before, newMarks: newMarks, scored: scored};
}

function _cktCommitDart(numberIdx, multiplier) {
  _cktSaveSnapshot();
  var p = _ckt.currentPlayer;
  var opp = 1 - p;
  var result = _cktCalculateScoring(p, numberIdx, multiplier);
  var before = result.before;
  var newMarks = result.newMarks;
  var scored = result.scored;

  _ckt.log.push({player: p, numberIdx: numberIdx, mult: multiplier, marks: multiplier, scored: scored});
  _ckt._turnDarts.push({numberIdx: numberIdx, mult: multiplier});
  _ckt._selectedNumber = -1;

  // カット判定: プレイヤーがクローズ & CPUもそのナンバーをクローズ済み
  var justClosed = (before < 3 && newMarks >= 3);
  var oppHadScoring = (_ckt.marks[opp][numberIdx] >= 3);
  if (justClosed && oppHadScoring && typeof sfxCktCut === 'function') {
    sfxCktCut();
  } else if (typeof sfxCktHit === 'function') {
    sfxCktHit(multiplier);
  }

  // Check win
  if (_cktCheckWin(p)) {
    _cktEndGame(p);
    return;
  }

  _cktAdvanceDart();
}

function _cktAdvanceDart() {
  _ckt.currentDart++;
  if (_ckt.currentDart >= 3) {
    // End of turn
    _ckt.stats[_ckt.currentPlayer].rounds++;
    _ckt.currentDart = 0;
    _ckt.currentPlayer = 1 - _ckt.currentPlayer;
    if (_ckt.currentPlayer === 0) _ckt.round++;
    _ckt._selectedNumber = -1;
    _cktCheckTurnAchievement(); // ターン実績チェック（リセット前に）
    _ckt._turnDarts = []; // 新ターン開始でリセット

    _cktRefreshBoard();
    _cktRefreshInput();

    // If CPU turn, trigger
    if (_ckt.players === 3 && _ckt.currentPlayer === 1) {
      _cktCpuTurn();
    }
    return;
  }
  _cktRefreshBoard();
  _cktRefreshInput();
}

function _cktCheckWin(p) {
  // All 7 numbers must be closed (marks >= 3) AND points >= opponent
  for (var i = 0; i < 7; i++) {
    if (_ckt.marks[p][i] < 3) return false;
  }
  return _ckt.points[p] >= _ckt.points[1 - p];
}

// ============================================================
// CPU AI
// ============================================================

function _cktCpuTurn() {
  _ckt._busy = true;
  _ckt.currentDart = 0;
  _ckt._turnDarts = []; // CPUターン開始時にリセット
  _cktRefreshBoard();
  _cktRefreshInput();
  _cktCpuDart(0);
}

function _cktCpuDart(dartNum) {
  if (dartNum >= 3) {
    _ckt._busy = false;
    _ckt.stats[1].rounds++;
    _ckt.currentDart = 0;
    _ckt.currentPlayer = 0;
    _ckt.round++;
    _cktCheckTurnAchievement(); // ターン実績チェック（リセット前に）
    _ckt._turnDarts = []; // Player 1ターン開始時にリセット
    var targetEl2 = document.getElementById('ckt-cpu-target');
    if (targetEl2) targetEl2.textContent = '';
    _cktRefreshBoard();
    _cktRefreshInput();
    return;
  }

  // Natural throw tempo: 0.6-1.0s, first dart slightly longer
  var baseDelay = 600 + Math.floor(Math.random() * 400);
  var delay = dartNum === 0 ? baseDelay + 200 : baseDelay;

  // Show target immediately (before delay)
  var targetIdx = _cktCpuChooseTarget();
  var targetEl = document.getElementById('ckt-cpu-target');
  if (targetEl) {
    targetEl.textContent = (targetIdx === 6 ? 'BULL' : CKT_NUMBERS[targetIdx]) + ' を狙っています';
  }

  setTimeout(function() {
    var result = _cktCpuThrow(targetIdx);

    _cktSaveSnapshot();
    if (result.hit) {
      _cktCommitDartCpu(result.numberIdx, result.mult);
    } else {
      _ckt.log.push({player: 1, numberIdx: -1, mult: 0, marks: 0, scored: 0});
      _ckt._turnDarts.push({numberIdx: -1, mult: 0});
    }

    _ckt.currentDart = dartNum + 1;
    // hit/cut 音は _cktCommitDartCpu 側で処理、miss のみここで鳴らす
    if (!result.hit && typeof sfxWrong === 'function') sfxWrong();
    _cktRefreshBoard();
    _cktRefreshInput();

    // Check win after CPU dart
    if (result.hit && _cktCheckWin(1)) {
      _ckt._busy = false;
      _cktEndGame(1);
      return;
    }

    _cktCpuDart(dartNum + 1);
  }, delay);
}

function _cktCommitDartCpu(numberIdx, multiplier) {
  var p = 1;
  var opp = 0;
  var result = _cktCalculateScoring(p, numberIdx, multiplier);
  var before = result.before;
  var newMarks = result.newMarks;
  var scored = result.scored;

  // カット判定: CPUがクローズ & プレイヤーもそのナンバーをクローズ済み
  var cpuJustClosed = (before < 3 && newMarks >= 3);
  var playerHadScoring = (_ckt.marks[opp][numberIdx] >= 3);
  if (cpuJustClosed && playerHadScoring && typeof sfxCktCut === 'function') {
    sfxCktCut();
  } else if (typeof sfxCktHit === 'function') {
    sfxCktHit(multiplier);
  }

  _ckt.log.push({player: p, numberIdx: numberIdx, mult: multiplier, marks: multiplier, scored: scored});
  _ckt._turnDarts.push({numberIdx: numberIdx, mult: multiplier});
}

// ターン実績判定 (5マーク以上 / White Horse)
function _cktCheckTurnAchievement() {
  var darts = _ckt._turnDarts;
  if (!darts || darts.length === 0) return;
  var totalMarks = 0;
  for (var i = 0; i < darts.length; i++) {
    if (darts[i].numberIdx >= 0) totalMarks += darts[i].mult;
  }
  // White Horse: 3投すべてトリプル & すべて異なるナンバー
  var isWH = false;
  if (darts.length === 3) {
    var allT = darts[0].mult === 3 && darts[1].mult === 3 && darts[2].mult === 3;
    var allHit = darts[0].numberIdx >= 0 && darts[1].numberIdx >= 0 && darts[2].numberIdx >= 0;
    var allDiff = darts[0].numberIdx !== darts[1].numberIdx &&
                  darts[1].numberIdx !== darts[2].numberIdx &&
                  darts[0].numberIdx !== darts[2].numberIdx;
    isWH = allT && allHit && allDiff;
  }
  if (isWH) {
    _cktShowAchievement('WHITE HORSE!', 'wh', 2000);
    if (typeof sfxCktAchieve === 'function') sfxCktAchieve(9, true);
  } else if (totalMarks >= 5) {
    _cktShowAchievement(totalMarks + ' MARKS!', '', 1400);
    if (typeof sfxCktAchieve === 'function') sfxCktAchieve(totalMarks, false);
  }
}
var _cktAchQueue = [];
var _cktAchShowing = false;

function _cktShowAchievement(text, cls, duration) {
  _cktAchQueue.push({text: text, cls: cls, duration: duration || 1400});
  if (!_cktAchShowing) _cktProcessAchQueue();
}

function _cktProcessAchQueue() {
  if (_cktAchQueue.length === 0) { _cktAchShowing = false; return; }
  _cktAchShowing = true;
  var item = _cktAchQueue.shift();
  var el = document.getElementById('ckt-achievement');
  if (!el) { _cktAchShowing = false; return; }
  el.textContent = item.text;
  el.className = 'ckt-achievement' + (item.cls ? ' ' + item.cls : '') + ' show';
  clearTimeout(_ckt._achTimer);
  _ckt._achTimer = setTimeout(function() {
    el.classList.remove('show');
    setTimeout(_cktProcessAchQueue, 320); // フェードアウト後に次を表示
  }, item.duration);
}

// オーバーキル: 点差200以上で加点しようとした際に警告・加点キャップ
function _cktTriggerOverkill() {
  if (typeof sfxWrong === 'function') {
    sfxWrong();
    setTimeout(function() { if (typeof sfxWrong === 'function') sfxWrong(); }, 260);
  }
  _cktShowAchievement('OVERKILL!', 'ok', 1200);
}

function _cktCpuChooseTarget() {
  // ================================================================
  // 王道クリケット戦略（修正版）:
  // 基本: 20→19→18→17→16→15→BULL の順で閉じる
  //
  // 優先度の判断:
  // 1. 相手が閉じて自分が閉じてない番号 → 防御（相手のポイント加算を止める）
  //    ただし「残り3本でポイント逆転可能」なら逆転を優先
  // 2. ポイント差が相手に4マーク分以上離れたら加点より先にクローズを進める
  //    （相手に対してクローズ済み番号がなければ加点不可なので標準クローズ）
  // 3. ポイント逆転可能（残り3本 × 最高値で逆転圏内）なら加点優先
  // 4. それ以外は標準の 20→BULL 順クローズ
  // ================================================================
  var my = _ckt.marks[1];
  var opp = _ckt.marks[0];
  var myPts = _ckt.points[1];
  var oppPts = _ckt.points[0];
  var pointDiff = myPts - oppPts; // 正=CPU有利

  // カテゴリー分け
  var myOpen = [];
  var oppClosedMyClosed = []; // 相手が閉じて自分が未クローズ
  var scoreable = [];         // 自分が閉じて相手が未クローズ（加点可能）

  for (var i = 0; i < 7; i++) {
    var myClosed = my[i] >= 3;
    var oppClosed = opp[i] >= 3;
    if (!myClosed) myOpen.push(i);
    if (!myClosed && oppClosed) oppClosedMyClosed.push(i);
    if (myClosed && !oppClosed) scoreable.push(i);
  }

  // 最高値加点可能番号
  var topScoreable = scoreable.length > 0
    ? scoreable.slice().sort(function(a,b){ return CKT_NUMBERS[b]-CKT_NUMBERS[a]; })[0]
    : -1;
  var maxScorePerDart = topScoreable >= 0 ? CKT_NUMBERS[topScoreable] * 3 : 0;

  // 3本で逆転可能かどうか
  var canComebackIn3 = pointDiff < 0 && maxScorePerDart * 3 >= (-pointDiff);

  // 1. 3本で逆転可能ならポイント加点を最優先
  if (canComebackIn3 && topScoreable >= 0) {
    return topScoreable;
  }

  // 2. 相手が閉じて自分が未クローズ → 防御
  // ただしオーバーキルキャップにより残り脅威が次ターゲット1マーク未満なら防御スキップ
  if (oppClosedMyClosed.length > 0) {
    var oppRemainCap = Math.max(0, 200 - (oppPts - myPts));
    var nextStdTarget = myOpen.slice().sort(function(a,b){ return a-b; })[0];
    var nextStdValue = nextStdTarget >= 0 ? CKT_NUMBERS[nextStdTarget] : 0;
    if (oppRemainCap >= nextStdValue) {
      // 脅威が十分大きい → 防御
      oppClosedMyClosed.sort(function(a, b) {
        var diff = my[b] - my[a];
        if (diff !== 0) return diff;
        return CKT_NUMBERS[b] - CKT_NUMBERS[a];
      });
      return oppClosedMyClosed[0];
    }
    // oppRemainCap < nextStdValue → 脅威軽微、標準クローズへ
  }

  // 3. 加点可能 & 閉じ遅れが2未満 → 加点（クリケット攻めの前提）
  // 相手より2ナンバー以上先行されていない限り、クローズ済み番号で得点を稼ぐ
  if (topScoreable >= 0) {
    var myClosedCount = 7 - myOpen.length;
    var oppClosedCount = 0;
    for (var ci = 0; ci < 7; ci++) { if (opp[ci] >= 3) oppClosedCount++; }
    var closingGap = oppClosedCount - myClosedCount; // 正=相手が先行
    if (closingGap <= 1) {
      return topScoreable;
    }
  }

  // 4. 大幅な閉じ遅れ or 加点不可 → 追いかけクローズ
  // 4a. ポイント負けで4マーク分以上差がある & 加点可能 → 加点
  var bigPointGap = pointDiff < 0 && topScoreable >= 0 && (-pointDiff) > CKT_NUMBERS[topScoreable] * 4;
  if (bigPointGap) {
    return topScoreable;
  }

  // 4b. 標準クローズ: 20→19→...→15→BULL
  if (myOpen.length > 0) {
    // 2マーク（あと1本でクローズ）の番号を優先
    var almostClosed = myOpen.filter(function(idx) { return my[idx] === 2; });
    if (almostClosed.length > 0) {
      almostClosed.sort(function(a, b) { return CKT_NUMBERS[b] - CKT_NUMBERS[a]; });
      return almostClosed[0];
    }
    myOpen.sort(function(a, b) { return a - b; }); // 20優先（index小さい順）
    return myOpen[0];
  }

  // 5. 全クローズ済み → 加点
  if (topScoreable >= 0) return topScoreable;
  return 0;
}

function _cktCpuThrow(targetIdx) {
  var lv = _ckt.cpuLevel;
  var hitRate = _CKT_CPU_HIT[lv] || 0.3;
  var tripleRate = _CKT_CPU_TRIPLE[lv] || 0.05;
  var doubleRate = _CKT_CPU_DOUBLE[lv] || 0.1;

  if (Math.random() > hitRate) {
    // Miss the number entirely
    return {hit: false, numberIdx: -1, mult: 0};
  }

  // Hit the intended number, determine multiplier
  var mult;
  if (targetIdx === 6) {
    // Bull: only S-Bull (1) or D-Bull (2)
    mult = Math.random() < doubleRate ? 2 : 1;
  } else {
    var r = Math.random();
    if (r < tripleRate) mult = 3;
    else if (r < tripleRate + doubleRate) mult = 2;
    else mult = 1;
  }

  return {hit: true, numberIdx: targetIdx, mult: mult};
}

// ============================================================
// UNDO
// ============================================================

function cktUndoTurn() {
  if (_ckt._busy) return;
  if (_ckt.currentDart === 0) return; // このターンまだ投げていない
  var targetPlayer = _ckt.currentPlayer;
  var firstSnap = null;
  // スタックを遡り、ターン開始時点（currentDart===0, 同プレイヤー）のスナップを探す
  while (_ckt._undoStack.length > 0) {
    var top = _ckt._undoStack[_ckt._undoStack.length - 1];
    if (top.currentPlayer !== targetPlayer) break;
    firstSnap = _ckt._undoStack.pop();
    if (firstSnap.currentDart === 0) break;
  }
  if (!firstSnap) return;
  _ckt.marks = [firstSnap.marks[0].slice(), firstSnap.marks[1].slice()];
  _ckt.points = firstSnap.points.slice();
  _ckt.currentPlayer = firstSnap.currentPlayer;
  _ckt.currentDart = 0;
  _ckt.round = firstSnap.round;
  _ckt.stats = [
    {totalMarks: firstSnap.stats[0].totalMarks, rounds: firstSnap.stats[0].rounds},
    {totalMarks: firstSnap.stats[1].totalMarks, rounds: firstSnap.stats[1].rounds}
  ];
  _ckt.log = _ckt.log.slice(0, firstSnap.logLen);
  _ckt._turnDarts = [];
  _ckt._selectedNumber = -1;
  _cktRefreshBoard();
  _cktRefreshInput();
}

function cktUndoDart() {
  if (_ckt._busy) return;
  if (_ckt._undoStack.length === 0) return;
  var snap = _ckt._undoStack.pop();
  _ckt.marks = [snap.marks[0].slice(), snap.marks[1].slice()];
  _ckt.points = snap.points.slice();
  _ckt.currentPlayer = snap.currentPlayer;
  _ckt.currentDart = snap.currentDart;
  _ckt.round = snap.round;
  _ckt.stats = [
    {totalMarks: snap.stats[0].totalMarks, rounds: snap.stats[0].rounds},
    {totalMarks: snap.stats[1].totalMarks, rounds: snap.stats[1].rounds}
  ];
  _ckt.log = _ckt.log.slice(0, snap.logLen);
  _ckt._turnDarts = snap.turnDarts ? snap.turnDarts.slice() : [];
  _ckt._selectedNumber = -1;
  _cktRefreshBoard();
  _cktRefreshInput();
}

// ============================================================
// GAME END
// ============================================================

function _cktEndGame(winner) {
  _ckt._busy = false;
  if (typeof sfxCheckout === 'function') sfxCheckout();

  document.getElementById('ckt-game-screen').style.display = 'none';
  document.getElementById('ckt-result-wrap').style.display = '';

  var title = document.getElementById('ckt-result-title');
  var winnerEl = document.getElementById('ckt-result-winner');
  title.textContent = 'GAME OVER';
  winnerEl.textContent = _ckt.names[winner] + ' WIN!';
  winnerEl.style.color = winner === 0 ? 'var(--acc)' : 'var(--acc2)';

  var mpr0 = _ckt.stats[0].rounds > 0 ? (_ckt.stats[0].totalMarks / _ckt.stats[0].rounds).toFixed(2) : '0.00';
  var mpr1 = _ckt.stats[1].rounds > 0 ? (_ckt.stats[1].totalMarks / _ckt.stats[1].rounds).toFixed(2) : '0.00';

  var statsEl = document.getElementById('ckt-stats-table');
  var sh = '<table style="width:100%;border-collapse:collapse;font-size:13px;">';
  sh += '<tr style="color:var(--mut);font-size:10px;letter-spacing:1px;">';
  sh += '<td style="padding:6px;text-align:right;">' + _esc(_ckt.names[0]) + '</td>';
  sh += '<td style="padding:6px;text-align:center;">STAT</td>';
  sh += '<td style="padding:6px;text-align:left;">' + _esc(_ckt.names[1]) + '</td>';
  sh += '</tr>';
  sh += _cktStatRow(mpr0, 'MPR', mpr1);
  sh += _cktStatRow(String(_ckt.points[0]), 'Points', String(_ckt.points[1]));
  sh += _cktStatRow(String(_ckt.stats[0].rounds), 'Rounds', String(_ckt.stats[1].rounds));
  sh += _cktStatRow(String(_ckt.stats[0].totalMarks), 'Total Marks', String(_ckt.stats[1].totalMarks));
  sh += '</table>';
  statsEl.innerHTML = sh;

  // Show LV up button if vs CPU and not already at max level
  var lvupBtn = document.getElementById('ckt-lvup-btn');
  if (lvupBtn) lvupBtn.style.display = (_ckt.players === 3 && _ckt.cpuLevel < 12) ? '' : 'none';

  // Save history
  _cktSaveHistory(winner);
}

function _cktStatRow(v0, label, v1) {
  return '<tr style="border-top:1px solid var(--bdr);">' +
    '<td style="padding:6px;text-align:right;font-weight:700;color:var(--txt);">' + v0 + '</td>' +
    '<td style="padding:6px;text-align:center;color:var(--mut);font-size:11px;">' + label + '</td>' +
    '<td style="padding:6px;text-align:left;font-weight:700;color:var(--txt);">' + v1 + '</td>' +
    '</tr>';
}

function _cktStatCard(label, value) {
  return '<div style="text-align:center;padding:4px 2px;">' +
    '<div style="font-size:17px;font-weight:700;color:var(--acc);">' + value + '</div>' +
    '<div style="font-size:10px;color:var(--mut);margin-top:2px;">' + label + '</div>' +
    '</div>';
}

function _cktRenderMprTrend(h) {
  // MPR推移（最新10ゲーム）
  var recent = h.slice(0, 10).reverse();
  if (recent.length === 0) return '';
  var html = '<div style="margin-top:12px;padding:10px;background:rgba(232,255,71,0.05);border-radius:8px;">';
  html += '<div style="font-size:10px;color:var(--mut);letter-spacing:1px;margin-bottom:6px;">MPR推移（最新10試合）</div>';
  html += '<div style="display:flex;gap:2px;align-items:flex-end;height:60px;">';
  var maxMpr = Math.max.apply(null, recent.map(function(g){ return g.mpr[0] || 0; }));
  var maxMpr2 = Math.max(maxMpr, 3);
  recent.forEach(function(g) {
    var mpr = g.mpr[0] || 0;
    var h_val = (mpr / maxMpr2 * 55) + 5;
    var color = mpr >= 2.5 ? 'var(--acc)' : 'var(--acc2)';
    html += '<div style="flex:1;height:' + h_val + 'px;background:' + color + ';border-radius:2px;opacity:0.7;font-size:7px;display:flex;align-items:flex-end;justify-content:center;color:#000;padding-bottom:2px;">';
    if (mpr > 0) html += mpr.toFixed(1);
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

function _cktRenderLevelStats(h) {
  // レベル別勝率
  var levelWins = {}, levelTotal = {};
  h.forEach(function(g) {
    if (g.players !== 3) return;
    var lv = g.cpuLevel || 4;
    levelTotal[lv] = (levelTotal[lv] || 0) + 1;
    if (g.winner === 0) levelWins[lv] = (levelWins[lv] || 0) + 1;
  });
  var levels = Object.keys(levelTotal).map(function(x){ return parseInt(x, 10); }).sort(function(a,b){ return b - a; });
  if (levels.length === 0) return '';
  var html = '<div style="margin-top:12px;padding:10px;background:rgba(232,255,71,0.05);border-radius:8px;">';
  html += '<div style="font-size:10px;color:var(--mut);letter-spacing:1px;margin-bottom:6px;">レベル別勝率</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(' + Math.min(levels.length, 6) + ',1fr);gap:4px;">';
  levels.forEach(function(lv) {
    var wins = levelWins[lv] || 0;
    var total = levelTotal[lv];
    var rate = Math.round(wins / total * 100);
    html += '<div style="text-align:center;padding:4px;background:var(--sur);border-radius:6px;">';
    html += '<div style="font-size:13px;font-weight:700;color:' + (rate >= 50 ? 'var(--acc)' : 'var(--acc2)') + ';">' + rate + '%</div>';
    html += '<div style="font-size:9px;color:var(--mut);">LV' + lv + ' (' + wins + '/' + total + ')</div>';
    html += '</div>';
  });
  html += '</div></div>';
  return html;
}

// ============================================================
// HISTORY
// ============================================================

function _cktGetHistory() {
  try { return JSON.parse(localStorage.getItem('dh_ckt') || '[]'); } catch(e) { return []; }
}

function _cktSaveHistory(winner) {
  try {
    var h = _cktGetHistory();
    var mpr0 = _ckt.stats[0].rounds > 0 ? (_ckt.stats[0].totalMarks / _ckt.stats[0].rounds) : 0;
    var mpr1 = _ckt.stats[1].rounds > 0 ? (_ckt.stats[1].totalMarks / _ckt.stats[1].rounds) : 0;
    h.unshift({
      date: new Date().toISOString(),
      names: _ckt.names.slice(),
      winner: winner,
      points: _ckt.points.slice(),
      mpr: [Math.round(mpr0 * 100) / 100, Math.round(mpr1 * 100) / 100],
      rounds: _ckt.round,
      players: _ckt.players,
      cpuLevel: _ckt.cpuLevel
    });
    localStorage.setItem('dh_ckt', JSON.stringify(h.slice(0, 100)));
  } catch(ex) {}
}

function _cktRenderHistory() {
  var wrap = document.getElementById('ckt-hist-wrap');
  if (!wrap) return;
  var h = _cktGetHistory();

  if (h.length === 0) {
    wrap.innerHTML = '<div style="padding:24px;text-align:center;color:var(--mut);font-size:13px;">まだ履歴がありません</div>';
    return;
  }

  // Show Cricket statistics
  renderCktStats();

  // Aggregate stats (Player 1 = user perspective)
  var cpuGames = h.filter(function(g){ return g.players === 3; });
  var twoPGames = h.filter(function(g){ return g.players === 2; });
  var cpuWins = cpuGames.filter(function(g){ return g.winner === 0; }).length;
  var allMpr = h.map(function(g){ return g.mpr[0]; }).filter(function(v){ return v > 0; });
  var avgMpr = allMpr.length > 0 ? allMpr.reduce(function(a,b){ return a+b; }, 0) / allMpr.length : 0;
  var bestMpr = allMpr.length > 0 ? Math.max.apply(null, allMpr) : 0;
  var allRounds = h.map(function(g){ return g.rounds; });
  var avgRounds = allRounds.length > 0 ? allRounds.reduce(function(a,b){ return a+b; }, 0) / allRounds.length : 0;
  var cpuWinRate = cpuGames.length > 0 ? Math.round(cpuWins / cpuGames.length * 100) + '%' : '—';

  var html = '<div style="padding:8px;">';

  // Summary card
  html += '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:10px;padding:12px;margin-bottom:10px;">';
  html += '<div style="font-size:10px;color:var(--mut);letter-spacing:1px;margin-bottom:10px;text-align:center;">STATS SUMMARY</div>';
  html += '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:4px;">';
  html += _cktStatCard('総試合', h.length + '戦');
  html += _cktStatCard('対CPU勝率', cpuWinRate);
  html += _cktStatCard('平均MPR', avgMpr > 0 ? avgMpr.toFixed(2) : '—');
  html += _cktStatCard('最高MPR', bestMpr > 0 ? bestMpr.toFixed(2) : '—');
  html += _cktStatCard('平均R数', avgRounds > 0 ? avgRounds.toFixed(1) : '—');
  html += _cktStatCard('2P試合', twoPGames.length + '戦');
  html += '</div></div>';

  // MPR推移とレベル別成績
  html += _cktRenderMprTrend(h);
  html += _cktRenderLevelStats(h);

  // Game list
  for (var i = 0; i < h.length; i++) {
    var g = h[i];
    var d = new Date(g.date);
    var ds = d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
    var winner = g.names[g.winner];
    var mode = g.players === 3 ? 'vs CPU Lv.' + g.cpuLevel : '2P';
    html += '<div style="background:var(--sur);border:1px solid var(--bdr);border-radius:8px;padding:10px;margin-bottom:6px;">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;">';
    html += '<div style="font-size:12px;font-weight:700;color:var(--acc);">' + _esc(winner) + ' WIN</div>';
    html += '<div style="font-size:10px;color:var(--mut);">' + ds + '</div>';
    html += '</div>';
    html += '<div style="font-size:11px;color:var(--mut);margin-top:4px;">' + mode + ' | ' + g.rounds + 'R | ';
    html += _esc(g.names[0]) + ' MPR:' + (g.mpr[0]).toFixed(2) + ' pts:' + g.points[0];
    html += ' vs ' + _esc(g.names[1]) + ' MPR:' + (g.mpr[1]).toFixed(2) + ' pts:' + g.points[1];
    html += '</div></div>';
  }

  html += '</div>';
  wrap.innerHTML = html;
}

// ============================================================
// NAVIGATION
// ============================================================

function goSubCktGame() {
  document.getElementById('subCkt-game').className = 'cu-subtab on';
  document.getElementById('subCkt-hist').className = 'cu-subtab';
  document.getElementById('ckt-game-wrap').style.display = 'flex';
  document.getElementById('ckt-hist-wrap').style.display = 'none';
}

function goSubCktHist() {
  document.getElementById('subCkt-game').className = 'cu-subtab';
  document.getElementById('subCkt-hist').className = 'cu-subtab on';
  document.getElementById('ckt-game-wrap').style.display = 'none';
  document.getElementById('ckt-hist-wrap').style.display = '';
  _cktRenderHistory();
}

function cktAgain() {
  cktStart();
}

function cktAgainLvUp() {
  cktSetCpu(Math.min(_ckt.cpuLevel + 1, 12));
  cktStart();
}

function cktBackSetup() {
  document.getElementById('ckt-result-wrap').style.display = 'none';
  _cktShowSetup();
}

function cktToggleSound() {
  if (typeof toggleSound === 'function') toggleSound();
  var btn = document.getElementById('ckt-snd-btn2');
  if (btn) btn.textContent = (typeof _sndOn !== 'undefined' && _sndOn) ? '🔊' : '🔇';
}

function cktConfirmExit() {
  document.getElementById('ckt-exit-confirm').style.display = 'flex';
}

function cktExitYes() {
  document.getElementById('ckt-exit-confirm').style.display = 'none';
  document.getElementById('ckt-game-screen').style.display = 'none';
  _cktShowSetup();
}

function cktExitNo() {
  document.getElementById('ckt-exit-confirm').style.display = 'none';
}

// ============================================================
// SHARE
// ============================================================

function shareCkt() {
  var mpr0 = _ckt.stats[0].rounds > 0 ? (_ckt.stats[0].totalMarks / _ckt.stats[0].rounds).toFixed(2) : '0.00';
  var mpr1 = _ckt.stats[1].rounds > 0 ? (_ckt.stats[1].totalMarks / _ckt.stats[1].rounds).toFixed(2) : '0.00';
  var text = '🎯 Cricket Result\n';
  text += _ckt.names[0] + ': MPR ' + mpr0 + ' / ' + _ckt.points[0] + 'pts\n';
  text += _ckt.names[1] + ': MPR ' + mpr1 + ' / ' + _ckt.points[1] + 'pts\n';
  text += _ckt.round + ' rounds';

  if (navigator.share) {
    navigator.share({text: text}).catch(function(){});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      alert('コピーしました');
    }).catch(function(){});
  }
}

// ============================================================
// KEYBOARD INPUT FOR CRICKET MODE
// ============================================================
document.addEventListener('keydown', function(e) {
  // Skip if history or other modals are open
  if (document.getElementById('vhist').style.display !== 'none') return;
  var scEd = document.getElementById('sc-editor');
  if (scEd && scEd.classList.contains('show')) return;

  // Cricket mode is active
  var vcktEl = document.getElementById('vckt');
  if (!vcktEl || vcktEl.style.display === 'none') return;

  var cktGameScreen = document.getElementById('ckt-game-screen');
  var cktResultWrap = document.getElementById('ckt-result-wrap');
  if (!cktGameScreen || cktGameScreen.style.display === 'none') return;
  if (cktResultWrap && cktResultWrap.style.display !== 'none') return;

  var key = e.key.toLowerCase();

  // Numbers 0-6: Select cricket number
  if (key >= '0' && key <= '6') {
    var num = parseInt(key, 10);
    if (num < CKT_NUMBERS.length) {
      e.preventDefault();
      cktSelectNumber(num);
    }
    return;
  }

  // S/D/T: Single/Double/Triple
  if (key === 's' || key === 'S') {
    e.preventDefault();
    cktSelectMult(1);
    return;
  }
  if (key === 'd' || key === 'D') {
    e.preventDefault();
    cktSelectMult(2);
    return;
  }
  if (key === 't' || key === 'T') {
    e.preventDefault();
    cktSelectMult(3);
    return;
  }

  // Backspace: Record a miss
  if (e.key === 'Backspace') {
    e.preventDefault();
    cktMiss();
    return;
  }
});

// ============================================================
// REGISTER FUNCTIONS
// ============================================================
(function() {
  if (typeof _fns === 'undefined') return;
  _fns.goTabCkt      = function() { goTab('ckt'); };
  _fns.goSubCktGame  = goSubCktGame;
  _fns.goSubCktHist  = goSubCktHist;
  _fns.cktSetPlayers = cktSetPlayers;
  _fns.cktSetCpu     = cktSetCpu;
  _fns.cktStart      = cktStart;
  _fns.cktHit        = function(el) { cktHit(parseInt(el.getAttribute('data-num'),10), parseInt(el.getAttribute('data-mult'),10)); };
  _fns.cktSelectNumber = cktSelectNumber;
  _fns.cktSelectMult = cktSelectMult;
  _fns.cktMiss       = cktMiss;
  _fns.cktUndoDart   = cktUndoDart;
  _fns.cktUndoTurn   = cktUndoTurn;
  _fns.cktToggleSound = cktToggleSound;
  _fns.cktAgain      = cktAgain;
  _fns.cktAgainLvUp  = cktAgainLvUp;
  _fns.cktBackSetup  = cktBackSetup;
  _fns.cktConfirmExit = cktConfirmExit;
  _fns.cktExitYes    = cktExitYes;
  _fns.cktExitNo     = cktExitNo;
  _fns.shareCkt      = shareCkt;
})();

// Move vckt inside .app if it was placed outside (HTML structure issue)
(function(){
  var vckt = document.getElementById('vckt');
  var app  = document.querySelector('.app');
  if (app && vckt && !app.contains(vckt)) {
    app.appendChild(vckt);
  }
})();

/* ============================================================
   CRICKET STATISTICS & ANALYTICS
   ============================================================ */

var _cktStatsTab = 'day';

function renderCktStats() {
  var h = _cktGetHistory();
  if (!h.length) return;

  var container = document.getElementById('ckt-stats-container');
  if (!container) return;

  // タブ UI
  var tabs = ['day', 'week', 'month'].map(function(t) {
    return '<div class="ckt-stats-tab ' + (_cktStatsTab === t ? 'on' : '') + '" data-tab="' + t + '">' +
      (t === 'day' ? '本日' : t === 'week' ? '今週' : '今月') + '</div>';
  }).join('');

  // フィルタリング
  var now = new Date();
  var filtered = h.filter(function(g) {
    var gd = new Date(g.date);
    if (_cktStatsTab === 'day') {
      return gd.toDateString() === now.toDateString();
    } else if (_cktStatsTab === 'week') {
      var weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - (now.getDay() || 7) + 1);
      return gd >= weekStart;
    } else {
      return gd.getFullYear() === now.getFullYear() &&
             gd.getMonth() === now.getMonth();
    }
  });

  if (!filtered.length) {
    container.innerHTML = '<div class="ckt-stats-empty">データなし</div>';
    setupCktStatsTabs();
    return;
  }

  // 統計計算
  var mprs = filtered.map(function(g) { return g.mpr || 0; });
  var avgMpr = (mprs.reduce(function(a, b) { return a + b; }, 0) / mprs.length).toFixed(2);
  var maxMpr = Math.max.apply(null, mprs);
  var minMpr = Math.min.apply(null, mprs);
  var trend = '';
  if (filtered.length >= 2) {
    var latestMpr = filtered[0].mpr || 0;
    var prevMpr = filtered[1].mpr || 0;
    if (latestMpr > prevMpr) trend = '<span style="color:#ff6b35;font-weight:900;">▲</span>';
    else if (latestMpr < prevMpr) trend = '<span style="color:#4fc3f7;font-weight:900;">▼</span>';
  }

  var html = '<div class="ckt-stats-tabs">' + tabs + '</div>' +
    '<div class="ckt-stats-grid">' +
      '<div class="ckt-stat-card">' +
        '<div style="color:var(--mut);font-size:10px;letter-spacing:1px;">平均MPR</div>' +
        '<div style="font-size:24px;font-family:\'Bebas Neue\',cursive;color:#47ffb4;font-weight:700;margin-top:4px;">' + avgMpr + ' ' + trend + '</div>' +
      '</div>' +
      '<div class="ckt-stat-card">' +
        '<div style="color:var(--mut);font-size:10px;letter-spacing:1px;">最高MPR</div>' +
        '<div style="font-size:24px;font-family:\'Bebas Neue\',cursive;color:var(--acc);font-weight:700;margin-top:4px;">' + maxMpr.toFixed(2) + '</div>' +
      '</div>' +
      '<div class="ckt-stat-card">' +
        '<div style="color:var(--mut);font-size:10px;letter-spacing:1px;">ゲーム数</div>' +
        '<div style="font-size:24px;font-family:\'Bebas Neue\',cursive;color:var(--grn);font-weight:700;margin-top:4px;">' + filtered.length + '</div>' +
      '</div>' +
    '</div>';

  container.innerHTML = html;
  setupCktStatsTabs();
  drawCktChart();
}

function setupCktStatsTabs() {
  var tabs = document.querySelectorAll('.ckt-stats-tab');
  tabs.forEach(function(tab) {
    tab.addEventListener('click', function() {
      _cktStatsTab = tab.getAttribute('data-tab');
      renderCktStats();
    });
  });
}

function drawCktChart() {
  var h = _cktGetHistory();
  var wrap = document.getElementById('ckt-chart-wrap');
  var canvas = document.getElementById('ckt-chart');

  if (!wrap || !canvas || h.length < 2) {
    if (wrap) wrap.style.display = 'none';
    return;
  }

  wrap.style.display = 'block';

  // 直近30ゲーム、古い順に逆順
  var base = h.slice(0, 30).reverse();
  var scores = base.map(function(g, i) {
    var window10 = base.slice(Math.max(0, i - 9), i + 1);
    var sum = 0;
    for (var j = 0; j < window10.length; j++) sum += window10[j].mpr || 0;
    return Math.round((sum / window10.length) * 100) / 100;
  });

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

  // グリッド
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for (var g = 0; g <= 4; g++) {
    var gy = pad.top + (gh / 4) * g;
    ctx.beginPath();
    ctx.moveTo(pad.left, gy);
    ctx.lineTo(pad.left + gw, gy);
    ctx.stroke();
    var lv = Math.round(max - (range / 4) * g * 100) / 100;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(lv, pad.left - 4, gy + 3);
  }

  // グラフデータ計算
  var pts = scores.map(function(s, i) {
    return {
      x: pad.left + (i / (scores.length - 1)) * gw,
      y: pad.top + gh - ((s - min) / range) * gh
    };
  });

  // グラデーション塗り
  var grad = ctx.createLinearGradient(0, pad.top, 0, pad.top + gh);
  grad.addColorStop(0, 'rgba(71,255,180,0.3)');
  grad.addColorStop(1, 'rgba(71,255,180,0)');
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pad.top + gh);
  pts.forEach(function(p) { ctx.lineTo(p.x, p.y); });
  ctx.lineTo(pts[pts.length-1].x, pad.top + gh);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 折れ線
  ctx.beginPath();
  ctx.strokeStyle = '#47ffb4';
  ctx.lineWidth = 2;
  pts.forEach(function(p, i) {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();

  // ドット
  pts.forEach(function(p) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#47ffb4';
    ctx.fill();
  });
}
