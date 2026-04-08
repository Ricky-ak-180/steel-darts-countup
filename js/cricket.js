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

// CPU hit rate per level (probability of hitting intended number)
// Index 0 unused; levels 1-12
var _CKT_CPU_HIT = [0, 0.15, 0.22, 0.30, 0.38, 0.46, 0.54, 0.62, 0.70, 0.78, 0.84, 0.90, 0.95];
// CPU triple rate when hitting the intended number
var _CKT_CPU_TRIPLE = [0, 0.02, 0.04, 0.06, 0.10, 0.15, 0.20, 0.28, 0.35, 0.42, 0.50, 0.58, 0.65];
// CPU double rate when hitting the intended number (and not triple)
var _CKT_CPU_DOUBLE = [0, 0.05, 0.08, 0.12, 0.16, 0.20, 0.25, 0.30, 0.35, 0.40, 0.45, 0.50, 0.55];

// CPU level descriptions
var _CKT_CPU_DESC = [
  '', 'MPR ~0.5', 'MPR ~0.8', 'MPR ~1.2', 'MPR ~1.6', 'MPR ~2.0',
  'MPR ~2.4', 'MPR ~2.8', 'MPR ~3.2', 'MPR ~3.6', 'MPR ~4.0', 'MPR ~4.5', 'MPR ~5.0'
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
  document.querySelectorAll('#ckt-setup-wrap [data-fn="cktSetCpu"]').forEach(function(el) {
    el.classList.toggle('on', parseInt(el.getAttribute('data-arg'), 10) === arg);
  });
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

function _cktMarkStr(count) {
  if (count === 0) return '<span class="ckt-mark-empty"></span>';
  if (count === 1) return '<span class="ckt-mark-slash">/</span>';
  if (count === 2) return '<span class="ckt-mark-x">✕</span>';
  return '<span class="ckt-mark-closed">●</span>';
}

function _cktRefreshBoard() {
  var el = document.getElementById('ckt-board');
  if (!el) return;
  var h = '';
  var p0 = _ckt.currentPlayer === 0 ? ' ckt-active-player' : '';
  var p1 = _ckt.currentPlayer === 1 ? ' ckt-active-player' : '';

  h += '<div class="ckt-header">';
  h += '<div class="ckt-hdr-name' + p0 + '">' + _esc(_ckt.names[0]) + '</div>';
  h += '<div class="ckt-hdr-mid"></div>';
  h += '<div class="ckt-hdr-name' + p1 + '">' + _esc(_ckt.names[1]) + '</div>';
  h += '</div>';

  h += '<div class="ckt-points-row">';
  h += '<div class="ckt-points' + p0 + '">' + _ckt.points[0] + '</div>';
  h += '<div class="ckt-pts-mid">PTS</div>';
  h += '<div class="ckt-points' + p1 + '">' + _ckt.points[1] + '</div>';
  h += '</div>';

  for (var i = 0; i < 7; i++) {
    var numLabel = i === 6 ? 'BULL' : String(CKT_NUMBERS[i]);
    var m0 = _ckt.marks[0][i];
    var m1 = _ckt.marks[1][i];
    var closed = m0 >= 3 && m1 >= 3;
    h += '<div class="ckt-row' + (closed ? ' ckt-row-closed' : '') + '">';
    h += '<div class="ckt-marks">' + _cktMarkStr(m0) + '</div>';
    h += '<div class="ckt-number">' + numLabel + '</div>';
    h += '<div class="ckt-marks">' + _cktMarkStr(m1) + '</div>';
    h += '</div>';
  }

  // MPR row
  var mpr0 = _ckt.stats[0].rounds > 0 ? (_ckt.stats[0].totalMarks / _ckt.stats[0].rounds).toFixed(1) : '0.0';
  var mpr1 = _ckt.stats[1].rounds > 0 ? (_ckt.stats[1].totalMarks / _ckt.stats[1].rounds).toFixed(1) : '0.0';
  h += '<div class="ckt-mpr-row">';
  h += '<div class="ckt-mpr">MPR: ' + mpr0 + '</div>';
  h += '<div class="ckt-mpr-mid">R' + _ckt.round + '</div>';
  h += '<div class="ckt-mpr">MPR: ' + mpr1 + '</div>';
  h += '</div>';

  el.innerHTML = h;
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
    ind.textContent = _ckt.names[_ckt.currentPlayer] + ' — Dart ' + (_ckt.currentDart + 1) + '/3';
    ind.className = 'ckt-dart-ind' + (_ckt.currentPlayer === 1 ? ' ckt-p2' : '');
  }

  // CPU area
  var cpuArea = document.getElementById('ckt-cpu-area');
  var inputArea = document.getElementById('ckt-input-area');
  var isCpu = _ckt.players === 3 && _ckt.currentPlayer === 1;
  if (cpuArea) cpuArea.style.display = isCpu ? 'flex' : 'none';
  if (inputArea) inputArea.style.display = isCpu ? 'none' : '';

  // Number buttons highlighting
  var btns = document.querySelectorAll('.ckt-number-btn');
  btns.forEach(function(btn) {
    var idx = parseInt(btn.getAttribute('data-arg'), 10);
    btn.classList.toggle('on', idx === _ckt._selectedNumber);
    // Gray out fully closed numbers
    var closed = _ckt.marks[0][idx] >= 3 && _ckt.marks[1][idx] >= 3;
    btn.classList.toggle('ckt-closed', closed);
  });

  // Multiplier buttons: if Bull is selected, show S-BULL / D-BULL
  var multS = document.getElementById('ckt-mult-s');
  var multD = document.getElementById('ckt-mult-d');
  var multT = document.getElementById('ckt-mult-t');
  if (_ckt._selectedNumber === 6) {
    if (multS) multS.textContent = 'S-BULL';
    if (multD) multD.textContent = 'D-BULL';
    if (multT) multT.style.display = 'none';
  } else {
    if (multS) multS.textContent = 'S';
    if (multD) multD.textContent = 'D';
    if (multT) multT.style.display = '';
  }

  // Disable multipliers if no number selected
  var multRow = document.getElementById('ckt-mult-row');
  if (multRow) {
    var mbtns = multRow.querySelectorAll('.ckt-mult-btn');
    mbtns.forEach(function(b) {
      b.classList.toggle('ckt-disabled', _ckt._selectedNumber === -1 && b.getAttribute('data-fn') !== 'cktMiss');
    });
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
    logLen: _ckt.log.length
  });
  // Keep at most 20 undo snapshots
  if (_ckt._undoStack.length > 20) _ckt._undoStack.shift();
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
  _ckt._selectedNumber = -1;
  _cktAdvanceDart();
}

function _cktCommitDart(numberIdx, multiplier) {
  _cktSaveSnapshot();
  var p = _ckt.currentPlayer;
  var opp = 1 - p;
  var before = _ckt.marks[p][numberIdx];
  var newMarks = before + multiplier;
  var marksApplied = Math.min(newMarks, 3) - before; // marks that count toward closing
  var extraMarks = Math.max(0, newMarks - 3);

  _ckt.marks[p][numberIdx] = Math.min(newMarks, 3 + extraMarks); // store up to what was scored
  // Actually: marks array stores raw total capped for display: 0,1,2,3+
  _ckt.marks[p][numberIdx] = newMarks; // keep full count for scoring calc

  // Calculate scoring
  var scored = 0;
  if (newMarks > 3 && _ckt.marks[opp][numberIdx] < 3) {
    // Score extra marks
    scored = extraMarks * CKT_NUMBERS[numberIdx];
    _ckt.points[p] += scored;
  }

  // Track marks for MPR (only marks toward closing or scoring count)
  _ckt.stats[p].totalMarks += multiplier;

  _ckt.log.push({player: p, numberIdx: numberIdx, mult: multiplier, marks: multiplier, scored: scored});
  _ckt._selectedNumber = -1;

  if (typeof sfxImpact === 'function') sfxImpact();

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
    _cktRefreshBoard();
    _cktRefreshInput();
    return;
  }

  setTimeout(function() {
    var targetIdx = _cktCpuChooseTarget();
    var result = _cktCpuThrow(targetIdx);

    _cktSaveSnapshot();
    if (result.hit) {
      _cktCommitDartCpu(result.numberIdx, result.mult);
    } else {
      _ckt.log.push({player: 1, numberIdx: -1, mult: 0, marks: 0, scored: 0});
    }

    _ckt.currentDart = dartNum + 1;
    if (typeof sfxImpact === 'function') sfxImpact();
    _cktRefreshBoard();
    _cktRefreshInput();

    // Check win after CPU dart
    if (result.hit && _cktCheckWin(1)) {
      _ckt._busy = false;
      _cktEndGame(1);
      return;
    }

    _cktCpuDart(dartNum + 1);
  }, 500);
}

function _cktCommitDartCpu(numberIdx, multiplier) {
  var p = 1;
  var opp = 0;
  var before = _ckt.marks[p][numberIdx];
  var newMarks = before + multiplier;
  var extraMarks = Math.max(0, newMarks - 3);

  _ckt.marks[p][numberIdx] = newMarks;

  var scored = 0;
  if (newMarks > 3 && _ckt.marks[opp][numberIdx] < 3) {
    scored = extraMarks * CKT_NUMBERS[numberIdx];
    _ckt.points[p] += scored;
  }

  _ckt.stats[p].totalMarks += multiplier;
  _ckt.log.push({player: p, numberIdx: numberIdx, mult: multiplier, marks: multiplier, scored: scored});
}

function _cktCpuChooseTarget() {
  // Strategy: prioritize closing own open numbers (highest value first)
  // If all closed, try to score on numbers opponent hasn't closed
  var myOpen = [];
  var oppOpen = [];
  for (var i = 0; i < 7; i++) {
    if (_ckt.marks[1][i] < 3) myOpen.push(i);
    if (_ckt.marks[0][i] < 3) oppOpen.push(i);
  }

  // If losing on points and opponent has open numbers, consider scoring
  if (_ckt.points[1] < _ckt.points[0] && myOpen.length === 0) {
    // All my numbers closed but losing on points - can't score, game logic issue
    // Actually this shouldn't happen since we need points >= opp to win
  }

  // Priority 1: Close own open numbers (favor highest value)
  if (myOpen.length > 0) {
    // Slight preference for numbers where we already have marks
    var best = -1, bestScore = -1;
    for (var j = 0; j < myOpen.length; j++) {
      var idx = myOpen[j];
      var score = CKT_NUMBERS[idx] * 10 + _ckt.marks[1][idx] * 100;
      // If opponent hasn't closed this number and we have 3+ marks, we can score
      if (score > bestScore) { bestScore = score; best = idx; }
    }
    return best;
  }

  // Priority 2: Score on opponent's open numbers (need our marks >= 3)
  var scoreable = [];
  for (var k = 0; k < 7; k++) {
    if (_ckt.marks[1][k] >= 3 && _ckt.marks[0][k] < 3) {
      scoreable.push(k);
    }
  }
  if (scoreable.length > 0) {
    // Prefer highest value
    scoreable.sort(function(a, b) { return CKT_NUMBERS[b] - CKT_NUMBERS[a]; });
    return scoreable[0];
  }

  // Fallback: aim at 20
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
  var html = '<div style="padding:8px;">';
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

function cktBackSetup() {
  document.getElementById('ckt-result-wrap').style.display = 'none';
  _cktShowSetup();
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
  _fns.cktSelectNumber = cktSelectNumber;
  _fns.cktSelectMult = cktSelectMult;
  _fns.cktMiss       = cktMiss;
  _fns.cktUndoDart   = cktUndoDart;
  _fns.cktAgain      = cktAgain;
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
