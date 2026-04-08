/* ===== クエスト サウンドエフェクト (Web Audio API) ===== */
var _sfxCtx = null;
function _sfxContext() {
  if (typeof _sndOn !== 'undefined' && !_sndOn) return null;
  if (!_sfxCtx) _sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _sfxCtx;
}
function sfxImpact() {
  try {
    var ctx = _sfxContext(), now = ctx.currentTime;
    var buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var g = ctx.createGain(); g.gain.setValueAtTime(0.55, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 320; f.Q.value = 0.8;
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(now);
  } catch(e) {}
}
function sfxCheckout() {
  try {
    var ctx = _sfxContext(), now = ctx.currentTime;
    [523, 659, 784, 1047].forEach(function(freq, i) {
      var osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
      var g = ctx.createGain(); var t = now + i * 0.10;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.28, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
      osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t + 0.4);
    });
  } catch(e) {}
}
function sfxStreak() {
  try {
    var ctx = _sfxContext(), now = ctx.currentTime;
    [880, 1100, 1320, 1760].forEach(function(freq, i) {
      var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
      var g = ctx.createGain(); var t = now + i * 0.07;
      g.gain.setValueAtTime(0.18, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t + 0.28);
    });
  } catch(e) {}
}
function sfxWrong() {
  try {
    var ctx = _sfxContext(), now = ctx.currentTime;
    var osc = ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 180;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.22, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    osc.connect(g); g.connect(ctx.destination); osc.start(now); osc.stop(now + 0.3);
  } catch(e) {}
}
// Cricket: "トン" — ダーツがボードに刺さる音 1発
function _sfxTon(ctx, t) {
  // ① ノイズバースト（衝撃の「ト」）
  var bufLen = Math.floor(ctx.sampleRate * 0.055);
  var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  var d = buf.getChannelData(0);
  for (var i = 0; i < bufLen; i++) {
    d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufLen, 1.8);
  }
  var src = ctx.createBufferSource(); src.buffer = buf;
  var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 420; f.Q.value = 2.2;
  var g = ctx.createGain(); g.gain.setValueAtTime(0.62, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.055);
  src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(t);

  // ② 低音の共鳴（「ン」の余韻）
  var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 180;
  var g2 = ctx.createGain(); g2.gain.setValueAtTime(0.22, t); g2.gain.exponentialRampToValueAtTime(0.001, t + 0.10);
  osc.connect(g2); g2.connect(ctx.destination); osc.start(t); osc.stop(t + 0.12);

  // ③ 先端の金属ティック（ダーツの針が刺さる瞬間）
  var osc2 = ctx.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 3200;
  var g3 = ctx.createGain(); g3.gain.setValueAtTime(0.08, t); g3.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
  osc2.connect(g3); g3.connect(ctx.destination); osc2.start(t); osc2.stop(t + 0.015);
}
// Cricket: hit sound — 1=トン / 2=トントン / 3=トントントン
function sfxCktHit(mult) {
  try {
    var ctx = _sfxContext(), now = ctx.currentTime;
    var count = Math.min(mult || 1, 3);
    var gap = 0.16; // 160ms間隔（自然なリズム）
    for (var i = 0; i < count; i++) {
      _sfxTon(ctx, now + i * gap);
    }
  } catch(e) {}
}
// Cricket: cut sound — ザーーッ（重厚ノイズ、クローズより強く長め）
function sfxCktCut() {
  try {
    var ctx = _sfxContext(), now = ctx.currentTime;

    // ① 重厚ノイズ本体（ザーーッ中核、400Hz帯・クローズより低め）
    var bufLen = Math.floor(ctx.sampleRate * 0.42);
    var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < bufLen; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/bufLen, 0.9);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 400; f.Q.value = 0.55;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.82, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(now);

    // ② 低音の重み（ドン…90Hz、クローズより低く太い）
    var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 90;
    var gLow = ctx.createGain();
    gLow.gain.setValueAtTime(0.40, now);
    gLow.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc.connect(gLow); gLow.connect(ctx.destination); osc.start(now); osc.stop(now + 0.28);

    // ③ 中高域シャー感（1400Hz帯）
    var bufLen2 = Math.floor(ctx.sampleRate * 0.35);
    var buf2 = ctx.createBuffer(1, bufLen2, ctx.sampleRate);
    var d2 = buf2.getChannelData(0);
    for (var j = 0; j < bufLen2; j++) d2[j] = (Math.random()*2-1) * Math.pow(1 - j/bufLen2, 1.2);
    var src2 = ctx.createBufferSource(); src2.buffer = buf2;
    var f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1400; f2.Q.value = 1.0;
    var g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.28, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    src2.connect(f2); f2.connect(g2); g2.connect(ctx.destination); src2.start(now);

  } catch(e) {}
}
// Cricket: achievement sound — marks 5-9 or White Horse
function sfxCktAchieve(marks, isWhiteHorse) {
  try {
    var ctx = _sfxContext(), now = ctx.currentTime;
    var freqSets = {
      5: [784, 988],
      6: [880, 1175],
      7: [784, 988, 1319],
      8: [880, 1175, 1568],
      9: [784, 988, 1319, 1760]
    };
    var freqs = isWhiteHorse
      ? [659, 784, 988, 1319, 1760]
      : (freqSets[Math.min(Math.max(marks, 5), 9)] || freqSets[5]);
    var gap = isWhiteHorse ? 0.09 : 0.10;
    var vol = isWhiteHorse ? 0.32 : 0.22 + (marks - 5) * 0.02;
    var sustain = isWhiteHorse ? 0.38 : 0.22 + (marks - 5) * 0.02;
    freqs.forEach(function(freq, i) {
      var t = now + i * gap;
      var osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
      var g = ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + sustain);
      osc.connect(g); g.connect(ctx.destination); osc.start(t); osc.stop(t + sustain + 0.02);
    });
  } catch(e) {}
}
// Cricket: close sound — ザーッ（重厚ノイズ、ナンバーロック）
function sfxCktClose() {
  try {
    var ctx = _sfxContext(), now = ctx.currentTime;

    // ① 重厚ノイズ本体（ザーーッ中核、500Hz帯）
    var bufLen = Math.floor(ctx.sampleRate * 0.28);
    var buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < bufLen; i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/bufLen, 1.0);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.6;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.72, now + 0.010);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
    src.connect(f); f.connect(g); g.connect(ctx.destination); src.start(now);

    // ② 低音の重み（ドン…120Hz）
    var osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = 120;
    var gLow = ctx.createGain();
    gLow.gain.setValueAtTime(0.32, now);
    gLow.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gLow); gLow.connect(ctx.destination); osc.start(now); osc.stop(now + 0.20);

    // ③ 中高域シャー感（ザーの質感・1600Hz帯）
    var bufLen2 = Math.floor(ctx.sampleRate * 0.22);
    var buf2 = ctx.createBuffer(1, bufLen2, ctx.sampleRate);
    var d2 = buf2.getChannelData(0);
    for (var j = 0; j < bufLen2; j++) d2[j] = (Math.random()*2-1) * Math.pow(1 - j/bufLen2, 1.3);
    var src2 = ctx.createBufferSource(); src2.buffer = buf2;
    var f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1600; f2.Q.value = 1.0;
    var g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.22, now);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    src2.connect(f2); f2.connect(g2); g2.connect(ctx.destination); src2.start(now);

  } catch(e) {}
}
