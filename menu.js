/* ================================================================
   menu.js
   MenuSystem — animated main menu with floating panel, buttons,
   bubble particles, and fish silhouettes.
   Transitions into GameSystem when PLAY is pressed.
================================================================= */

class MenuSystem {
    constructor() {
        this.menuCanvas = document.getElementById('menuCanvas');
        this.ctx        = this.menuCanvas.getContext('2d');
        this.gameCanvas = document.getElementById('gameCanvas');

        this.W = 0; this.H = 0;
        this.dpr = window.devicePixelRatio || 1;

        this.elapsed  = 0;
        this.lastTime = 0;

        this.isGameStarted = false;
        this.game = null;

        this.mx = 0; this.my = 0;
        this.buttons  = BTN_DEFS.map(d => ({ ...d, rect: null, hover: false, press: false, ripple: null }));
        this.bubbles  = [];
        this.fishSilh = [];
        this.floatY   = 0;
        this.tiltDeg  = 0;

        this._init();
    }

    _init() {
        this._resize();
        window.addEventListener('resize', () => this._resize());

        this.menuCanvas.addEventListener('mousemove', e => this._onMove(e));
        this.menuCanvas.addEventListener('mousedown', e => this._onDown(e));
        this.menuCanvas.addEventListener('mouseup',   e => this._onUp(e));
        this.menuCanvas.addEventListener('touchstart', e => this._onTouch(e, 'down'), { passive: true });
        this.menuCanvas.addEventListener('touchend',   e => this._onTouch(e, 'up'),   { passive: true });
        this.menuCanvas.addEventListener('touchmove',  e => this._onTouch(e, 'move'), { passive: true });

        document.getElementById('closeHowToPlay').addEventListener('click', () => this._closeModal('howToPlayModal'));
        document.getElementById('closeSettings').addEventListener('click',  () => this._closeModal('settingsModal'));

        ['musicVol', 'sfxVol'].forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener('input', () => {
                document.getElementById(id + 'Val').textContent = el.value + '%';
            });
        });

        const fsBtn = document.getElementById('fullscreenToggle');
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
                fsBtn.textContent = 'ON'; fsBtn.classList.add('on');
            } else {
                document.exitFullscreen().catch(() => {});
                fsBtn.textContent = 'OFF'; fsBtn.classList.remove('on');
            }
        });

        requestAnimationFrame(ts => this._loop(ts));
    }

    _resize() {
        this.dpr = window.devicePixelRatio || 1;
        this.W   = window.innerWidth;
        this.H   = window.innerHeight;

        for (const cv of [this.menuCanvas, this.gameCanvas]) {
            cv.width  = Math.round(this.W * this.dpr);
            cv.height = Math.round(this.H * this.dpr);
            cv.style.width  = this.W + 'px';
            cv.style.height = this.H + 'px';
        }
        this._spawnParticles();
    }

    _spawnParticles() {
        const { W, H } = this;
        this.bubbles = Array.from({ length: 60 }, () => ({
            x:  Math.random() * W,
            y:  H + Math.random() * H * 0.6,
            r:  1.4 + Math.random() * 4.8,
            vy: 0.35 + Math.random() * 0.85,
            dx: (Math.random() - 0.5) * 0.28,
            a:  0.12 + Math.random() * 0.32,
            ph: Math.random() * Math.PI * 2,
        }));
        this.fishSilh = Array.from({ length: 7 }, () => this._mkFish());
    }

    _mkFish() {
        const { W, H } = this;
        const dir = Math.random() > 0.5 ? 1 : -1;
        return {
            x: dir === 1 ? -80 : W + 80,
            y: H * 0.12 + Math.random() * H * 0.7,
            sz: 16 + Math.random() * 38,
            vx: (0.35 + Math.random() * 0.65) * dir,
            a:  0.05 + Math.random() * 0.09,
            dir,
        };
    }

    _loop(ts) {
        const dt = Math.min((ts - this.lastTime) / 1000, 0.05);
        this.lastTime = ts;
        this.elapsed += dt;
        if (!this.isGameStarted) { this._update(dt); this._draw(); }
        requestAnimationFrame(ts2 => this._loop(ts2));
    }

    _update(dt) {
        const { W, H } = this;
        const e = this.elapsed;
        this.floatY  = Math.sin(e * 0.9) * 14;
        this.tiltDeg = Math.sin(e * 0.9 + 0.4) * 1.3;

        for (const b of this.bubbles) {
            b.y -= b.vy;
            b.x += b.dx + Math.sin(e * 1.1 + b.ph) * 0.14;
            if (b.y < -12) { b.y = H + 8; b.x = Math.random() * W; }
        }
        for (let i = 0; i < this.fishSilh.length; i++) {
            const f = this.fishSilh[i];
            f.x += f.vx;
            if ((f.dir === 1 && f.x > W + 100) || (f.dir === -1 && f.x < -100)) {
                this.fishSilh[i] = this._mkFish();
            }
        }
        for (const btn of this.buttons) {
            if (btn.ripple) {
                btn.ripple.r += dt * 170;
                btn.ripple.a -= dt * 2.0;
                if (btn.ripple.a <= 0) btn.ripple = null;
            }
        }
    }

    _draw() {
        const { ctx, dpr, W, H, elapsed: e } = this;
        ctx.save();
        ctx.scale(dpr, dpr);
        this._drawBG(ctx, W, H, e);
        this._drawBubbles(ctx, e);
        this._drawFishSilh(ctx);
        this._drawFloatingPanel(ctx, W, H, e);
        ctx.restore();
    }

    // ── Background ────────────────────────────────────────────
    _drawBG(ctx, W, H, e) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, C.bg0); g.addColorStop(0.45, C.bg1); g.addColorStop(1, C.bg2);
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        const rg = ctx.createRadialGradient(W/2, H*0.42, 0, W/2, H*0.42, Math.max(W, H) * 0.6);
        rg.addColorStop(0, 'rgba(0,110,200,0.13)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);

        // Light rays
        ctx.save();
        for (let i = 0; i < 10; i++) {
            const sx = W * (0.05 + i * 0.1);
            const sp = 55 + i * 9;
            const rr = ctx.createLinearGradient(sx, 0, sx, H * 0.9);
            rr.addColorStop(0, `rgba(70,190,255,${0.038 + (i % 3) * 0.009})`);
            rr.addColorStop(1, 'rgba(0,80,180,0)');
            ctx.fillStyle = rr;
            ctx.beginPath();
            ctx.moveTo(sx - 3, 0); ctx.lineTo(sx + 3, 0);
            ctx.lineTo(sx + sp, H * 0.9); ctx.lineTo(sx - sp, H * 0.9);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();

        // Sand ripples
        ctx.save();
        for (let i = 0; i < 15; i++) {
            const cx2 = W * (0.04 + i * 0.065);
            const cy2 = H * (0.82 + Math.sin(e * 0.55 + i) * 0.035);
            const rw  = 28 + Math.sin(e * 1.05 + i * 0.8) * 16;
            const rh  = 6  + Math.sin(e * 0.85 + i * 1.2) * 2.5;
            ctx.fillStyle = `rgba(110,215,255,${0.055 + Math.sin(e * 0.75 + i) * 0.025})`;
            ctx.beginPath(); ctx.ellipse(cx2, cy2, rw, rh, 0, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    // ── Bubbles ───────────────────────────────────────────────
    _drawBubbles(ctx, e) {
        for (const b of this.bubbles) {
            const pulse = 1 + Math.sin(e * 1.9 + b.ph) * 0.07;
            const r     = b.r * pulse;
            ctx.save(); ctx.globalAlpha = b.a;
            const bg = ctx.createRadialGradient(b.x - r*.3, b.y - r*.3, r*.04, b.x, b.y, r);
            bg.addColorStop(0, 'rgba(195,238,255,0.55)');
            bg.addColorStop(1, 'rgba(70,170,255,0.06)');
            ctx.fillStyle = bg;
            ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `rgba(130,215,255,${b.a * 1.7})`; ctx.lineWidth = 0.7; ctx.stroke();
            ctx.globalAlpha = b.a * 1.1; ctx.fillStyle = 'rgba(255,255,255,0.72)';
            ctx.beginPath(); ctx.arc(b.x - r*.34, b.y - r*.34, r*.26, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    }

    // ── Fish silhouettes ──────────────────────────────────────
    _drawFishSilh(ctx) {
        for (const f of this.fishSilh) {
            ctx.save(); ctx.globalAlpha = f.a; ctx.fillStyle = 'rgba(0,75,155,0.9)';
            ctx.translate(f.x, f.y); if (f.dir === -1) ctx.scale(-1, 1);
            ctx.beginPath(); ctx.ellipse(0, 0, f.sz, f.sz * .42, 0, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath();
            ctx.moveTo(f.sz, 0); ctx.lineTo(f.sz + f.sz*.5, -f.sz*.33); ctx.lineTo(f.sz + f.sz*.5, f.sz*.33);
            ctx.closePath(); ctx.fill(); ctx.restore();
        }
    }

    // ── Floating panel ────────────────────────────────────────
    _drawFloatingPanel(ctx, W, H, e) {
        const maxW   = Math.min(W * 1.0, 920);
        const maxH   = Math.min(H * 0.78, 630);
        const aspect = 920 / 630;
        let pW, pH;
        if (maxW / aspect <= maxH) { pW = maxW; pH = maxW / aspect; }
        else                        { pH = maxH; pW = maxH * aspect; }

        const pX = (W - pW) / 2;
        const pY = (H - pH) / 2 - H * 0.04 + this.floatY;
        this._panel = { x: pX, y: pY, w: pW, h: pH };

        // Drop shadow ellipse
        const shadowScale = 1 - Math.abs(Math.sin(e * 0.9)) * 0.22;
        const shadowAlpha = 0.22 - Math.abs(Math.sin(e * 0.9)) * 0.1;
        const sdw = ctx.createRadialGradient(W/2, pY+pH+22, 0, W/2, pY+pH+22, pW*0.44*shadowScale);
        sdw.addColorStop(0, `rgba(0,12,35,${shadowAlpha})`);
        sdw.addColorStop(1, 'rgba(0,12,35,0)');
        ctx.fillStyle = sdw;
        ctx.beginPath(); ctx.ellipse(W/2, pY+pH+22, pW*0.44*shadowScale, 14*shadowScale, 0, 0, Math.PI*2); ctx.fill();

        ctx.save();
        ctx.translate(W/2, pY+pH/2);
        ctx.rotate(this.tiltDeg * Math.PI / 180);
        ctx.translate(-W/2, -(pY+pH/2));

        // Glow ring
        const gp = 0.18 + Math.abs(Math.sin(e * 0.9)) * 0.1;
        ctx.save();
        ctx.shadowColor = `rgba(40,170,255,${gp})`; ctx.shadowBlur = 48;
        ctx.strokeStyle = `rgba(60,190,255,${gp*1.4})`; ctx.lineWidth = 1.5;
        this._rrPath(ctx, pX, pY, pW, pH, 20); ctx.stroke(); ctx.restore();

        // Panel fill
        const pg = ctx.createLinearGradient(pX, pY, pX, pY+pH);
        pg.addColorStop(0, 'rgba(6,22,52,0.88)');
        pg.addColorStop(0.5, 'rgba(4,15,38,0.86)');
        pg.addColorStop(1, 'rgba(3,11,30,0.90)');
        ctx.fillStyle = pg; this._rrPath(ctx, pX, pY, pW, pH, 20); ctx.fill();
        ctx.strokeStyle = C.panelBorder; ctx.lineWidth = 1.8;
        this._rrPath(ctx, pX, pY, pW, pH, 20); ctx.stroke();

        // Top sheen
        const sh = ctx.createLinearGradient(pX, pY, pX, pY+pH*0.32);
        sh.addColorStop(0, 'rgba(255,255,255,0.08)'); sh.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sh; this._rrPath(ctx, pX+1, pY+1, pW-2, pH*0.32, 20); ctx.fill();

        const cx = pX + pW / 2;

        // Subtitle
        ctx.save();
        ctx.font = `500 ${pW*0.024}px 'Exo 2',sans-serif`;
        ctx.fillStyle = C.subtitle; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('🐟  AN UNDERWATER SURVIVAL GAME  🐟', cx, pY+pH*0.13); ctx.restore();

        // Title
        const tY  = pY + pH * 0.30;
        const tSz = Math.min(pW * 0.142, 115);
        ctx.save();
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.75)'; ctx.shadowBlur = 12;
        ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4;
        const tg = ctx.createLinearGradient(cx, tY-tSz*0.5, cx, tY+tSz*0.5);
        tg.addColorStop(0, '#ffd060'); tg.addColorStop(0.55, '#ffb020'); tg.addColorStop(1, '#ff7800');
        ctx.fillStyle = tg; ctx.font = `${tSz}px 'Bangers',cursive`;
        ctx.save();
        ctx.transform(1, 0, -0.10, 1, tSz*0.055, 0);
        ctx.fillText('FIN & FURY', cx, tY);
        ctx.shadowColor = 'rgba(255,170,0,0.45)'; ctx.shadowBlur = 28;
        ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0;
        ctx.fillText('FIN & FURY', cx, tY);
        ctx.restore(); ctx.restore();

        // Tagline
        ctx.save();
        ctx.font = `italic 500 ${pW*0.028}px 'Exo 2',sans-serif`;
        ctx.fillStyle = C.tagline; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Eat all fish. Grab pearls to shoot. Survive 5 stages.', cx, pY+pH*0.46);
        ctx.restore();

        // Divider
        const divY = pY + pH * 0.525;
        ctx.save();
        const dg = ctx.createLinearGradient(pX+pW*0.15, divY, pX+pW*0.85, divY);
        dg.addColorStop(0, 'rgba(60,190,255,0)'); dg.addColorStop(0.5, 'rgba(60,190,255,0.35)'); dg.addColorStop(1, 'rgba(60,190,255,0)');
        ctx.strokeStyle = dg; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pX+pW*0.15, divY); ctx.lineTo(pX+pW*0.85, divY); ctx.stroke(); ctx.restore();

        // Buttons
        const btnW     = Math.min(pW * 0.46, 290);
        const btnH     = Math.min(pH * 0.115, 52);
        const btnGap   = Math.min(pH * 0.030, 14);
        const btnR     = btnH / 2;
        const btnX     = cx - btnW / 2;
        const btnStartY = divY + pH * 0.045;

        for (let i = 0; i < this.buttons.length; i++) {
            const btn = this.buttons[i];
            const by  = btnStartY + i * (btnH + btnGap);
            btn.rect  = { x: btnX, y: by, w: btnW, h: btnH, r: btnR };
            this._drawBtn(ctx, btn, e);
        }

        // Keyboard hint
        ctx.save();
        ctx.font = `400 ${Math.max(10, pW*0.019)}px 'Exo 2',sans-serif`;
        ctx.fillStyle = C.hint; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('WASD / ARROWS TO MOVE  ·  MOUSE TO AIM  ·  CLICK / SPACE TO SHOOT', cx, pY+pH*0.935);
        ctx.restore();

        ctx.restore();
    }

    // ── Button ────────────────────────────────────────────────
    _drawBtn(ctx, btn, e) {
        if (!btn.rect) return;
        const { x, y, w, h, r } = btn.rect;
        const hov = btn.hover, prs = btn.press;
        const yOff = prs ? 2 : hov ? -3 : 0;

        ctx.save(); ctx.translate(0, yOff);
        ctx.shadowColor = btn.primary
            ? `rgba(255,110,10,${hov?0.75:0.38})`
            : `rgba(0,170,255,${hov?0.52:0.22})`;
        ctx.shadowBlur = hov ? 26 : 12;

        const [c0, c1] = btn.primary
            ? (hov ? [C.playHA, C.playHB] : [C.playA, C.playB])
            : (hov ? [C.subHA,  C.subHB]  : [C.subA,  C.subB]);
        const fg = ctx.createLinearGradient(x, y, x, y+h);
        fg.addColorStop(0, c0); fg.addColorStop(1, c1);
        ctx.fillStyle = fg; this._rrPath(ctx, x, y, w, h, r); ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = hov ? C.btnBorderH : C.btnBorder;
        ctx.lineWidth   = hov ? 1.8 : 1.2;
        this._rrPath(ctx, x, y, w, h, r); ctx.stroke();

        // Sheen
        const sg = ctx.createLinearGradient(x, y, x, y+h*0.48);
        sg.addColorStop(0, 'rgba(255,255,255,0.14)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg; this._rrPath(ctx, x+1, y+1, w-2, h*0.48, r); ctx.fill();

        // Label
        ctx.shadowColor = C.btnTextShadow; ctx.shadowBlur = 5;
        ctx.fillStyle = '#ffffff';
        ctx.font = `700 ${Math.max(13, Math.min(h*0.42, 18))}px 'Exo 2',sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(btn.label, x + w/2, y + h/2);

        // Ripple
        if (btn.ripple?.a > 0) {
            ctx.globalAlpha = btn.ripple.a;
            ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.shadowBlur = 0;
            ctx.beginPath(); ctx.arc(btn.ripple.x, btn.ripple.y - yOff, btn.ripple.r, 0, Math.PI*2); ctx.stroke();
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    // ── Rounded-rect path helper ──────────────────────────────
    _rrPath(ctx, x, y, w, h, r) {
        const rd = Math.min(r, w/2, h/2);
        ctx.beginPath();
        ctx.moveTo(x+rd, y); ctx.lineTo(x+w-rd, y); ctx.arcTo(x+w, y, x+w, y+rd, rd);
        ctx.lineTo(x+w, y+h-rd); ctx.arcTo(x+w, y+h, x+w-rd, y+h, rd);
        ctx.lineTo(x+rd, y+h); ctx.arcTo(x, y+h, x, y+h-rd, rd);
        ctx.lineTo(x, y+rd); ctx.arcTo(x, y, x+rd, y, rd);
        ctx.closePath();
    }

    // ── Input helpers ─────────────────────────────────────────
    _cssPt(e) {
        const r = this.menuCanvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * (this.W / r.width), y: (e.clientY - r.top) * (this.H / r.height) };
    }

    _hitBtn(px, py) {
        for (const btn of this.buttons) {
            if (!btn.rect) continue;
            const { x, y, w, h } = btn.rect;
            const byAdj = y + this.floatY;
            if (px >= x && px <= x+w && py >= byAdj && py <= byAdj+h) return btn;
        }
        return null;
    }

    _onMove(e) {
        const { x, y } = this._cssPt(e); this.mx = x; this.my = y;
        const hit = this._hitBtn(x, y);
        for (const btn of this.buttons) btn.hover = (btn === hit);
        this.menuCanvas.style.cursor = hit ? 'pointer' : 'default';
    }

    _onDown(e) {
        const { x, y } = this._cssPt(e);
        const hit = this._hitBtn(x, y);
        if (hit) hit.press = true;
    }

    _onUp(e) {
        const { x, y } = this._cssPt(e);
        const hit = this._hitBtn(x, y);
        for (const btn of this.buttons) {
            if (btn.press && btn === hit) {
                btn.ripple = { x, y, r: 0, a: 0.48 };
                this._btnAction(btn.id);
            }
            btn.press = false;
        }
    }

    _onTouch(e, type) {
        const t = e.touches[0] || e.changedTouches[0];
        if (!t) return;
        const ev = { clientX: t.clientX, clientY: t.clientY };
        if      (type === 'down') this._onDown(ev);
        else if (type === 'up')   this._onUp(ev);
        else                      this._onMove(ev);
    }

    _btnAction(id) {
        if      (id === 'play')      this._startGame();
        else if (id === 'howtoplay') this._openModal('howToPlayModal');
        else if (id === 'settings')  this._openModal('settingsModal');
    }

    _openModal(id)  { const el = document.getElementById(id); el.setAttribute('aria-hidden','false'); el.classList.add('open'); }
    _closeModal(id) { const el = document.getElementById(id); el.classList.remove('open'); el.setAttribute('aria-hidden','true'); }

    _startGame() {
        this.isGameStarted = true;
        this.menuCanvas.style.display = 'none';
        this.gameCanvas.style.display = 'block';
        this.game = new GameSystem(this.gameCanvas, this.dpr);
    }
}