/* ================================================================
   FIN & FURY  —  game.js
   Self-contained gameplay engine (no ES modules, no imports).
   Loaded via plain <script src="game.js"> AFTER fin_n_fury.js.

   Sprite sheet layout (all sheets 960×480, 6 cols × 4 rows):
     Row 0 = idle  right  |  Row 1 = idle  left
     Row 2 = swim  right  |  Row 3 = swim  left

   Flow: Game constructed → shows Loading screen while images load
         → on complete → Stage 1 starts → player controls Fin
         → eat all NPC fish → Stage 2 → ... (endless)
         → every 5 stages a Fury boss warning appears
================================================================= */

'use strict';

// ── Sprite sheet constants ────────────────────────────────────
const FRAME_W   = 160;
const FRAME_H   = 120;
const ANIM_COLS = 6;
const ROW_IDLE_R = 0;
const ROW_IDLE_L = 1;
const ROW_SWIM_R = 2;
const ROW_SWIM_L = 3;

// NPC species: { key, file, minScale, maxScale, color }
const NPC_SPECIES = [
    { key: 'npc_green',    file: 'assets/fish_sprite_sheet_green.png',     minScale: 0.38, maxScale: 0.80, color: '#38c850' },
    { key: 'npc_goldfish', file: 'assets/fish_sprite_sheet_goldfish.png',  minScale: 0.40, maxScale: 0.88, color: '#ff9a20' },
    { key: 'npc_clown',    file: 'assets/fish_sprite_sheet_clownfish.png', minScale: 0.36, maxScale: 0.80, color: '#ff5520' },
    { key: 'npc_tuna',     file: 'assets/fish_sprite_sheet_tuna.png',      minScale: 0.50, maxScale: 1.05, color: '#4878c8' },
];

const BG_CYCLE = 5; // number of distinct stage backgrounds

// ── Helpers ───────────────────────────────────────────────────
const rand    = (a, b)    => a + Math.random() * (b - a);
const randInt = (a, b)    => Math.floor(rand(a, b + 1));
const clamp   = (v, a, b) => Math.max(a, Math.min(b, v));

// ─────────────────────────────────────────────────────────────
//  AssetLoader
// ─────────────────────────────────────────────────────────────
class AssetLoader {
    constructor() {
        this.images   = {};
        this._total   = 0;
        this._done    = 0;
        this.progress = 0;   // 0 → 1
        this.label    = '';
        this.onComplete = null;
    }
    queue(key, src) {
        this._total++;
        const img = new Image();
        img.onload = img.onerror = () => {
            if (img.complete && img.naturalWidth) this.images[key] = img;
            this._done++;
            this.progress = this._done / this._total;
            this.label    = key.replace(/_/g, ' ');
            if (this._done >= this._total && this.onComplete) this.onComplete();
        };
        img.src = src;
    }
    get(key) { return this.images[key] || null; }
}

// ─────────────────────────────────────────────────────────────
//  Sprite  — animates one row of a spritesheet
// ─────────────────────────────────────────────────────────────
class Sprite {
    constructor(img) {
        this.img   = img;
        this.row   = ROW_IDLE_R;
        this.col   = 0;
        this.timer = 0;
        this.fps   = 8;
    }
    setRow(r) { if (this.row !== r) { this.row = r; this.col = 0; this.timer = 0; } }
    update(dt) {
        this.timer += dt;
        const dur = 1 / this.fps;
        if (this.timer >= dur) { this.col = (this.col + 1) % ANIM_COLS; this.timer -= dur; }
    }
    draw(ctx, x, y, scale, fallbackColor) {
        const dw = FRAME_W * scale, dh = FRAME_H * scale;
        if (this.img && this.img.naturalWidth) {
            ctx.drawImage(this.img,
                this.col * FRAME_W, this.row * FRAME_H, FRAME_W, FRAME_H,
                x - dw / 2, y - dh / 2, dw, dh);
        } else {
            // Fallback: draw a simple fish shape in the given color
            const fc = fallbackColor || '#4af';
            const bw = dw * 0.52, bh = dh * 0.38;
            const facingRight = (this.row === ROW_IDLE_R || this.row === ROW_SWIM_R);
            ctx.save();
            ctx.fillStyle = fc;
            // Body ellipse
            ctx.beginPath();
            ctx.ellipse(x, y, bw, bh, 0, 0, Math.PI * 2);
            ctx.fill();
            // Tail
            const tx = facingRight ? x + bw : x - bw;
            ctx.beginPath();
            ctx.moveTo(tx, y);
            ctx.lineTo(tx + (facingRight ? bw*0.55 : -bw*0.55), y - bh * 0.7);
            ctx.lineTo(tx + (facingRight ? bw*0.55 : -bw*0.55), y + bh * 0.7);
            ctx.closePath();
            ctx.fill();
            // Eye
            const ex = facingRight ? x - bw * 0.55 : x + bw * 0.55;
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(ex, y - bh * 0.2, bh * 0.22, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#111';
            ctx.beginPath(); ctx.arc(ex + (facingRight?-1:1)*bh*0.04, y - bh*0.2, bh*0.11, 0, Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  Player  — Fin, controlled by keyboard
// ─────────────────────────────────────────────────────────────
class Player {
    constructor(img, x, y) {
        this.sprite = new Sprite(img);
        this.sprite.fps = 9;
        this.x = x; this.y = y;
        this.scale  = 0.72;   // grows as fish are eaten
        this.speed  = 215;    // px/s (shrinks slightly as player grows)
        this.radius = 36;     // logical collision radius
        this.facingRight = true;
        this.moving = false;
    }
    get hitR() { return this.radius * this.scale; }

    update(dt, keys, W, H) {
        let dx = 0, dy = 0;
        if (keys['ArrowLeft']  || keys['a'] || keys['A']) dx -= 1;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) dx += 1;
        if (keys['ArrowUp']    || keys['w'] || keys['W']) dy -= 1;
        if (keys['ArrowDown']  || keys['s'] || keys['S']) dy += 1;

        if (dx && dy) { dx *= 0.707; dy *= 0.707; }
        this.moving = !!(dx || dy);

        this.x = clamp(this.x + dx * this.speed * dt, this.hitR, W - this.hitR);
        this.y = clamp(this.y + dy * this.speed * dt, this.hitR, H - this.hitR);

        if (dx > 0) this.facingRight = true;
        if (dx < 0) this.facingRight = false;

        if (this.moving) {
            this.sprite.setRow(this.facingRight ? ROW_SWIM_R : ROW_SWIM_L);
            this.sprite.fps = 10;
        } else {
            this.sprite.setRow(this.facingRight ? ROW_IDLE_R : ROW_IDLE_L);
            this.sprite.fps = 7;
        }
        this.sprite.update(dt);
    }

    draw(ctx) { this.sprite.draw(ctx, this.x, this.y, this.scale, '#30c8a8'); }

    grow(npcScale) {
        this.scale  = Math.min(this.scale  + npcScale * 0.018, 1.9);
        this.radius = Math.min(this.radius + npcScale * 1.0,   85);
        this.speed  = Math.max(this.speed  - npcScale * 1.2,   115);
    }
}

// ─────────────────────────────────────────────────────────────
//  NpcFish  — simple 3-state AI: SWIM / IDLE / TURN
// ─────────────────────────────────────────────────────────────
const S_SWIM = 0, S_IDLE = 1, S_TURN = 2;

class NpcFish {
    constructor(img, x, y, scale, color) {
        this.sprite = new Sprite(img);
        this.x = x; this.y = y;
        this.scale  = scale;
        this.color  = color || '#4af';
        this.radius = 36;
        this.alive  = true;
        this.dying  = false;
        this.dyT    = 0;
        this.dyDur  = 0.42;

        // Speed inversely proportional to size — smaller fish dart faster
        this.speed = clamp(rand(55, 125) / scale, 42, 270);
        this.angle = rand(0, Math.PI * 2);
        this.vx    = Math.cos(this.angle) * this.speed;
        this.vy    = Math.sin(this.angle) * this.speed;

        this.state     = S_SWIM;
        this.stTimer   = rand(1.8, 4.5);
        this.turnTarget = this.angle;
        this.facingRight = this.vx >= 0;
    }
    get hitR() { return this.radius * this.scale; }

    update(dt, W, H) {
        if (this.dying) {
            this.dyT += dt;
            if (this.dyT >= this.dyDur) this.alive = false;
            this.sprite.update(dt);
            return;
        }

        this.stTimer -= dt;
        const margin = this.hitR + 12;

        if (this.state === S_SWIM) {
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            // Wall bounce
            if (this.x < margin)  { this.vx =  Math.abs(this.vx); this.angle = 0; }
            if (this.x > W-margin){ this.vx = -Math.abs(this.vx); this.angle = Math.PI; }
            if (this.y < margin)  { this.vy =  Math.abs(this.vy); }
            if (this.y > H-margin){ this.vy = -Math.abs(this.vy); }

            if (this.stTimer <= 0) {
                if (Math.random() < 0.42) {
                    this.state   = S_IDLE;
                    this.stTimer = rand(0.7, 2.0);
                    this.vx = 0; this.vy = 0;
                } else {
                    this.state      = S_TURN;
                    this.turnTarget = this.angle + rand(-Math.PI * 0.8, Math.PI * 0.8);
                    this.stTimer    = rand(0.4, 1.0);
                }
            }
        } else if (this.state === S_IDLE) {
            // Very slow drift
            this.x += Math.cos(this.angle) * 10 * dt;
            this.y += Math.sin(this.angle) * 10 * dt;
            if (this.stTimer <= 0) {
                this.state   = S_SWIM;
                this.stTimer = rand(2.0, 5.0);
                this.angle   = this.turnTarget;
                this.vx = Math.cos(this.angle) * this.speed;
                this.vy = Math.sin(this.angle) * this.speed;
            }
        } else { // S_TURN
            const diff  = this.turnTarget - this.angle;
            this.angle += diff * Math.min(dt * 4.5, 1);
            this.vx = Math.cos(this.angle) * this.speed;
            this.vy = Math.sin(this.angle) * this.speed;
            if (this.stTimer <= 0) {
                this.state   = S_SWIM;
                this.stTimer = rand(2.0, 5.5);
            }
        }

        this.x = clamp(this.x, margin, W - margin);
        this.y = clamp(this.y, margin, H - margin);

        if (Math.abs(this.vx) > 6) this.facingRight = this.vx > 0;

        const moving = this.state === S_SWIM && (Math.abs(this.vx) > 8 || Math.abs(this.vy) > 8);
        if (moving) {
            this.sprite.setRow(this.facingRight ? ROW_SWIM_R : ROW_SWIM_L);
            this.sprite.fps = 9;
        } else {
            this.sprite.setRow(this.facingRight ? ROW_IDLE_R : ROW_IDLE_L);
            this.sprite.fps = 6;
        }
        this.sprite.update(dt);
    }

    startDying() { if (!this.dying) { this.dying = true; this.dyT = 0; } }

    draw(ctx) {
        if (!this.alive) return;
        ctx.save();

        if (this.dying) {
            const t = this.dyT / this.dyDur;
            ctx.globalAlpha = Math.max(0, 1 - t);
            this.sprite.draw(ctx, this.x, this.y, this.scale * (1 + t * 0.45), this.color);
        } else {
            // Tilt NPC for vertical movement only
            const vertDom = this.state === S_SWIM &&
                            Math.abs(this.vy) > Math.abs(this.vx) * 1.3;
            if (vertDom) {
                const tilt = clamp(Math.atan2(this.vy, Math.abs(this.vx)), -0.55, 0.55);
                ctx.translate(this.x, this.y);
                ctx.rotate(tilt);
                ctx.translate(-this.x, -this.y);
            }
            this.sprite.draw(ctx, this.x, this.y, this.scale, this.color);
        }
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  ScorePopup  — floating +pts text
// ─────────────────────────────────────────────────────────────
class ScorePopup {
    constructor(x, y, text, color) {
        this.x = x; this.y = y; this.text = text; this.color = color || '#ffffff';
        this.alpha = 1; this.vy = -52; this.timer = 0; this.dur = 1.1; this.alive = true;
    }
    update(dt) {
        this.timer += dt; this.y += this.vy * dt; this.vy *= 0.93;
        this.alpha = 1 - this.timer / this.dur;
        if (this.timer >= this.dur) this.alive = false;
    }
    draw(ctx) {
        if (!this.alive) return;
        ctx.save();
        ctx.globalAlpha  = Math.max(0, this.alpha);
        ctx.fillStyle    = this.color;
        ctx.font         = "bold 20px 'Exo 2', sans-serif";
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor  = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur   = 6;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  StageTransition  — fade-out → label → fade-in
// ─────────────────────────────────────────────────────────────
class StageTransition {
    constructor() { this.active=false; this.phase='idle'; this.alpha=0; this.timer=0; this.label=''; this.cb=null; }
    start(label, cb) { this.active=true; this.phase='out'; this.alpha=0; this.timer=0; this.label=label; this.cb=cb; }
    update(dt) {
        if (!this.active) return;
        this.timer += dt;
        if (this.phase === 'out') {
            this.alpha = Math.min(1, this.timer / 0.45);
            if (this.timer >= 0.45) { this.phase='text'; this.timer=0; if (this.cb) this.cb(); }
        } else if (this.phase === 'text') {
            if (this.timer >= 1.5) { this.phase='in'; this.timer=0; }
        } else {
            this.alpha = 1 - Math.min(1, this.timer / 0.5);
            if (this.timer >= 0.5) { this.active=false; this.phase='idle'; this.alpha=0; }
        }
    }
    draw(ctx, W, H) {
        if (!this.active && this.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = clamp(this.alpha, 0, 1);
        ctx.fillStyle   = '#000d1a';
        ctx.fillRect(0, 0, W, H);
        if (this.phase === 'text' || this.phase === 'in') {
            ctx.globalAlpha = this.phase === 'in' ? clamp(this.alpha * 5, 0, 1) : 1;
            ctx.fillStyle   = '#ffd060';
            ctx.font        = "bold 56px 'Bangers', cursive";
            ctx.textAlign   = 'center';
            ctx.textBaseline= 'middle';
            ctx.shadowColor = 'rgba(255,180,0,0.65)';
            ctx.shadowBlur  = 32;
            ctx.fillText(this.label, W / 2, H / 2);
        }
        ctx.restore();
    }
}

// ─────────────────────────────────────────────────────────────
//  HUD
// ─────────────────────────────────────────────────────────────
class HUD {
    draw(ctx, W, H, stage, score, fishLeft, playerScale) {
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 8;

        // Stage label — top left
        ctx.fillStyle = '#7de8ff'; ctx.font = "700 17px 'Exo 2', sans-serif";
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText(`STAGE  ${stage}`, 20, 16);

        // Score — top centre
        ctx.fillStyle = '#ffd060'; ctx.textAlign = 'center';
        ctx.fillText(`SCORE  ${score}`, W / 2, 16);

        // Fish remaining — top right
        ctx.fillStyle = '#ff9040'; ctx.textAlign = 'right';
        ctx.fillText(`FISH  ${fishLeft}`, W - 20, 16);

        // Size bar — below stage label
        const bx = 20, by = 42, bw = 120, bh = 8;
        const fill = clamp((playerScale - 0.72) / (1.9 - 0.72), 0, 1);
        ctx.shadowBlur = 0;

        // Track
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        this._rr(ctx, bx, by, bw, bh, 4); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        this._rr(ctx, bx, by, bw, bh, 4); ctx.fill();

        // Fill
        if (fill > 0) {
            const cg = ctx.createLinearGradient(bx, by, bx + bw, by);
            cg.addColorStop(0, '#00e5ff'); cg.addColorStop(1, '#00ff88');
            ctx.fillStyle = cg;
            this._rr(ctx, bx, by, Math.max(8, bw * fill), bh, 4); ctx.fill();
        }

        // Label
        ctx.fillStyle = 'rgba(100,220,255,0.6)';
        ctx.font = "11px 'Exo 2', sans-serif";
        ctx.textAlign = 'left'; ctx.textBaseline = 'top';
        ctx.fillText('SIZE', bx + bw + 8, by + 1);

        ctx.restore();
    }

    _rr(ctx, x, y, w, h, r) {
        const rd = Math.min(r, w/2, h/2);
        ctx.beginPath();
        ctx.moveTo(x+rd,y); ctx.lineTo(x+w-rd,y); ctx.arcTo(x+w,y,x+w,y+rd,rd);
        ctx.lineTo(x+w,y+h-rd); ctx.arcTo(x+w,y+h,x+w-rd,y+h,rd);
        ctx.lineTo(x+rd,y+h); ctx.arcTo(x,y+h,x,y+h-rd,rd);
        ctx.lineTo(x,y+rd); ctx.arcTo(x,y,x+rd,y,rd); ctx.closePath();
    }
}

// ─────────────────────────────────────────────────────────────
//  Game  — main engine, attached to gameCanvas
// ─────────────────────────────────────────────────────────────
class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.dpr    = window.devicePixelRatio || 1;
        this.W      = Math.round(canvas.width  / this.dpr);
        this.H      = Math.round(canvas.height / this.dpr);

        this.state  = 'loading';  // loading | playing | transition
        this.stage  = 1;
        this.score  = 0;

        this.loader     = new AssetLoader();
        this.player     = null;
        this.npcs       = [];
        this.popups     = [];
        this.bgImg      = null;
        this.fgImg      = null;
        this.hud        = new HUD();
        this.transition = new StageTransition();

        this.keys = {};
        this._bindKeys();
        this._queueAssets();

        this.lastTime = 0;
        this.elapsed  = 0;
        this._bgBubbles = null;
    }

    // ── Key input ─────────────────────────────────────────────
    _bindKeys() {
        window.addEventListener('keydown', e => {
            this.keys[e.key] = true;
            if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))
                e.preventDefault();
        });
        window.addEventListener('keyup', e => { this.keys[e.key] = false; });
    }

    // ── Queue all assets ──────────────────────────────────────
    _queueAssets() {
        this.loader.queue('player', 'assets/fish_sprite_sheet_teal.png');
        this.loader.queue('fury',   'assets/fish_sprite_sheet_fury.png');
        NPC_SPECIES.forEach(sp => this.loader.queue(sp.key, sp.file));
        for (let i = 1; i <= BG_CYCLE; i++) {
            this.loader.queue(`bg${i}`, `assets/stage${i}_bg.png`);
            this.loader.queue(`fg${i}`, `assets/stage${i}_fg.png`);
        }
        this.loader.onComplete = () => {
            this._initStage(this.stage);
            this.state = 'playing';
        };
    }

    // ── Resize (called from MenuSystem on window resize) ──────
    resize(W, H, dpr) {
        this.W = W; this.H = H; this.dpr = dpr;
    }

    // ── Start loop ────────────────────────────────────────────
    start() { requestAnimationFrame(ts => this._loop(ts)); }

    _loop(ts) {
        const dt = Math.min((ts - this.lastTime) / 1000, 0.05);
        this.lastTime = ts;
        this.elapsed += dt;
        this._update(dt);
        this._draw();
        requestAnimationFrame(ts2 => this._loop(ts2));
    }

    // ── Stage init ────────────────────────────────────────────
    _initStage(n) {
        const bgIdx = ((n - 1) % BG_CYCLE) + 1;
        this.bgImg  = this.loader.get(`bg${bgIdx}`);
        this.fgImg  = this.loader.get(`fg${bgIdx}`);

        // Spawn player at centre on first stage, keep position after
        if (!this.player) {
            this.player = new Player(this.loader.get('player'), this.W / 2, this.H / 2);
        }

        // Spawn NPC fish — count and max size increase each stage
        const count   = Math.min(6 + n * 2, 28);
        this.npcs     = [];
        this.popups   = [];
        for (let i = 0; i < count; i++) this._spawnNpc(n);
    }

    _spawnNpc(stageNum) {
        const sp    = NPC_SPECIES[randInt(0, NPC_SPECIES.length - 1)];
        const img   = this.loader.get(sp.key);
        const extra = Math.min(stageNum * 0.035, 0.22);
        const scale = rand(sp.minScale, sp.maxScale + extra);

        // Avoid spawning on top of the player
        let x, y, attempts = 0;
        do {
            x = rand(80, this.W - 80);
            y = rand(80, this.H - 80);
            attempts++;
        } while (
            this.player &&
            Math.hypot(x - this.player.x, y - this.player.y) < 220 &&
            attempts < 20
        );

        this.npcs.push(new NpcFish(img, x, y, scale, sp.color));
    }

    // ── Update ────────────────────────────────────────────────
    _update(dt) {
        this.transition.update(dt);
        if (this.state !== 'playing') return;

        this.player.update(dt, this.keys, this.W, this.H);
        for (const npc of this.npcs) npc.update(dt, this.W, this.H);
        this._checkEat();
        for (const p of this.popups) p.update(dt);
        this.popups = this.popups.filter(p => p.alive);

        // Stage clear — all NPC fish eaten
        const remaining = this.npcs.filter(n => n.alive).length;
        if (remaining === 0 && !this.transition.active) {
            this._stageClear();
        }
    }

    _checkEat() {
        const p = this.player;
        for (const npc of this.npcs) {
            if (!npc.alive || npc.dying) continue;
            const dist = Math.hypot(p.x - npc.x, p.y - npc.y);
            const gap  = p.hitR * 0.75 + npc.hitR * 0.70;
            if (dist > gap) continue;

            if (npc.scale <= p.scale * 1.12) {
                // Player eats NPC
                npc.startDying();
                const pts = Math.round(npc.scale * 100);
                this.score += pts;
                p.grow(npc.scale);
                this.popups.push(new ScorePopup(npc.x, npc.y - 22, `+${pts}`, '#ffd060'));
            } else {
                // NPC too big — gently push player away
                const ang = Math.atan2(p.y - npc.y, p.x - npc.x);
                p.x = clamp(p.x + Math.cos(ang) * 10, p.hitR, this.W - p.hitR);
                p.y = clamp(p.y + Math.sin(ang) * 10, p.hitR, this.H - p.hitR);
                // Show warning only once per contact (check popup not already shown)
                const recent = this.popups.filter(pp => pp.text === 'TOO BIG!').length;
                if (recent === 0) {
                    this.popups.push(new ScorePopup(p.x, p.y - 34, 'TOO BIG!', '#ff5555'));
                }
            }
        }
    }

    _stageClear() {
        this.state = 'transition';
        const next      = this.stage + 1;
        const isBoss    = next % 5 === 0;
        const lbl       = isBoss
            ? `⚠  STAGE ${next}  —  FURY APPROACHES!`
            : `STAGE  ${next}`;
        this.transition.start(lbl, () => {
            this.stage = next;
            this._initStage(this.stage);
        });
        // Re-enable playing after transition completes (~2.5 s)
        setTimeout(() => { if (this.state === 'transition') this.state = 'playing'; }, 2600);
    }

    // ── Draw ──────────────────────────────────────────────────
    _draw() {
        const { ctx, dpr, W, H } = this;
        ctx.save();
        ctx.scale(dpr, dpr);

        if (this.state === 'loading') {
            this._drawLoading(ctx, W, H);
        } else {
            this._drawGame(ctx, W, H);
        }
        ctx.restore();
    }

    _drawLoading(ctx, W, H) {
        const g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#000d1a'); g.addColorStop(1, '#001e3c');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

        // Light rays (reuse menu style)
        ctx.save();
        for (let i = 0; i < 10; i++) {
            const sx = W*(0.05+i*0.1), sp = 55+i*9;
            const rr = ctx.createLinearGradient(sx,0,sx,H*0.9);
            rr.addColorStop(0,`rgba(70,190,255,${0.03+(i%3)*0.008})`);
            rr.addColorStop(1,'rgba(0,80,180,0)');
            ctx.fillStyle=rr; ctx.beginPath();
            ctx.moveTo(sx-3,0); ctx.lineTo(sx+3,0);
            ctx.lineTo(sx+sp,H*0.9); ctx.lineTo(sx-sp,H*0.9);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();

        // Title
        ctx.save();
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.shadowColor='rgba(255,170,0,0.55)'; ctx.shadowBlur=28;
        const tg = ctx.createLinearGradient(W/2,H/2-90,W/2,H/2-20);
        tg.addColorStop(0,'#ffd060'); tg.addColorStop(1,'#ff7800');
        ctx.fillStyle=tg; ctx.font="80px 'Bangers', cursive";
        // Italic slant
        ctx.save(); ctx.transform(1,0,-0.1,1,7,0);
        ctx.fillText('FIN & FURY', W/2, H/2 - 60); ctx.restore();
        ctx.restore();

        // "Loading..." text
        ctx.save();
        ctx.fillStyle='rgba(120,210,255,0.9)';
        ctx.font="20px 'Exo 2', sans-serif";
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('Loading...', W/2, H/2 + 14);
        ctx.restore();

        // Progress bar
        const bw = Math.min(W * 0.48, 380), bh = 6;
        const bx = (W-bw)/2, by = H/2 + 46;
        ctx.save();
        ctx.fillStyle='rgba(255,255,255,0.08)';
        ctx.beginPath(); ctx.roundRect(bx,by,bw,bh,3); ctx.fill();
        const pg=ctx.createLinearGradient(bx,by,bx+bw,by);
        pg.addColorStop(0,'#00c8ff'); pg.addColorStop(1,'#00ff88');
        ctx.fillStyle=pg;
        ctx.beginPath(); ctx.roundRect(bx,by,Math.max(6,bw*this.loader.progress),bh,3); ctx.fill();
        ctx.restore();

        // Asset label
        ctx.save();
        ctx.fillStyle='rgba(100,170,210,0.5)';
        ctx.font="12px 'Exo 2', sans-serif";
        ctx.textAlign='center'; ctx.textBaseline='top';
        ctx.fillText(this.loader.label, W/2, by+14);
        ctx.restore();
    }

    _drawGame(ctx, W, H) {
        // ── Background ────────────────────────────────────────
        if (this.bgImg && this.bgImg.naturalWidth) {
            ctx.drawImage(this.bgImg, 0, 0, W, H);
        } else {
            // Animated underwater gradient fallback — always looks good
            this._drawFallbackBG(ctx, W, H);
        }

        // NPC fish (behind player)
        for (const npc of this.npcs) npc.draw(ctx);

        // Player
        if (this.player) this.player.draw(ctx);

        // Foreground overlay (coral, seaweed etc.)
        if (this.fgImg && this.fgImg.naturalWidth) {
            ctx.drawImage(this.fgImg, 0, 0, W, H);
        }

        // Score popups
        for (const p of this.popups) p.draw(ctx);

        // HUD
        const alive = this.npcs.filter(n => n.alive).length;
        this.hud.draw(ctx, W, H, this.stage, this.score, alive, this.player?.scale ?? 0.72);

        // Stage transition overlay (on top of everything)
        this.transition.draw(ctx, W, H);
    }

    _drawFallbackBG(ctx, W, H) {
        const e = this.elapsed;

        // Stage-tinted deep gradient (colour shifts every 5 stages)
        const stageTint = (this.stage - 1) % 5;
        const bgColors = [
            ['#000d1a','#001e3c','#002f54'],  // stage 1 – deep blue
            ['#00101a','#001a2c','#002038'],  // stage 2 – darker blue
            ['#060010','#0d0025','#120035'],  // stage 3 – deep purple
            ['#080a00','#0f1400','#141a00'],  // stage 4 – dark cave
            ['#120000','#1a0000','#200000'],  // stage 5 – volcanic
        ];
        const [c0,c1,c2] = bgColors[stageTint];
        const g = ctx.createLinearGradient(0,0,0,H);
        g.addColorStop(0, c0); g.addColorStop(0.45, c1); g.addColorStop(1, c2);
        ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

        // Radial centre glow
        const rg = ctx.createRadialGradient(W/2,H*0.42,0,W/2,H*0.42,Math.max(W,H)*0.6);
        rg.addColorStop(0,'rgba(0,100,180,0.12)'); rg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);

        // Light shafts from above
        ctx.save();
        for (let i=0; i<10; i++) {
            const sx=W*(0.05+i*0.1), sp=55+i*9;
            const rr=ctx.createLinearGradient(sx,0,sx,H*0.88);
            rr.addColorStop(0,`rgba(70,190,255,${0.035+(i%3)*0.008})`);
            rr.addColorStop(1,'rgba(0,80,180,0)');
            ctx.fillStyle=rr; ctx.beginPath();
            ctx.moveTo(sx-3,0); ctx.lineTo(sx+3,0);
            ctx.lineTo(sx+sp,H*0.88); ctx.lineTo(sx-sp,H*0.88);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();

        // Animated caustic light blobs
        ctx.save();
        for (let i=0; i<16; i++) {
            const cx2=W*(0.03+i*0.062);
            const cy2=H*(0.82+Math.sin(e*0.55+i)*0.032);
            const rw=26+Math.sin(e*1.05+i*0.8)*15;
            const rh=5+Math.sin(e*0.85+i*1.2)*2.2;
            const a=0.05+Math.sin(e*0.75+i)*0.022;
            ctx.fillStyle=`rgba(100,210,255,${Math.max(0,a)})`;
            ctx.beginPath(); ctx.ellipse(cx2,cy2,rw,rh,0,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();

        // Floating bubble particles in background
        ctx.save();
        if (!this._bgBubbles) {
            this._bgBubbles = Array.from({length:35}, () => ({
                x: rand(0, W), y: rand(0, H),
                r: rand(1.5, 5), vy: rand(0.3, 0.9),
                dx: (Math.random()-0.5)*0.25, ph: Math.random()*Math.PI*2,
            }));
        }
        for (const b of this._bgBubbles) {
            b.y -= b.vy; b.x += b.dx + Math.sin(e*1.1+b.ph)*0.12;
            if (b.y < -10) { b.y = H+5; b.x = rand(0,W); }
            const alpha = 0.12 + Math.sin(e*1.8+b.ph)*0.06;
            ctx.globalAlpha = Math.max(0, alpha);
            ctx.strokeStyle = 'rgba(130,210,255,0.6)'; ctx.lineWidth = 0.8;
            ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.stroke();
            ctx.fillStyle = 'rgba(200,240,255,0.2)';
            ctx.beginPath(); ctx.arc(b.x,b.y,b.r,0,Math.PI*2); ctx.fill();
            // Highlight dot
            ctx.globalAlpha = alpha*1.2;
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.beginPath(); ctx.arc(b.x-b.r*0.32,b.y-b.r*0.32,b.r*0.24,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }
}
