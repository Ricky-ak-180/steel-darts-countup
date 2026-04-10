// ============================================================
// caller.js — 音声コーラー
// モード1: 事前生成音声ファイル再生（高品質 Neural TTS）
// モード2: Web Speech API フォールバック
// ============================================================

var _callerOn = localStorage.getItem('caller') !== '0';
var _callerGender = localStorage.getItem('caller_gender') || 'M'; // 'M' | 'F'
var _callerMode = 'speech'; // 'audio' | 'speech'
var _callerAudioBaseM = './audio/caller/';
var _callerAudioBaseF = './audio/caller/female/';
var _callerAudioBase = _callerGender === 'F' ? _callerAudioBaseF : _callerAudioBaseM;
var _callerCache = {};      // filename -> AudioBuffer
var _callerCtx = null;
var _callerQueue = [];      // [{buffers:[], opts:{}}]
var _callerPlaying = false;

// Web Speech API 用
var _callerVoice = null;
var _speechQueue = [];
var _speechBusy = false;

// ---- 初期化 ----
// manifest.json の存在確認だけ先に行う（AudioContext はユーザー操作時に作成）
var _callerManifestReady = false;
function _callerInitAudio() {
  _callerManifestReady = false;
  fetch(_callerAudioBase + 'manifest.json')
    .then(function(r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function(m) {
      _callerMode = 'audio';
      _callerManifestReady = true;
      console.log('[Caller] Audio mode ready: ' + _callerAudioBase);
      _callerInitSpeech();
    })
    .catch(function() {
      // 女性フォルダが未生成の場合は男性フォルダでフォールバック
      if (_callerAudioBase === _callerAudioBaseF) {
        console.log('[Caller] Female audio not found, falling back to male audio');
        _callerAudioBase = _callerAudioBaseM;
        fetch(_callerAudioBase + 'manifest.json')
          .then(function(r) { return r.ok ? r.json() : Promise.reject(); })
          .then(function() {
            _callerMode = 'audio';
            _callerManifestReady = true;
            console.log('[Caller] Audio mode ready (male fallback)');
            _callerInitSpeech();
          })
          .catch(function() {
            _callerMode = 'speech';
            _callerInitSpeech();
          });
      } else {
        _callerMode = 'speech';
        console.log('[Caller] Speech mode (fallback)');
        _callerInitSpeech();
      }
    });
}
_callerInitAudio();

// ユーザー操作コンテキストで AudioContext を作成・取得
function _callerGetCtx() {
  if (_callerCtx) {
    if (_callerCtx.state === 'suspended') _callerCtx.resume();
    return _callerCtx;
  }
  if (!_callerManifestReady) return null;
  try {
    _callerCtx = new (window.AudioContext || window.webkitAudioContext)();
    // 作成直後に resume（一部ブラウザで suspended になる）
    if (_callerCtx.state === 'suspended') _callerCtx.resume();
    // よく使う音声を先読み
    _callerPreload(['s0','s60','s100','s140','s180','s180_high','s140_high','s100_high','gameshot_match','gameshot_leg','bust','caller_on']);
    return _callerCtx;
  } catch(e) {
    return null;
  }
}

// 男性/女性ボイス名パターン
var _VOICE_MALE   = /david|ryan|james|george|mark|richard|thomas|eric|luca|reed|malo|noel|grandpa|male/i;
var _VOICE_FEMALE = /hazel|sonia|libby|samantha|zira|susan|kate|fiona|moira|tessa|helen|female|junior/i;

function _callerInitSpeech() {
  if (!window.speechSynthesis) return;
  function pick() {
    var voices = speechSynthesis.getVoices();
    var best = null, bestScore = -1;
    for (var i = 0; i < voices.length; i++) {
      var v = voices[i]; if (!/^en/i.test(v.lang)) continue;
      var s = 0;
      if (/en[-_]GB/i.test(v.lang)) s += 50;
      if (/neural|online|natural/i.test(v.name)) s += 100;
      if (/google/i.test(v.name)) s += 40;
      // 性別スコア
      var isMale   = _VOICE_MALE.test(v.name);
      var isFemale = _VOICE_FEMALE.test(v.name);
      if (_callerGender === 'M' && isMale)   s += 80;
      if (_callerGender === 'F' && isFemale) s += 80;
      if (_callerGender === 'M' && isFemale) s -= 30;
      if (_callerGender === 'F' && isMale)   s -= 30;
      if (s > bestScore) { bestScore = s; best = v; }
    }
    if (best) _callerVoice = best;
  }
  pick();
  if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = pick;
}

// 性別設定トグル（設定パネルから呼ぶ）
function toggleCallerGender() {
  _callerGender = _callerGender === 'M' ? 'F' : 'M';
  localStorage.setItem('caller_gender', _callerGender);
  // キャッシュクリア＆audioベースURL切替
  _callerCache = {};
  _callerQueue = [];
  _callerPlaying = false;
  _callerAudioBase = _callerGender === 'F' ? _callerAudioBaseF : _callerAudioBaseM;
  _callerVoice = null;
  _callerInitAudio();
  var btn = document.getElementById('btn-caller-gender');
  if (btn) btn.textContent = _callerGender === 'M' ? '♂' : '♀';
}

// ---- 歓声SE（Web Audio API合成） ----
function _callerPlayCrowd(level) {
  if (!_callerOn) return;
  var ctx = _callerGetCtx();
  if (!ctx) return;
  // level: 'small' | 'medium' | 'big'
  var duration = level === 'big' ? 2.0 : level === 'medium' ? 1.2 : 0.6;
  var volume = level === 'big' ? 0.15 : level === 'medium' ? 0.10 : 0.06;
  var layerCount = level === 'big' ? 8 : level === 'medium' ? 5 : 3;

  // ホワイトノイズベースの歓声（複数レイヤーで厚みを出す）
  var sampleRate = ctx.sampleRate;
  var bufLen = Math.floor(sampleRate * duration);
  var buf = ctx.createBuffer(1, bufLen, sampleRate);
  var data = buf.getChannelData(0);

  for (var i = 0; i < bufLen; i++) {
    var t = i / sampleRate;
    var env = Math.sin(Math.PI * t / duration); // フェードイン・アウト
    env *= env; // よりスムーズなエンベロープ
    var noise = 0;
    for (var l = 0; l < layerCount; l++) {
      // 各レイヤーに異なる周波数帯のノイズ
      noise += (Math.random() * 2 - 1) * Math.sin(t * (200 + l * 150));
    }
    data[i] = noise / layerCount * env;
  }

  var source = ctx.createBufferSource();
  source.buffer = buf;

  // バンドパスフィルタで人声っぽい帯域に制限
  var filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1200;
  filter.Q.value = 0.8;

  var gain = ctx.createGain();
  gain.gain.value = volume;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  // 少し遅延させてコーラー音声の後に重ねる
  source.start(ctx.currentTime + 0.3);
}

// ---- Audio モード: ファイル読み込み ----
function _callerPreload(names) {
  names.forEach(function(n) { _callerLoad(n, function(){}); });
}

function _callerLoad(name, cb) {
  if (_callerCache[name]) { cb(_callerCache[name]); return; }
  var ctx = _callerGetCtx();
  if (!ctx) { cb(null); return; }
  var url = _callerAudioBase + name + '.mp3';
  fetch(url)
    .then(function(r) { return r.ok ? r.arrayBuffer() : Promise.reject('404'); })
    .then(function(ab) { return ctx.decodeAudioData(ab); })
    .then(function(buf) { _callerCache[name] = buf; cb(buf); })
    .catch(function() { cb(null); });
}

// ---- Audio モード: 再生キュー ----
function _callerPlay(plays, opts) {
  if (!_callerOn) return;
  if (_callerMode === 'audio') {
    // ユーザー操作のコンテキストで AudioContext を作成・resume
    var ctx = _callerGetCtx();
    if (ctx) {
      _callerQueue.push({ plays: plays, opts: opts || {} });
      if (!_callerPlaying) _callerFlushAudio();
      return;
    }
  }
  // Speech フォールバック
  if (opts && opts.text) {
    _speechEnqueue(opts.text, opts);
  }
}

function _callerFlushAudio() {
  if (_callerQueue.length === 0) { _callerPlaying = false; return; }
  _callerPlaying = true;
  var item = _callerQueue.shift();
  _callerPlaySequence(item.plays, 0, function() {
    setTimeout(_callerFlushAudio, 60);
  });
}

function _callerPlaySequence(names, idx, onDone) {
  if (idx >= names.length) { onDone(); return; }
  var name = names[idx];
  if (name === null) {
    // 無音ポーズ
    setTimeout(function() { _callerPlaySequence(names, idx + 1, onDone); }, 300);
    return;
  }
  _callerLoad(name, function(buf) {
    if (!buf) {
      _callerPlaySequence(names, idx + 1, onDone);
      return;
    }
    var ctx = _callerGetCtx();
    if (!ctx) { _callerPlaySequence(names, idx + 1, onDone); return; }
    var doPlay = function() {
      var source = ctx.createBufferSource();
      source.buffer = buf;
      // 女性声: ピッチ高め（1.22倍）、男性声: 通常
      var gain = ctx.createGain();
      gain.gain.value = 1.0;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.onended = function() {
        setTimeout(function() { _callerPlaySequence(names, idx + 1, onDone); }, 60);
      };
      source.start();
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(doPlay);
    } else {
      doPlay();
    }
  });
}

// ---- Speech フォールバックキュー ----
function _speechEnqueue(text, opts) {
  if (!window.speechSynthesis) return;
  opts = opts || {};
  var u = new SpeechSynthesisUtterance(text);
  if (_callerVoice) u.voice = _callerVoice;
  u.lang = 'en-GB';
  u.rate = opts.rate || 1.0;
  u.pitch = opts.pitch || 1.0;
  u.volume = opts.volume || 1.0;
  _speechQueue.push(u);
  if (!_speechBusy) _speechFlush();
}

function _speechFlush() {
  if (_speechQueue.length === 0) { _speechBusy = false; return; }
  _speechBusy = true;
  var u = _speechQueue.shift();
  u.onend = function() { setTimeout(_speechFlush, 80); };
  u.onerror = function() { setTimeout(_speechFlush, 80); };
  speechSynthesis.speak(u);
}

// ---- スコアテキスト変換（Speech フォールバック用） ----
var _SMAP = {
  180:'One Hundred and Eighty!', 177:'One Hundred and Seventy Seven',
  174:'One Hundred and Seventy Four', 171:'One Hundred and Seventy One',
  170:'One Hundred and Seventy', 160:'One Hundred and Sixty',
  158:'One Hundred and Fifty Eight', 157:'One Hundred and Fifty Seven',
  150:'One Hundred and Fifty', 140:'One Hundred and Forty',
  130:'One Hundred and Thirty', 120:'One Hundred and Twenty',
  110:'One Hundred and Ten', 100:'One Hundred',
};
function _sText(n) {
  if (n === 0) return 'No score.';
  if (_SMAP[n]) return _SMAP[n];
  var ones=['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  var tens=['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (n < 20) return ones[n];
  if (n < 100) { var t=Math.floor(n/10),o=n%10; return tens[t]+(o?' '+ones[o]:''); }
  var h=Math.floor(n/100), r=n%100;
  var hundreds=['','One Hundred','Two Hundred','Three Hundred','Four Hundred','Five Hundred',
                'Six Hundred','Seven Hundred','Eight Hundred','Nine Hundred'];
  var base = h <= 9 ? hundreds[h] : 'One Thousand';
  if (h >= 10) return base; // 1000
  return base + (r > 0 ? ' and ' + _sText(r) : '');
}

// ============================================================
// PUBLIC API
// ============================================================

function callerScore(score) {
  if (!_callerOn || score == null) return;
  var key = 's' + score;

  // 歓声SE: 高スコアでは歓声を重ねる
  if (score === 180) _callerPlayCrowd('big');
  else if (score >= 140) _callerPlayCrowd('medium');
  else if (score >= 100) _callerPlayCrowd('small');

  // テンション別音声: _high版を先にload試行 → あれば使用、なければ通常版
  if (score >= 100) {
    var highKey = key + '_high';
    _callerLoad(highKey, function(buf) {
      if (buf) {
        _callerPlay([highKey], {text: _sText(score), rate: 1.05, pitch: 1.05});
      } else {
        _callerPlay([key], {text: _sText(score)});
      }
    });
  } else {
    _callerPlay([key], {text: _sText(score)});
  }
}

function callerGameShot(isMatchWin) {
  if (!_callerOn) return;
  var key = isMatchWin ? 'gameshot_match' : 'gameshot_leg';
  var text = isMatchWin ? 'Game Shot! And the match!' : 'Game Shot! And the leg.';
  _callerPlayCrowd(isMatchWin ? 'big' : 'medium');
  _callerPlay([key], {text: text, rate: 1.1, pitch: 1.1});
}

function callerBust() {
  if (!_callerOn) return;
  _callerPlay(['bust'], {text: 'Bust.'});
}

function callerRequire(remaining) {
  if (!_callerOn || remaining <= 0 || remaining > 170) return;
  _callerPlay(['r' + remaining], {text: 'You require ' + _sText(remaining)});
}

function callerSimCheckout(who) {
  if (!_callerOn) return;
  if (who === 'player') {
    _callerPlay(['checkout'], {text: 'Checkout! Well done!'});
  } else {
    _callerPlay(['cpu_checkout'], {text: 'CPU checks out.'});
  }
}

function callerFinish(total) {
  if (!_callerOn) return;
  // "Total score," → [スコア] 全て同じ音声で読み上げ
  _callerPlay(['total_score', null, 's' + total], {text: 'Total score, ' + _sText(total)});
}

// 設定トグル
function toggleCaller() {
  _callerOn = !_callerOn;
  localStorage.setItem('caller', _callerOn ? '1' : '0');
  var btn = document.getElementById('btn-caller');
  if (btn) btn.classList.toggle('caller-off', !_callerOn);
  if (_callerOn) _callerPlay(['caller_on'], {text: 'Caller on.'});
}

// ボタン初期状態
(function(){
  var btn = document.getElementById('btn-caller');
  if (btn && !_callerOn) btn.classList.add('caller-off');
  var gBtn = document.getElementById('btn-caller-gender');
  if (gBtn) gBtn.textContent = _callerGender === 'M' ? '♂' : '♀';
})();

// ============================================================
// game.js フック（キャッシュ対策: caller.js 側から強制パッチ）
// game.js に古いキャッシュが当たっていてもコーラーが動くよう保険的にパッチ
// game.js 側にすでにフックがある場合は二重コールを防ぐ
// ============================================================
(function _callerPatchGameFunctions() {
  function patch() {
    // CountUp: commit() — フックがなければパッチ
    if (typeof commit === 'function' && !commit.toString().includes('callerScore') && !commit._callerPatched) {
      var _origCommit = commit;
      window.commit = function(total) { _origCommit.apply(this, arguments); callerScore(total); };
      window.commit._callerPatched = true;
    }

    // 01: z01Ok() — フックがなければパッチ（スコアコールは _z01Commit 経由にする）
    if (typeof z01Ok === 'function' && !z01Ok.toString().includes('callerScore') && !z01Ok._callerPatched) {
      var _origZ01Ok = z01Ok;
      window.z01Ok = function() { _origZ01Ok.apply(this, arguments); };
      window.z01Ok._callerPatched = true;
      // _z01Commit でスコア・バストをコール
      if (typeof _z01Commit === 'function' && !_z01Commit.toString().includes('callerBust') && !_z01Commit._callerPatched) {
        var _origZ01Commit = _z01Commit;
        window._z01Commit = function(sc) {
          var p = _z01.currentPlayer, rem = _z01.remain[p], after = rem - sc;
          var bust = _z01.outRule === 0 ? (after < 0 || after === 1) : (after < 0);
          _origZ01Commit.apply(this, arguments);
          if (bust) { callerBust(); } else if (sc > 0) { callerScore(sc); }
        };
        window._z01Commit._callerPatched = true;
      }
    }

    // 01: _z01LegEnd() — フックがなければパッチ
    if (typeof _z01LegEnd === 'function' && !_z01LegEnd.toString().includes('callerGameShot') && !_z01LegEnd._callerPatched) {
      var _origLegEnd = _z01LegEnd;
      window._z01LegEnd = function(winner) {
        _origLegEnd.apply(this, arguments);
        var matchOver = _z01 && _z01.legWins && (_z01.legWins[winner] >= _z01.legs);
        callerGameShot(matchOver);
      };
      window._z01LegEnd._callerPatched = true;
    }

    // CountUp: showResult() — フックがなければパッチ
    if (typeof showResult === 'function' && !showResult.toString().includes('callerFinish') && !showResult._callerPatched) {
      var _origShowResult = showResult;
      window.showResult = function() {
        _origShowResult.apply(this, arguments);
        if (typeof g !== 'undefined' && g.total != null) callerFinish(g.total);
      };
      window.showResult._callerPatched = true;
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patch);
  } else {
    patch();
  }
})();

// iOS Safari: 最初のユーザー操作で AudioContext を unlock する
(function _callerIosUnlock() {
  function unlock() {
    if (_callerCtx) {
      if (_callerCtx.state === 'suspended') _callerCtx.resume();
    } else if (_callerManifestReady) {
      // manifest が読み込まれていれば AudioContext を先に作成しておく
      _callerGetCtx();
    }
    document.removeEventListener('touchstart', unlock, true);
    document.removeEventListener('click', unlock, true);
  }
  document.addEventListener('touchstart', unlock, true);
  document.addEventListener('click', unlock, true);
})();
