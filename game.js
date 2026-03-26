/* ================================================================
   game.js
   GameSystem — orchestrates all modules.

   Eaten / Respawn flow:
     1. _triggerEaten()  → isEaten=true, countdownTimer=RESPAWN_COUNTDOWN
     2. _update() is frozen; drawEatenScreen() overlays the countdown
     3. When countdown hits 0 → isRespawning=true, isEaten=false
     4. Fin falls from the top over RESPAWN_FALL_DURATION seconds
     5. When fall complete → isRespawning=false, normal play resumes

   Player screen-wrap:
     Fin wraps at viewport edges just like fish do.
     Left edge → reappear at right; right edge → reappear at left.
     Top/bottom remain clamped to world bounds.
================================================================= */

class GameSystem {
    constructor(canvas, dpr, startStage = 1) {
        this.canvas = canvas;
        this.ctx    = canvas.getContext('2d');
        this.dpr    = dpr;

        this.MAX_STAGE = 15;
        this.stage     = startStage;

        initSpriteContainers(this);

        // ── Game state ────────────────────────────────────────
        this.attempts  = MAX_ATTEMPTS;
        this.score     = 0;
        this.highScore = parseInt(localStorage.getItem('finNFury_highScore') || '0');
        this.playerSize    = PLAYER_START_SIZE;
        this.hasPearlPower = false;
        this.pearlShotsLeft    = 0;        // shots remaining from current pearl
        this.pearlFireTimer    = 0;        // cooldown between shots
        this.gameOver      = false;

        this.stageTime    = 0;
        this.stageDamaged = false;
        this.comboCount   = 0;
        this.comboTimer   = 0;

        // ── Eaten / respawn state ─────────────────────────────
        this.isEaten        = false;   // showing eaten screen + countdown
        this.isRespawning   = false;   // Fin is falling in from top
        this.eatenTimer     = 0;       // counts down from RESPAWN_COUNTDOWN
        this.respawnTimer   = 0;       // counts up to RESPAWN_FALL_DURATION
        this.respawnTargetY = 0;       // world Y where Fin lands after fall
        this.respawnStartY  = 0;       // world Y at top of screen

        // Entity lists
        this.bgTinyfish     = [];
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
        this.particles      = [];
        this.bubbleTexts    = [];   // ← eat-bubble messages

        // Respawn tracking
        this.maxFuryfish     = 0;  // original spawn count
        this.maxEnemies      = 0;  // original spawn count
        this.furyfishRespawnTimer = 0;
        this.enemyRespawnTimer    = 0;

        this.boss         = null;
        this.bossDefeated = false;

        // Player
        this.fishX          = 0;
        this.fishY          = 0;
        this.fishVx         = 0;   // ← horizontal velocity, used by bubble-text facing
        this.fishMoving     = false;
        this.fishFacingLeft = true;
        this.fishAttacking  = false;
        this.lastAttackTime       = -100;
        this.lastEatTime          = -100;  // set by collisions, drives bite anim
        this.attackDuration       = 0.25;
        this.firedInCurrentAttack = false;
        this.projectileSpeed      = 480;

        // Timers
        this.elapsed  = 0;
        this.lastTime = performance.now();

        this.hitFlashTimer  = 0;
        this.damageCooldown = 0;

        this.stageClear      = false;
        this.stageClearTimer = 0;
        this.stageClearInfo  = null;

        this.stageIntroTimer  = 0;
        this.stageIntroActive = false;

        this.tryAgainButtonRect = null;
        this.continueButtonRect = null;

        // ── Pause / Settings ──────────────────────────────────
        this.isPaused      = false;
        this.showSettings  = false;
        this.settingsBtnRect = null;   // top-right gear button hit area
        this.resumeBtnRect   = null;   // "Resume" button on pause screen
        this.closeBtnRect    = null;   // "✕" on settings panel

        // Camera
        this.cam   = { x: 0, y: 0 };
        this.world = { w: 0, h: 0 };

        // Vertical offset applied to Fin's start Y and respawn target Y
        // so the play area sits lower inside the visible map circle.
        this.mapCircleYOffset = 200;  // plain number — NOT a function

        // ── Init ──────────────────────────────────────────────
        initAudio(this);
        this.bgm = this.bgm || null;  // set by initAudio
        loadSprites(this);
        initInput(this);
        this._initStage();

        requestAnimationFrame(ts => this._animate(ts));
    }

    // ── Stage setup ───────────────────────────────────────────
    _initStage() {
        const vW = window.innerWidth, vH = window.innerHeight;
        this.canvas.width  = Math.round(vW * this.dpr);
        this.canvas.height = Math.round(vH * this.dpr);
        this.canvas.style.width  = vW + 'px';
        this.canvas.style.height = vH + 'px';

        initCamera(this);

        // Player start position — apply mapCircleYOffset (number, not function)
        this.fishX = this.world.w / 2;
        this.fishY = this.world.h / 2 + this.mapCircleYOffset;

        // Camera centered on player
        this.cam.x = Math.max(0, Math.min(this.world.w - vW, this.fishX - vW / 2));
        this.cam.y = Math.max(0, Math.min(this.world.h - vH, this.fishY - vH / 2));

        this.projectiles    = [];
        this.floatingTexts  = [];
        this.bubbleTexts    = [];
        this.stageClear      = false;
        this.stageClearTimer = 0;
        this.stageClearInfo  = null;
        this.stageTime       = 0;
        this.stageDamaged    = false;
        this.comboCount      = 0;
        this.comboTimer      = 0;
        this.hasPearlPower   = false;
        this.pearlShotsLeft  = 0;
        this.pearlFireTimer  = 0;
        this.isEaten         = false;
        this.isRespawning    = false;
        this.eatenTimer      = 0;
        this.respawnTimer    = 0;
        this.damageCooldown  = 0;
        this.lastEatTime     = -100;
        this.fishVx          = 0;
        this.kingCrab        = null;
        this.kingCrabActive  = false;
        this.bossDefeated    = false;
        this.finHp           = FIN_MAX_HP;
        this.finMaxHp        = FIN_MAX_HP;

        // Reset respawn timers (start with full delay to prevent immediate respawning)
        this.furyfishRespawnTimer = FURYFISH_RESPAWN_DELAY;
        this.enemyRespawnTimer    = ENEMY_RESPAWN_DELAY;

        spawnStageEntities(this);
        spawnParticles(this);

        // Apply CSS background class for this stage
        applyBgClass(this);

        this.stageIntroActive = true;
        this.stageIntroTimer  = 2.8;
    }

    // ── Main loop ─────────────────────────────────────────────
    _animate(ts) {
        const dt = Math.min((ts - this.lastTime) / 1000, 0.05);
        this.lastTime = ts;
        this.elapsed += dt;
        this._lastDt = dt;   // stored so renderer can pass correct dt to drawBubbleTexts

        if (!this.gameOver && !this.stageClear && !this.isPaused) {
            this._update(dt);
        } else if (this.stageClear) {
            this.stageClearTimer += dt;
            if (this.stageClearTimer > 3.5) this._nextStage();
        }

        // drawFrame lives in renderer.js — it handles ALL canvas drawing
        drawFrame(this);

        // Overlays drawn on top
        if (this.gameOver)   drawGameOver(this);
        if (this.stageClear) drawStageClearScreen(this);
        if (this.isEaten)    drawEatenScreen(this);
        if (this.isPaused && !this.showSettings) drawPauseScreen(this);
        if (this.showSettings) drawSettingsPanel(this);

        requestAnimationFrame(ts2 => this._animate(ts2));
    }

    _update(dt) {
        this.stageTime += dt;
        this.fishMoving = false;

        // ── Eaten countdown ───────────────────────────────────
        if (this.isEaten) {
            this.eatenTimer -= dt;
            if (this.eatenTimer <= 0) {
                this._startRespawn();
            }
            return; // gameplay frozen during countdown
        }

        // ── Respawn fall animation ────────────────────────────
        if (this.isRespawning) {
            this.respawnTimer += dt;
            const t = Math.min(this.respawnTimer / RESPAWN_FALL_DURATION, 1.0);
            const eased = t * t;
            this.fishY = this.respawnStartY + (this.respawnTargetY - this.respawnStartY) * eased;
            updateCamera(this, dt);
            if (this.respawnTimer >= RESPAWN_FALL_DURATION) {
                this.isRespawning   = false;
                this.fishY          = this.respawnTargetY;
                this.damageCooldown = 2.0;
            }
            return;
        }

        if (this.comboTimer > 0) { this.comboTimer -= dt; if (this.comboTimer <= 0) this.comboCount = 0; }
        for (const c of this.clams) { if (c.openAnim > 0) c.openAnim -= dt * 2; }
        if (this.hitFlashTimer  > 0) this.hitFlashTimer  -= dt;
        if (this.damageCooldown > 0) this.damageCooldown -= dt;
        if (this.stageIntroActive) {
            this.stageIntroTimer -= dt;
            if (this.stageIntroTimer <= 0) this.stageIntroActive = false;
        }

        applyMouseMovement(this, dt);
        applyKeyboardMovement(this, dt);

        // Track fishVx (used by bubble-text to know which way Fin is facing)
        // fishFacingLeft is already maintained by the input system, so derive from it.
        this.fishVx = this.fishFacingLeft ? -1 : 1;

        // ── Player world-edge wrap (X axis) ───────────────────
        const wrapMargin = 40;
        if (this.fishX > this.world.w - wrapMargin) {
            this.fishX = wrapMargin + 10;
        } else if (this.fishX < wrapMargin) {
            this.fishX = this.world.w - wrapMargin - 10;
        }

        // Y stays clamped to world bounds — small margin so Fin can reach near top/bottom
        const marginY = 18;
        this.fishY = Math.max(marginY, Math.min(this.world.h - marginY, this.fishY));

        updateCamera(this, dt);
        this._handleAttack();
        this._updateProjectiles(dt);

        for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
            const ft = this.floatingTexts[i];
            ft.wy -= 65 * dt; ft.life -= dt;
            if (ft.life <= 0) this.floatingTexts.splice(i, 1);
        }

        updateEdibleFish(this, dt);
        updateFuryfish(this, dt);
        updateEnemies(this, dt);
        updateClams(this, dt);
        updateMantaRay(this, dt);
        if (this.boss && !this.bossDefeated) updateBoss(this, dt);
        checkKingCrabTrigger(this);
        if (this.kingCrab && !this.kingCrab.defeated) updateKingCrab(this, dt);

        checkCollisions(this);

        // Stage clears when all ENEMIES (furyfish + bgEnemies) and bosses are defeated.
        // Edible fish (clownfish, goldfish etc.) do NOT block stage progression.
        const bossOk     = !this.boss     || this.bossDefeated;
        const kingCrabOk = !this.kingCrab || this.kingCrab.defeated;
        const enemiesOk  = this.bgFuryfish.length === 0 && this.bgEnemies.length === 0;
        if (enemiesOk && bossOk && kingCrabOk && !this.stageClear) {
            this.stageClear      = true;
            this.stageClearTimer = 0;
            this._buildStageClearInfo();
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('finNFury_highScore', this.highScore.toString());
            }
        }
    }

    // ── Eaten / respawn ───────────────────────────────────────

    _startBeingEaten(fish) {
        if (this.isEaten || this.isRespawning) return;
        this.damageCooldown = 3.0;
        playSound(this, 'damage');
        this._triggerEaten();
    }

    _triggerEaten() {
        this.attempts--;
        this.stageDamaged  = true;
        this.hitFlashTimer = 0;

        if (this.attempts <= 0) {
            this.gameOver = true;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem('finNFury_highScore', this.highScore.toString());
            }
        } else {
            this.isEaten    = true;
            this.eatenTimer = RESPAWN_COUNTDOWN;
        }
    }

    _startRespawn() {
        const vH = this.canvas.height / this.dpr;
        this.isEaten      = false;
        this.isRespawning = true;
        this.respawnTimer = 0;

        this.fishX         = this.world.w / 2;
        this.respawnStartY  = this.cam.y - 80;
        this.respawnTargetY = this.cam.y + vH * 0.45;
        this.fishY         = this.respawnStartY;
        this.fishFacingLeft = true;
    }

    // ── Attack / projectiles ──────────────────────────────────
    _handleAttack() {
        if (!this.hasPearlPower) return;

        // Tick down the fire interval timer
        if (this.pearlFireTimer > 0) {
            this.pearlFireTimer -= this._lastDt || 0.016;
        }

        // Fire when: attack button held, interval elapsed, shots remaining
        if (this.fishAttacking && this.pearlFireTimer <= 0 && this.pearlShotsLeft > 0) {
            this._spawnProjectile();
            this.pearlFireTimer = PEARL_FIRE_INTERVAL;
            this.pearlShotsLeft--;
            this.lastAttackTime = this.elapsed;

            // Out of shots — pearl power expended
            if (this.pearlShotsLeft <= 0) {
                this.hasPearlPower  = false;
                this.pearlShotsLeft = 0;
                this._spawnFloatingText(this.fishX, this.fishY - 60, '🦪 PEARL SPENT — find a clam!', '#888888');
            }
        }
    }

    _spawnProjectile() {
        this.projectiles.push({
            x:  this.fishX + (this.fishFacingLeft ? -36 : 36),
            y:  this.fishY,
            vx: this.fishFacingLeft ? -this.projectileSpeed : this.projectileSpeed,
            vy: 0,
            frameOffset: Math.random() * 8,
        });
        playSound(this, 'shoot');
    }

    _updateProjectiles(dt) {
        const W = this.world.w, H = this.world.h;
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.x += p.vx * dt; p.y += p.vy * dt;
            if (p.x < -150 || p.x > W + 150 || p.y < -150 || p.y > H + 150)
                this.projectiles.splice(i, 1);
        }
    }

    // ── Score ─────────────────────────────────────────────────
    _addScore(amount) {
        this.score += amount;
        this.comboCount++;
        this.comboTimer = 2.0;
        if (this.comboCount === 2) this.score += 20;
        if (this.comboCount === 3) this.score += 50;
        if (this.comboCount === 5) this.score += 100;
    }

    _spawnFloatingText(wx, wy, text, color = '#ffd060') {
        this.floatingTexts.push({ wx, wy, text, color, life: 1.4, maxLife: 1.4 });
    }

    // ── Stage transitions ─────────────────────────────────────
    _buildStageClearInfo() {
        const stageBonus = this.stage * 300;
        const speedBonus = Math.max(0, 600 - Math.floor(this.stageTime) * 8);
        const noDmgBonus = this.stageDamaged ? 0 : 400;
        this.score += stageBonus + speedBonus + noDmgBonus;
        this.stageClearInfo = { stageBonus, speedBonus, noDmgBonus };
    }

    _nextStage() {
        if (this.stage >= this.MAX_STAGE) {
            this.stageClear = false;
            this.gameOver   = true;
            if (this.bgm) { this.bgm.pause(); this.bgm.currentTime = 0; }
            return;
        }
        this.stage++;
        this._initStage();
    }

    // ── Pause / Settings ──────────────────────────────────────
    _togglePause() {
        // Can't pause on game-over, stage-clear, or eaten screens
        if (this.gameOver || this.stageClear || this.isEaten) return;
        if (this.showSettings) { this.showSettings = false; this.isPaused = false; return; }
        this.isPaused = !this.isPaused;
        // Pause/resume BGM
        if (this.bgm) {
            if (this.isPaused) this.bgm.pause();
            else this.bgm.play().catch(() => {});
        }
    }

    _openSettings() {
        this.isPaused     = true;
        this.showSettings = true;
        if (this.bgm) this.bgm.pause();
    }

    _closeSettings() {
        this.showSettings = false;
        this.isPaused     = false;
        if (this.bgm) this.bgm.play().catch(() => {});
    }

    _restartGame() {
        this.score        = 0;
        this.attempts     = MAX_ATTEMPTS;
        this.stage        = 1;
        this.playerSize   = PLAYER_START_SIZE;
        this.gameOver     = false;
        this.stageClear   = false;
        this.isEaten      = false;
        this.isRespawning = false;
        this.particles    = [];
        this.bubbleTexts  = [];
        this.kingCrab     = null;
        this.kingCrabActive = false;
        this.bossDefeated = false;
        if (this.bgm) { this.bgm.currentTime = 0; this.bgm.play().catch(()=>{}); }
        this._initStage();
    }
}