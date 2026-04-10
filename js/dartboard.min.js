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
  osin:  0.780,  // outer single outer edge (was 0.917)
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
  var R = W / 2 * 0.76;          // board radius — matches hit test
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

// Redraw board then overlay all current dart markers
function _dbRedraw() {
  dbDraw();
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
  var R  = rect.width / 2 * 0.76;  // must match dbDraw()

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
  dbDraw();  // always redraw — clears previous session's markers
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
  el.className = 'db-flash db-flash-show';
  setTimeout(function() { el.className = 'db-flash'; }, 1500);  // 700 → 1500ms
}

// ============================================================
// TOUCH / CLICK HANDLER
// ============================================================

function _dbOnTap(e) {
  e.preventDefault();
  if (_db.darts.length >= 3) return;
  var touch = e.changedTouches ? e.changedTouches[0] : e;
  var hit = _dbHitTest(touch.clientX, touch.clientY);
  hit._tapX = touch.clientX;  // store for marker drawing
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
  var size = Math.min(window.innerWidth - 24, 360);
  canvas.style.width  = size + 'px';
  canvas.style.height = size + 'px';
  canvas.width  = size * dpr;
  canvas.height = size * dpr;

  canvas.addEventListener('touchstart', _dbOnTap, { passive: false });
  canvas.addEventListener('click',      _dbOnTap);

  dbDraw();
});
