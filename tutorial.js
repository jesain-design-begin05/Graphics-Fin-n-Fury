/* ================================================================
   tutorial.js
   How-To-Play modal — canvas animation for each tutorial page.
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

  /* ── Fin sprite sheet — same sheet used by the game ──────────
     fin_sprite-removebg-previeww.png : 4 cols × 4 rows
       row 0 = idle   row 1 = swim
       row 2 = attack row 3 = shoot
  ──────────────────────────────────────────────────────────── */
  var _finSheet = Object.assign(new Image(), {
    src: 'fish_sprites/Finnew_sprite/fin_sprite-removebg-previeww.png'
  });
  var _furyImg  = Object.assign(new Image(), { src: 'fish3_1.png' });
  var _finImg   = Object.assign(new Image(), { src: 'fishh.png' }); // fallback

  // Projectile sprites — same 8 frames the game uses
  var _projSprites = [];
  for (var _pi = 1; _pi <= 8; _pi++) {
    var _pn = _pi < 10 ? '0' + _pi : '' + _pi;
    _projSprites[_pi] = Object.assign(new Image(), {
      src: 'projectile_water/projectile_water' + _pn + '.png'
    });
  }

  var FIN_COLS = 4, FIN_ROWS_COUNT = 4;
  var FIN_ROW_IDLE = 0, FIN_ROW_SWIM = 1, FIN_ROW_ATTACK = 2, FIN_ROW_SHOOT = 3;

  /* Draw one frame from the fin sheet.
     col  0-3, row = one of the FIN_ROW_* constants
     facingLeft = true → sprite faces left (sheet native direction) */
  function drawPlayer(cx, cy, h, facingLeft, row, col) {
    row = (row === undefined) ? FIN_ROW_SWIM : row;
    col = (col === undefined) ? 0            : col;

    ctx.save();
    ctx.translate(cx, cy);
    if (!facingLeft) ctx.scale(-1, 1); // flip for right-facing

    var sheetReady = _finSheet.complete && _finSheet.naturalWidth > 0;
    if (sheetReady) {
      var fw = _finSheet.naturalWidth  / FIN_COLS;
      var fh = _finSheet.naturalHeight / FIN_ROWS_COUNT;
      var dw = fw * (h / fh); // scale so drawn height == h
      var dh = h;
      // No globalCompositeOperation — sheet already has transparency
      ctx.drawImage(_finSheet,
        col * fw, row * fh, fw, fh,
        -dw / 2, -dh / 2, dw, dh);
    } else if (_finImg.complete && _finImg.naturalWidth > 0) {
      // fallback: flat fishh.png
      var sc = h / _finImg.naturalHeight;
      var w  = _finImg.naturalWidth * sc;
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(_finImg, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = '#ff9900';
      ctx.beginPath(); ctx.ellipse(0, 0, h * .55, h * .4, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawEnemy(cx, cy, h, facingLeft) {
    ctx.save(); ctx.translate(cx, cy);
    if (!facingLeft) ctx.scale(-1, 1);
    if (_furyImg.complete && _furyImg.naturalWidth > 0) {
      var sc = h / _furyImg.naturalHeight, w = _furyImg.naturalWidth * sc;
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(_furyImg, -w / 2, -h / 2, w, h);
    } else {
      ctx.fillStyle = '#ff3030';
      ctx.beginPath(); ctx.ellipse(0, 0, h * .6, h * .42, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function bg() {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#001428'); g.addColorStop(1, '#003060');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(0,35,70,.7)'; ctx.fillRect(0, H - 28, W, 28);
  }

  function key(label, x, y) {
    ctx.save(); ctx.font = "bold 12px 'Exo 2',sans-serif";
    var kw = ctx.measureText(label).width + 18, kh = 24;
    ctx.fillStyle = 'rgba(0,120,200,.28)'; ctx.strokeStyle = 'rgba(0,200,255,.65)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.roundRect(x - kw / 2, y - kh / 2, kw, kh, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7de8ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y); ctx.restore();
  }

  function fish(cx, cy, sz, col, facingLeft, bob) {
    ctx.save(); ctx.translate(cx, cy + (bob || 0));
    if (facingLeft) ctx.scale(-1, 1);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, sz, sz * 0.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sz * .8, 0); ctx.lineTo(sz * 1.4, -sz * .45); ctx.lineTo(sz * 1.4, sz * .45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.beginPath(); ctx.arc(-sz * .38, -sz * .1, sz * .14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function heart(x, y, filled) {
    ctx.save(); ctx.font = '20px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.globalAlpha = filled ? 1 : .22; ctx.shadowColor = '#ff2020'; ctx.shadowBlur = filled ? 10 : 0;
    ctx.fillStyle = '#ff4040'; ctx.fillText('❤', x, y); ctx.restore();
  }

  /* ── Projectile — mirrors drawProjectiles() in renderer.js ──
     frame cycles through 1-8 at 15fps, flipped when moving right */
  function drawProjectile(px, py, facingLeft, alpha) {
    var frame = (Math.floor(t * 15 / 60) % 8) + 1; // t is in animation ticks (~60fps)
    var img   = _projSprites[frame];
    if (!img || !img.complete || img.naturalWidth === 0) {
      // fallback: plain glowing orb if sprites not loaded yet
      ctx.save();
      ctx.globalAlpha = alpha || 1;
      var g = ctx.createRadialGradient(px, py, 0, px, py, 10);
      g.addColorStop(0, 'rgba(180,240,255,1)');
      g.addColorStop(1, 'rgba(0,120,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(px, py, 10, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      return;
    }
    var ox = img.naturalWidth / 2, oy = img.naturalHeight / 2;
    ctx.save();
    ctx.globalAlpha = alpha || 1;
    ctx.translate(px, py);
    if (!facingLeft) ctx.scale(-1, 1); // game flips when vx > 0 (moving right)
    ctx.drawImage(img, -ox, -oy);
    ctx.restore();
  }

  /* ─────────────────────────────────────────────────────────
     Page 1 — Movement
  ───────────────────────────────────────────────────────── */
  function p1() {
    bg();
    var fx = 80 + Math.sin(t * .038) * 150, fy = H / 2 + Math.sin(t * .052) * 45;
    var moving = true;
    var swimCol = Math.floor((t / 6) % 2); // alternates col 0 and 1 of swim row
    drawPlayer(fx, fy, 54, Math.cos(t * .038) < 0, FIN_ROW_SWIM, swimCol);
    ctx.save(); ctx.strokeStyle = 'rgba(0,200,255,.3)'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(fx, fy, 38, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); ctx.restore();
    var kx = W - 95, ky = H / 2 - 8;
    key('W', kx, ky - 34); key('A', kx - 30, ky); key('S', kx, ky); key('D', kx + 30, ky);
    ctx.save(); ctx.fillStyle = 'rgba(150,220,255,.5)'; ctx.font = "10px 'Exo 2',sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('or ↑ ← ↓ →', kx, ky + 30); ctx.restore();
  }

  /* ─────────────────────────────────────────────────────────
     Page 2 — Eating fish
     Fin swims right. When he overlaps a fish it disappears and
     a +score popup floats up from that spot — not before.
  ───────────────────────────────────────────────────────── */
  // State lives outside p2() so it persists across frames
  var _p2Fish = null;      // initialised on first call
  var _p2Popups = [];      // { x, y, score, life }

  function p2() {
    bg();

    // One-time init of the fish array
    if (!_p2Fish) {
      _p2Fish = [
        { bx: W * .38, by: H * .38, sz: 9,  col: '#ff9944', pts: '+5',  alive: true },
        { bx: W * .55, by: H * .55, sz: 11, col: '#44ccff', pts: '+15', alive: true },
        { bx: W * .68, by: H * .32, sz: 8,  col: '#ff6699', pts: '+5',  alive: true },
        { bx: W * .80, by: H * .50, sz: 13, col: '#88ff88', pts: '+15', alive: true },
      ];
    }

    // Fin moves right, wraps around
    var px = 50 + (t * .55) % (W - 80);
    var py = H / 2;
    var EAT_R = 22;

    // Check overlaps — eat fish and spawn popup
    _p2Fish.forEach(function(f) {
      if (!f.alive) return;
      if (Math.hypot(px - f.bx, py - f.by) < EAT_R + f.sz) {
        f.alive = false;
        _p2Popups.push({ x: f.bx, y: f.by - 10, score: f.pts, life: 1.0 });
      }
    });

    // Re-spawn all fish when Fin wraps (px near start again)
    if (px < 55) {
      _p2Fish.forEach(function(f) { f.alive = true; });
    }

    // Draw living fish
    _p2Fish.forEach(function(f, i) {
      if (f.alive)
        fish(f.bx, f.by, f.sz, f.col, true, Math.sin(t * .07 + i) * 3);
    });

    // Draw Fin
    var swimCol = Math.floor((t / 6) % 2);
    drawPlayer(px, py, 54, false, FIN_ROW_SWIM, swimCol);

    // Draw and age popups
    for (var i = _p2Popups.length - 1; i >= 0; i--) {
      var pop = _p2Popups[i];
      pop.life -= 0.018;
      pop.y    -= 0.6;
      if (pop.life <= 0) { _p2Popups.splice(i, 1); continue; }
      var a = Math.min(1, pop.life / 0.5);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = "bold 18px 'Bangers',cursive";
      ctx.fillStyle = '#ffd060'; ctx.textAlign = 'center';
      ctx.shadowColor = '#ffd060'; ctx.shadowBlur = 10;
      ctx.fillText(pop.score, pop.x, pop.y);
      ctx.restore();
    }
  }

  /* ─────────────────────────────────────────────────────────
     Page 3 — Avoiding enemies
  ───────────────────────────────────────────────────────── */
  function p3() {
    bg();
    var px = 80 + Math.sin(t * .04) * 50, py = H / 2 + Math.cos(t * .035) * 28;
    var ex = W * .68 + Math.cos(t * .04) * 18, ey = H / 2 + Math.sin(t * .04) * 14;
    ctx.save(); ctx.strokeStyle = 'rgba(255,60,60,' + (.25 + Math.sin(t * .08) * .15) + ')'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(ex, ey, 52 + Math.sin(t * .08) * 5, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    var swimCol = Math.floor((t / 6) % 2);
    drawPlayer(px, py, 50, true, FIN_ROW_SWIM, swimCol);
    drawEnemy(ex, ey, 64, true);
    for (var i = 0; i < 5; i++) heart(22 + i * 26, 22, i < 3);
  }

  // Persistent projectile pools — survive across animation frames
  var _p4Projs = [];  // { x, y, vx }
  var _p5Projs = [];
  var _p4LastPhase = -1;
  // Hit toast state for page 5 — shows immediately when a projectile reaches the enemy
  var _p5HitToasts = [];  // { x, y, life }

  /* ─────────────────────────────────────────────────────────
     Page 4 — Pearl power + shooting
     Phase 0: Fin swims to clam
     Phase 1: Fin chomps repeatedly, fires multiple projectiles
     Phase 2: Fin idles, projectiles fly off screen  (loops)
  ───────────────────────────────────────────────────────── */
  function p4() {
    bg();
    var lt    = t % 300;
    var phase = lt < 100 ? 0 : lt < 200 ? 1 : 2;
    var prog  = (lt % 100) / 100;

    // Clear projs when phase resets to 0
    if (phase === 0 && _p4LastPhase !== 0) _p4Projs = [];
    _p4LastPhase = phase;

    var cx2 = W / 2, cy2 = H - 34;

    // Clam shell
    ctx.save();
    var sg = ctx.createLinearGradient(cx2, cy2, cx2, cy2 + 16);
    sg.addColorStop(0, '#9a6840'); sg.addColorStop(1, '#5a3218');
    ctx.fillStyle = sg;
    ctx.beginPath(); ctx.ellipse(cx2, cy2 + 8, 28, 13, 0, 0, Math.PI * 2); ctx.fill();
    if (phase >= 1) {
      ctx.save(); ctx.globalAlpha = Math.min(1, prog * 4);
      var pr = ctx.createRadialGradient(cx2 - 3, cy2 - 14, 1, cx2, cy2 - 12, 10);
      pr.addColorStop(0, '#fffaee'); pr.addColorStop(1, '#c09878');
      ctx.fillStyle = pr;
      ctx.beginPath(); ctx.arc(cx2, cy2 - 12, 10, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    ctx.restore();

    var px2 = cx2, py2 = H * .38;
    var finRow, finCol;

    if (phase === 0) {
      px2 = 60 + prog * (cx2 - 80); py2 = H * .42;
      finRow = FIN_ROW_SWIM; finCol = Math.floor((t / 6) % 2);
    } else if (phase === 1) {
      // Rapid chomp loop — repeat the 1→2→1 bite 3 times across the phase
      var chompProg = (prog * 3) % 1;
      finRow = FIN_ROW_ATTACK;
      finCol = chompProg < 0.25 ? 1 : chompProg < 0.75 ? 2 : 1;
      // Spawn a projectile once per chomp at the fully-open moment
      if (chompProg > 0.45 && chompProg < 0.50) {
        _p4Projs.push({ x: px2 + 42, y: py2, vx: 8 });
      }
      key('SPACE', W * .80, H * .18);
    } else {
      finRow = FIN_ROW_IDLE; finCol = 0;
    }

    // Move + draw all live projectiles
    for (var i = _p4Projs.length - 1; i >= 0; i--) {
      _p4Projs[i].x += _p4Projs[i].vx;
      if (_p4Projs[i].x > W + 50) { _p4Projs.splice(i, 1); continue; }
      drawProjectile(_p4Projs[i].x, _p4Projs[i].y, false, 1);
    }

    drawPlayer(px2, py2, 50, false, finRow, finCol);

    if (phase === 1 && prog < 0.35) {
      ctx.save(); ctx.globalAlpha = Math.min(1, prog * 6);
      ctx.font = "bold 15px 'Bangers',cursive";
      ctx.fillStyle = '#00e8ff'; ctx.textAlign = 'center';
      ctx.shadowColor = '#00e8ff'; ctx.shadowBlur = 10;
      ctx.fillText('🦪 PEARL POWER!', cx2, cy2 - 38);
      ctx.restore();
    }
  }

  /* ─────────────────────────────────────────────────────────
     Page 5 — Shooting enemies
     Phase 0: Fin idles   Phase 1: rapid chomp, fires multiple shots
     Phase 2: hit flash on enemy   Phase 3: YOU WIN
  ───────────────────────────────────────────────────────── */
  var _p5LastPhase = -1;

  function p5() {
    bg();
    var PHASE_LEN = 120;
    var cycle  = t % (PHASE_LEN * 4);
    var phase  = Math.floor(cycle / PHASE_LEN);
    var prog   = (cycle % PHASE_LEN) / PHASE_LEN;

    // Clear projectiles and hit toasts at start of each new phase 0
    if (phase === 0 && _p5LastPhase !== 0) {
      _p5Projs = [];
      _p5HitToasts = [];
    }
    _p5LastPhase = phase;

    var bx = W * .72 + Math.sin(t * .04) * 14, by = H * .42;
    var playerX = W * .25, playerY = H * .45;
    var HIT_RADIUS = 44;

    // ── Move projectiles + detect hits ───────────────────────
    for (var j = _p5Projs.length - 1; j >= 0; j--) {
      var pr = _p5Projs[j];
      pr.x += pr.vx;
      // Detect collision with enemy
      if (!pr.hit && Math.abs(pr.x - bx) < HIT_RADIUS && Math.abs(pr.y - by) < HIT_RADIUS) {
        pr.hit = true;
        _p5HitToasts.push({ x: bx, y: by - 65, life: 1.2 });
      }
      if (pr.x > W + 50) { _p5Projs.splice(j, 1); continue; }
      // Draw projectile (hide after hit)
      if (!pr.hit) drawProjectile(pr.x, pr.y, false, 1);
    }

    // ── Enemy — flash red whenever there's an active hit toast ──
    if (phase < 3) {
      var hasHit = _p5HitToasts.length > 0;
      if (hasHit) {
        ctx.save(); ctx.globalAlpha = 0.45 + Math.sin(t * 0.5) * 0.3;
        ctx.fillStyle = '#ff3333';
        ctx.beginPath(); ctx.arc(bx, by, 50, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
      drawEnemy(bx, by, 80, true);
    }

    // ── Fin row/col ──────────────────────────────────────────
    var finRow, finCol;
    if (phase === 0) {
      finRow = FIN_ROW_IDLE; finCol = 0;
      playerY = H * .45 + Math.sin(t * .08) * 4;
    } else if (phase === 1) {
      // Rapid chomp — 3 bites across the phase
      var chompP = (prog * 3) % 1;
      finRow = FIN_ROW_ATTACK;
      finCol = chompP < 0.25 ? 1 : chompP < 0.75 ? 2 : 1;
      // Spawn once per chomp at fully-open moment
      if (chompP > 0.45 && chompP < 0.50) {
        _p5Projs.push({ x: playerX + 42, y: playerY, vx: 7, hit: false });
      }
    } else {
      finRow = FIN_ROW_SWIM; finCol = Math.floor((t / 6) % 2);
    }

    drawPlayer(playerX, playerY, 54, false, finRow, finCol);

    // ── Draw & age hit toasts ────────────────────────────────
    for (var k = _p5HitToasts.length - 1; k >= 0; k--) {
      var ht = _p5HitToasts[k];
      ht.life -= 0.018;
      ht.y    -= 0.5;
      if (ht.life <= 0) { _p5HitToasts.splice(k, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.min(1, ht.life / 0.4);
      ctx.font = "bold 20px 'Bangers',cursive"; ctx.textAlign = 'center';
      ctx.fillStyle = '#ff4444'; ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 14;
      ctx.fillText('💥 HIT!', ht.x, ht.y);
      ctx.restore();
    }

    // YOU WIN
    if (phase === 3) {
      ctx.save(); ctx.globalAlpha = Math.min(1, prog * 4);
      ctx.font = "bold 28px 'Bangers',cursive";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffd060'; ctx.shadowColor = '#ffd060'; ctx.shadowBlur = 22;
      ctx.fillText('🏆 YOU WIN! 🏆', W / 2, H * .38);
      ctx.restore();
    }
  }

  var renderers = { 1: p1, 2: p2, 3: p3, 4: p4, 5: p5 };
  function loop() {
    if (renderers[page]) renderers[page]();
    t++;
    _tutTimers[page] = requestAnimationFrame(loop);
  }
  loop();
}