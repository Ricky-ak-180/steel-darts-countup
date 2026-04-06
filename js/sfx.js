/* ===== クエスト サウンドエフェクト (Web Audio API) ===== */
var _sfxCtx = null;
function _sfxContext() {
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
