/* ================================================================
   tutorial.js
   How-To-Play modal — canvas animation for each tutorial page.
   Extracted from the inline <script> block in fin_n_fury.html.
================================================================= */

/* ── Tutorial helpers ────────────────────────────────── */
var _tutTimers = {};

function tutGo(n) {
  Object.keys(_tutTimers).forEach(function(k){ cancelAnimationFrame(_tutTimers[k]); delete _tutTimers[k]; });
  document.querySelectorAll('.tut-page').forEach(function(p){ p.classList.remove('active'); });
  var page = document.getElementById('tut-' + n);
  if (page) { page.classList.add('active'); _tutDraw(n); }
}

function _tutClose() {
  Object.keys(_tutTimers).forEach(function(k){ cancelAnimationFrame(_tutTimers[k]); delete _tutTimers[k]; });
  document.querySelectorAll('.tut-page').forEach(function(p){ p.classList.remove('active'); });
  document.getElementById('tut-1').classList.add('active');
  var m = document.getElementById('howToPlayModal');
  m.classList.remove('open'); m.setAttribute('aria-hidden','true');
}

document.addEventListener('DOMContentLoaded', function(){
  document.getElementById('closeHowToPlay').addEventListener('click', _tutClose);
  document.getElementById('closeHowToPlayDone').addEventListener('click', _tutClose);
  var _modal = document.getElementById('howToPlayModal');
  new MutationObserver(function(){
    if (_modal.classList.contains('open')) setTimeout(function(){ tutGo(1); }, 80);
  }).observe(_modal, { attributes: true, attributeFilter: ['class'] });
});

function _tutDraw(page) {
  var cvs = document.getElementById('tutC' + page);
  if (!cvs) return;
  var ctx = cvs.getContext('2d'), W = cvs.width, H = cvs.height, t = 0;

  function bg() {
    var g = ctx.createLinearGradient(0,0,0,H);
    g.addColorStop(0,'#001428'); g.addColorStop(1,'#003060');
    ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
    ctx.fillStyle='rgba(0,35,70,.7)'; ctx.fillRect(0,H-28,W,28);
  }
  function key(label,x,y) {
    ctx.save(); ctx.font="bold 12px 'Exo 2',sans-serif";
    var kw=ctx.measureText(label).width+18,kh=24;
    ctx.fillStyle='rgba(0,120,200,.28)'; ctx.strokeStyle='rgba(0,200,255,.65)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(x-kw/2,y-kh/2,kw,kh,6); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#7de8ff'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(label,x,y); ctx.restore();
  }

  var _finImg  = Object.assign(new Image(),{src:'fishh.png'});
  var _furyImg = Object.assign(new Image(),{src:'fish3_1.png'});

  function drawPlayer(cx,cy,h,facingLeft) {
    ctx.save(); ctx.translate(cx,cy);
    if(!facingLeft) ctx.scale(-1,1);
    if(_finImg.complete&&_finImg.naturalWidth>0){
      var sc=h/_finImg.naturalHeight,w=_finImg.naturalWidth*sc;
      ctx.globalCompositeOperation='screen';
      ctx.drawImage(_finImg,-w/2,-h/2,w,h);
    } else {
      ctx.fillStyle='#ff9900'; ctx.beginPath(); ctx.ellipse(0,0,h*.55,h*.4,0,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  function drawEnemy(cx,cy,h,facingLeft) {
    ctx.save(); ctx.translate(cx,cy);
    if(!facingLeft) ctx.scale(-1,1);
    if(_furyImg.complete&&_furyImg.naturalWidth>0){
      var sc=h/_furyImg.naturalHeight,w=_furyImg.naturalWidth*sc;
      ctx.globalCompositeOperation='screen';
      ctx.drawImage(_furyImg,-w/2,-h/2,w,h);
    } else {
      ctx.fillStyle='#ff3030'; ctx.beginPath(); ctx.ellipse(0,0,h*.6,h*.42,0,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
  }
  function fish(cx,cy,sz,col,facingLeft,bob){
    ctx.save(); ctx.translate(cx,cy+(bob||0));
    if(facingLeft) ctx.scale(-1,1);
    ctx.fillStyle=col;
    ctx.beginPath(); ctx.ellipse(0,0,sz,sz*0.5,0,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz*.8,0); ctx.lineTo(sz*1.4,-sz*.45); ctx.lineTo(sz*1.4,sz*.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(-sz*.38,-sz*.1,sz*.14,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }
  function heart(x,y,filled){
    ctx.save(); ctx.font='20px serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.globalAlpha=filled?1:.22; ctx.shadowColor='#ff2020'; ctx.shadowBlur=filled?10:0;
    ctx.fillStyle='#ff4040'; ctx.fillText('❤',x,y); ctx.restore();
  }

  function p1(){
    bg();
    var fx=80+Math.sin(t*.038)*150, fy=H/2+Math.sin(t*.052)*45;
    drawPlayer(fx,fy,54,Math.cos(t*.038)<0);
    ctx.save(); ctx.strokeStyle='rgba(0,200,255,.3)'; ctx.lineWidth=1.5; ctx.setLineDash([4,4]);
    ctx.beginPath(); ctx.arc(fx,fy,38,0,Math.PI*2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    var kx=W-95,ky=H/2-8;
    key('W',kx,ky-34); key('A',kx-30,ky); key('S',kx,ky); key('D',kx+30,ky);
    ctx.save(); ctx.fillStyle='rgba(150,220,255,.5)'; ctx.font="10px 'Exo 2',sans-serif"; ctx.textAlign='center';
    ctx.fillText('or ↑ ← ↓ →',kx,ky+30); ctx.restore();
  }
  function p2(){
    bg();
    var px=60+(t*.6)%(W-80);
    var bait=[{bx:W*.55,by:H*.28,sz:9,col:'#ff9944'},{bx:W*.70,by:H*.62,sz:11,col:'#44ccff'},{bx:W*.62,by:H*.48,sz:7,col:'#ff6699'},{bx:W*.82,by:H*.38,sz:13,col:'#88ff88'}];
    bait.forEach(function(f,i){
      if(Math.hypot(px-f.bx,H/2-f.by)>22*.5+f.sz) fish(f.bx,f.by,f.sz,f.col,true,Math.sin(t*.07+i)*3);
    });
    drawPlayer(px,H/2,54,false);
    ctx.save(); ctx.globalAlpha=.4+Math.sin(t*.06)*.4; ctx.fillStyle='#ffd060';
    ctx.font="bold 18px 'Bangers',cursive"; ctx.textAlign='center'; ctx.shadowColor='#ffd060'; ctx.shadowBlur=10;
    ctx.fillText('+15',px+38,H/2-36); ctx.restore();
  }
  function p3(){
    bg();
    var px=80+Math.sin(t*.04)*50, py=H/2+Math.cos(t*.035)*28;
    var ex=W*.68+Math.cos(t*.04)*18, ey=H/2+Math.sin(t*.04)*14;
    ctx.save(); ctx.strokeStyle='rgba(255,60,60,'+(.25+Math.sin(t*.08)*.15)+')'; ctx.lineWidth=2.5;
    ctx.beginPath(); ctx.arc(ex,ey,52+Math.sin(t*.08)*5,0,Math.PI*2); ctx.stroke(); ctx.restore();
    drawPlayer(px,py,50,true); drawEnemy(ex,ey,64,true);
    for(var i=0;i<5;i++) heart(22+i*26,22,i<3);
  }
  function p4(){
    bg();
    var lt=t%270,phase=lt<90?0:lt<180?1:2;
    var cx2=W/2,cy2=H-34;
    ctx.save();
    var sg=ctx.createLinearGradient(cx2,cy2,cx2,cy2+16); sg.addColorStop(0,'#9a6840'); sg.addColorStop(1,'#5a3218');
    ctx.fillStyle=sg; ctx.beginPath(); ctx.ellipse(cx2,cy2+8,28,13,0,0,Math.PI*2); ctx.fill();
    if(phase>=1){
      var pr=ctx.createRadialGradient(cx2-3,cy2-14,1,cx2,cy2-12,10); pr.addColorStop(0,'#fffaee'); pr.addColorStop(1,'#c09878');
      ctx.fillStyle=pr; ctx.beginPath(); ctx.arc(cx2,cy2-12,10,0,Math.PI*2); ctx.fill();
    }
    ctx.restore();
    var px2,py2;
    if(phase===0){px2=60+(lt/90)*(cx2-80);py2=H*.42;}
    else if(phase===1){px2=cx2;py2=H*.35;}
    else{px2=cx2+30;py2=H*.38;}
    drawPlayer(px2,py2,50,false);
    if(phase===2) key('SPACE',W*.78,H*.2);
  }
  function p5(){
    bg();
    var phase=Math.floor(t/120)%4;
    var bx=W*.72+Math.sin(t*.04)*16, by=H*.42;
    var playerX=W*.25, playerY=H*.45;
    if(phase<3) drawEnemy(bx,by,80,true);
    drawPlayer(playerX,playerY,54,false);
    if(phase===3){
      ctx.save(); ctx.font="bold 28px 'Bangers',cursive"; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillStyle='#ffd060'; ctx.shadowColor='#ffd060'; ctx.shadowBlur=20;
      ctx.fillText('🏆 YOU WIN! 🏆',W/2,H*.38); ctx.restore();
    }
  }

  var renderers={1:p1,2:p2,3:p3,4:p4,5:p5};
  function loop(){
    if(renderers[page]) renderers[page]();
    t++;
    _tutTimers[page]=requestAnimationFrame(loop);
  }
  loop();
}