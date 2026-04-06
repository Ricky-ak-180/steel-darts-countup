// ============================================================
// sim501.js — 501 シミュレーター
// ============================================================

// ---- Board geometry (matches data.js) ----
var _S_SEGS = [20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
var _S_CX=120,_S_CY=120,_S_R=100,_S_RD=92,_S_RT2=62,_S_RT1=54,_S_RB=16,_S_RBULL=7;

// ---- Levels: σ in board-px (board radius = 100px in 240px SVG) ----
var _S_LVL = [
  {name:'初心者',   sigma:42},
  {name:'アマ',     sigma:26},
  {name:'ハウス',   sigma:16},
  {name:'セミプロ', sigma:10},
  {name:'プロ',     sigma:6},
  {name:'エリート', sigma:3},
];

// ---- Game state ----
var _simG = {
  mode:'cpu', playerLvl:2, cpuLvl:2, totalLegs:3, firstThrow:'player',
  playerLegs:0, cpuLegs:0,
  curPlayer:'player',
  playerScore:501, cpuScore:501,
  pRoundStart:501, cRoundStart:501,
  dartIdx:0, roundDarts:[],
  pThrows:0, pScored:0, pCoAttempts:0, pCoHits:0,
  cThrows:0, cScored:0, cCoAttempts:0, cCoHits:0,
  corkPhase:0, corkPDist:999, corkCDist:999,
  busy:false,
};

// Timestamp when board was last drawn (prevents touch click-through)
var _simBoardAt = 0;

// ---- Box-Muller N(0,1) ----
function _sN01() {
  var u=0,v=0;
  while(!u) u=Math.random();
  while(!v) v=Math.random();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function _sNoise(ax,ay,sig){ return {x:ax+_sN01()*sig, y:ay+_sN01()*sig}; }

// ---- Segment centre (SVG coords) ----
function _sSegPt(s) {
  if (!s||s==='Bull') return {x:_S_CX,y:_S_CY};
  if (s==='25') return {x:_S_CX, y:_S_CY-(_S_RB+_S_RBULL)/2};
  var m=s.match(/^([TDB]?)(\d+)$/); if(!m) return {x:_S_CX,y:_S_CY};
  var ring=m[1]||'S', n=parseInt(m[2]);
  var idx=_S_SEGS.indexOf(n); if(idx<0) return {x:_S_CX,y:_S_CY};
  var ang=(-99+(idx+0.5)*18)*Math.PI/180;
  var r=ring==='D'?(_S_R+_S_RD)/2:ring==='T'?(_S_RT2+_S_RT1)/2:(_S_RD+_S_RT2)/2;
  return {x:_S_CX+r*Math.cos(ang), y:_S_CY+r*Math.sin(ang)};
}

// ---- (x,y) → dart result ----
function _sHit(x,y) {
  var dx=x-_S_CX, dy=y-_S_CY, d=Math.sqrt(dx*dx+dy*dy);
  if (d>_S_R+4)    return {s:'miss',v:0,dbl:false};
  if (d<=_S_RBULL) return {s:'Bull',v:50,dbl:true};
  if (d<=_S_RB)    return {s:'25',  v:25,dbl:false};
  var ang=Math.atan2(dy,dx)*180/Math.PI;
  var idx=Math.floor(((ang+99)%360+360)%360/18)%20;
  var n=_S_SEGS[idx];
  if (d<=_S_RT1) return {s:String(n),   v:n,   dbl:false};
  if (d<=_S_RT2) return {s:'T'+n,       v:n*3, dbl:false};
  if (d<=_S_RD)  return {s:String(n),   v:n,   dbl:false};
               return {s:'D'+n,         v:n*2, dbl:true};
}

// ---- 501 bust check ----
// returns {ok, checkout, bust, realVal}
function _sCheck(remaining, dart) {
  var r=remaining-dart.v;
  if (r<0||r===1||(r===0&&!dart.dbl)) return {bust:true,  v:dart.v, s:dart.s};
  if (r===0&&dart.dbl)                return {checkout:true,v:dart.v,s:dart.s};
  return {ok:true, v:dart.v, s:dart.s};
}

// ---- CPU aim ----
function _sAim(score) {
  if (score<=170&&typeof CHECKOUT!=='undefined'&&CHECKOUT[score]) return CHECKOUT[score][0];
  if (score>40) return 'T20';
  if (score===50) return 'Bull';
  if (score%2===0&&score<=40) return 'D'+(score/2);
  return '1';
}

// ============================================================
// SVG BOARD RENDERER
// ============================================================
function _sBoardSVG(aimX,aimY,landX,landY,hint) {
  var cx=_S_CX,cy=_S_CY,R=_S_R;
  function rad(d){return d*Math.PI/180;}
  function arc(ro,ri,a1,a2){
    var c1=Math.cos(rad(a1)),s1=Math.sin(rad(a1)),c2=Math.cos(rad(a2)),s2=Math.sin(rad(a2));
    return 'M'+(cx+ro*c1)+','+(cy+ro*s1)+
           ' A'+ro+','+ro+',0,0,1,'+(cx+ro*c2)+','+(cy+ro*s2)+
           ' L'+(cx+ri*c2)+','+(cy+ri*s2)+
           ' A'+ri+','+ri+',0,0,0,'+(cx+ri*c1)+','+(cy+ri*s1)+'Z';
  }
  // Highlight hint segment
  var hintParsed = hint ? hint.match(/^([TDB]?)(\d+)$/) : null;
  var hintRing = hintParsed ? (hintParsed[1]||'S') : null;
  var hintN    = hintParsed ? parseInt(hintParsed[2]) : -1;
  var svg='<svg id="sim-bsvg" width="240" height="240" viewBox="0 0 240 240" style="display:block;touch-action:none;">';
  svg+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(R+2)+'" fill="#0a0a0a"/>';
  for(var i=0;i<20;i++){
    var n=_S_SEGS[i],a1=-99+i*18,a2=a1+18,ev=i%2===0;
    var isH = n===hintN;
    var cS=ev?'#1c1c1c':'#141414', cT=ev?'#0d2e10':'#2a0d0d', cD=ev?'#0d2e10':'#2a0d0d';
    if (isH&&hintRing==='S') cS=ev?'rgba(66,165,245,0.3)':'rgba(66,165,245,0.25)';
    if (isH&&hintRing==='T') cT='rgba(66,165,245,0.5)';
    if (isH&&hintRing==='D') cD='rgba(66,165,245,0.5)';
    svg+='<path d="'+arc(R,_S_RD,a1,a2)+'" fill="'+cD+'"/>';
    svg+='<path d="'+arc(_S_RD,_S_RT2,a1,a2)+'" fill="'+cS+'"/>';
    svg+='<path d="'+arc(_S_RT2,_S_RT1,a1,a2)+'" fill="'+cT+'"/>';
    svg+='<path d="'+arc(_S_RT1,_S_RB,a1,a2)+'" fill="'+cS+'"/>';
    var wc=Math.cos(rad(a1)),ws=Math.sin(rad(a1));
    svg+='<line x1="'+(cx+R*wc)+'" y1="'+(cy+R*ws)+'" x2="'+(cx+_S_RB*wc)+'" y2="'+(cy+_S_RB*ws)+'" stroke="#2a2a2a" stroke-width="1"/>';
    var la=-99+(i+0.5)*18;
    svg+='<text x="'+(cx+113*Math.cos(rad(la)))+'" y="'+(cy+113*Math.sin(rad(la)))+'" text-anchor="middle" dominant-baseline="central" font-size="9" fill="#666" font-family="Arial,sans-serif">'+n+'</text>';
  }
  var cBull='#0d3d10', cBs='#6b0f0f';
  if (hint==='Bull')  cBs='rgba(66,165,245,0.5)';
  if (hint==='25')    cBull='rgba(66,165,245,0.4)';
  svg+='<circle cx="'+cx+'" cy="'+cy+'" r="'+_S_RB+'" fill="'+cBull+'"/>';
  svg+='<circle cx="'+cx+'" cy="'+cy+'" r="'+_S_RBULL+'" fill="'+cBs+'"/>';
  if (aimX!=null) {
    svg+='<circle cx="'+aimX+'" cy="'+aimY+'" r="6" fill="rgba(232,255,71,0.3)" stroke="#e8ff47" stroke-width="1.5"/>';
    svg+='<line x1="'+(aimX-9)+'" y1="'+aimY+'" x2="'+(aimX+9)+'" y2="'+aimY+'" stroke="#e8ff47" stroke-width="1" opacity="0.6"/>';
    svg+='<line x1="'+aimX+'" y1="'+(aimY-9)+'" x2="'+aimX+'" y2="'+(aimY+9)+'" stroke="#e8ff47" stroke-width="1" opacity="0.6"/>';
  }
  if (landX!=null) {
    svg+='<circle cx="'+landX+'" cy="'+landY+'" r="4.5" fill="#ffe066" stroke="#fff8" stroke-width="1"/>';
  }
  svg+='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="#2a2a2a" stroke-width="1.5"/>';
  svg+='</svg>';
  return svg;
}

// ---- Draw board in #sim-board-wrap ----
function _simDraw(ax,ay,lx,ly,hintStr) {
  var w=document.getElementById('sim-board-wrap'); if(!w) return;
  w.innerHTML=_sBoardSVG(ax,ay,lx,ly,hintStr);
  var svg=w.querySelector('#sim-bsvg');
  if(!svg) return;
  if (_simG.curPlayer!=='player') { svg.style.pointerEvents='none'; return; }
  svg.style.pointerEvents='';
  _simBoardAt = Date.now();
  function onTap(cx2,cy2){
    if(_simG.busy||_simG.curPlayer!=='player') return;
    if(Date.now()-_simBoardAt < 400) return; // ignore click-through from previous UI tap
    var r=svg.getBoundingClientRect();
    _simPlayerThrow((cx2-r.left)*240/r.width,(cy2-r.top)*240/r.height);
  }
  svg.addEventListener('touchstart',function(e){e.preventDefault();var t=e.changedTouches[0];onTap(t.clientX,t.clientY);},{passive:false,once:true});
  svg.addEventListener('click',function(e){onTap(e.clientX,e.clientY);},{once:true});
}

// ============================================================
// THROW FLOW — PLAYER
// ============================================================
function _simPlayerThrow(tapX,tapY) {
  if (_simG.busy||_simG.curPlayer!=='player') return;
  _simG.busy=true;
  var sig=_S_LVL[_simG.playerLvl].sigma;
  var land=_sNoise(tapX,tapY,sig);
  var dart=_sHit(land.x,land.y);
  // track CO attempt at round start if score<=170
  // (tracked at round-level below)
  _simDraw(tapX,tapY,null,null,null);
  setTimeout(function(){
    _simDraw(tapX,tapY,land.x,land.y,null);
    if(typeof sfxImpact==='function') sfxImpact();
    _simProcessDart('player',dart);
    _simG.busy=false;
  },320);
}

// ============================================================
// THROW FLOW — CPU
// ============================================================
function _simCpuRound() {
  _simG.dartIdx=0; _simG.roundDarts=[];
  _simG.cRoundStart=_simG.cpuScore;
  // Track CO attempt
  if (_simG.cpuScore<=170&&typeof CHECKOUT!=='undefined'&&CHECKOUT[_simG.cpuScore]) _simG.cCoAttempts++;
  _simCpuDart();
}

function _simCpuDart() {
  if (_simG.dartIdx>=3) { _simEndCpuRound(); return; }
  _simG.busy=true;
  setTimeout(function(){
    var aimStr=_sAim(_simG.cpuScore);
    var pt=_sSegPt(aimStr);
    var sig=_S_LVL[_simG.cpuLvl].sigma;
    var land=_sNoise(pt.x,pt.y,sig);
    var dart=_sHit(land.x,land.y);
    _simDraw(pt.x,pt.y,null,null,null);
    setTimeout(function(){
      _simDraw(pt.x,pt.y,land.x,land.y,null);
      if(typeof sfxImpact==='function') sfxImpact();
      _simG.busy=false;
      _simProcessDart('cpu',dart);
    },350);
  },600);
}

// ============================================================
// UNIFIED DART PROCESSING
// ============================================================
function _simProcessDart(who,dart) {
  var score=who==='player'?_simG.playerScore:_simG.cpuScore;
  var res=_sCheck(score,dart);
  var entry={s:res.s,v:res.v,bust:!!res.bust,checkout:!!res.checkout};
  _simG.roundDarts.push(entry);
  if (who==='player') {
    _simG.pThrows++;
    if(!res.bust){ _simG.playerScore-=res.v; _simG.pScored+=res.v; }
    if(res.checkout) _simG.pCoHits++;
  } else {
    _simG.cThrows++;
    if(!res.bust){ _simG.cpuScore-=res.v; _simG.cScored+=res.v; }
    if(res.checkout) _simG.cCoHits++;
  }
  _simRefresh();
  if (res.checkout) {
    if(typeof sfxCheckout==='function') sfxCheckout();
    setTimeout(function(){ _simEndLeg(who); },600);
    return;
  }
  if (res.bust) {
    // Restore score and reverse this round's pScored/cScored contributions
    if(who==='player') {
      _simG.pScored -= (_simG.pRoundStart - _simG.playerScore);
      _simG.playerScore = _simG.pRoundStart;
    } else {
      _simG.cScored -= (_simG.cRoundStart - _simG.cpuScore);
      _simG.cpuScore = _simG.cRoundStart;
    }
    _simRefresh();
    setTimeout(function(){
      if(who==='player') _simEndPlayerRound();
      else _simEndCpuRound();
    },600);
    return;
  }
  _simG.dartIdx++;
  if (_simG.dartIdx>=3) {
    setTimeout(function(){
      if(who==='player') _simEndPlayerRound();
      else _simEndCpuRound();
    },400);
    return;
  }
  // Continue
  if (who==='player') {
    _simRefresh();
    setTimeout(_simDrawHint, 550);
  } else {
    _simCpuDart();
  }
}

// ---- End rounds & switch turns ----
function _simEndPlayerRound() {
  _simG.dartIdx=0; _simG.roundDarts=[];
  if (_simG.mode==='solo') {
    _simG.pRoundStart=_simG.playerScore;
    _simRefresh();
    _simDrawHint();
    return;
  }
  _simG.curPlayer='cpu';
  _simG.cRoundStart=_simG.cpuScore;
  _simRefresh();
  _simDrawHint();
  setTimeout(function(){ _simCpuRound(); },500);
}

function _simEndCpuRound() {
  _simG.dartIdx=0; _simG.roundDarts=[];
  // Track player CO attempt for next round
  if (_simG.playerScore<=170&&typeof CHECKOUT!=='undefined'&&CHECKOUT[_simG.playerScore]) _simG.pCoAttempts++;
  _simG.curPlayer='player';
  _simG.pRoundStart=_simG.playerScore;
  _simRefresh();
  _simDrawHint();
}

// ============================================================
// LEG & MATCH
// ============================================================
function _simEndLeg(winner) {
  if(winner==='player') _simG.playerLegs++; else _simG.cpuLegs++;
  _simRefresh();
  var legsNeeded=Math.ceil(_simG.totalLegs/2);
  var matchOver= _simG.mode==='solo'
    ? (_simG.playerLegs>=_simG.totalLegs)
    : (_simG.playerLegs>=legsNeeded||_simG.cpuLegs>=legsNeeded);
  if (matchOver) { setTimeout(_simShowResult,500); return; }
  _simShowLegOverlay(winner);
}

function _simShowLegOverlay(winner) {
  var ov=document.getElementById('sim-leg-overlay'); if(!ov) return;
  var txt=document.getElementById('sim-leg-res-txt');
  var scr=document.getElementById('sim-leg-res-scr');
  if(txt){ txt.textContent=winner==='player'?'🎯 LEG WIN!':'😞 CPU WIN'; txt.className='sim-leg-res-txt '+(winner==='player'?'win':'lose'); }
  if(scr) scr.textContent=_simG.playerLegs+' – '+_simG.cpuLegs;
  ov.classList.remove('hide');
  if(winner==='player'&&typeof sfxStreak==='function') sfxStreak();
}

function _simNextLeg() {
  var ov=document.getElementById('sim-leg-overlay'); if(ov) ov.classList.add('hide');
  _simG.playerScore=501; _simG.cpuScore=501;
  _simG.dartIdx=0; _simG.roundDarts=[];
  // Alternate first throw
  _simG.curPlayer=(_simG.curPlayer==='player')?'cpu':'player';
  _simG.pRoundStart=501; _simG.cRoundStart=501;
  _simRefresh();
  _simDrawHint();
  if(_simG.curPlayer==='cpu') setTimeout(_simCpuRound,800);
}

// ============================================================
// CORK
// ============================================================
function _simCorkInit() {
  _simG.corkPhase=0; _simG.corkPDist=999; _simG.corkCDist=999;
  _simShowScreen('sim-cork-screen');
  _simCorkDraw(null,null);
  var msg=document.getElementById('sim-cork-msg');
  if(msg) msg.textContent='ブルを狙って投げる — ボードをタップ！';
  var btn=document.getElementById('sim-cork-btn');
  if(btn) btn.style.display='none';
}

function _simCorkDraw(lx,ly) {
  var w=document.getElementById('sim-cork-wrap'); if(!w) return;
  w.innerHTML=_sBoardSVG(null,null,lx,ly,null);
  var svg=w.querySelector('#sim-bsvg');
  if(!svg||_simG.corkPhase!==0) return;
  function tap(cx2,cy2){
    var r=svg.getBoundingClientRect();
    _simCorkPlayer((cx2-r.left)*240/r.width,(cy2-r.top)*240/r.height);
  }
  svg.addEventListener('touchstart',function(e){e.preventDefault();var t=e.changedTouches[0];tap(t.clientX,t.clientY);},{passive:false,once:true});
  svg.addEventListener('click',function(e){tap(e.clientX,e.clientY);},{once:true});
}

function _simCorkPlayer(tx,ty) {
  _simG.corkPhase=1;
  var land=_sNoise(_S_CX,_S_CY,_S_LVL[_simG.playerLvl].sigma);
  var dx=land.x-_S_CX,dy=land.y-_S_CY;
  _simG.corkPDist=Math.sqrt(dx*dx+dy*dy);
  if(typeof sfxImpact==='function') sfxImpact();
  _simCorkDraw(land.x,land.y);
  var msg=document.getElementById('sim-cork-msg');
  var d=_sHit(land.x,land.y);
  if(msg) msg.textContent='あなた: '+d.s+'  (距離='+_simG.corkPDist.toFixed(1)+'px)';
  setTimeout(_simCorkCpu,900);
}

function _simCorkCpu() {
  _simG.corkPhase=2;
  var land=_sNoise(_S_CX,_S_CY,_S_LVL[_simG.cpuLvl].sigma);
  var dx=land.x-_S_CX,dy=land.y-_S_CY;
  _simG.corkCDist=Math.sqrt(dx*dx+dy*dy);
  if(typeof sfxImpact==='function') sfxImpact();
  _simCorkDraw(land.x,land.y);
  var playerFirst=_simG.corkPDist<=_simG.corkCDist;
  _simG.firstThrow=playerFirst?'player':'cpu';
  var msg=document.getElementById('sim-cork-msg');
  var d=_sHit(land.x,land.y);
  if(msg) msg.textContent='CPU: '+d.s+'  (距離='+_simG.corkCDist.toFixed(1)+'px)\n→ '+(playerFirst?'あなたの先行！':'CPUの先行！');
  var btn=document.getElementById('sim-cork-btn');
  if(btn){btn.style.display='';btn.textContent=playerFirst?'あなたの先行でスタート！':'CPUの先行でスタート！';}
}

function _simCorkGo() { _simBeginGame(); }

// ============================================================
// SETUP UI
// ============================================================
function sim501ShowSetup() {
  _simShowScreen('sim-setup-screen');
  _simSyncSetup();
}

function _simSyncSetup() {
  var m=_simG.mode;
  var b0=document.getElementById('simm0'),b1=document.getElementById('simm1');
  if(b0){b0.classList.toggle('active',m==='solo');b1.classList.toggle('active',m==='cpu');}
  var ps=document.getElementById('sim-plvl'); if(ps) ps.value=String(_simG.playerLvl);
  var cs=document.getElementById('sim-clvl'); if(cs) cs.value=String(_simG.cpuLvl);
  var ls=document.getElementById('sim-legs'); if(ls) ls.value=String(_simG.totalLegs);
  var cpuRow=document.getElementById('sim-cpu-row');   if(cpuRow) cpuRow.style.display=m==='solo'?'none':'';
  var firstRow=document.getElementById('sim-first-row');if(firstRow)firstRow.style.display=m==='solo'?'none':'';
  document.querySelectorAll('[data-simfirst]').forEach(function(b){
    b.classList.toggle('active',b.getAttribute('data-simfirst')===_simG.firstThrow);
  });
}

function sim501SetMode(v){ _simG.mode=v; _simSyncSetup(); }
function sim501SetFirst(v){ _simG.firstThrow=v; _simSyncSetup(); }

function sim501Start() {
  var b0=document.getElementById('simm0');
  _simG.mode=(b0&&b0.classList.contains('active'))?'solo':'cpu';
  var ps=document.getElementById('sim-plvl'); if(ps) _simG.playerLvl=parseInt(ps.value)||2;
  var cs=document.getElementById('sim-clvl'); if(cs) _simG.cpuLvl=parseInt(cs.value)||2;
  var ls=document.getElementById('sim-legs'); if(ls) _simG.totalLegs=parseInt(ls.value)||3;
  // Reset stats
  _simG.playerLegs=0;_simG.cpuLegs=0;
  _simG.pThrows=0;_simG.pScored=0;_simG.pCoAttempts=0;_simG.pCoHits=0;
  _simG.cThrows=0;_simG.cScored=0;_simG.cCoAttempts=0;_simG.cCoHits=0;
  if (_simG.firstThrow==='cork'&&_simG.mode!=='solo') { _simCorkInit(); return; }
  if (_simG.firstThrow==='coin') _simG.firstThrow=Math.random()<0.5?'player':'cpu';
  _simBeginGame();
}

function _simBeginGame() {
  _simG.playerScore=501;_simG.cpuScore=501;
  _simG.dartIdx=0;_simG.roundDarts=[];
  _simG.curPlayer=(_simG.mode==='solo'||_simG.firstThrow==='player')?'player':'cpu';
  _simG.pRoundStart=501;_simG.cRoundStart=501;
  _simShowScreen('sim-game-screen');
  var cpuBlk=document.getElementById('sim-score-cpu');
  if(cpuBlk) cpuBlk.style.display=_simG.mode==='solo'?'none':'';
  _simRefresh();
  _simDrawHint();
  if(_simG.curPlayer==='cpu') setTimeout(_simCpuRound,800);
}

// ============================================================
// UI HELPERS
// ============================================================

function _simGetHint() {
  var sc=_simG.curPlayer==='player'?_simG.playerScore:_simG.cpuScore;
  if(sc<=170&&sc>=2&&typeof CHECKOUT!=='undefined'&&CHECKOUT[sc]) return CHECKOUT[sc][0];
  return null;
}
function _simDrawHint() { _simDraw(null,null,null,null,_simGetHint()); }

function _simShowScreen(id) {
  ['sim-setup-screen','sim-cork-screen','sim-game-screen','sim-result-screen'].forEach(function(s){
    var el=document.getElementById(s);
    if(el) el.style.display=(s===id)?'':'none';
  });
}

function _simRefresh() {
  // Scores
  var ps=document.getElementById('sim-ps');if(ps) ps.textContent=_simG.playerScore;
  var cs2=document.getElementById('sim-cs');if(cs2) cs2.textContent=_simG.cpuScore;
  var ls=document.getElementById('sim-ls');if(ls) ls.textContent=_simG.playerLegs+' – '+_simG.cpuLegs;
  // Active highlight
  var pb=document.getElementById('sim-score-player');
  var cb=document.getElementById('sim-score-cpu');
  if(pb) pb.classList.toggle('sim-active',_simG.curPlayer==='player');
  if(cb) cb.classList.toggle('sim-active',_simG.curPlayer==='cpu');
  // Dart slots
  var ds=document.getElementById('sim-dart-slots');
  if(ds){
    var h='';
    for(var i=0;i<3;i++){
      var d=_simG.roundDarts[i];
      if(d) h+='<div class="sim-ds '+(d.bust?'sim-ds-bust':d.checkout?'sim-ds-co':'sim-ds-hit')+'">'+d.s+'<br><small>'+(d.bust?'BUST':'+'+d.v)+'</small></div>';
      else  h+='<div class="sim-ds sim-ds-empty'+(i===_simG.dartIdx?' sim-ds-cur':'')+'">—</div>';
    }
    ds.innerHTML=h;
  }
  // Turn message
  var tm=document.getElementById('sim-turn-msg');
  if(tm){
    if(_simG.mode==='solo'){
      tm.innerHTML='<span class="sim-tm-you">あなたのターン</span> — ボードをタップ';
    } else if(_simG.curPlayer==='player'){
      tm.innerHTML='<span class="sim-tm-you">あなたのターン</span> — ボードをタップ';
    } else {
      tm.innerHTML='<span class="sim-tm-cpu">CPU ターン</span>…';
    }
  }
  // Checkout hint
  var hn=document.getElementById('sim-hint');
  if(hn){
    var sc=_simG.curPlayer==='player'?_simG.playerScore:_simG.cpuScore;
    if(sc<=170&&sc>=2&&typeof CHECKOUT!=='undefined'&&CHECKOUT[sc]){
      hn.textContent='上がり目: '+CHECKOUT[sc].join(' → ');
      hn.style.display='';
    } else {
      hn.style.display='none';
    }
  }
}

// ============================================================
// RESULT SCREEN
// ============================================================
function _simShowResult() {
  _simShowScreen('sim-result-screen');
  var rw=document.getElementById('sim-rw');
  var rs=document.getElementById('sim-rs');
  if(rw){
    if(_simG.mode==='solo'){rw.textContent='🎯 FINISH!';rw.className='sim-rw neutral';}
    else if(_simG.playerLegs>_simG.cpuLegs){rw.textContent='🏆 YOU WIN!';rw.className='sim-rw win';if(typeof sfxStreak==='function')sfxStreak();}
    else{rw.textContent='😞 CPU WIN';rw.className='sim-rw lose';}
  }
  var pA=_simG.pThrows>0?(_simG.pScored/_simG.pThrows*3).toFixed(1):'—';
  var cA=_simG.cThrows>0?(_simG.cScored/_simG.cThrows*3).toFixed(1):'—';
  var pC=_simG.pCoAttempts>0?Math.round(_simG.pCoHits/_simG.pCoAttempts*100)+'%':'—';
  var cC=_simG.cCoAttempts>0?Math.round(_simG.cCoHits/_simG.cCoAttempts*100)+'%':'—';
  if(rs){
    var isCpu=_simG.mode==='cpu';
    var lg=isCpu?'<div class="sim-stat"><span>レグ</span><b>'+_simG.playerLegs+' – '+_simG.cpuLegs+'</b></div>':'';
    var hdr='<div class="sim-stat sim-stat-hdr"><span></span><b>YOU</b>'+(isCpu?'<b>CPU</b>':'')+'</div>';
    var avg='<div class="sim-stat"><span>3本平均</span><b>'+pA+'</b>'+(isCpu?'<b>'+cA+'</b>':'')+'</div>';
    var co ='<div class="sim-stat"><span>CO率</span><b>'+pC+'</b>'+(isCpu?'<b>'+cC+'</b>':'')+'</div>';
    var thr='<div class="sim-stat"><span>スロー数</span><b>'+_simG.pThrows+'</b>'+(isCpu?'<b>'+_simG.cThrows+'</b>':'')+'</div>';
    rs.innerHTML=lg+hdr+avg+co+thr;
  }
}

// ============================================================
// _fns EXTENSION (must run after arr.js defines _fns)
// ============================================================
(function(){
  if(typeof _fns==='undefined') return;
  _fns.goTabSim      = function(){ goTab('sim'); };
  _fns.sim501Start   = sim501Start;
  _fns.sim501SetMode0= function(){ sim501SetMode('solo'); };
  _fns.sim501SetMode1= function(){ sim501SetMode('cpu'); };
  _fns.sim501First   = function(a){ sim501SetFirst(['player','cpu','coin','cork'][a]); };
  _fns.sim501NextLeg = _simNextLeg;
  _fns.sim501CorkGo  = _simCorkGo;
  _fns.sim501Again   = function(){ sim501ShowSetup(); };
})();

// Move vsim inside .app if it was placed outside (HTML structure issue)
(function(){
  var vsim = document.getElementById('vsim');
  var app  = document.querySelector('.app');
  if (app && vsim && !app.contains(vsim)) {
    app.appendChild(vsim);
  }
})();
