/* ================================================================
   menu.js  —  MenuSystem (full redesign)
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

        this.menuState = 'main'; // 'main' or 'stage_select'

        this.mx = 0; this.my = 0;
        this.buttons  = BTN_DEFS.map(d => ({ ...d, rect: null, hover: false, press: false, ripple: null }));
        this.stageBtns = STAGE_BTN_DEFS.map(d => ({
            ...d, rect: null, hover: false, press: false, ripple: null,
            img: Object.assign(new Image(), { src: d.src }),
        }));
        this.bubbles  = [];
        this.particles = [];
        this.fishSilh = [];
        this.fishSchools = [];
        this.floatY   = 0;
        this.tiltDeg  = 0;
        this._minifish = null;

        // Load assets
        this.imgShadow = Object.assign(new Image(), { src: 'fishshadow.png' });
        this.imgLeft   = Object.assign(new Image(), { src: 'fish3_1.png' });
        this.imgRight  = Object.assign(new Image(), { src: 'fishh.png' });
        this.imgBottom = Object.assign(new Image(), { src: 'fishshadow.png' });

        this._bgAssets = {
            boat:     Object.assign(new Image(), { src: 'boat.png' }),
            coral:    Object.assign(new Image(), { src: 'coral.png' }),
            coral1:   Object.assign(new Image(), { src: 'coral1.png' }),
            coral3:   Object.assign(new Image(), { src: 'coral3.png' }),
            seagrass: Object.assign(new Image(), { src: 'seagras.png' }),
        };

        this._init();
    }

    _init() {
        this._resize();
        window.addEventListener('resize', () => this._resize());
        this.menuCanvas.addEventListener('mousemove', e => this._onMove(e));
        this.menuCanvas.addEventListener('mousedown', e => this._onDown(e));
        this.menuCanvas.addEventListener('mouseup',   e => this._onUp(e));
        this.menuCanvas.addEventListener('touchstart', e => this._onTouch(e,'down'), {passive:true});
        this.menuCanvas.addEventListener('touchend',   e => this._onTouch(e,'up'),   {passive:true});
        this.menuCanvas.addEventListener('touchmove',  e => this._onTouch(e,'move'), {passive:true});
        document.getElementById('closeHowToPlay').addEventListener('click', () => this._closeModal('howToPlayModal'));
        document.getElementById('closeSettings').addEventListener('click',   () => this._closeModal('settingsModal'));
        ['musicVol','sfxVol'].forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener('input', () => {
                document.getElementById(id+'Val').textContent = el.value+'%';
                if (id === 'musicVol') this._updateMusicVolume();
            });
        });
        const fsBtn = document.getElementById('fullscreenToggle');
        fsBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(()=>{});
                fsBtn.textContent = 'ON'; fsBtn.classList.add('on');
            } else {
                document.exitFullscreen().catch(()=>{});
                fsBtn.textContent = 'OFF'; fsBtn.classList.remove('on');
            }
        });
        this._initMusic();
        requestAnimationFrame(ts => this._loop(ts));
    }

    _initMusic() {
        this.musicVolume = parseFloat(document.getElementById('musicVol')?.value || 70) / 100;
        this.bgm = new Audio('sounds/homescreen.mp3');
        this.bgm.loop = true;
        this.bgm.volume = this.musicVolume;
        this.bgm.play().catch(() => {
            // Autoplay blocked — play on first interaction
            const unlock = () => {
                this.bgm.play().catch(()=>{});
                window.removeEventListener('click', unlock);
                window.removeEventListener('keydown', unlock);
            };
            window.addEventListener('click', unlock);
            window.addEventListener('keydown', unlock);
        });
    }

    _updateMusicVolume() {
        const ml = document.getElementById('musicVol');
        if (ml) {
            this.musicVolume = ml.value / 100;
            if (this.bgm) this.bgm.volume = this.musicVolume;
        }
    }

    _resize() {
        this.dpr = window.devicePixelRatio || 1;
        this.W   = window.innerWidth; this.H = window.innerHeight;
        for (const cv of [this.menuCanvas, this.gameCanvas]) {
            cv.width  = Math.round(this.W * this.dpr); cv.height = Math.round(this.H * this.dpr);
            cv.style.width  = this.W + 'px'; cv.style.height = this.H + 'px';
        }
        this._spawnParticles();
    }

    _spawnParticles() {
        const {W, H} = this;
        this.bubbles = Array.from({length:75}, () => ({
            x:  Math.random() * W, y:  H + Math.random() * H * 0.5,
            r:  1.2 + Math.random() * 5.5, vy: 0.4 + Math.random() * 1.1,
            dx: (Math.random() - 0.5) * 0.3, a:  0.08 + Math.random() * 0.32,
            ph: Math.random() * Math.PI * 2,
        }));
        this.particles = Array.from({length:55}, () => ({
            x:  Math.random() * W, y:  Math.random() * H,
            r:  0.4 + Math.random() * 1.3, vy: 0.12 + Math.random() * 0.35,
            ph: Math.random() * Math.PI * 2,
        }));
        this.fishSilh = Array.from({length:7}, () => this._mkSilh());
        this.fishSchools = Array.from({length: 6}, () => this._mkSchool());
    }

    _mkSilh() {
        const {W,H} = this;
        const dir = Math.random() > 0.5 ? 1 : -1;
        return {
            x:  dir === 1 ? -100 : W + 100, y:  H * 0.1 + Math.random() * H * 0.8,
            sz: 10 + Math.random() * 28, vx: (0.25 + Math.random() * 0.55) * dir,
            a:  0.03 + Math.random() * 0.07, dir,
        };
    }

    _mkSchool() {
        const {W, H} = this;
        const dir = Math.random() > 0.5 ? 1 : -1;
        const count = 18 + Math.floor(Math.random() * 30);
        const cx = dir === 1 ? -200 : W + 200;
        const cy = H * (0.08 + Math.random() * 0.78);
        const spd = 0.18 + Math.random() * 0.28;
        const spread = 90 + Math.random() * 120;
        const fish = Array.from({length: count}, () => ({
            ox: (Math.random() - 0.5) * spread,
            oy: (Math.random() - 0.5) * spread * 0.45,
            sz: 6 + Math.random() * 18,
            wobble: Math.random() * Math.PI * 2,
            wobbleSpd: 0.8 + Math.random() * 0.6,
        }));
        return { cx, cy, dir, spd, fish, alpha: 0.06 + Math.random() * 0.13 };
    }

    _loop(ts) {
        const dt = Math.min((ts - this.lastTime) / 1000, 0.05);
        this.lastTime = ts; this.elapsed += dt;
        if (!this.isGameStarted) { this._update(dt); this._draw(); }
        requestAnimationFrame(ts2 => this._loop(ts2));
    }

    _update(dt) {
        const {W,H,elapsed:e} = this;
        this.floatY  = Math.sin(e * 0.75) * 11;
        this.tiltDeg = Math.sin(e * 0.75 + 0.4) * 0.9;
        for (const b of this.bubbles) {
            b.y -= b.vy; b.x += b.dx + Math.sin(e * 1.2 + b.ph) * 0.18;
            if (b.y < -12) { b.y = H + 8; b.x = Math.random() * W; }
        }
        for (const p of this.particles) {
            p.y += p.vy;
            if (p.y > H + 10) { p.y = -10; p.x = Math.random() * W; }
        }
        for (let i = 0; i < this.fishSilh.length; i++) {
            const f = this.fishSilh[i]; f.x += f.vx;
            if ((f.dir===1 && f.x > W+120) || (f.dir===-1 && f.x < -120))
                this.fishSilh[i] = this._mkSilh();
        }
        for (let i = 0; i < this.fishSchools.length; i++) {
            const s = this.fishSchools[i];
            s.cx += s.spd * s.dir;
            const gone = s.dir === 1 ? s.cx > W + 300 : s.cx < -300;
            if (gone) this.fishSchools[i] = this._mkSchool();
        }
        for (const btn of this.buttons) {
            if (btn.ripple) {
                btn.ripple.r += dt * 185; btn.ripple.a -= dt * 2.2;
                if (btn.ripple.a <= 0) btn.ripple = null;
            }
        }
    }

    _draw() {
        const {ctx,dpr,W,H,elapsed:e} = this;
        ctx.save(); ctx.scale(dpr, dpr);
        this._drawBG(ctx, W, H, e);
        this._drawMarineSnow(ctx, W, H, e);
        this._drawFishSchools(ctx, e);
        this._drawSeaFloor(ctx, W, H, e);
        this._drawBubbles(ctx, e);
        this._drawFishSilh(ctx);
        this._drawPanel(ctx, W, H, e);
        this._drawFishChars(ctx, W, H, e);
        ctx.restore();
    }

    _drawFishSchools(ctx, e) {
        const img = this.imgShadow;
        const imgReady = img && img.complete && img.naturalWidth > 0;
        for (const s of this.fishSchools) {
            for (const f of s.fish) {
                const fx = s.cx + f.ox + Math.sin(e * f.wobbleSpd + f.wobble) * 4;
                const fy = s.cy + f.oy + Math.cos(e * f.wobbleSpd * 0.7 + f.wobble) * 3;
                const sz = f.sz * 2.2;
                ctx.save();
                ctx.globalAlpha = s.alpha;
                ctx.translate(fx, fy);
                if (s.dir === -1) ctx.scale(-1, 1);
                if (imgReady) {
                    const aspect = img.naturalWidth / img.naturalHeight;
                    const dw = sz * aspect, dh = sz;
                    ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
                } else {
                    ctx.fillStyle = `rgba(0, 15, 50, 1)`;
                    ctx.beginPath(); ctx.ellipse(0, 0, sz * 0.55, sz * 0.35, 0, 0, Math.PI * 2); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(sz * 0.5, 0); ctx.lineTo(sz * 0.85, -sz * 0.28); ctx.lineTo(sz * 0.85, sz * 0.28); ctx.closePath(); ctx.fill();
                }
                ctx.restore();
            }
        }
    }

    _drawBG(ctx, W, H, e) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#001020'); g.addColorStop(0.3, '#002244');
        g.addColorStop(0.7, '#003660'); g.addColorStop(1, '#004878');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        const rg = ctx.createRadialGradient(W/2, H*0.38, 0, W/2, H*0.38, Math.max(W,H)*0.72);
        rg.addColorStop(0, 'rgba(0,150,200,0.22)'); rg.addColorStop(0.5, 'rgba(0,80,150,0.08)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
        const lg = ctx.createRadialGradient(0, H*0.5, 0, 0, H*0.5, W*0.5);
        lg.addColorStop(0, 'rgba(0,210,190,0.13)'); lg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
        const rg2 = ctx.createRadialGradient(W, H*0.5, 0, W, H*0.5, W*0.5);
        rg2.addColorStop(0, 'rgba(0,170,255,0.13)'); rg2.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg2; ctx.fillRect(0, 0, W, H);
        ctx.save();
        for (let i = 0; i < 20; i++) {
            const cx = W * (0.025 + i * 0.05);
            const cy = H * (0.875 + Math.sin(e*0.5+i*0.7)*0.032);
            const rw = 20 + Math.sin(e*1.1+i*0.9)*13, rh = 4.5 + Math.sin(e*0.85+i*1.2)*2;
            const al = 0.055 + Math.sin(e*0.75+i)*0.028;
            ctx.fillStyle = `rgba(70,210,255,${al})`;
            ctx.beginPath(); ctx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI*2); ctx.fill();
        }
        ctx.restore();
        ctx.save();
        const brd = 16, pulse = 0.28 + Math.sin(e*1.1)*0.09;
        ctx.strokeStyle = `rgba(0,230,255,${pulse})`; ctx.lineWidth = 3.5;
        ctx.strokeRect(brd, brd, W-brd*2, H-brd*2);
        ctx.strokeStyle = `rgba(0,200,240,${pulse*0.45})`; ctx.lineWidth = 1.5;
        ctx.strokeRect(brd+7, brd+7, W-(brd+7)*2, H-(brd+7)*2);
        ctx.restore();
    }

    _drawSeaFloor(ctx, W, H, e) {
        const boat = this._bgAssets.boat;
        if (boat && boat.complete && boat.naturalWidth > 0) {
            const bh = Math.min(H * 0.85, 550), sc = bh / boat.naturalHeight;
            const bw = boat.naturalWidth * sc, bx = W * 0.85 - bw / 2;
            const by = H * 0.70 - bh * 0.5 + Math.sin(e * 0.4) * 6;
            ctx.save(); ctx.globalAlpha = 0.75; ctx.globalCompositeOperation = 'screen';
            ctx.drawImage(boat, bx, by, bw, bh); ctx.restore();
        }

        const mkItems = (img, positions, layer) => positions.map(([xFrac, scaleFrac, swayAmp, swaySpd, swayPh]) => {
            const alphas   = [0.75, 0.55, 0.88];
            const scaleAdj = [1.00, 1.00, 1.15];
            const yAdj     = [0.02, 0.00, -0.01];
            return [img, xFrac, scaleFrac * scaleAdj[layer], swayAmp, swaySpd, swayPh, alphas[layer], yAdj[layer]];
        });

        const backCoral3 = mkItems(this._bgAssets.coral3, [
            [0.18, 0.28, 2, 0.15, 1.4], [0.47, 0.31, 2, 0.17, 0.8],
            [0.60, 0.33, 2, 0.19, 1.9], [0.74, 0.29, 2, 0.16, 3.1],
        ], 0);

        const midGrass = mkItems(this._bgAssets.seagrass, [
            [0.02, 0.17, 8, 1.0, 0.0], [0.08, 0.16, 7, 0.9, 0.6],
            [0.14, 0.18, 9, 1.1, 1.3], [0.20, 0.15, 7, 0.8, 2.1],
            [0.26, 0.17, 8, 1.0, 0.4], [0.32, 0.16, 6, 0.9, 3.0],
            [0.38, 0.18, 8, 1.1, 1.7], [0.44, 0.15, 7, 0.8, 0.9],
            [0.50, 0.17, 9, 1.0, 2.4], [0.56, 0.16, 7, 0.9, 1.1],
            [0.62, 0.18, 8, 1.1, 0.2], [0.68, 0.15, 6, 0.8, 2.8],
            [0.74, 0.17, 8, 1.0, 1.5], [0.80, 0.16, 7, 0.9, 0.7],
            [0.86, 0.18, 9, 1.1, 2.2], [0.92, 0.15, 7, 0.8, 1.0],
            [0.97, 0.16, 8, 1.0, 3.1],
        ], 1);

        const midCoral  = mkItems(this._bgAssets.coral,  [], 1);
        const midCoral1 = mkItems(this._bgAssets.coral1, [], 1);

        const frontGrass = mkItems(this._bgAssets.seagrass, [
            [0.00, 0.20, 11, 1.2, 0.2], [0.10, 0.19, 10, 1.1, 1.0],
            [0.22, 0.21, 12, 1.3, 2.1], [0.34, 0.18, 9,  1.0, 0.7],
            [0.46, 0.20, 11, 1.2, 1.8], [0.58, 0.19, 10, 1.1, 3.0],
            [0.70, 0.21, 12, 1.3, 0.4], [0.82, 0.18, 9,  1.0, 1.6],
            [0.94, 0.20, 11, 1.2, 2.5],
        ], 2);

        const frontCoral3 = mkItems(this._bgAssets.coral3, [
            [0.08, 0.38, 3, 0.22, 0.9], [0.33, 0.36, 2, 0.18, 2.0],
            [0.58, 0.40, 3, 0.24, 1.1], [0.82, 0.37, 2, 0.20, 0.3],
        ], 2);

        const allLayers = [...backCoral3, ...frontCoral3, ...midGrass, ...midCoral, ...midCoral1, ...frontGrass];

        for (const [img, xFrac, scaleFrac, swayAmp, swaySpd, swayPh, alpha, yAdj] of allLayers) {
            if (!img || !img.complete || img.naturalWidth === 0) continue;
            const ih   = Math.min(H * scaleFrac, H * 0.30), sc = ih / img.naturalHeight;
            const iw   = img.naturalWidth * sc;
            const sway = Math.sin(e * swaySpd * 0.3 + swayPh) * swayAmp * 0.35;
            const baseX = W * xFrac - iw / 2;
            const baseY = H - ih * (0.85 - yAdj);
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.globalCompositeOperation = (img === this._bgAssets.coral3) ? 'source-over' : 'lighten';
            ctx.transform(1, 0, sway / ih, 1, baseX - (sway / ih) * (baseY + ih), baseY);
            ctx.drawImage(img, 0, 0, iw, ih);
            ctx.restore();
        }

        const fadeH  = H * 0.38, fadeY  = H - fadeH;
        const fadeGr = ctx.createLinearGradient(0, fadeY, 0, H);
        fadeGr.addColorStop(0,   'rgba(0, 8, 22, 0)');
        fadeGr.addColorStop(0.45,'rgba(0, 8, 22, 0.25)');
        fadeGr.addColorStop(0.78,'rgba(0, 8, 22, 0.52)');
        fadeGr.addColorStop(1,   'rgba(0, 5, 16, 0.72)');
        ctx.save(); ctx.fillStyle = fadeGr; ctx.fillRect(0, fadeY, W, fadeH); ctx.restore();

        const topGr = ctx.createLinearGradient(0, 0, 0, H * 0.18);
        topGr.addColorStop(0, 'rgba(0, 10, 28, 0.55)'); topGr.addColorStop(1, 'rgba(0, 10, 28, 0)');
        ctx.save(); ctx.fillStyle = topGr; ctx.fillRect(0, 0, W, H * 0.18); ctx.restore();

        if (!this._minifish) {
            this._minifish = Array.from({length: 8}, (_, i) => ({
                x: Math.random() * W, y: H * (0.72 + Math.random() * 0.18),
                spd: (0.4 + Math.random() * 0.5) * (Math.random() > 0.5 ? 1 : -1),
                sz: 5 + Math.random() * 9, ph: Math.random() * Math.PI * 2,
                col: ['rgba(0,180,160,', 'rgba(0,140,200,', 'rgba(60,160,180,'][i % 3],
            }));
        }
        const img = this.imgShadow;
        const imgOk = img && img.complete && img.naturalWidth > 0;
        for (const f of this._minifish) {
            f.x += f.spd;
            if (f.x > W + 60) f.x = -60;
            if (f.x < -60)    f.x = W + 60;
            const bob = Math.sin(e * 1.8 + f.ph) * 3;
            const alpha = 0.22 + Math.sin(e * 0.5 + f.ph) * 0.08;
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.translate(f.x, f.y + bob);
            if (f.spd < 0) ctx.scale(-1, 1);
            if (imgOk) {
                const asp = img.naturalWidth / img.naturalHeight;
                const fw  = f.sz * 2.2 * asp, fh = f.sz * 2.2;
                ctx.drawImage(img, -fw / 2, -fh / 2, fw, fh);
            } else {
                ctx.fillStyle = `${f.col}1)`;
                ctx.beginPath(); ctx.ellipse(0, 0, f.sz, f.sz * 0.42, 0, 0, Math.PI * 2); ctx.fill();
                ctx.beginPath(); ctx.moveTo(f.sz * 0.8, 0); ctx.lineTo(f.sz * 1.35, -f.sz * 0.35); ctx.lineTo(f.sz * 1.35, f.sz * 0.35); ctx.closePath(); ctx.fill();
            }
            ctx.restore();
        }
    }

    _drawMarineSnow(ctx, W, H, e) {
        ctx.save(); ctx.fillStyle = 'rgba(190,235,255,0.16)';
        for (const p of this.particles) {
            ctx.beginPath();
            ctx.arc((p.x + Math.sin(e*0.38+p.ph)*14) % W, p.y, p.r, 0, Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    }

    _drawBubbles(ctx, e) {
        for (const b of this.bubbles) {
            const r = b.r * (1 + Math.sin(e*2+b.ph)*0.06);
            ctx.save(); ctx.globalAlpha = b.a;
            ctx.strokeStyle = `rgba(130,220,255,${b.a*1.9})`; ctx.lineWidth = 0.85;
            ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI*2); ctx.stroke();
            ctx.globalAlpha = b.a * 0.75;
            ctx.fillStyle = 'rgba(210,245,255,0.65)';
            ctx.beginPath(); ctx.arc(b.x-r*0.3, b.y-r*0.3, r*0.27, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }

    _drawFishSilh(ctx) {
        for (const f of this.fishSilh) {
            ctx.save(); ctx.globalAlpha = f.a; ctx.fillStyle = 'rgba(0,55,115,0.7)';
            ctx.translate(f.x, f.y);
            if (f.dir === -1) ctx.scale(-1,1);
            ctx.beginPath(); ctx.ellipse(0,0,f.sz,f.sz*0.42,0,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(f.sz,0); ctx.lineTo(f.sz+f.sz*0.5,-f.sz*0.32); ctx.lineTo(f.sz+f.sz*0.5,f.sz*0.32);
            ctx.closePath(); ctx.fill(); ctx.restore();
        }
    }

    _drawFishChars(ctx, W, H, e) {
        const bobL = Math.sin(e * 1.1) * 14;
        const bobR = Math.sin(e * 1.1 + Math.PI * 0.6) * 12;
        const bobB = Math.sin(e * 0.9 + Math.PI * 0.3) * 8;
        const panelLeft  = (W - Math.min(W * 0.48, 680)) / 2;
        const panelRight = W - panelLeft;
        const lImg = this.imgLeft;
        if (lImg.complete && lImg.naturalWidth > 0) {
            const mh = Math.min(H * 0.55, 380), sc = mh / lImg.naturalHeight;
            const lw = lImg.naturalWidth * sc, lh = lImg.naturalHeight * sc;
            const lx = panelRight - lw * 0.38;
            const ly = H * 0.50 - lh * 0.1 + bobL;
            ctx.save(); ctx.shadowColor = 'rgba(255,50,50,0.35)'; ctx.shadowBlur = 40;
            ctx.drawImage(lImg, lx, ly, lw, lh); ctx.restore();
        }
        const rImg = this.imgRight;
        if (rImg.complete && rImg.naturalWidth > 0) {
            const mh = Math.min(H * 0.45, 320), sc = mh / rImg.naturalHeight;
            const rw = rImg.naturalWidth * sc, rh = rImg.naturalHeight * sc;
            const rx = panelLeft - rw * 0.62;
            const ry = H * 0.50 - rh * 0.05 + bobR;
            ctx.save(); ctx.shadowColor = 'rgba(255,160,0,0.30)'; ctx.shadowBlur = 30;
            ctx.translate(rx + rw, ry); ctx.scale(-1, 1);
            ctx.drawImage(rImg, 0, 0, rw, rh); ctx.restore();
        }
        const bImg = this.imgBottom;
        if (bImg.complete && bImg.naturalWidth > 0) {
            const mh = Math.min(H * 0.28, 185), sc = mh / bImg.naturalHeight;
            const bw = bImg.naturalWidth * sc, bh = bImg.naturalHeight * sc;
            const bx = W * 0.04, by = H * 0.70 + bobB;
            ctx.save(); ctx.globalAlpha = 0.95; ctx.shadowColor = 'rgba(0,200,100,0.25)'; ctx.shadowBlur = 20;
            ctx.drawImage(bImg, bx, by, bw, bh); ctx.restore();
        }
    }

    _drawPanel(ctx, W, H, e) {
        const pW = Math.min(W * 0.48, 680), pH = Math.min(H * 0.84, 600);
        const pX = (W - pW) / 2, pY = (H - pH) / 2 - H * 0.02 + this.floatY;
        ctx.save();
        const ss = 1 - Math.abs(Math.sin(e*0.75)) * 0.2;
        const sdw = ctx.createRadialGradient(W/2, pY+pH+28, 0, W/2, pY+pH+28, pW*0.52*ss);
        sdw.addColorStop(0, 'rgba(0,8,25,0.38)'); sdw.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sdw;
        ctx.beginPath(); ctx.ellipse(W/2, pY+pH+28, pW*0.52*ss, 16*ss, 0, 0, Math.PI*2); ctx.fill();
        ctx.restore();
        ctx.save();
        ctx.translate(W/2, pY+pH/2); ctx.rotate(this.tiltDeg*Math.PI/180); ctx.translate(-W/2, -(pY+pH/2));
        const gp = 0.24 + Math.abs(Math.sin(e*0.75))*0.11;
        ctx.save();
        ctx.shadowColor = `rgba(0,215,255,${gp})`; ctx.shadowBlur = 58;
        ctx.strokeStyle = `rgba(0,225,255,${gp*1.35})`; ctx.lineWidth = 2.2;
        this._rrPath(ctx,pX,pY,pW,pH,22); ctx.stroke(); ctx.restore();
        const pg = ctx.createLinearGradient(pX,pY,pX,pY+pH);
        pg.addColorStop(0, 'rgba(3,16,48,0.93)'); pg.addColorStop(0.5, 'rgba(2,12,36,0.91)'); pg.addColorStop(1, 'rgba(1,9,26,0.94)');
        ctx.fillStyle = pg; this._rrPath(ctx,pX,pY,pW,pH,22); ctx.fill();
        ctx.strokeStyle = 'rgba(0,175,235,0.38)'; ctx.lineWidth = 2;
        this._rrPath(ctx,pX,pY,pW,pH,22); ctx.stroke();
        const sh = ctx.createLinearGradient(pX,pY,pX,pY+pH*0.3);
        sh.addColorStop(0,'rgba(255,255,255,0.075)'); sh.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle = sh; this._rrPath(ctx,pX+2,pY+2,pW-4,pH*0.3,20); ctx.fill();
        const cx = pX + pW/2;

        if (this.menuState === 'stage_select') {
            // ── Stage Select Screen ────────────────────────────
            ctx.save();
            ctx.font = `${Math.min(pW*0.11, 80)}px 'Bangers', cursive`;
            ctx.fillStyle = '#ffd060'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(255,180,0,0.6)'; ctx.shadowBlur = 18;
            ctx.fillText('SELECT STAGE', cx, pY + pH*0.14);
            ctx.restore();

            const divY = pY + pH * 0.245;
            ctx.save();
            const dg = ctx.createLinearGradient(pX+pW*0.1, divY, pX+pW*0.9, divY);
            dg.addColorStop(0, 'rgba(0,200,255,0)'); dg.addColorStop(0.5,'rgba(0,200,255,0.45)'); dg.addColorStop(1, 'rgba(0,200,255,0)');
            ctx.strokeStyle = dg; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(pX+pW*0.1,divY); ctx.lineTo(pX+pW*0.9,divY); ctx.stroke(); ctx.restore();

            // 3 stage buttons with thumbnails
            const gap = pW * 0.03;
            const sideMargin = pW * 0.06;
            const availW = pW - sideMargin * 2;
            const cardW = (availW - gap * 2) / 3;
            const cardH = Math.min(cardW * 0.72, pH * 0.38);
            const cardY = divY + pH * 0.04;

            for (let i = 0; i < 3; i++) {
                const btn = this.stageBtns[i];
                const bx = pX + sideMargin + i * (cardW + gap);
                btn.rect = { x: bx, y: cardY - this.floatY, w: cardW, h: cardH, r: 10 };
                this._drawStageCard(ctx, btn, bx, cardY, cardW, cardH, e);
            }

            // Back button
            const backW = Math.min(pW*0.38, 220), backH = Math.min(pH*0.11, 48);
            const backX = cx - backW/2, backY = cardY + cardH + pH*0.06;
            const backBtn = this.stageBtns[3];
            backBtn.rect = { x: backX, y: backY - this.floatY, w: backW, h: backH, r: backH/2 };
            this._drawBtn(ctx, backBtn, e);
        } else {
            // ── Main Menu ──────────────────────────────────────
            this._drawWoodenSign(ctx, cx, pY + pH*0.215, pW*0.92, pH*0.295, e);
            const tagY = pY + pH * 0.47;
            ctx.save();
            ctx.font = `italic 500 ${Math.min(pW*0.037, 17)}px 'Exo 2', sans-serif`;
            ctx.fillStyle = 'rgba(195,238,255,0.88)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.shadowColor = 'rgba(0,140,220,0.55)'; ctx.shadowBlur = 9;
            ctx.fillText('Eat all fish. Grab pearls to shoot. Survive 15 stages.', cx, tagY); ctx.restore();
            const divY = pY + pH * 0.535;
            ctx.save();
            const dg = ctx.createLinearGradient(pX+pW*0.1, divY, pX+pW*0.9, divY);
            dg.addColorStop(0, 'rgba(0,200,255,0)'); dg.addColorStop(0.5,'rgba(0,200,255,0.45)'); dg.addColorStop(1, 'rgba(0,200,255,0)');
            ctx.strokeStyle = dg; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(pX+pW*0.1,divY); ctx.lineTo(pX+pW*0.9,divY); ctx.stroke(); ctx.restore();
            const btnW = Math.min(pW*0.68, 380), btnH = Math.min(pH*0.107, 52);
            const btnGp = Math.min(pH*0.028, 14), btnR = btnH/2;
            const btnX = cx - btnW/2, btnSY = divY + pH*0.045;
            for (let i = 0; i < this.buttons.length; i++) {
                const btn = this.buttons[i], by = btnSY + i*(btnH+btnGp);
                btn.rect = { x:btnX, y:by, w:btnW, h:btnH, r:btnR };
                this._drawBtn(ctx, btn, e);
            }
        }
        ctx.restore();
    }

    _drawStageCard(ctx, btn, bx, by, w, h, e) {
        const hov = btn.hover, prs = btn.press;
        const yOff = prs ? 2 : hov ? -4 : 0;
        const r = 10;
        ctx.save();
        ctx.translate(0, yOff);
        // Shadow
        ctx.shadowColor = hov ? 'rgba(0,200,255,0.6)' : 'rgba(0,0,0,0.4)';
        ctx.shadowBlur  = hov ? 22 : 10;
        // Rounded clip for image
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(bx, by, w, h, r);
        ctx.clip();
        // Thumbnail image
        if (btn.img && btn.img.complete && btn.img.naturalWidth > 0) {
            ctx.drawImage(btn.img, bx, by, w, h);
        } else {
            // Fallback gradient per theme
            const themes = { ocean: ['#0050a0','#003060'], abyss: ['#220044','#110022'], volcano: ['#801000','#400800'] };
            const [c0,c1] = themes[btn.theme] || themes.ocean;
            const g = ctx.createLinearGradient(bx,by,bx,by+h);
            g.addColorStop(0,c0); g.addColorStop(1,c1);
            ctx.fillStyle = g; ctx.fillRect(bx, by, w, h);
        }
        // Dark overlay
        const ov = ctx.createLinearGradient(bx,by,bx,by+h);
        ov.addColorStop(0,'rgba(0,0,0,0.05)'); ov.addColorStop(1,'rgba(0,0,0,0.55)');
        ctx.fillStyle = ov; ctx.fillRect(bx, by, w, h);
        ctx.restore();
        // Border
        ctx.strokeStyle = hov ? 'rgba(0,220,255,1)' : 'rgba(60,180,255,0.45)';
        ctx.lineWidth = hov ? 2.5 : 1.5;
        ctx.beginPath(); ctx.roundRect(bx, by, w, h, r); ctx.stroke();
        // Label
        ctx.save();
        ctx.font = `bold ${Math.max(11, w*0.13)}px 'Bangers', cursive`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,0.9)'; ctx.shadowBlur = 6;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(btn.label, bx + w/2, by + h - 8);
        ctx.restore();
        // Ripple
        if (btn.ripple) {
            ctx.save();
            ctx.beginPath(); ctx.roundRect(bx, by, w, h, r); ctx.clip();
            ctx.strokeStyle = `rgba(255,255,255,${btn.ripple.a})`;
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(btn.ripple.x, btn.ripple.y + yOff, btn.ripple.r, 0, Math.PI*2); ctx.stroke();
            ctx.restore();
        }
        ctx.restore();
    }

    _drawWoodenSign(ctx, cx, cy, sw, sh, e) {
        const sx = cx - sw/2, sy = cy - sh/2;
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,0.6)'; ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 7;
        const wg = ctx.createLinearGradient(sx, sy, sx, sy+sh);
        wg.addColorStop(0, '#d8962e'); wg.addColorStop(0.35,'#c07a1c');
        wg.addColorStop(0.7, '#a86218'); wg.addColorStop(1, '#8a4c10');
        ctx.fillStyle = wg; this._rrPath(ctx, sx, sy, sw, sh, 14); ctx.fill(); ctx.restore();
        ctx.save(); ctx.strokeStyle = 'rgba(70,35,8,0.28)'; ctx.lineWidth = 1;
        for (let i = 0; i < 5; i++) {
            const gy = sy + sh*(0.16+i*0.17), wav = Math.sin(e*0.28+i)*3;
            ctx.beginPath(); ctx.moveTo(sx+14, gy+wav);
            ctx.quadraticCurveTo(cx, gy+wav*0.4, sx+sw-14, gy-wav); ctx.stroke();
        }
        ctx.restore();
        ctx.save(); ctx.strokeStyle = 'rgba(235,178,75,0.55)'; ctx.lineWidth = 2;
        this._rrPath(ctx, sx+2, sy+2, sw-4, sh-4, 12); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.strokeStyle = '#4e280a'; ctx.lineWidth = 3.5;
        this._rrPath(ctx, sx, sy, sw, sh, 14); ctx.stroke(); ctx.restore();
        for (const [nx,ny] of [[sx+18,sy+13],[sx+sw-18,sy+13],[sx+18,sy+sh-13],[sx+sw-18,sy+sh-13]]) {
            ctx.save(); ctx.fillStyle='#8a5e38'; ctx.shadowColor='rgba(0,0,0,0.5)'; ctx.shadowBlur=5;
            ctx.beginPath(); ctx.arc(nx,ny,5.5,0,Math.PI*2); ctx.fill();
            ctx.fillStyle='#c09260'; ctx.beginPath(); ctx.arc(nx-1,ny-1,2.2,0,Math.PI*2); ctx.fill(); ctx.restore();
        }
        ctx.save(); ctx.fillStyle='rgba(90,45,8,0.32)'; ctx.globalAlpha=0.6;
        for (let i = 0; i < 5; i++) {
            const fx = sx+sw*(0.14+i*0.185), fy = sy+sh*0.82;
            ctx.save(); ctx.translate(fx,fy);
            ctx.beginPath(); ctx.ellipse(0,0,10,5,0,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(10,0); ctx.lineTo(15,-4); ctx.lineTo(15,4); ctx.closePath(); ctx.fill();
            ctx.restore();
        }
        ctx.restore();
        ctx.save(); ctx.font = `600 ${Math.max(10,sw*0.038)}px 'Exo 2', sans-serif`;
        ctx.fillStyle = 'rgba(255,218,135,0.92)'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.shadowColor='rgba(0,0,0,0.75)'; ctx.shadowBlur=7;
        ctx.fillText('AN UNDERWATER SURVIVAL GAME', cx, sy+sh*0.18); ctx.restore();
        const tY = sy + sh*0.56, tSz = Math.min(sw*0.225, 98);
        ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.font = `${tSz}px 'Bangers', cursive`;
        ctx.save(); ctx.transform(1, 0, -0.09, 1, tSz*0.05, 0);
        ctx.strokeStyle = '#ff55bb'; ctx.lineWidth = tSz * 0.065; ctx.lineJoin = 'round'; ctx.shadowBlur = 0;
        ctx.strokeText('FIN & FURY', cx, tY); ctx.restore(); ctx.restore();
        ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.shadowColor='rgba(0,0,0,0.82)'; ctx.shadowBlur=12; ctx.shadowOffsetX=3; ctx.shadowOffsetY=5;
        const tg = ctx.createLinearGradient(cx, tY-tSz*0.5, cx, tY+tSz*0.5);
        tg.addColorStop(0, '#ffe258'); tg.addColorStop(0.42, '#ffba18'); tg.addColorStop(1, '#ff7200');
        ctx.fillStyle = tg; ctx.font = `${tSz}px 'Bangers', cursive`;
        ctx.save(); ctx.transform(1, 0, -0.09, 1, tSz*0.05, 0);
        ctx.fillText('FIN & FURY', cx, tY);
        ctx.shadowColor='rgba(255,155,0,0.6)'; ctx.shadowBlur=32; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
        ctx.fillText('FIN & FURY', cx, tY); ctx.restore(); ctx.restore();
    }

    _drawBtn(ctx, btn, e) {
        if (!btn.rect) return;
        const {x,y,w,h,r} = btn.rect;
        const hov=btn.hover, prs=btn.press, yOff = prs?2 : hov?-3 : 0;
        ctx.save(); ctx.translate(0, yOff);
        ctx.shadowColor = btn.primary ? `rgba(255,110,10,${hov?0.88:0.48})` : `rgba(0,175,255,${hov?0.65:0.28})`;
        ctx.shadowBlur = hov ? 30 : 14;
        const [c0,c1] = btn.primary ? (hov ? [C.playHA,C.playHB] : [C.playA,C.playB]) : (hov ? [C.subHA, C.subHB] : [C.subA, C.subB]);
        const fg = ctx.createLinearGradient(x,y,x,y+h);
        fg.addColorStop(0,c0); fg.addColorStop(1,c1);
        ctx.fillStyle = fg; this._rrPath(ctx,x,y,w,h,r); ctx.fill();
        ctx.shadowBlur=0; ctx.strokeStyle = hov ? C.btnBorderH : C.btnBorder; ctx.lineWidth = hov?2:1.2;
        this._rrPath(ctx,x,y,w,h,r); ctx.stroke();
        const sg = ctx.createLinearGradient(x,y,x,y+h*0.5);
        sg.addColorStop(0,'rgba(255,255,255,0.17)'); sg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sg; this._rrPath(ctx,x+1,y+1,w-2,h*0.5,r); ctx.fill();
        ctx.shadowColor=C.btnTextShadow; ctx.shadowBlur=5; ctx.fillStyle='#ffffff';
        ctx.font=`700 ${Math.max(13,Math.min(h*0.44,20))}px 'Exo 2',sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(btn.label, x+w/2, y+h/2);
        if (btn.ripple?.a > 0) {
            ctx.globalAlpha=btn.ripple.a; ctx.strokeStyle='rgba(255,255,255,0.9)';
            ctx.lineWidth=1.8; ctx.shadowBlur=0;
            ctx.beginPath(); ctx.arc(btn.ripple.x, btn.ripple.y-yOff, btn.ripple.r, 0, Math.PI*2); ctx.stroke();
            ctx.globalAlpha=1;
        }
        ctx.restore();
    }

    _rrPath(ctx,x,y,w,h,r) {
        const rd=Math.min(r,w/2,h/2); ctx.beginPath();
        ctx.moveTo(x+rd,y); ctx.lineTo(x+w-rd,y); ctx.arcTo(x+w,y,x+w,y+rd,rd);
        ctx.lineTo(x+w,y+h-rd); ctx.arcTo(x+w,y+h,x+w-rd,y+h,rd);
        ctx.lineTo(x+rd,y+h); ctx.arcTo(x,y+h,x,y+h-rd,rd);
        ctx.lineTo(x,y+rd); ctx.arcTo(x,y,x+rd,y,rd); ctx.closePath();
    }

    _cssPt(e) {
        const r=this.menuCanvas.getBoundingClientRect();
        return { x:(e.clientX-r.left)*(this.W/r.width), y:(e.clientY-r.top)*(this.H/r.height) };
    }

    _hitBtn(px,py) {
        for (const btn of this.buttons) {
            if (!btn.rect) continue;
            const {x,y,w,h}=btn.rect, byAdj=y+this.floatY;
            if (px>=x&&px<=x+w&&py>=byAdj&&py<=byAdj+h) return btn;
        }
        return null;
    }

    _onMove(e) {
        const {x,y}=this._cssPt(e); this.mx=x; this.my=y;
        // Hit test all active buttons
        const allBtns = this.menuState === 'stage_select'
            ? [...this.stageBtns]
            : [...this.buttons];
        const hit = this._hitBtnList(allBtns, x, y);
        for (const btn of allBtns) btn.hover = (btn === hit);
        this.menuCanvas.style.cursor = hit ? 'pointer' : 'default';
    }
    _onDown(e) {
        const {x,y}=this._cssPt(e);
        const allBtns = this.menuState === 'stage_select' ? [...this.stageBtns] : [...this.buttons];
        const hit = this._hitBtnList(allBtns, x, y);
        if (hit) hit.press = true;
    }
    _onUp(e) {
        const {x,y}=this._cssPt(e);
        const allBtns = this.menuState === 'stage_select' ? [...this.stageBtns] : [...this.buttons];
        const hit = this._hitBtnList(allBtns, x, y);
        for (const btn of allBtns) {
            if (btn.press && btn === hit) { btn.ripple={x,y,r:0,a:0.52}; this._btnAction(btn.id); }
            btn.press = false;
        }
    }
    _onTouch(e,type) {
        const t=e.touches[0]||e.changedTouches[0]; if(!t) return;
        const ev={clientX:t.clientX,clientY:t.clientY};
        if (type==='down') this._onDown(ev); else if (type==='up') this._onUp(ev); else this._onMove(ev);
    }
    _hitBtnList(list, px, py) {
        for (const btn of list) {
            if (!btn.rect) continue;
            const {x,y,w,h}=btn.rect, byAdj=y+this.floatY;
            if (px>=x&&px<=x+w&&py>=byAdj&&py<=byAdj+h) return btn;
        }
        return null;
    }
    _btnAction(id) {
        if (id==='play') { this.menuState='stage_select'; }
        else if (id==='back') { this.menuState='main'; }
        else if (id==='start_1')  this._startGame(1);
        else if (id==='start_6')  this._startGame(6);
        else if (id==='start_11') this._startGame(11);
        else if (id==='howtoplay') this._openModal('howToPlayModal');
        else if (id==='settings')  this._openModal('settingsModal');
    }
    _openModal(id)  { const el=document.getElementById(id); el.setAttribute('aria-hidden','false'); el.classList.add('open'); }
    _closeModal(id) { const el=document.getElementById(id); el.classList.remove('open'); el.setAttribute('aria-hidden','true'); }
    _startGame(startStage = 1) {
        if (this.bgm) { this.bgm.pause(); this.bgm.currentTime = 0; }
        this.isGameStarted = true;
        this.menuCanvas.style.display = 'none';
        this.gameCanvas.style.display = 'block';
        this.game = new GameSystem(this.gameCanvas, this.dpr, startStage);
    }
}