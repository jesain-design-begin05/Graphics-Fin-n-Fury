/* ================================================================
   FIN & FURY  —  fin_n_fury.js  (UPDATED)
   Changes:
     • Health bar above player fish REMOVED
     • Only 5 stages total
     • Fish are FINITE per stage — no respawning of edible fish
     • Stage clears when ALL edible fish are eaten
     • Enemies (furyfish/bgEnemies) still chase but do NOT respawn
     • Clams with pearls — collecting pearl UNLOCKS shooting for that stage
     • Stage 5 has a BOSS FISH with HP bar + charge attacks
================================================================= */

// ── Button definitions ───────────────────────────────────────
const BTN_DEFS = [
    { id: 'play',      label: '▶   PLAY',          primary: true  },
    { id: 'howtoplay', label: '📖   HOW TO PLAY',   primary: false },
    { id: 'settings',  label: '⚙   SETTINGS',       primary: false },
];

// ── Palette ──────────────────────────────────────────────────
const C = {
    bg0: '#000d1a', bg1: '#001e3c', bg2: '#002f54',
    panelFill:   'rgba(5, 18, 42, 0.82)',
    panelBorder: 'rgba(80, 170, 230, 0.38)',
    panelSheen:  'rgba(255,255,255,0.06)',
    panelGlow:   'rgba(0, 160, 255, 0.22)',
    subtitle:    'rgba(100, 210, 255, 0.9)',
    titleYellow: '#ffc940',
    titleOrange: '#ff8c00',
    tagline:     'rgba(130, 220, 255, 0.75)',
    hint:        'rgba(100, 170, 210, 0.55)',
    playA: '#ff9520', playB: '#ff4f00',
    playHA:'#ffb040', playHB:'#ff6a10',
    subA:  'rgba(14,60,120,0.75)', subB:  'rgba(8,38,82,0.75)',
    subHA: 'rgba(22,90,170,0.90)', subHB: 'rgba(12,55,120,0.90)',
    btnBorder:   'rgba(60, 195, 255, 0.50)',
    btnBorderH:  'rgba(120, 230, 255, 1.00)',
    btnTextShadow:'rgba(0,0,0,0.6)',
};

// ── Score Values ─────────────────────────────────────────────
const SCORE = {
    SMALL: 10,
    MEDIUM: 20,
    LARGE: 40,
    POISON: 60,
    ENEMY: 80,
    GIANT_POISON: 120,
    PEARL: 50,
    BOSS_HIT: 200,
    BOSS_KILL: 2000,
};

// ── Stage definitions — FINITE fish counts, 5 stages ─────────
const STAGE_DEFS = {
    1: { clownfish: 15, goldfish: 10, enemies: 2 },
    2: { clownfish: 18, goldfish: 14, secondfish: 8, enemies: 3 },
    3: { clownfish: 20, goldfish: 16, secondfish: 10, tertiaryfish: 10, furyfish: 3, enemies: 4 },
    4: { clownfish: 22, goldfish: 18, secondfish: 12, tertiaryfish: 12, tunafish: 6, furyfish: 5, enemies: 6 },
    5: { clownfish: 10, goldfish: 8, tunafish: 4, furyfish: 4, enemies: 4, hasBoss: true },
};

// ================================================================
//  GameSystem
// ================================================================
class GameSystem {
    constructor(canvas, dpr) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.dpr    = dpr;

        this.MAX_STAGE = 5;
        this.stage     = 1;

        // Sprite containers
        this.bgImages  = {};
        this.fgImages  = {};

        this.clownfishRestLeft   = {}; this.clownfishRestRight  = {};
        this.clownfishSwimLeft   = {}; this.clownfishSwimRight  = {};
        this.furyfishRestLeft    = {}; this.furyfishRestRight   = {};
        this.furyfishSwimLeft    = {}; this.furyfishSwimRight   = {};
        this.furyfishAttackLeft  = {}; this.furyfishAttackRight = {};
        this.furyfishAttackAltLeft = {}; this.furyfishAttackAltRight = {};
        this.goldfishRestLeft    = {}; this.goldfishRestRight   = {};
        this.goldfishSwimLeft    = {}; this.goldfishSwimRight   = {};
        this.secondfishRestLeft  = {}; this.secondfishRestRight = {};
        this.secondfishSwimLeft  = {}; this.secondfishSwimRight = {};
        this.tertiaryRestLeft    = {}; this.tertiaryRestRight   = {};
        this.tertiarySwimLeft    = {}; this.tertiarySwimRight   = {};
        this.tunafishRestLeft    = {}; this.tunafishRestRight   = {};
        this.tunafishSwimLeft    = {}; this.tunafishSwimRight   = {};
        this.mainfishRestLeft    = {}; this.mainfishRestRight   = {};
        this.mainfishSwimLeft    = {}; this.mainfishSwimRight   = {};
        this.mainfishAttackLeft  = {}; this.mainfishAttackRight = {};

        // Game state
        this.health    = 3;
        this.score     = 0;
        this.highScore = parseInt(localStorage.getItem('finNFury_highScore') || '0');
        this.controlMode = localStorage.getItem('finNFury_controlMode') || 'keyboard';
        this.playerSize    = 0.35;
        this.hasPearlPower = false; // Must collect pearl from clam first!
        this.gameOver  = false;

        this.stageTime    = 0;
        this.stageDamaged = false;
        this.comboCount   = 0;
        this.comboTimer   = 0;

        this.clams        = [];
        this.clamSprite   = {};
        this.pearlSprite  = null;
        this.floatingTexts = [];
        this.tryAgainButtonRect  = null;
        this.stageClear          = false;
        this.stageClearTimer     = 0;
        this.stageClearInfo      = null;
        this.continueButtonRect  = null;

        this.sfx       = {};
        this.sfxVolume = 0.9;

        this.projectileSprites = {};

        // Finite fish pools
        this.bgClownfish    = [];
        this.bgFuryfish     = [];
        this.bgGoldfish     = [];
        this.bgSecondfish   = [];
        this.bgTertiaryfish = [];
        this.bgTunafish     = [];
        this.bgEnemies      = [];
        this.projectiles    = [];

        // Boss state
        this.boss           = null;
        this.bossDefeated   = false;
        this.bossSprite     = {};

        // Player
        this.fishX         = 0;
        this.fishY         = 0;
        this.fishMoving    = false;
        this.fishFacingLeft = true;
        this.fishAttacking = false;
        this.lastAttackTime       = -100;
        this.attackDuration       = 0.25;
        this.firedInCurrentAttack = false;
        this.projectileSpeed      = 400;

        this.elapsed  = 0;
        this.lastTime = performance.now();
        this.particles = [];

        // Red screen flash when player is hit
        this.hitFlashTimer = 0;

        // Damage cooldown — prevents furyfsh from draining HP every frame on contact
        this.damageCooldown = 0;

        // Stage intro display
        this.stageIntroTimer  = 0;
        this.stageIntroActive = false;

        this.keys = {};

        window.addEventListener('keydown', e => {
            const k = e.key.toLowerCase();
            if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
            if (e.key === ' ' && !this.keys[' ']) this.fishAttacking = true;
            this.keys[k] = true;
        });
        window.addEventListener('keyup', e => {
            this.keys[e.key.toLowerCase()] = false;
            if (e.key === ' ') this.fishAttacking = false;
        });
        window.addEventListener('blur', () => { this.keys = {}; this.fishAttacking = false; });

        this._initAudio();
        const sfxSlider = document.getElementById('sfxVol');
        if (sfxSlider) sfxSlider.addEventListener('input', () => this._updateSfxVolume());
        this.canvas.addEventListener('click', e => this._onCanvasClick(e));

        this._loadSprites();
        this._initStage();
        requestAnimationFrame(ts => this._animate(ts));
    }

    // ── Load all sprites once ─────────────────────────────────
    _loadSprites() {
        const img = () => new Image();

        // Backgrounds — reuse stages 1-5 assets (cap at 5)
        for (let i = 1; i <= 5; i++) {
            this.bgImages[i] = img(); this.bgImages[i].src = `backgrounds/stage${i}_bg.png`;
            this.fgImages[i] = img(); this.fgImages[i].src = `backgrounds/stage${i}_fg.png`;
        }

        const types = [
            ['clownfish',  'clownfish_sprite',  this.clownfishRestLeft,  this.clownfishRestRight,  this.clownfishSwimLeft,  this.clownfishSwimRight],
            ['goldfish',   'goldfish_sprite',   this.goldfishRestLeft,   this.goldfishRestRight,   this.goldfishSwimLeft,   this.goldfishSwimRight],
            ['secondfish', 'secondfish_sprite', this.secondfishRestLeft, this.secondfishRestRight, this.secondfishSwimLeft, this.secondfishSwimRight],
            ['tertiary',   'tertiary_sprite',   this.tertiaryRestLeft,   this.tertiaryRestRight,   this.tertiarySwimLeft,   this.tertiarySwimRight],
            ['tunafish',   'tunafish_sprite',   this.tunafishRestLeft,   this.tunafishRestRight,   this.tunafishSwimLeft,   this.tunafishSwimRight],
            ['furyfish',   'furyfish_sprite',   this.furyfishRestLeft,   this.furyfishRestRight,   this.furyfishSwimLeft,   this.furyfishSwimRight],
            ['mainfish',   'mainfish_sprite',   this.mainfishRestLeft,   this.mainfishRestRight,   this.mainfishSwimLeft,   this.mainfishSwimRight],
        ];
        for (const [name, folder, rL, rR, sL, sR] of types) {
            for (let f = 1; f <= 6; f++) {
                rL[f] = img(); rL[f].src = `fish_sprites/${folder}/${name}-rest-left-${f}.png`;
                rR[f] = img(); rR[f].src = `fish_sprites/${folder}/${name}-rest-right-${f}.png`;
                sL[f] = img(); sL[f].src = `fish_sprites/${folder}/${name}-swim-left-${f}.png`;
                sR[f] = img(); sR[f].src = `fish_sprites/${folder}/${name}-swim-right-${f}.png`;
            }
        }
        for (let f = 1; f <= 6; f++) {
            this.mainfishAttackLeft[f]     = img(); this.mainfishAttackLeft[f].src     = `fish_sprites/mainfish_attack_sprite/mainfish-attack-left-${f}.png`;
            this.mainfishAttackRight[f]    = img(); this.mainfishAttackRight[f].src    = `fish_sprites/mainfish_attack_sprite/mainfish-attack-right-${f}.png`;
            this.furyfishAttackLeft[f]     = img(); this.furyfishAttackLeft[f].src     = `fish_sprites/furyfish_attack_sprite/furyfish-attack-left-${f}.png`;
            this.furyfishAttackRight[f]    = img(); this.furyfishAttackRight[f].src    = `fish_sprites/furyfish_attack_sprite/furyfish-attack-right-${f}.png`;
            this.furyfishAttackAltLeft[f]  = img(); this.furyfishAttackAltLeft[f].src  = `fish_sprites/furyfish_attack_sprite/furyfish-attack-alt-left-${f}.png`;
            this.furyfishAttackAltRight[f] = img(); this.furyfishAttackAltRight[f].src = `fish_sprites/furyfish_attack_sprite/furyfish-attack-alt-right-${f}.png`;
        }
        // Boss uses furyfish giant sprites (reuse)
        this.bossSprite.left  = this.furyfishSwimLeft;
        this.bossSprite.right = this.furyfishSwimRight;
        this.bossSprite.attackL = this.furyfishAttackLeft;
        this.bossSprite.attackR = this.furyfishAttackRight;

        this.clamSprite.closed = img(); this.clamSprite.closed.src = 'collectibles/clam_closed.png';
        this.clamSprite.open   = img(); this.clamSprite.open.src   = 'collectibles/clam_open.png';
        this.pearlSprite       = img(); this.pearlSprite.src        = 'collectibles/pearl.png';
        this.gameOverSprite    = img(); this.gameOverSprite.src     = 'game_over.png';

        for (let f = 1; f <= 8; f++) {
            this.projectileSprites[f] = img();
            // pad single digits
            const n = f < 10 ? `0${f}` : `${f}`;
            this.projectileSprites[f].src = `projectile_water/projectile_water${n}.png`;
        }
    }

    // ── Initialise stage ──────────────────────────────────────
    _initStage() {
        const W = window.innerWidth, H = window.innerHeight;
        this.canvas.width  = Math.round(W * this.dpr);
        this.canvas.height = Math.round(H * this.dpr);
        this.canvas.style.width  = W + 'px';
        this.canvas.style.height = H + 'px';

        this.bgClownfish    = [];
        this.bgFuryfish     = [];
        this.bgGoldfish     = [];
        this.bgSecondfish   = [];
        this.bgTertiaryfish = [];
        this.bgTunafish     = [];
        this.bgEnemies      = [];
        this.projectiles    = [];
        this.clams          = [];
        this.floatingTexts  = [];
        this.boss           = null;
        this.bossDefeated   = false;

        this.stageClear      = false;
        this.stageClearTimer = 0;
        this.stageClearInfo  = null;
        this.stageTime       = 0;
        this.stageDamaged    = false;
        this.comboCount      = 0;
        this.comboTimer      = 0;

        // Pearl power resets each stage — find a clam!
        this.hasPearlPower = false;

        const def = STAGE_DEFS[this.stage];

        const mk = (yMin, yMax, sMin, sMax, extra = {}) => ({
            x: Math.random() * W,
            y: H * yMin + Math.random() * H * (yMax - yMin),
            vx: (Math.random() > 0.5 ? 1 : -1) * (sMin + Math.random() * (sMax - sMin)),
            vy: 0,
            frameOffset: Math.random() * 6,
            bobOffset: Math.random() * Math.PI * 2,
            ...extra,
        });

        for (let i = 0; i < (def.clownfish    || 0); i++) this.bgClownfish.push(   mk(0.05, 0.90, 35, 90));
        for (let i = 0; i < (def.goldfish     || 0); i++) this.bgGoldfish.push(    mk(0.08, 0.88, 25, 70));
        for (let i = 0; i < (def.secondfish   || 0); i++) this.bgSecondfish.push(  mk(0.12, 0.85, 30, 80));
        for (let i = 0; i < (def.tertiaryfish || 0); i++) this.bgTertiaryfish.push(mk(0.15, 0.82, 15, 50));
        for (let i = 0; i < (def.tunafish     || 0); i++) this.bgTunafish.push(    mk(0.18, 0.80, 40, 80));
        for (let i = 0; i < (def.furyfish     || 0); i++) this.bgFuryfish.push(    mk(0.05, 0.92, 20, 50, { isAttacking: false, isGiant: false, chaseSpeed: 0 }));
        for (let i = 0; i < (def.enemies      || 0); i++) this.bgEnemies.push(     mk(0.10, 0.88, 25, 60, { isAttacking: false }));

        // Clams — 2 per stage, always have pearls
        for (let i = 0; i < 2; i++) {
            this.clams.push({
                x: W * 0.15 + Math.random() * W * 0.70,
                y: H * 0.88 + Math.random() * H * 0.08,
                hasPearl: true,
                openAnim: 0,
                pearlCollected: false,
            });
        }

        // Spawn boss on stage 5
        if (def.hasBoss) {
            this.boss = {
                x: W * 0.75,
                y: H * 0.40,
                vx: -60,
                vy: 0,
                hp: 12,
                maxHp: 12,
                phase: 0,           // 0=patrol, 1=charge
                chargeTimer: 0,
                chargeCooldown: 4,
                chargeDuration: 0.7,
                isCharging: false,
                chargeVx: 0,
                chargeVy: 0,
                frameOffset: 0,
                bobOffset: Math.random() * Math.PI * 2,
                hitFlash: 0,
                facingLeft: true,
            };
        }

        // Marine snow
        if (this.particles.length === 0) {
            for (let i = 0; i < 80; i++) {
                this.particles.push({
                    x: Math.random() * 2000,
                    y: Math.random() * 2000,
                    r: 0.5 + Math.random() * 1.5,
                    speed: 0.2 + Math.random() * 0.5,
                    phase: Math.random() * Math.PI * 2,
                });
            }
        }

        this.fishX = W / 2;
        this.fishY = H / 2;

        // Trigger stage intro banner
        this.stageIntroActive = true;
        this.stageIntroTimer  = 2.8; // seconds to display
    }

    // ── Edible fish count (stage-clear condition) ─────────────
    _countEdible() {
        return this.bgClownfish.length
            + this.bgGoldfish.length
            + this.bgSecondfish.length
            + this.bgTertiaryfish.length
            + this.bgTunafish.length;
    }

    // ── Main loop ─────────────────────────────────────────────
    _animate(ts) {
        const dt = Math.min((ts - this.lastTime) / 1000, 0.05);
        this.lastTime = ts;
        this.elapsed += dt;

        if (!this.gameOver && !this.stageClear) {
            this._update(dt);
        } else if (this.stageClear) {
            this.stageClearTimer += dt;
            if (this.stageClearTimer > 3.5) this._nextStage();
        }

        this._draw();
        if (this.gameOver)   this._drawGameOver();
        if (this.stageClear) this._drawStageClearScreen();

        requestAnimationFrame(ts2 => this._animate(ts2));
    }

    _update(dt) {
        this.stageTime += dt;

        // Update control mode from settings
        this.controlMode = localStorage.getItem('finNFury_controlMode') || 'keyboard';
        console.log('controlMode:', this.controlMode);

        if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.comboCount = 0; }
        for (const c of this.clams) { if (c.openAnim > 0) c.openAnim -= dt * 2; }
        if (this.hitFlashTimer > 0) this.hitFlashTimer -= dt;
        if (this.damageCooldown > 0) this.damageCooldown -= dt;
        if (this.stageIntroActive) {
            this.stageIntroTimer -= dt;
            if (this.stageIntroTimer <= 0) this.stageIntroActive = false;
        }

        const W = this.canvas.width / this.dpr;
        const H = this.canvas.height / this.dpr;

        if (this.controlMode === 'keyboard') {
            const spd = 200;
            let moved = false;

            if (this.keys['w'] || this.keys['arrowup'])    { this.fishY -= spd * dt; moved = true; }
            if (this.keys['s'] || this.keys['arrowdown'])  { this.fishY += spd * dt; moved = true; }
            if (this.keys['a'] || this.keys['arrowleft'])  { this.fishX -= spd * dt; this.fishFacingLeft = true;  moved = true; }
            if (this.keys['d'] || this.keys['arrowright']) { this.fishX += spd * dt; this.fishFacingLeft = false; moved = true; }

            this.fishMoving = moved;
        } else {
            applyMouseMovement(this, dt);
        }

        this.fishX = Math.max(50, Math.min(W - 50, this.fishX));
        this.fishY = Math.max(50, Math.min(H - 50, this.fishY));

        this._handleAttack();
        this._updateProjectiles(dt);

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.y -= 60 * dt; ft.life -= dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        // Move edible fish (wrap around)
        const wrapX = (f) => {
            f.x += f.vx * dt;
            if (f.vx > 0 && f.x > W + 100) f.x = -100;
            else if (f.vx < 0 && f.x < -100) f.x = W + 100;
        };
        for (const f of this.bgClownfish)    wrapX(f);
        for (const f of this.bgGoldfish)     wrapX(f);
        for (const f of this.bgSecondfish)   wrapX(f);
        for (const f of this.bgTertiaryfish) wrapX(f);
        for (const f of this.bgTunafish)     wrapX(f);

        // Furyfish — chase player, speed ramps up the closer they get
        for (const f of this.bgFuryfish) {
            const dx = this.fishX - f.x, dy = this.fishY - f.y;
            const dist = Math.hypot(dx, dy);
            const aggroRange = 340 + this.stage * 40;

            if (dist < aggroRange) {
                // Lock on — speed increases as distance closes (closer = faster)
                if (!f.isAttacking) {
                    f.isAttacking = true;
                    f.chaseSpeed  = 200 + this.stage * 15; // same base as Fin's movement speed
                }
                // Ramp speed up as it closes in (max 2.5x base)
                const closeness = Math.max(0, 1 - dist / aggroRange);
                const spd2 = f.chaseSpeed * (1 + closeness * 1.5);
                const ang  = Math.atan2(dy, dx);
                f.vx = Math.cos(ang) * spd2;
                f.vy = Math.sin(ang) * spd2;
            } else {
                if (f.isAttacking) {
                    f.isAttacking = false;
                    f.chaseSpeed  = 0;
                }
                f.vy *= 0.97;
                if (Math.abs(f.vx) < 55) f.vx = (f.vx >= 0 ? 1 : -1) * 60;
            }
            f.x += f.vx * dt; f.y += f.vy * dt;
            if (f.vx > 0 && f.x > W + 100) f.x = -100;
            else if (f.vx < 0 && f.x < -100) f.x = W + 100;
        }

        // Enemy fish — chase player (slower)
        for (const f of this.bgEnemies) {
            const dx = this.fishX - f.x, dy = this.fishY - f.y;
            const dist = Math.hypot(dx, dy);
            if (dist < 200 + this.stage * 20) {
                f.isAttacking = true;
                const ang = Math.atan2(dy, dx), spd2 = 55 + this.stage * 8;
                f.vx = Math.cos(ang) * spd2; f.vy = Math.sin(ang) * spd2;
            } else {
                f.isAttacking = false;
                f.vy *= 0.97;
                if (Math.abs(f.vx) < 15) f.vx = (f.vx >= 0 ? 1 : -1) * 20;
            }
            f.x += f.vx * dt; f.y += f.vy * dt;
            if (f.vx > 0 && f.x > W + 100) f.x = -100;
            else if (f.vx < 0 && f.x < -100) f.x = W + 100;
        }

        // Boss update (stage 5)
        if (this.boss && !this.bossDefeated) this._updateBoss(dt, W, H);

        this._checkCollisions();

        // Stage clear: all edible fish gone + (no boss OR boss defeated)
        const bossOk = !this.boss || this.bossDefeated;
        if (this._countEdible() === 0 && bossOk && !this.stageClear) {
            this.stageClear = true;
            this.stageClearTimer = 0;
            this._buildStageClearInfo();
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('finNFury_highScore', this.highScore.toString());
            }
        }
    }

    // ── Boss AI ───────────────────────────────────────────────
    _updateBoss(dt, W, H) {
        const b = this.boss;
        if (b.hitFlash > 0) b.hitFlash -= dt;

        b.chargeTimer += dt;

        if (!b.isCharging) {
            // Patrol: sine-wave movement toward player
            const dx = this.fishX - b.x, dy = this.fishY - b.y;
            const dist = Math.hypot(dx, dy);
            // Slow orbit
            b.vx += (dx / dist) * 40 * dt;
            b.vy += (dy / dist) * 40 * dt;
            b.vx *= 0.96; b.vy *= 0.96;
            // Clamp patrol speed
            const mag = Math.hypot(b.vx, b.vy);
            if (mag > 80) { b.vx = b.vx / mag * 80; b.vy = b.vy / mag * 80; }

            // Initiate charge
            if (b.chargeTimer >= b.chargeCooldown) {
                b.isCharging  = true;
                b.chargeTimer = 0;
                const ang = Math.atan2(dy, dx);
                const chSpd = 420;
                b.chargeVx = Math.cos(ang) * chSpd;
                b.chargeVy = Math.sin(ang) * chSpd;
                this._spawnFloatingText(b.x, b.y - 60, '⚡ CHARGE!', '#ff4444');
            }
        } else {
            // Charging
            b.x += b.chargeVx * dt;
            b.y += b.chargeVy * dt;
            if (b.chargeTimer >= b.chargeDuration) {
                b.isCharging  = false;
                b.chargeTimer = 0;
                b.vx = b.chargeVx * 0.1;
                b.vy = b.chargeVy * 0.1;
            }
        }

        if (!b.isCharging) { b.x += b.vx * dt; b.y += b.vy * dt; }

        b.facingLeft = b.vx < 0;

        // Keep boss in screen
        b.x = Math.max(80, Math.min(W - 80, b.x));
        b.y = Math.max(80, Math.min(H - 80, b.y));
    }

    // ── Collision checks ──────────────────────────────────────
    _checkCollisions() {
        const pr = 30 * this.playerSize;

        // Eat edible fish
        const eatArr = (arr, r, pts, grow) => {
            for (let i = arr.length - 1; i >= 0; i--) {
                const f = arr[i];
                if (Math.hypot(this.fishX - f.x, this.fishY - f.y) < pr + r) {
                    arr.splice(i, 1);
                    this._addScore(pts);
                    this._spawnFloatingText(f.x, f.y, `+${pts}`);
                    this.playerSize = Math.min(this.playerSize + grow, 1.2);
                    this._playSound(this.sfx.eat);
                }
            }
        };
        eatArr(this.bgClownfish,    15, SCORE.SMALL,  0.010);
        eatArr(this.bgGoldfish,     15, SCORE.SMALL,  0.008);
        eatArr(this.bgSecondfish,   20, SCORE.MEDIUM, 0.012);
        eatArr(this.bgTertiaryfish, 15, SCORE.MEDIUM, 0.010);
        eatArr(this.bgTunafish,     25, SCORE.LARGE,  0.015);

        // Furyfish contact — damage player but NEVER remove furyfish
        for (let i = 0; i < this.bgFuryfish.length; i++) {
            const f = this.bgFuryfish[i];
            if (Math.hypot(this.fishX - f.x, this.fishY - f.y) < pr + 22) {
                if (this.damageCooldown <= 0) {
                    this._takeDamage();
                    this.damageCooldown = 1.0;
                }
                // Nudge furyfish away so it doesn't stick on Fin
                const ang = Math.atan2(f.y - this.fishY, f.x - this.fishX);
                f.x += Math.cos(ang) * 80;
                f.y += Math.sin(ang) * 80;
            }
        }
        // Enemy contact — damage player but NEVER remove enemy
        for (let i = 0; i < this.bgEnemies.length; i++) {
            const f = this.bgEnemies[i];
            if (Math.hypot(this.fishX - f.x, this.fishY - f.y) < pr + 20) {
                if (this.damageCooldown <= 0) {
                    this._takeDamage();
                    this.damageCooldown = 1.0;
                }
                // Nudge enemy away
                const ang = Math.atan2(f.y - this.fishY, f.x - this.fishX);
                f.x += Math.cos(ang) * 70;
                f.y += Math.sin(ang) * 70;
            }
        }

        // Boss contact — damage
        if (this.boss && !this.bossDefeated) {
            const hitR = this.boss.isCharging ? 55 : 45;
            if (Math.hypot(this.fishX - this.boss.x, this.fishY - this.boss.y) < pr + hitR) {
                this._takeDamage();
            }
        }

        // Projectiles vs furyfish
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            let hit = false;
            for (let j = this.bgFuryfish.length - 1; j >= 0; j--) {
                if (Math.hypot(p.x - this.bgFuryfish[j].x, p.y - this.bgFuryfish[j].y) < 30) {
                    this._addScore(SCORE.POISON);
                    this._spawnFloatingText(this.bgFuryfish[j].x, this.bgFuryfish[j].y, `+${SCORE.POISON}`, '#ff4f00');
                    this.bgFuryfish.splice(j, 1);
                    this.projectiles.splice(i, 1);
                    this._playSound(this.sfx.shootHit);
                    hit = true; break;
                }
            }
            if (hit) continue;
            for (let j = this.bgEnemies.length - 1; j >= 0; j--) {
                if (Math.hypot(p.x - this.bgEnemies[j].x, p.y - this.bgEnemies[j].y) < 30) {
                    this._addScore(SCORE.ENEMY);
                    this._spawnFloatingText(this.bgEnemies[j].x, this.bgEnemies[j].y, `+${SCORE.ENEMY}`, '#ff8800');
                    this.bgEnemies.splice(j, 1);
                    this.projectiles.splice(i, 1);
                    this._playSound(this.sfx.shootHit);
                    hit = true; break;
                }
            }
            if (hit) continue;

            // Projectiles vs Boss
            if (this.boss && !this.bossDefeated) {
                if (Math.hypot(p.x - this.boss.x, p.y - this.boss.y) < 55) {
                    this.boss.hp--;
                    this.boss.hitFlash = 0.18;
                    this.projectiles.splice(i, 1);
                    this._addScore(SCORE.BOSS_HIT);
                    this._spawnFloatingText(this.boss.x, this.boss.y - 40, `HIT! +${SCORE.BOSS_HIT}`, '#ff4f00');
                    this._playSound(this.sfx.shootHit);
                    if (this.boss.hp <= 0) {
                        this.bossDefeated = true;
                        this._addScore(SCORE.BOSS_KILL);
                        this._spawnFloatingText(this.boss.x, this.boss.y - 60, `BOSS DEFEATED! +${SCORE.BOSS_KILL}`, '#ffd060');
                    }
                }
            }
        }

        // Player vs clams — collect pearl → unlock shooting
        for (const clam of this.clams) {
            if (clam.hasPearl && !clam.pearlCollected) {
                if (Math.hypot(this.fishX - clam.x, this.fishY - clam.y) < pr + 28) {
                    clam.hasPearl      = false;
                    clam.pearlCollected = true;
                    clam.openAnim      = 1.0;
                    this.hasPearlPower = true;
                    this._addScore(SCORE.PEARL);
                    this._spawnFloatingText(clam.x, clam.y - 20, `🦪 PEARL POWER! +${SCORE.PEARL}`, '#00c8ff');
                    this._playSound(this.sfx.collect);
                }
            }
        }
    }

    _takeDamage() {
        this.health--;
        this.stageDamaged  = true;
        this.hitFlashTimer = 0.45; // red screen flash duration in seconds
        this._playSound(this.sfx.damage);
        if (this.health <= 0) {
            this.gameOver = true;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('finNFury_highScore', this.highScore.toString());
            }
        }
    }

    _buildStageClearInfo() {
        const stageBonus  = this.stage * 300;
        const speedBonus  = Math.max(0, 600 - Math.floor(this.stageTime) * 8);
        const noDmgBonus  = this.stageDamaged ? 0 : 400;
        this.score += stageBonus + speedBonus + noDmgBonus;
        this.stageClearInfo = { stageBonus, speedBonus, noDmgBonus };
    }

    _nextStage() {
        if (this.stage >= this.MAX_STAGE) {
            // Final victory — show game over as victory
            this.stageClear = false;
            this.gameOver   = true;
            return;
        }
        this.stage++;
        this._initStage();
    }

    _restartGame() {
        this.score      = 0;
        this.health     = 3;
        this.stage      = 1;
        this.playerSize = 0.35;
        this.gameOver   = false;
        this.stageClear = false;
        this.particles  = [];
        this._initStage();
    }

    _onCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        if (this.gameOver && this.tryAgainButtonRect) {
            const b = this.tryAgainButtonRect;
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) this._restartGame();
        }
        if (this.stageClear && this.continueButtonRect) {
            const b = this.continueButtonRect;
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) this._nextStage();
        }
    }

    _addScore(amount) {
        this.score += amount;
        this.comboCount++;
        this.comboTimer = 2.0;
        if (this.comboCount === 2) this.score += 20;
        if (this.comboCount === 3) this.score += 50;
        if (this.comboCount === 5) this.score += 100;
    }

    // ── DRAW ─────────────────────────────────────────────────
    _draw() {
        const { ctx, canvas, dpr } = this;
        const W = canvas.width / dpr, H = canvas.height / dpr;

        ctx.save();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, W, H);

        const bs = { x: Math.sin(this.elapsed * 0.4) * 12, y: Math.cos(this.elapsed * 0.3) * 8 };
        const fs = { x: Math.sin(this.elapsed * 0.6 + 1) * 20, y: Math.cos(this.elapsed * 0.5 + 1) * 12 };

        const bgIdx = Math.min(this.stage, 5);
        const bg = this.bgImages[bgIdx];
        if (bg && bg.complete && bg.naturalWidth !== 0) {
            ctx.save(); ctx.translate(bs.x, bs.y);
            ctx.drawImage(bg, -20, -20, W + 40, H + 40);
            ctx.restore();
        } else {
            const g = ctx.createLinearGradient(0, 0, 0, H);
            g.addColorStop(0, '#000d1a'); g.addColorStop(0.5, '#001e3c'); g.addColorStop(1, '#002f54');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        }

        this._drawAtmosphere(ctx, W, H);
        this._drawBgFish(ctx);
        this._drawBoss(ctx);
        this._drawCollectibles(ctx);
        this._drawPlayerFish(ctx);
        this._drawProjectiles(ctx);
        this._drawFloatingTexts(ctx);

        const fg = this.fgImages[bgIdx];
        if (fg && fg.complete && fg.naturalWidth !== 0) {
            ctx.save(); ctx.translate(fs.x, fs.y);
            ctx.drawImage(fg, -30, -30, W + 60, H + 60);
            ctx.restore();
        }

        this._drawHUD(ctx, W, H);

        // ── Red hit flash overlay ──────────────────────────
        if (this.hitFlashTimer > 0) {
            const alpha = Math.min(0.55, this.hitFlashTimer * 1.4);
            ctx.save();
            ctx.fillStyle = `rgba(220, 0, 0, ${alpha})`;
            ctx.fillRect(0, 0, W, H);
            // Pulsing border vignette
            const vg = ctx.createRadialGradient(W/2, H/2, H * 0.25, W/2, H/2, H * 0.8);
            vg.addColorStop(0, 'rgba(180,0,0,0)');
            vg.addColorStop(1, `rgba(220,0,0,${alpha * 1.2})`);
            ctx.fillStyle = vg;
            ctx.fillRect(0, 0, W, H);
            ctx.restore();
        }

        // ── Stage intro banner ─────────────────────────────
        if (this.stageIntroActive) {
            const t       = this.stageIntroTimer;
            const total   = 2.8;
            const elapsed = total - t;

            // Fade in 0→0.4s, hold, fade out last 0.5s
            let alpha = 1;
            if (elapsed < 0.4)   alpha = elapsed / 0.4;
            else if (t < 0.5)    alpha = t / 0.5;

            ctx.save();
            ctx.globalAlpha = alpha;

            // Dark backdrop strip
            const stripH = 160;
            const stripY = H / 2 - stripH / 2;
            const stripG = ctx.createLinearGradient(0, stripY, 0, stripY + stripH);
            stripG.addColorStop(0,   'rgba(0,8,24,0)');
            stripG.addColorStop(0.2, 'rgba(0,8,24,0.88)');
            stripG.addColorStop(0.8, 'rgba(0,8,24,0.88)');
            stripG.addColorStop(1,   'rgba(0,8,24,0)');
            ctx.fillStyle = stripG;
            ctx.fillRect(0, stripY, W, stripH);

            const isBossStage = this.stage === this.MAX_STAGE;

            // Stage label
            ctx.font = "bold 22px 'Exo 2', sans-serif";
            ctx.textAlign   = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle   = isBossStage ? '#ff6040' : 'rgba(130,220,255,0.9)';
            ctx.shadowColor = isBossStage ? '#ff2000' : '#00aaff';
            ctx.shadowBlur  = 18;
            ctx.fillText(
                isBossStage ? '⚠  FINAL STAGE  ⚠' : `— STAGE ${this.stage} OF ${this.MAX_STAGE} —`,
                W / 2, H / 2 - 32
            );

            // Big stage title
            const titleSize = Math.min(W * 0.14, 90);
            ctx.font = `bold ${titleSize}px 'Bangers', cursive`;
            ctx.shadowColor = isBossStage ? '#ff2000' : '#00c8ff';
            ctx.shadowBlur  = 30;
            ctx.fillStyle   = isBossStage ? '#ff4030' : '#ffffff';

            // Slight bounce scale — peaks at elapsed=0.4s
            const bounce = 1 + Math.sin(Math.min(elapsed / 0.4, 1) * Math.PI) * 0.08;
            ctx.save();
            ctx.translate(W / 2, H / 2 + 18);
            ctx.scale(bounce, bounce);
            ctx.fillText(
                isBossStage ? '👹  BOSS STAGE' : `STAGE  ${this.stage}`,
                0, 0
            );
            ctx.restore();

            // Subtitle hint
            ctx.shadowBlur = 0;
            ctx.font       = `italic 500 ${Math.min(W * 0.028, 18)}px 'Exo 2', sans-serif`;
            ctx.fillStyle  = isBossStage ? '#ffaa80' : 'rgba(160,220,255,0.75)';
            ctx.fillText(
                isBossStage
                    ? 'Defeat the Boss to win!'
                    : (this.stage === 1 ? 'Eat fish to grow — find a clam to shoot!' : 'Eat all fish to advance!'),
                W / 2, H / 2 + 70
            );

            ctx.restore();
        }

        ctx.restore();
    }

    _drawHUD(ctx, W, H) {
        const pulse = 1 + Math.sin(this.elapsed * 4) * 0.08;

        const hudText = (text, x, y, color, shadow, size = 22) => {
            ctx.save();
            ctx.shadowColor = shadow; ctx.shadowBlur = 8;
            ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
            ctx.font = `bold ${size * pulse}px 'Bangers', cursive`;
            ctx.textAlign = 'left';
            ctx.strokeText(text, x, y);
            ctx.fillStyle = color;
            ctx.fillText(text, x, y);
            ctx.restore();
        };

        hudText(`SCORE: ${this.score}`,   40, 40,  '#ffd060', '#ffd060', 24);
        hudText(`BEST: ${this.highScore}`, 40, 65,  '#ffaa40', '#ffaa40', 18);
        hudText(`STAGE ${this.stage} / ${this.MAX_STAGE}`, 40, 90, '#ffffff', '#ffffff', 18);
        hudText(`HP: ${'❤'.repeat(Math.max(0, this.health))}`, 40, 140, '#ff4f00', '#ff4f00', 22);

        // Pearl status
        const pearlCol  = this.hasPearlPower ? '#00c8ff' : '#888';
        const pearlTxt  = this.hasPearlPower ? '🦪 PEARL READY (SPACE)' : '🦪 Find a clam to shoot!';
        ctx.save();
        ctx.shadowColor = this.hasPearlPower ? '#00c8ff' : 'transparent'; ctx.shadowBlur = 6;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.font = "bold 17px 'Bangers', cursive"; ctx.textAlign = 'left';
        ctx.strokeText(pearlTxt, 40, 165);
        ctx.fillStyle = pearlCol; ctx.fillText(pearlTxt, 40, 165);
        ctx.restore();

        // Fish remaining
        const rem = this._countEdible();
        const remTxt = rem > 0 ? `🐟 EAT ${rem} MORE FISH` : (this.boss && !this.bossDefeated ? '🔥 DEFEAT THE BOSS!' : '✅ STAGE CLEAR!');
        const remCol = rem > 0 ? '#80ffb0' : (this.boss && !this.bossDefeated ? '#ff8040' : '#ffd060');
        ctx.save();
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
        ctx.font = "bold 17px 'Bangers', cursive"; ctx.textAlign = 'left';
        ctx.strokeText(remTxt, 40, 190);
        ctx.fillStyle = remCol; ctx.fillText(remTxt, 40, 190);
        ctx.restore();

        // Boss HP bar (top-centre)
        if (this.boss && !this.bossDefeated) {
            const barW = 320, barH = 22;
            const barX = (W - barW) / 2, barY = 24;
            const pct = Math.max(0, this.boss.hp / this.boss.maxHp);

            ctx.save();
            // Label
            ctx.font = "bold 18px 'Bangers', cursive"; ctx.textAlign = 'center';
            ctx.fillStyle = '#ff4040'; ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 10;
            ctx.fillText('👹 BOSS', W / 2, barY - 4);

            // BG
            ctx.shadowBlur = 0;
            ctx.fillStyle = 'rgba(0,0,0,0.6)';
            ctx.fillRect(barX, barY, barW, barH);
            ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 2;
            ctx.strokeRect(barX, barY, barW, barH);

            // Fill — pulses red to orange
            const bpulse = 0.5 + Math.sin(this.elapsed * 6) * 0.5;
            const r = Math.floor(200 + 55 * bpulse), g = Math.floor(20 + 60 * (1 - pct));
            ctx.fillStyle = `rgb(${r},${g},20)`;
            ctx.fillRect(barX + 2, barY + 2, Math.max(0, (barW - 4) * pct), barH - 4);

            // HP text
            ctx.fillStyle = '#fff'; ctx.font = "bold 14px 'Exo 2', sans-serif"; ctx.textAlign = 'center';
            ctx.fillText(`${this.boss.hp} / ${this.boss.maxHp}`, W / 2, barY + barH - 5);
            ctx.restore();
        }
    }

    _drawPlayerFish(ctx) {
        const timeSince = this.elapsed - this.lastAttackTime;
        const attacking = timeSince < this.attackDuration;
        let frame, imgSet;

        if (attacking) {
            const prog = Math.min(0.99, timeSince / this.attackDuration);
            frame = Math.floor(prog * 6) + 1;
            imgSet = this.fishFacingLeft ? this.mainfishAttackLeft : this.mainfishAttackRight;
        } else if (this.fishMoving) {
            frame = Math.floor((this.elapsed * 10) % 6) + 1;
            imgSet = this.fishFacingLeft ? this.mainfishSwimLeft : this.mainfishSwimRight;
        } else {
            frame = Math.floor((this.elapsed * 10) % 6) + 1;
            imgSet = this.fishFacingLeft ? this.mainfishRestLeft : this.mainfishRestRight;
        }

        let img = imgSet[frame];
        if (attacking && (!img || !img.complete || img.naturalWidth === 0))
            img = (this.fishFacingLeft ? this.mainfishSwimLeft : this.mainfishSwimRight)[frame];

        if (img && img.complete && img.naturalWidth !== 0) {
            const bob = (this.fishMoving || this.fishAttacking) ? 0 : Math.sin(this.elapsed * 2) * 8;
            const dw = img.naturalWidth * this.playerSize;
            const dh = img.naturalHeight * this.playerSize;
            const x  = this.fishX - dw / 2;
            const y  = this.fishY - dh / 2 + bob;

            // Flicker (blink every 0.1s) during damage cooldown window
            const flicker = this.damageCooldown > 0 && Math.floor(this.elapsed * 10) % 2 === 0;
            if (!flicker) {
                ctx.drawImage(img, x, y, dw, dh);
            }
            // ── NO health bar drawn above fish ──
        }
    }

    _drawBoss(ctx) {
        if (!this.boss || this.bossDefeated) return;
        const b = this.boss;
        const frame = Math.floor((this.elapsed * 10 + b.frameOffset) % 6) + 1;
        const set = b.isCharging
            ? (b.facingLeft ? this.bossSprite.attackL : this.bossSprite.attackR)
            : (b.facingLeft ? this.bossSprite.left    : this.bossSprite.right);
        const img = set[frame];

        if (img && img.complete && img.naturalWidth !== 0) {
            const sc = 1.4 + Math.sin(this.elapsed * 2) * 0.05;
            const w  = img.naturalWidth * sc, h = img.naturalHeight * sc;
            const bob = b.isCharging ? 0 : Math.sin(this.elapsed * 1.5 + b.bobOffset) * 8;

            ctx.save();
            // Red flash on hit
            if (b.hitFlash > 0) {
                ctx.globalCompositeOperation = 'source-over';
                ctx.shadowColor = '#ff0000';
                ctx.shadowBlur  = 40;
            }
            ctx.drawImage(img, b.x - w / 2, b.y - h / 2 + bob, w, h);

            // Charge aura
            if (b.isCharging) {
                ctx.save();
                ctx.globalAlpha = 0.35 + Math.sin(this.elapsed * 15) * 0.2;
                ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 60;
                ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 4;
                ctx.beginPath(); ctx.arc(b.x, b.y, 65, 0, Math.PI * 2); ctx.stroke();
                ctx.restore();
            }
            ctx.restore();
        }
    }

    _drawBgFish(ctx) {
        const drawSet = (arr, rL, rR, sL, sR, scale) => {
            for (const f of arr) {
                const frame = Math.floor((this.elapsed * 10 + f.frameOffset) % 6) + 1;
                const isL   = f.vx < 0;
                let img = (isL ? sL : sR)[frame];
                if (!img || !img.complete || img.naturalWidth === 0) img = (isL ? rL : rR)[frame];
                if (img && img.complete && img.naturalWidth !== 0) {
                    const sc  = typeof scale === 'function' ? scale(f) : scale;
                    const w   = img.naturalWidth * sc, h = img.naturalHeight * sc;
                    const bob = Math.sin(this.elapsed * 2 + f.bobOffset) * 5;
                    ctx.drawImage(img, f.x - w / 2, f.y - h / 2 + bob, w, h);
                }
            }
        };

        drawSet(this.bgClownfish,    this.clownfishRestLeft,  this.clownfishRestRight,  this.clownfishSwimLeft,  this.clownfishSwimRight,  0.35);
        drawSet(this.bgGoldfish,     this.goldfishRestLeft,   this.goldfishRestRight,   this.goldfishSwimLeft,   this.goldfishSwimRight,   0.30);
        drawSet(this.bgSecondfish,   this.secondfishRestLeft, this.secondfishRestRight, this.secondfishSwimLeft, this.secondfishSwimRight, 0.40);
        drawSet(this.bgTertiaryfish, this.tertiaryRestLeft,   this.tertiaryRestRight,   this.tertiarySwimLeft,   this.tertiarySwimRight,   0.35);
        drawSet(this.bgTunafish,     this.tunafishRestLeft,   this.tunafishRestRight,   this.tunafishSwimLeft,   this.tunafishSwimRight,   0.50);

        // Furyfish (with attack animation)
        for (const f of this.bgFuryfish) {
            const frame = Math.floor((this.elapsed * 10 + f.frameOffset) % 6) + 1;
            const isL   = f.vx < 0;
            let img = f.isAttacking ? (isL ? this.furyfishAttackLeft : this.furyfishAttackRight)[frame] : null;
            if (!img || !img.complete || img.naturalWidth === 0) img = (isL ? this.furyfishSwimLeft : this.furyfishSwimRight)[frame];
            if (img && img.complete && img.naturalWidth !== 0) {
                const sc  = 0.45 * (f.isAttacking ? 1.2 : 1.0);
                const w   = img.naturalWidth * sc, h = img.naturalHeight * sc;
                const bob = f.isAttacking ? 0 : Math.sin(this.elapsed * 2 + f.bobOffset) * 5;
                ctx.drawImage(img, f.x - w / 2, f.y - h / 2 + bob, w, h);
            }
        }

        // Enemies
        for (const f of this.bgEnemies) {
            const frame = Math.floor((this.elapsed * 10 + f.frameOffset) % 6) + 1;
            const isL   = f.vx < 0;
            const img   = (isL ? this.furyfishSwimLeft : this.furyfishSwimRight)[frame];
            if (img && img.complete && img.naturalWidth !== 0) {
                const sc  = 0.45 * (f.isAttacking ? 1.1 : 1.0);
                const w   = img.naturalWidth * sc, h = img.naturalHeight * sc;
                const bob = f.isAttacking ? 0 : Math.sin(this.elapsed * 2 + f.bobOffset) * 5;
                ctx.drawImage(img, f.x - w / 2, f.y - h / 2 + bob, w, h);
            }
        }
    }

    _drawCollectibles(ctx) {
        for (const clam of this.clams) {
            const img = (clam.hasPearl && !clam.pearlCollected) ? this.clamSprite.closed : this.clamSprite.open;
            if (img && img.complete && img.naturalWidth !== 0) {
                const sc = 0.6, w = img.naturalWidth * sc, h = img.naturalHeight * sc;
                const x = clam.x - w / 2, y = clam.y - h / 2;

                if (clam.hasPearl && !clam.pearlCollected) {
                    // Glowing pearl clam
                    ctx.save();
                    ctx.shadowColor = `rgba(0,200,255,${0.4 + Math.sin(this.elapsed * 3) * 0.2})`;
                    ctx.shadowBlur  = 20 + Math.sin(this.elapsed * 3) * 8;
                    ctx.drawImage(img, x, y, w, h);
                    ctx.restore();

                    // Floating pearl icon above
                    if (this.pearlSprite && this.pearlSprite.complete) {
                        const ps = 0.4 + Math.sin(this.elapsed * 2) * 0.04;
                        const pw = this.pearlSprite.naturalWidth * ps;
                        const ph = this.pearlSprite.naturalHeight * ps;
                        const fy = y - ph - 8 + Math.sin(this.elapsed * 2) * 4;
                        ctx.save(); ctx.globalAlpha = 0.88;
                        ctx.drawImage(this.pearlSprite, clam.x - pw / 2, fy, pw, ph);
                        ctx.restore();
                    }

                    // "SHOOT UNLOCK" hint text
                    ctx.save();
                    ctx.font = "bold 12px 'Exo 2', sans-serif";
                    ctx.textAlign = 'center'; ctx.fillStyle = '#00c8ff';
                    ctx.globalAlpha = 0.6 + Math.sin(this.elapsed * 3) * 0.4;
                    ctx.fillText('COLLECT TO SHOOT!', clam.x, clam.y - 40 + Math.sin(this.elapsed * 2) * 4);
                    ctx.restore();
                } else {
                    ctx.drawImage(img, x, y, w, h);
                }

                // Pearl pop animation
                if (clam.openAnim > 0 && this.pearlSprite && this.pearlSprite.complete) {
                    const prog = 1.0 - clam.openAnim;
                    ctx.save();
                    ctx.globalAlpha = clam.openAnim;
                    const pw = this.pearlSprite.naturalWidth * 0.5;
                    const ph = this.pearlSprite.naturalHeight * 0.5;
                    ctx.drawImage(this.pearlSprite, clam.x - pw / 2, y - prog * 50, pw, ph);
                    ctx.restore();
                }
            }
        }
    }

    _handleAttack() {
        if (!this.hasPearlPower) return;
        if (this.fishAttacking && (this.elapsed - this.lastAttackTime > this.attackDuration)) {
            this.lastAttackTime = this.elapsed;
            this.firedInCurrentAttack = false;
        }
        const t = this.elapsed - this.lastAttackTime;
        if (t < this.attackDuration) {
            const frame = Math.floor(Math.min(0.99, t / this.attackDuration) * 6) + 1;
            if (frame === 4 && !this.firedInCurrentAttack) {
                this._spawnProjectile();
                this.firedInCurrentAttack = true;
            }
        }
    }

    _spawnProjectile() {
        this.projectiles.push({
            x: this.fishX + (this.fishFacingLeft ? -30 : 30),
            y: this.fishY,
            vx: this.fishFacingLeft ? -this.projectileSpeed : this.projectileSpeed,
            vy: 0,
            frameOffset: Math.random() * 8,
        });
        this._playSound(this.sfx.shoot);
    }

    _updateProjectiles(dt) {
        const W = this.canvas.width / this.dpr, H = this.canvas.height / this.dpr;
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.x < -100 || p.x > W + 100 || p.y < -100 || p.y > H + 100)
                this.projectiles.splice(i, 1);
        }
    }

    _drawProjectiles(ctx) {
        for (const p of this.projectiles) {
            const frame = Math.floor((this.elapsed * 15 + p.frameOffset) % 8) + 1;
            const img   = this.projectileSprites[frame];
            if (img && img.complete && img.naturalWidth !== 0) {
                const x = p.x - img.naturalWidth / 2, y = p.y - img.naturalHeight / 2;
                ctx.save();
                if (p.vx < 0) { ctx.scale(-1, 1); ctx.drawImage(img, -x - img.naturalWidth, y); }
                else           { ctx.drawImage(img, x, y); }
                ctx.restore();
            }
        }
    }

    _drawAtmosphere(ctx, W, H) {
        const e = this.elapsed;
        ctx.save();
        for (let i = 0; i < 6; i++) {
            const sx = W * (0.1 + i * 0.18), sh = Math.sin(e * 0.5 + i) * 30;
            const gr = ctx.createLinearGradient(sx + sh, 0, sx + sh, H);
            gr.addColorStop(0, `rgba(100,210,255,${0.05 + Math.sin(e + i) * 0.02})`);
            gr.addColorStop(0.8, 'rgba(0,50,100,0)');
            ctx.fillStyle = gr;
            ctx.beginPath();
            ctx.moveTo(sx + sh - 20, 0); ctx.lineTo(sx + sh + 20, 0);
            ctx.lineTo(sx + sh + 150, H); ctx.lineTo(sx + sh - 150, H);
            ctx.fill();
        }
        ctx.restore();
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        for (const p of this.particles) {
            const dx = Math.sin(e * 0.5 + p.phase) * 20;
            const dy = (e * p.speed * 40) % (H + 100);
            ctx.beginPath(); ctx.arc((p.x + dx) % W, (p.y + dy) % H, p.r, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }

    _spawnFloatingText(x, y, text, color = '#ffd060') {
        this.floatingTexts.push({ x, y, text, color, life: 1.2, maxLife: 1.2 });
    }
    _drawFloatingTexts(ctx) {
        ctx.save();
        ctx.textAlign = 'center';
        for (const ft of this.floatingTexts) {
            const alpha = Math.max(0, ft.life / ft.maxLife);
            const size  = ft.text.length > 20 ? 16 : 22;
            ctx.globalAlpha = alpha;
            ctx.font        = `bold ${size}px 'Bangers', cursive`;
            ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
            ctx.strokeText(ft.text, ft.x, ft.y);
            ctx.fillStyle = ft.color;
            ctx.fillText(ft.text, ft.x, ft.y);
        }
        ctx.globalAlpha = 1; ctx.restore();
    }

    _drawGameOver() {
        const { ctx, canvas, dpr } = this;
        const W = canvas.width / dpr, H = canvas.height / dpr;
        ctx.save(); ctx.scale(dpr, dpr);
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, W, H);

        const img = this.gameOverSprite;
        if (img && img.complete && img.naturalWidth !== 0) {
            const sc = Math.min(W * 0.75 / img.naturalWidth, H * 0.4 / img.naturalHeight);
            const iW = img.naturalWidth * sc, iH = img.naturalHeight * sc;
            ctx.drawImage(img, (W - iW) / 2, (H - iH) / 2 - 20, iW, iH);
        } else {
            ctx.fillStyle = '#ff4f00'; ctx.font = "bold 80px 'Bangers', cursive"; ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', W / 2, H / 2);
        }

        ctx.fillStyle = '#ffffff'; ctx.font = "24px 'Exo 2'"; ctx.textAlign = 'center';
        ctx.fillText(`Final Score: ${this.score}`, W / 2, H / 2 + 70);
        ctx.fillStyle = this.score >= this.highScore ? '#ffd060' : '#aaaaaa';
        ctx.fillText(`Best: ${this.highScore}`, W / 2, H / 2 + 100);

        const bW = 240, bH = 55, bX = (W - bW) / 2, bY = H / 2 + 145;
        this.tryAgainButtonRect = { x: bX, y: bY, w: bW, h: bH };
        const gd = ctx.createLinearGradient(bX, bY, bX, bY + bH);
        gd.addColorStop(0, '#00a8ff'); gd.addColorStop(1, '#0055aa');
        ctx.fillStyle = gd; ctx.fillRect(bX, bY, bW, bH);
        ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 3; ctx.strokeRect(bX, bY, bW, bH);
        ctx.fillStyle = '#fff'; ctx.font = "bold 28px 'Bangers', cursive";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('TRY AGAIN', W / 2, bY + bH / 2 + 2);
        ctx.restore();
    }

    _drawStageClearScreen() {
        const { ctx, canvas, dpr } = this;
        const W = canvas.width / dpr, H = canvas.height / dpr;
        ctx.save(); ctx.scale(dpr, dpr);
        ctx.fillStyle = 'rgba(0,18,38,0.88)'; ctx.fillRect(0, 0, W, H);

        const isVictory = this.stage >= this.MAX_STAGE;
        ctx.fillStyle = isVictory ? '#ffd060' : '#80ffc0';
        ctx.font = "bold 90px 'Bangers', cursive"; ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 15;
        ctx.fillText(isVictory ? '🏆 VICTORY! 🏆' : `STAGE ${this.stage} CLEAR!`, W / 2, H / 2 - 120);

        ctx.shadowBlur = 0;
        const lH = 30, sX = W / 2 - 160, sY = H / 2 - 40;
        if (this.stageClearInfo) {
            const { stageBonus, speedBonus, noDmgBonus } = this.stageClearInfo;
            const baseScore = this.score - stageBonus - speedBonus - noDmgBonus;
            const rows = [
                ['Stage Score:', baseScore, '#c0e0ff'],
                [`Stage ${this.stage} Bonus:`, `+${stageBonus}`, '#80ffb0'],
                ['Speed Bonus:', `+${speedBonus}`, '#80ffb0'],
                ['No-Damage Bonus:', `+${noDmgBonus}`, '#80ffb0'],
            ];
            rows.forEach(([lbl, val, col], idx) => {
                ctx.font = "22px 'Exo 2'"; ctx.textAlign = 'left'; ctx.fillStyle = '#c0e0ff';
                ctx.fillText(lbl, sX, sY + idx * lH);
                ctx.textAlign = 'right'; ctx.fillStyle = col;
                ctx.fillText(val, sX + 320, sY + idx * lH);
            });

            ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sX, sY + 4 * lH + 5); ctx.lineTo(sX + 320, sY + 4 * lH + 5); ctx.stroke();

            ctx.font = "bold 24px 'Exo 2'"; ctx.textAlign = 'left'; ctx.fillStyle = '#c0e0ff';
            ctx.fillText('Total Score:', sX, sY + 5 * lH + 10);
            ctx.textAlign = 'right'; ctx.fillStyle = '#ffd060';
            ctx.fillText(this.score, sX + 320, sY + 5 * lH + 10);
        }

        const tl = Math.max(0, Math.ceil(3.5 - this.stageClearTimer));
        ctx.font = "18px 'Exo 2'"; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(180,220,255,0.6)';
        ctx.fillText(isVictory ? '' : `Continuing in ${tl}s…`, W / 2, H / 2 + 120);

        const bW = 260, bH = 55, bX = (W - bW) / 2, bY = H / 2 + 148;
        this.continueButtonRect = { x: bX, y: bY, w: bW, h: bH };
        const gd = ctx.createLinearGradient(bX, bY, bX, bY + bH);
        gd.addColorStop(0, C.playA); gd.addColorStop(1, C.playB);
        ctx.fillStyle = gd; ctx.fillRect(bX, bY, bW, bH);
        ctx.strokeStyle = C.btnBorder; ctx.lineWidth = 2; ctx.strokeRect(bX, bY, bW, bH);
        ctx.fillStyle = '#fff'; ctx.font = "bold 28px 'Bangers', cursive";
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(isVictory ? '🔄 PLAY AGAIN' : 'CONTINUE ▶', W / 2, bY + bH / 2 + 2);

        ctx.restore();
    }

    // ── Audio ─────────────────────────────────────────────────
    _initAudio() {
        this.sfx = {
            shoot:    new Audio('sfx/shoot.wav'),
            shootHit: new Audio('sfx/shoot_hit.wav'),
            collect:  new Audio('sfx/collect.wav'),
            dud:      new Audio('sfx/dud.wav'),
            eat:      new Audio('sfx/eat.wav'),
            damage:   new Audio('sfx/damage.wav'),
        };
        this._updateSfxVolume();
    }
    _updateSfxVolume() {
        const sl = document.getElementById('sfxVol');
        if (sl) {
            this.sfxVolume = sl.value / 100;
            for (const k in this.sfx) if (this.sfx[k]) this.sfx[k].volume = this.sfxVolume;
        }
    }
    _playSound(sound) {
        if (sound && sound.src && this.sfxVolume > 0) {
            const s = sound.cloneNode();
            s.volume = this.sfxVolume;
            s.play().catch(() => {});
        }
    }
}

// ================================================================
//  MenuSystem  (unchanged visual, intact)
// ================================================================
class MenuSystem {
    constructor() {
        this.menuCanvas = document.getElementById('menuCanvas');
        this.ctx        = this.menuCanvas.getContext('2d');
        this.gameCanvas = document.getElementById('gameCanvas');
        this.W = 0; this.H = 0;
        this.dpr = window.devicePixelRatio || 1;
        this.elapsed = 0; this.lastTime = 0;
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
        this.menuCanvas.addEventListener('touchstart', e => this._onTouch(e,'down'), {passive:true});
        this.menuCanvas.addEventListener('touchend',   e => this._onTouch(e,'up'),   {passive:true});
        this.menuCanvas.addEventListener('touchmove',  e => this._onTouch(e,'move'), {passive:true});
        document.getElementById('closeHowToPlay').addEventListener('click', () => this._closeModal('howToPlayModal'));
        document.getElementById('closeSettings').addEventListener('click',   () => this._closeModal('settingsModal'));
        ['musicVol','sfxVol'].forEach(id => {
            const el = document.getElementById(id);
            el.addEventListener('input', () => { document.getElementById(id+'Val').textContent = el.value+'%'; });
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
        requestAnimationFrame(ts => this._loop(ts));
    }

    _resize() {
        this.dpr = window.devicePixelRatio || 1;
        this.W = window.innerWidth; this.H = window.innerHeight;
        for (const cv of [this.menuCanvas, this.gameCanvas]) {
            cv.width  = Math.round(this.W * this.dpr);
            cv.height = Math.round(this.H * this.dpr);
            cv.style.width  = this.W + 'px';
            cv.style.height = this.H + 'px';
        }
        this._spawnParticles();
    }

    _spawnParticles() {
        const {W,H} = this;
        this.bubbles = Array.from({length:60}, () => ({
            x: Math.random()*W, y: H+Math.random()*H*0.6,
            r: 1.4+Math.random()*4.8, vy: 0.35+Math.random()*0.85,
            dx: (Math.random()-0.5)*0.28, a: 0.12+Math.random()*0.32, ph: Math.random()*Math.PI*2,
        }));
        this.fishSilh = Array.from({length:7}, () => this._mkFish());
    }

    _mkFish() {
        const {W,H} = this;
        const dir = Math.random()>0.5?1:-1;
        return { x: dir===1?-80:W+80, y: H*0.12+Math.random()*H*0.7, sz: 16+Math.random()*38, vx: (0.35+Math.random()*0.65)*dir, a: 0.05+Math.random()*0.09, dir };
    }

    _loop(ts) {
        const dt = Math.min((ts-this.lastTime)/1000, 0.05);
        this.lastTime = ts; this.elapsed += dt;
        if (!this.isGameStarted) { this._update(dt); this._draw(); }
        requestAnimationFrame(ts2 => this._loop(ts2));
    }

    _update(dt) {
        const {W,H,elapsed:e} = this;
        this.floatY  = Math.sin(e*0.9)*14;
        this.tiltDeg = Math.sin(e*0.9+0.4)*1.3;
        for (const b of this.bubbles) {
            b.y -= b.vy; b.x += b.dx+Math.sin(e*1.1+b.ph)*0.14;
            if (b.y < -12) { b.y = H+8; b.x = Math.random()*W; }
        }
        for (let i=0; i<this.fishSilh.length; i++) {
            const f=this.fishSilh[i]; f.x+=f.vx;
            if ((f.dir===1&&f.x>W+100)||(f.dir===-1&&f.x<-100)) this.fishSilh[i]=this._mkFish();
        }
        for (const btn of this.buttons) {
            if (btn.ripple) { btn.ripple.r+=dt*170; btn.ripple.a-=dt*2.0; if(btn.ripple.a<=0) btn.ripple=null; }
        }
    }

    _draw() {
        const {ctx,dpr,W,H,elapsed:e} = this;
        ctx.save(); ctx.scale(dpr,dpr);
        this._drawBG(ctx,W,H,e);
        this._drawBubbles(ctx,e);
        this._drawFishSilh(ctx);
        this._drawFloatingPanel(ctx,W,H,e);
        ctx.restore();
    }

    _drawBG(ctx,W,H,e) {
        const g = ctx.createLinearGradient(0,0,0,H);
        g.addColorStop(0,C.bg0); g.addColorStop(0.45,C.bg1); g.addColorStop(1,C.bg2);
        ctx.fillStyle=g; ctx.fillRect(0,0,W,H);
        const rg = ctx.createRadialGradient(W/2,H*0.42,0,W/2,H*0.42,Math.max(W,H)*0.6);
        rg.addColorStop(0,'rgba(0,110,200,0.13)'); rg.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=rg; ctx.fillRect(0,0,W,H);
        ctx.save();
        for (let i=0;i<10;i++) {
            const sx=W*(0.05+i*0.1), sp=55+i*9;
            const rr=ctx.createLinearGradient(sx,0,sx,H*0.9);
            rr.addColorStop(0,`rgba(70,190,255,${0.038+(i%3)*0.009})`); rr.addColorStop(1,'rgba(0,80,180,0)');
            ctx.fillStyle=rr; ctx.beginPath();
            ctx.moveTo(sx-3,0); ctx.lineTo(sx+3,0); ctx.lineTo(sx+sp,H*0.9); ctx.lineTo(sx-sp,H*0.9);
            ctx.closePath(); ctx.fill();
        }
        ctx.restore();
        ctx.save();
        for (let i=0;i<15;i++) {
            const cx2=W*(0.04+i*0.065), cy2=H*(0.82+Math.sin(e*0.55+i)*0.035);
            const rw=28+Math.sin(e*1.05+i*0.8)*16, rh=6+Math.sin(e*0.85+i*1.2)*2.5;
            ctx.fillStyle=`rgba(110,215,255,${0.055+Math.sin(e*0.75+i)*0.025})`;
            ctx.beginPath(); ctx.ellipse(cx2,cy2,rw,rh,0,0,Math.PI*2); ctx.fill();
        }
        ctx.restore();
    }

    _drawBubbles(ctx,e) {
        for (const b of this.bubbles) {
            const pulse=1+Math.sin(e*1.9+b.ph)*0.07, r=b.r*pulse;
            ctx.save(); ctx.globalAlpha=b.a;
            const bg=ctx.createRadialGradient(b.x-r*.3,b.y-r*.3,r*.04,b.x,b.y,r);
            bg.addColorStop(0,'rgba(195,238,255,0.55)'); bg.addColorStop(1,'rgba(70,170,255,0.06)');
            ctx.fillStyle=bg; ctx.beginPath(); ctx.arc(b.x,b.y,r,0,Math.PI*2); ctx.fill();
            ctx.strokeStyle=`rgba(130,215,255,${b.a*1.7})`; ctx.lineWidth=0.7; ctx.stroke();
            ctx.globalAlpha=b.a*1.1; ctx.fillStyle='rgba(255,255,255,0.72)';
            ctx.beginPath(); ctx.arc(b.x-r*.34,b.y-r*.34,r*.26,0,Math.PI*2); ctx.fill();
            ctx.restore();
        }
    }

    _drawFishSilh(ctx) {
        for (const f of this.fishSilh) {
            ctx.save(); ctx.globalAlpha=f.a; ctx.fillStyle='rgba(0,75,155,0.9)';
            ctx.translate(f.x,f.y); if(f.dir===-1) ctx.scale(-1,1);
            ctx.beginPath(); ctx.ellipse(0,0,f.sz,f.sz*.42,0,0,Math.PI*2); ctx.fill();
            ctx.beginPath(); ctx.moveTo(f.sz,0); ctx.lineTo(f.sz+f.sz*.5,-f.sz*.33); ctx.lineTo(f.sz+f.sz*.5,f.sz*.33);
            ctx.closePath(); ctx.fill(); ctx.restore();
        }
    }

    _drawFloatingPanel(ctx,W,H,e) {
        const maxW=Math.min(W*1.0,920), maxH=Math.min(H*0.78,630), aspect=920/630;
        let pW,pH;
        if (maxW/aspect<=maxH) { pW=maxW; pH=maxW/aspect; } else { pH=maxH; pW=maxH*aspect; }
        const pX=(W-pW)/2, pY=(H-pH)/2-H*0.04+this.floatY;
        this._panel={x:pX,y:pY,w:pW,h:pH};

        const shadowScale=1-Math.abs(Math.sin(e*0.9))*0.22, shadowAlpha=0.22-Math.abs(Math.sin(e*0.9))*0.1;
        const sdw=ctx.createRadialGradient(W/2,pY+pH+22,0,W/2,pY+pH+22,pW*0.44*shadowScale);
        sdw.addColorStop(0,`rgba(0,12,35,${shadowAlpha})`); sdw.addColorStop(1,'rgba(0,12,35,0)');
        ctx.fillStyle=sdw; ctx.beginPath(); ctx.ellipse(W/2,pY+pH+22,pW*0.44*shadowScale,14*shadowScale,0,0,Math.PI*2); ctx.fill();

        ctx.save();
        ctx.translate(W/2,pY+pH/2); ctx.rotate(this.tiltDeg*Math.PI/180); ctx.translate(-W/2,-(pY+pH/2));

        const gp=0.18+Math.abs(Math.sin(e*0.9))*0.1;
        ctx.save(); ctx.shadowColor=`rgba(40,170,255,${gp})`; ctx.shadowBlur=48;
        ctx.strokeStyle=`rgba(60,190,255,${gp*1.4})`; ctx.lineWidth=1.5;
        this._rrPath(ctx,pX,pY,pW,pH,20); ctx.stroke(); ctx.restore();

        const pg=ctx.createLinearGradient(pX,pY,pX,pY+pH);
        pg.addColorStop(0,'rgba(6,22,52,0.88)'); pg.addColorStop(0.5,'rgba(4,15,38,0.86)'); pg.addColorStop(1,'rgba(3,11,30,0.90)');
        ctx.fillStyle=pg; this._rrPath(ctx,pX,pY,pW,pH,20); ctx.fill();
        ctx.strokeStyle=C.panelBorder; ctx.lineWidth=1.8; this._rrPath(ctx,pX,pY,pW,pH,20); ctx.stroke();
        const sh=ctx.createLinearGradient(pX,pY,pX,pY+pH*0.32);
        sh.addColorStop(0,'rgba(255,255,255,0.08)'); sh.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sh; this._rrPath(ctx,pX+1,pY+1,pW-2,pH*0.32,20); ctx.fill();

        const cx=pX+pW/2;

        // Subtitle
        ctx.save(); ctx.font=`500 ${pW*0.024}px 'Exo 2',sans-serif`; ctx.fillStyle=C.subtitle;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('🐟  AN UNDERWATER SURVIVAL GAME  🐟',cx,pY+pH*0.13); ctx.restore();

        // Title
        const tY=pY+pH*0.30, tSz=Math.min(pW*0.142,115);
        ctx.save(); ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.shadowColor='rgba(0,0,0,0.75)'; ctx.shadowBlur=12; ctx.shadowOffsetX=3; ctx.shadowOffsetY=4;
        const tg=ctx.createLinearGradient(cx,tY-tSz*0.5,cx,tY+tSz*0.5);
        tg.addColorStop(0,'#ffd060'); tg.addColorStop(0.55,'#ffb020'); tg.addColorStop(1,'#ff7800');
        ctx.fillStyle=tg; ctx.font=`${tSz}px 'Bangers',cursive`;
        ctx.save(); ctx.transform(1,0,-0.10,1,tSz*0.055,0); ctx.fillText('FIN & FURY',cx,tY);
        ctx.shadowColor='rgba(255,170,0,0.45)'; ctx.shadowBlur=28; ctx.shadowOffsetX=0; ctx.shadowOffsetY=0;
        ctx.fillText('FIN & FURY',cx,tY); ctx.restore(); ctx.restore();

        // Tagline
        ctx.save(); ctx.font=`italic 500 ${pW*0.028}px 'Exo 2',sans-serif`; ctx.fillStyle=C.tagline;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('Eat all fish. Grab pearls to shoot. Survive 5 stages.',cx,pY+pH*0.46); ctx.restore();

        // Divider
        const divY=pY+pH*0.525;
        ctx.save(); const dg=ctx.createLinearGradient(pX+pW*0.15,divY,pX+pW*0.85,divY);
        dg.addColorStop(0,'rgba(60,190,255,0)'); dg.addColorStop(0.5,'rgba(60,190,255,0.35)'); dg.addColorStop(1,'rgba(60,190,255,0)');
        ctx.strokeStyle=dg; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(pX+pW*0.15,divY); ctx.lineTo(pX+pW*0.85,divY); ctx.stroke(); ctx.restore();

        // Buttons
        const btnW=Math.min(pW*0.46,290), btnH=Math.min(pH*0.115,52), btnGap=Math.min(pH*0.030,14);
        const btnR=btnH/2, btnX=cx-btnW/2, btnStartY=divY+pH*0.045;
        for (let i=0;i<this.buttons.length;i++) {
            const btn=this.buttons[i], by=btnStartY+i*(btnH+btnGap);
            btn.rect={x:btnX,y:by,w:btnW,h:btnH,r:btnR};
            this._drawBtn(ctx,btn,e);
        }

        // Hint
        ctx.save(); ctx.font=`400 ${Math.max(10,pW*0.019)}px 'Exo 2',sans-serif`; ctx.fillStyle=C.hint;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText('WASD / ARROWS TO MOVE  ·  COLLECT PEARL FROM CLAM  ·  SPACE TO SHOOT',cx,pY+pH*0.935); ctx.restore();

        ctx.restore();
    }

    _drawBtn(ctx,btn,e) {
        if (!btn.rect) return;
        const {x,y,w,h,r}=btn.rect, hov=btn.hover, prs=btn.press;
        const yOff=prs?2:hov?-3:0;
        ctx.save(); ctx.translate(0,yOff);
        ctx.shadowColor=btn.primary?`rgba(255,110,10,${hov?0.75:0.38})`:`rgba(0,170,255,${hov?0.52:0.22})`;
        ctx.shadowBlur=hov?26:12;
        const [c0,c1]=btn.primary?(hov?[C.playHA,C.playHB]:[C.playA,C.playB]):(hov?[C.subHA,C.subHB]:[C.subA,C.subB]);
        const fg=ctx.createLinearGradient(x,y,x,y+h);
        fg.addColorStop(0,c0); fg.addColorStop(1,c1); ctx.fillStyle=fg;
        this._rrPath(ctx,x,y,w,h,r); ctx.fill();
        ctx.shadowBlur=0; ctx.strokeStyle=hov?C.btnBorderH:C.btnBorder; ctx.lineWidth=hov?1.8:1.2;
        this._rrPath(ctx,x,y,w,h,r); ctx.stroke();
        const sg=ctx.createLinearGradient(x,y,x,y+h*0.48);
        sg.addColorStop(0,'rgba(255,255,255,0.14)'); sg.addColorStop(1,'rgba(255,255,255,0)');
        ctx.fillStyle=sg; this._rrPath(ctx,x+1,y+1,w-2,h*0.48,r); ctx.fill();
        ctx.shadowColor=C.btnTextShadow; ctx.shadowBlur=5; ctx.fillStyle='#ffffff';
        ctx.font=`700 ${Math.max(13,Math.min(h*0.42,18))}px 'Exo 2',sans-serif`;
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(btn.label,x+w/2,y+h/2);
        if (btn.ripple?.a>0) {
            ctx.globalAlpha=btn.ripple.a; ctx.strokeStyle='rgba(255,255,255,0.8)'; ctx.lineWidth=1.5; ctx.shadowBlur=0;
            ctx.beginPath(); ctx.arc(btn.ripple.x,btn.ripple.y-yOff,btn.ripple.r,0,Math.PI*2); ctx.stroke(); ctx.globalAlpha=1;
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
        const hit=this._hitBtn(x,y);
        for (const btn of this.buttons) btn.hover=(btn===hit);
        this.menuCanvas.style.cursor=hit?'pointer':'default';
    }
    _onDown(e) { const {x,y}=this._cssPt(e); const hit=this._hitBtn(x,y); if(hit) hit.press=true; }
    _onUp(e) {
        const {x,y}=this._cssPt(e); const hit=this._hitBtn(x,y);
        for (const btn of this.buttons) {
            if (btn.press&&btn===hit) { btn.ripple={x,y,r:0,a:0.48}; this._btnAction(btn.id); }
            btn.press=false;
        }
    }
    _onTouch(e,type) {
        const t=e.touches[0]||e.changedTouches[0]; if(!t) return;
        const ev={clientX:t.clientX,clientY:t.clientY};
        if (type==='down') this._onDown(ev); else if (type==='up') this._onUp(ev); else this._onMove(ev);
    }
    _btnAction(id) {
        if (id==='play') this._startGame();
        else if (id==='howtoplay') this._openModal('howToPlayModal');
        else if (id==='settings')  this._openModal('settingsModal');
    }
    _openModal(id)  { const el=document.getElementById(id); el.setAttribute('aria-hidden','false'); el.classList.add('open'); }
    _closeModal(id) { const el=document.getElementById(id); el.classList.remove('open'); el.setAttribute('aria-hidden','true'); }
    _startGame() {
        this.isGameStarted=true;
        this.menuCanvas.style.display='none';
        this.gameCanvas.style.display='block';
        this.game=new GameSystem(this.gameCanvas,this.dpr);
    }
}

/* ── Bootstrap ───────────────────────────────────────────── */
window.addEventListener('DOMContentLoaded', () => { new MenuSystem(); });