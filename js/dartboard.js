// ============================================================
// Dartboard UI — Steel Darts Pro
// Canvas-based dartboard for 3-dart score input
// ============================================================

var _db = {
  canvas: null,
  darts: [],      // [{score, label, _tapX, _tapY}, ...]  max 3
  open: false,
  mode: 'cu'      // 'cu' = CountUp, '01' = 01 game
};

// Numbers clockwise from top
var DB_NUMS = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
var DB_SEG  = Math.PI * 2 / 20;
var DB_START = -Math.PI/2 - DB_SEG/2;

// Normalized radii (0–1, where 1.0 = outer edge of double)
// Touch-optimized: inner single drastically shrunk so triple/double
// become finger-friendly tap targets (triple: ×5 wider, double: ×3 wider)
var DB_R = {
  bull:  0.070,  // Bull          (was 0.047)
  obull: 0.160,  // Outer Bull    (was 0.110)
  isin:  0.300,  // inner single outer edge — compressed! (was 0.560)
  triI:  0.300,  // triple inner edge = isin (no gap)
  triO:  0.580,  // triple outer edge — wide band! (was 0.707)
  osin:  0.870,  // outer single outer edge — wider (double is checkout-only so thinner)
  dbl:   1.000   // double outer edge (unchanged)
};

// Colors
var DB_C = {
  black: '#1c1a14', cream: '#f0e0a0',
  red:   '#c0392b', green: '#1a8a3a',
  bull:  '#c0392b', obull: '#1a8a3a',
  wire:  '#c8a840', bg:    '#0f0e0a',
  num:   '#e8ff47'
};

// Dart marker colors (dart 1 / 2 / 3)
var DB_DART_COLORS = ['#e8ff47', '#ff9f43', '#ff6b6b'];

// ============================================================
// DRAWING
// ============================================================

function _dbArc(ctx, cx, cy, r1, r2, a1, a2, color) {
  ctx.beginPath();
  ctx.arc(cx, cy, r2, a1, a2, false);
  ctx.arc(cx, cy, r1, a2, a1, true);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function dbDraw() {
  var canvas = _db.canvas;
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width;
  var CX = W / 2, CY = W / 2;
  var R = W / 2 * 0.84;          // board radius — matches hit test
  var wire = Math.max(1, W / 400);

  ctx.clearRect(0, 0, W, W);

  // Board background
  ctx.fillStyle = DB_C.bg;
  ctx.fillRect(0, 0, W, W);

  // Outer wire ring (gold border)
  ctx.beginPath();
  ctx.arc(CX, CY, DB_R.dbl * R + wire * 3, 0, Math.PI * 2);
  ctx.fillStyle = DB_C.wire;
  ctx.fill();

  // Segments: inner single → triple → outer single → double
  for (var i = 0; i < 20; i++) {
    var a1 = DB_START + i * DB_SEG;
    var a2 = a1 + DB_SEG;
    var odd = (i % 2 === 0);
    _dbArc(ctx, CX, CY, DB_R.obull*R, DB_R.isin*R, a1, a2, odd ? DB_C.black : DB_C.cream);
    _dbArc(ctx, CX, CY, DB_R.triI*R,  DB_R.triO*R, a1, a2, odd ? DB_C.red   : DB_C.green);
    _dbArc(ctx, CX, CY, DB_R.triO*R,  DB_R.osin*R, a1, a2, odd ? DB_C.black : DB_C.cream);
    _dbArc(ctx, CX, CY, DB_R.osin*R,  DB_R.dbl*R,  a1, a2, odd ? DB_C.red   : DB_C.green);
  }

  // Radial wire lines
  ctx.strokeStyle = DB_C.wire;
  ctx.lineWidth = wire;
  for (var k = 0; k < 20; k++) {
    var wa = DB_START + k * DB_SEG;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(wa) * DB_R.obull * R, CY + Math.sin(wa) * DB_R.obull * R);
    ctx.lineTo(CX + Math.cos(wa) * DB_R.dbl   * R, CY + Math.sin(wa) * DB_R.dbl   * R);
    ctx.stroke();
  }

  // Ring wires
  [DB_R.isin, DB_R.triI, DB_R.triO, DB_R.osin, DB_R.dbl].forEach(function(r) {
    ctx.beginPath();
    ctx.arc(CX, CY, r * R, 0, Math.PI * 2);
    ctx.strokeStyle = DB_C.wire;
    ctx.lineWidth = wire;
    ctx.stroke();
  });

  // Outer bull (green)
  ctx.beginPath();
  ctx.arc(CX, CY, DB_R.obull * R, 0, Math.PI * 2);
  ctx.fillStyle = DB_C.obull;
  ctx.fill();
  ctx.strokeStyle = DB_C.wire;
  ctx.lineWidth = wire;
  ctx.stroke();

  // Bull (red)
  ctx.beginPath();
  ctx.arc(CX, CY, DB_R.bull * R, 0, Math.PI * 2);
  ctx.fillStyle = DB_C.bull;
  ctx.fill();

  // Number labels — outside the double ring
  var numR = DB_R.dbl * R + wire * 7 + R * 0.055;
  var fontSize = Math.max(10, Math.floor(R * 0.108));
  ctx.font = 'bold ' + fontSize + 'px "Bebas Neue", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (var j = 0; j < 20; j++) {
    var ca = DB_START + j * DB_SEG + DB_SEG / 2;
    // Alternate color for readability on red/green bands
    ctx.fillStyle = DB_C.num;
    ctx.fillText(String(DB_NUMS[j]),
      CX + Math.cos(ca) * numR,
      CY + Math.sin(ca) * numR);
  }
}

// ============================================================
// DART MARKERS — colored dot where each dart landed
// ============================================================

function _dbDrawMarkers() {
  var canvas = _db.canvas;
  if (!canvas || !_db.darts.length) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.width;
  var rect = canvas.getBoundingClientRect();
  var scaleX = W / rect.width;
  var scaleY = W / rect.height;
  var dotR = Math.max(7, W * 0.026);

  _db.darts.forEach(function(d, i) {
    if (d._tapX === undefined) return;  // Miss (no tap coord)
    var cx = (d._tapX - rect.left) * scaleX;
    var cy = (d._tapY - rect.top)  * scaleY;

    // Drop shadow
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur  = W * 0.015;

    // Colored dot
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fillStyle = DB_DART_COLORS[i];
    ctx.fill();

    ctx.shadowBlur = 0;

    // White outline
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(1.5, W * 0.004);
    ctx.stroke();

    // Dart number (1/2/3)
    var fs = Math.max(9, Math.floor(dotR * 1.05));
    ctx.font = 'bold ' + fs + 'px Arial, sans-serif';
    ctx.fillStyle = '#111';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), cx, cy);
  });
}

// Redraw board (board or kezuri) then overlay dart markers
function _dbRedraw() {
  if (_dbUIMode === 'kz') {
    _dbDrawKezuri();
  } else {
    dbDraw();
  }
  _dbDrawMarkers();
}

// ============================================================
// HIT TEST — tap (x,y) → {score, label}
// ============================================================

function _dbHitTest(tapX, tapY) {
  var canvas = _db.canvas;
  var rect = canvas.getBoundingClientRect();
  var CX = rect.left + rect.width  / 2;
  var CY = rect.top  + rect.height / 2;
  var R  = rect.width / 2 * 0.84;  // must match dbDraw()

  var dx = tapX - CX;
  var dy = tapY - CY;
  var r  = Math.sqrt(dx * dx + dy * dy);
  var rn = r / R;

  if (rn < DB_R.bull)  return { score: 50, label: 'Bull' };
  if (rn < DB_R.obull) return { score: 25, label: '25'   };
  if (rn > DB_R.dbl)   return { score: 0,  label: 'Miss' };

  var angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
  if (angle < 0) angle += 360;
  var segIdx = Math.floor(((angle + 9) % 360) / 18) % 20;
  var num = DB_NUMS[segIdx];

  if (rn < DB_R.isin) return { score: num,    label: String(num) };
  if (rn < DB_R.triO) return { score: num * 3, label: 'T' + num  };
  if (rn < DB_R.osin) return { score: num,    label: String(num) };
  return                     { score: num * 2, label: 'D' + num   };
}

// ============================================================
// DART INPUT LOGIC
// ============================================================

function _dbUpdateDisplay() {
  var totalEl  = document.getElementById('db-total');
  var dartsEl  = document.getElementById('db-darts-disp');
  var countEl  = document.getElementById('db-count-disp');
  var okBtn    = document.getElementById('db-ok-btn');
  var undoBtn  = document.getElementById('db-undo-btn');
  var missBtn  = document.getElementById('db-miss-btn');

  var total = _db.darts.reduce(function(s, d) { return s + d.score; }, 0);
  var n = _db.darts.length;

  if (totalEl) totalEl.textContent = total;
  if (dartsEl) {
    dartsEl.textContent = n
      ? _db.darts.map(function(d) { return d.label; }).join(' + ')
      : '—';
  }
  if (countEl) countEl.textContent = ['1本目', '2本目', '3本目', '確認'][Math.min(n, 3)];
  if (okBtn)   okBtn.disabled   = (n === 0);
  if (undoBtn) undoBtn.disabled = (n === 0);
  if (missBtn) missBtn.disabled = (n >= 3);

  // Progress dots
  for (var i = 0; i < 3; i++) {
    var dot = document.getElementById('db-dot-' + i);
    if (dot) dot.className = 'db-dot' + (i < n ? ' db-dot-hit' : '');
  }
}

function _dbAddDart(hit) {
  if (_db.darts.length >= 3) return;
  _db.darts.push(hit);
  _dbUpdateDisplay();
  _dbFlash(hit);
  _dbDrawMarkers();

  // Auto-submit after 3rd dart (1.5s — enough to see, short enough to feel snappy)
  if (_db.darts.length === 3) {
    setTimeout(function() { dbSubmit(); }, 1500);
  }
}

function dbUndoLast() {
  if (_db.darts.length === 0) return;
  _db.darts.pop();
  _dbUpdateDisplay();
  _dbRedraw();  // board + remaining markers
}

function dbAddMiss() {
  if (_db.darts.length >= 3) return;
  _dbAddDart({ score: 0, label: 'Miss' });  // no _tapX/_tapY → no dot drawn
}

// ============================================================
// SUBMIT
// ============================================================

function dbSubmit() {
  var total = _db.darts.reduce(function(s, d) { return s + d.score; }, 0);
  dbClose();

  if (_db.mode === '01') {
    if (typeof z01Pre === 'function') z01Pre(total);
    else if (typeof _z01BufUpdate === 'function') {
      _z01BufUpdate(String(total));
      if (typeof z01Ok === 'function') z01Ok();
    }
  } else {
    if (total > 180) total = 180;
    if (typeof commit === 'function') {
      if (typeof buf !== 'undefined') buf = '';
      commit(total);
    }
  }
}

// ============================================================
// KEZURI MODE (削りモード)
// Zoomed arc view: target segment large + full color,
// adjacent misses visible, everything else grayed out.
// ============================================================

var _dbUIMode = 'board';  // 'board' | 'kz'
var _dbKzMode = 'kz1';   // 'kz1' = T20/T18 zone, 'kz2' = T19/T17 zone

// Zone definitions
// centerIdx: DB_NUMS index of the segment placed at top-center after rotation
// scoring: the two main triple targets in the zone (get glow + perfect flash)
// mirror: true = flip horizontally so left-right order feels natural to the player
var _dbKzZones = {
  // cy: CY = W * cy.  rotDir: rotation = rotDir*π/2 - centerAngle
  // kz1: target at top (bull at bottom), kz2: target at bottom (bull at top)
  kz1: { nums:[5,20,1,18,4],  scoring:[20,18], centerIdx:1,  mirror:false, cy:1.04, rotDir:-1 },
  kz2: { nums:[7,19,3,17,2],  scoring:[19,17], centerIdx:10, mirror:false, cy:0.04, rotDir: 1 }
};

// Restore persisted mode
try { var _km = localStorage.getItem('db_kz_mode'); if (_dbKzZones[_km]) _dbKzMode = _km; } catch(e) {}

function _dbSetUIMode(mode) {
  _dbUIMode = mode;
  var boardBtn = document.getElementById('db-mode-board');
  var kzBtn    = document.getElementById('db-mode-kz');
  var kzTabs   = document.getElementById('db-kz-tabs');
  if (boardBtn) boardBtn.classList.toggle('db-mode-on', mode === 'board');
  if (kzBtn)    kzBtn.classList.toggle('db-mode-on',    mode === 'kz');
  if (kzTabs)   kzTabs.style.display = (mode === 'kz') ? 'flex' : 'none';
  _dbRedraw();
}

function _dbKzSetMode(m) {
  _dbKzMode = m;
  try { localStorage.setItem('db_kz_mode', m); } catch(e) {}
  document.querySelectorAll('.db-kz-tab').forEach(function(t) {
    t.classList.toggle('db-kz-tab-on', t.dataset.mode === m);
  });
  _dbRedraw();
}

function _dbDrawKezuri() {
  var canvas = _db.canvas;
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W   = canvas.width;

  var zone    = _dbKzZones[_dbKzMode];
  var primary = zone.nums;
  var idx     = zone.centerIdx;
  // kz1: target at top (bull at bottom), kz2: target at bottom (bull at top)
  var R  = W * 0.72;
  var CX = W / 2;
  var CY = W * zone.cy;
  var wire = Math.max(2, W / 250);

  // Narrowed triple ring (2/3 width for visual beauty; hit area stays full)
  var triMid  = (DB_R.triI + DB_R.triO) / 2;
  var triHalf = (DB_R.triO - DB_R.triI) / 2 * (2 / 3);
  var kzTriI  = triMid - triHalf;
  var kzTriO  = triMid + triHalf;

  ctx.clearRect(0, 0, W, W);
  ctx.fillStyle = DB_C.bg;
  ctx.fillRect(0, 0, W, W);

  var centerAngle = DB_START + idx * DB_SEG + DB_SEG / 2;
  var rotation    = zone.rotDir * Math.PI / 2 - centerAngle;
  var mirrorX     = zone.mirror ? -1 : 1;

  var MC = { seg1:'#0f0f0d', seg2:'#141412', tri:'#111110' };

  ctx.save();
  ctx.translate(CX, CY);
  ctx.rotate(rotation);
  if (zone.mirror) ctx.scale(-1, 1);
  ctx.translate(-CX, -CY);

  // Outer ring border
  ctx.beginPath();
  ctx.arc(CX, CY, DB_R.dbl * R + wire * 3, 0, Math.PI * 2);
  ctx.fillStyle = '#3a3420';
  ctx.fill();

  // Segments — 5 active = full color, others = near-invisible
  for (var i = 0; i < 20; i++) {
    var num   = DB_NUMS[i];
    var isPri = primary.indexOf(num) >= 0;
    var a1    = DB_START + i * DB_SEG;
    var a2    = a1 + DB_SEG;
    var odd   = (i % 2 === 0);
    if (isPri) {
      _dbArc(ctx,CX,CY, DB_R.obull*R, DB_R.isin*R, a1,a2, odd?DB_C.black:DB_C.cream);
      _dbArc(ctx,CX,CY, kzTriI*R,     kzTriO*R,    a1,a2, odd?DB_C.red  :DB_C.green);
      _dbArc(ctx,CX,CY, kzTriO*R,     DB_R.osin*R, a1,a2, odd?DB_C.black:DB_C.cream);
      _dbArc(ctx,CX,CY, DB_R.osin*R,  DB_R.dbl*R,  a1,a2, odd?DB_C.red  :DB_C.green);
    } else {
      _dbArc(ctx,CX,CY, DB_R.obull*R, DB_R.isin*R, a1,a2, odd?MC.seg1:MC.seg2);
      _dbArc(ctx,CX,CY, kzTriI*R,     kzTriO*R,    a1,a2, MC.tri);
      _dbArc(ctx,CX,CY, kzTriO*R,     DB_R.osin*R, a1,a2, odd?MC.seg1:MC.seg2);
      _dbArc(ctx,CX,CY, DB_R.osin*R,  DB_R.dbl*R,  a1,a2, MC.tri);
    }
  }

  // Glow on each scoring triple (T20+T18 for kz1, T19+T17 for kz2)
  zone.scoring.forEach(function(sNum) {
    var si  = DB_NUMS.indexOf(sNum);
    var sa1 = DB_START + si * DB_SEG;
    var sa2 = sa1 + DB_SEG;
    ctx.save();
    ctx.shadowColor = 'rgba(232,255,71,0.55)';
    ctx.shadowBlur  = R * 0.045;
    ctx.beginPath();
    ctx.arc(CX, CY, kzTriO * R, sa1, sa2);
    ctx.arc(CX, CY, kzTriI * R, sa2, sa1, true);
    ctx.closePath();
    ctx.strokeStyle = 'rgba(232,255,71,0.5)';
    ctx.lineWidth   = Math.max(3, R * 0.012);
    ctx.stroke();
    ctx.restore();
  });

  // Radial wires — bright between active segments, dim elsewhere
  for (var k = 0; k < 20; k++) {
    var kn1 = DB_NUMS[k];
    var kn2 = DB_NUMS[(k + 19) % 20];
    ctx.strokeStyle = (primary.indexOf(kn1) >= 0 || primary.indexOf(kn2) >= 0) ? DB_C.wire : '#252320';
    ctx.lineWidth   = wire;
    var wa = DB_START + k * DB_SEG;
    ctx.beginPath();
    ctx.moveTo(CX+Math.cos(wa)*DB_R.obull*R, CY+Math.sin(wa)*DB_R.obull*R);
    ctx.lineTo(CX+Math.cos(wa)*DB_R.dbl*R,   CY+Math.sin(wa)*DB_R.dbl*R);
    ctx.stroke();
  }

  // Ring wires — subdued
  [DB_R.isin,kzTriI,kzTriO,DB_R.osin,DB_R.dbl].forEach(function(r){
    ctx.beginPath();
    ctx.arc(CX, CY, r*R, 0, Math.PI*2);
    ctx.strokeStyle = '#4a4228';
    ctx.lineWidth   = wire * 0.7;
    ctx.stroke();
  });

  // Bull — enabled (barely visible at very bottom)
  ctx.beginPath();
  ctx.arc(CX, CY, DB_R.obull*R, 0, Math.PI*2);
  ctx.fillStyle = DB_C.obull; ctx.fill();
  ctx.strokeStyle = DB_C.wire; ctx.lineWidth = wire; ctx.stroke();
  ctx.beginPath();
  ctx.arc(CX, CY, DB_R.bull*R, 0, Math.PI*2);
  ctx.fillStyle = DB_C.bull; ctx.fill();

  ctx.restore();  // end rotation+mirror — text is now drawn upright

  // Labels outside the double ring, in screen space (always upright)
  var numR    = DB_R.dbl * R + wire * 5 + R * 0.045;
  var outline = Math.max(2, R * 0.008);
  ctx.textAlign    = 'center';
  ctx.textBaseline = 'middle';

  for (var j = 0; j < 20; j++) {
    var jnum = DB_NUMS[j];
    if (primary.indexOf(jnum) < 0) continue;

    var ca = DB_START + j * DB_SEG + DB_SEG / 2 + rotation;
    var jx = CX + mirrorX * Math.cos(ca) * numR;
    var jy = CY + Math.sin(ca) * numR;
    if (jx < -20 || jx > W + 20 || jy < -20 || jy > W + 20) continue;

    var isScoring = zone.scoring.indexOf(jnum) >= 0;
    if (isScoring) {
      ctx.save();
      ctx.shadowColor = 'rgba(232,255,71,0.8)';
      ctx.shadowBlur  = R * 0.04;
      ctx.font        = 'bold ' + Math.floor(R * 0.155) + 'px "Bebas Neue",Arial,sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      ctx.lineWidth   = Math.max(3, R * 0.013);
      ctx.strokeText(String(jnum), jx, jy);
      ctx.fillStyle   = DB_C.num;
      ctx.fillText(String(jnum), jx, jy);
      ctx.restore();
    } else {
      ctx.font        = 'bold ' + Math.floor(R * 0.11) + 'px "Bebas Neue",Arial,sans-serif';
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.lineWidth   = outline;
      ctx.strokeText(String(jnum), jx, jy);
      ctx.fillStyle   = 'rgba(232,255,71,0.75)';
      ctx.fillText(String(jnum), jx, jy);
    }
  }
}

// Hit test for kezuri zoomed view (reverses the rotation transform)
function _dbHitTestKezuri(tapX, tapY) {
  var canvas = _db.canvas;
  var rect   = canvas.getBoundingClientRect();
  var dpr    = canvas.width / rect.width;
  var cx     = (tapX - rect.left) * dpr;
  var cy     = (tapY - rect.top)  * dpr;

  var W  = canvas.width;
  var zone     = _dbKzZones[_dbKzMode];
  var R  = W * 0.72;
  var CX = W / 2;
  var CY = W * zone.cy;

  var idx      = zone.centerIdx;
  var centerAngle = DB_START + idx * DB_SEG + DB_SEG / 2;
  var rotation    = zone.rotDir * Math.PI / 2 - centerAngle;

  // Un-mirror for kz2 before reversing rotation
  if (zone.mirror) cx = W - cx;

  // Reverse rotation
  var dx  = cx - CX, dy = cy - CY;
  var rdx = dx * Math.cos(-rotation) - dy * Math.sin(-rotation);
  var rdy = dx * Math.sin(-rotation) + dy * Math.cos(-rotation);

  var r  = Math.sqrt(rdx*rdx + rdy*rdy);
  var rn = r / R;

  if (rn > DB_R.dbl)   return { score:0,  label:'Miss' };
  if (rn < DB_R.bull)  return { score:50, label:'Bull' };
  if (rn < DB_R.obull) return { score:25, label:'25'   };

  var angle  = Math.atan2(rdy, rdx) * 180 / Math.PI + 90;
  if (angle < 0) angle += 360;
  var segIdx = Math.floor(((angle + 9) % 360) / 18) % 20;
  var num    = DB_NUMS[segIdx];

  if (rn < DB_R.isin) return { score:num,   label:String(num) };
  if (rn < DB_R.triO) return { score:num*3,  label:'T'+num    };
  if (rn < DB_R.osin) return { score:num,   label:String(num) };
  return                     { score:num*2,  label:'D'+num     };
}

// ============================================================
// OPEN / CLOSE
// ============================================================

function dbOpen(mode) {
  _db.darts = [];
  _db.mode  = mode || 'cu';
  var modal = document.getElementById('db-modal');
  if (!modal) return;
  modal.classList.add('db-show');
  _db.open = true;
  _dbUpdateDisplay();
  // Sync UI mode buttons/tabs
  var kzTabs   = document.getElementById('db-kz-tabs');
  var boardBtn = document.getElementById('db-mode-board');
  var kzBtn    = document.getElementById('db-mode-kz');
  if (kzTabs)   kzTabs.style.display = (_dbUIMode === 'kz') ? 'flex' : 'none';
  if (boardBtn) boardBtn.classList.toggle('db-mode-on', _dbUIMode === 'board');
  if (kzBtn)    kzBtn.classList.toggle('db-mode-on',    _dbUIMode === 'kz');
  // Sync persisted kezuri mode tab
  document.querySelectorAll('.db-kz-tab').forEach(function(t) {
    t.classList.toggle('db-kz-tab-on', t.dataset.mode === _dbKzMode);
  });
  _dbRedraw();
}

function dbClose() {
  var modal = document.getElementById('db-modal');
  if (modal) modal.classList.remove('db-show');
  _db.open = false;
}

// ============================================================
// FLASH INDICATOR
// ============================================================

function _dbFlash(hit) {
  var el = document.getElementById('db-flash');
  if (!el) return;
  el.textContent = hit.score === 0 ? 'Miss!' : hit.label + '  +' + hit.score;
  var cls = 'db-flash db-flash-show';

  // Kezuri mode: color-code flash by hit quality
  if (_dbUIMode === 'kz') {
    var zone   = _dbKzZones[_dbKzMode];
    var m      = hit.label.match(/^[TD]?(\d+)$/);
    var hitNum = m ? parseInt(m[1]) : 0;
    var isTriple = hit.label.charAt(0) === 'T';

    if (isTriple && zone.scoring.indexOf(hitNum) >= 0) {
      cls += ' db-flash-perfect';            // scoring triple — green glow
    } else if (zone.nums.indexOf(hitNum) >= 0) {
      cls += ' db-flash-good';               // in zone (single/double) — light green
    } else if (hit.score === 0) {
      cls += ' db-flash-miss';               // miss — red
    } else {
      cls += ' db-flash-off';                // off-target number — amber
    }
  }

  el.className = cls;
  setTimeout(function() { el.className = 'db-flash'; }, 1500);
}

// ============================================================
// TOUCH / CLICK HANDLER
// ============================================================

function _dbOnTap(e) {
  e.preventDefault();
  if (_db.darts.length >= 3) return;
  var touch = e.changedTouches ? e.changedTouches[0] : e;
  var hit = _dbUIMode === 'kz'
    ? _dbHitTestKezuri(touch.clientX, touch.clientY)
    : _dbHitTest(touch.clientX, touch.clientY);
  hit._tapX = touch.clientX;
  hit._tapY = touch.clientY;
  _dbAddDart(hit);
}

// ============================================================
// INIT
// ============================================================

window.addEventListener('load', function() {
  var canvas = document.getElementById('db-canvas');
  if (!canvas) return;
  _db.canvas = canvas;

  // Retina-aware sizing
  var dpr  = window.devicePixelRatio || 1;
  var size = Math.min(window.innerWidth - 16, 440);  // use more screen width
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width  = size * dpr;
  canvas.height = size * dpr;

  canvas.addEventListener('touchstart', _dbOnTap, { passive: false });
  canvas.addEventListener('click',      _dbOnTap);

  dbDraw();
});
