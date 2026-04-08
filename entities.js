/* ================================================================
   entities.js
   Spawning + per-frame NPC updates.

   WRAP BEHAVIOUR:
   Fish wrap at the screen/viewport edges, not the world edges.
   When a fish exits the right side of the screen it reappears
   at the left side (and vice versa), so they always pass through
   the visible play area and never disappear for long.
================================================================= */

const MANTA_SPEED = 55; // forward glide speed (px/s)

function makeFish(worldW, worldH, yMin, yMax, speedMin, speedMax, extra = {}) {
    return {
        x: Math.random() * worldW,
        y: worldH * yMin + Math.random() * worldH * (yMax - yMin),
        vx: (Math.random() > 0.5 ? 1 : -1) * (speedMin + Math.random() * (speedMax - speedMin)),
        vy: 0,
        frameOffset: Math.random() * 6,
        bobOffset:   Math.random() * Math.PI * 2,
        _warnTimer:  0,
        ...extra,
    };
}

// ────────────────────────────────────────────────────────────────
//  Spawning
// ────────────────────────────────────────────────────────────────

function spawnStageEntities(game) {
    const W   = game.world.w;
    const H   = game.world.h;
    const def = STAGE_DEFS[game.stage];

    game.bgTinyfish     = [];
    game.bgClownfish    = [];
    game.bgGoldfish     = [];
    game.bgSecondfish   = [];
    game.bgTertiaryfish = [];
    game.bgTunafish     = [];
    game.bgFuryfish     = [];
    game.bgEnemies      = [];
    game.clams          = [];
    game.boss           = null;
    game.bossDefeated   = false;

    // ── Manta ray — slow background glider, top/mid area ─────
    game.mantaRay = {
        x:          game.world.w + 300,
        y:          H * 0.10 + Math.random() * H * 0.20,
        vx:         -MANTA_SPEED,
        bobOffset:  Math.random() * Math.PI * 2,
        frameCol:   0,
        frameRow:   0,
        frameTimer: 0,
        COLS: 4,
        ROWS: 2,
    };

    const mkDef = (type, yMin, yMax, extra) => makeFish(
        W, H, yMin, yMax,
        FISH_DEF[type].speedMin, FISH_DEF[type].speedMax,
        { type, ...(extra || {}) }
    );
    for (let i = 0; i < (def.tinyfish    || 0); i++) game.bgTinyfish.push(    mkDef('tinyfish',  0.05, 0.90));
    for (let i = 0; i < (def.clownfish   || 0); i++) game.bgClownfish.push(   mkDef('clownfish', 0.04, 0.88));
    for (let i = 0; i < (def.goldfish    || 0); i++) game.bgGoldfish.push(    mkDef('goldfish',  0.06, 0.86));
    for (let i = 0; i < (def.secondfish  || 0); i++) game.bgSecondfish.push(  mkDef('secondfish',0.08, 0.84));
    for (let i = 0; i < (def.tertiaryfish|| 0); i++) game.bgTertiaryfish.push(mkDef('tertiary',  0.10, 0.82));
    for (let i = 0; i < (def.tunafish    || 0); i++) game.bgTunafish.push(    mkDef('tunafish',  0.12, 0.78));

    for (let i = 0; i < (def.furyfish || 0); i++) {
        game.bgFuryfish.push(mkDef('furyfish', 0.05, 0.90, { isAttacking: false, chaseSpeed: 0, hp: FURYFISH_HP, maxHp: FURYFISH_HP, hitFlash: 0 }));
    }

    {
        const stage        = game.stage;
        const giantCount   = Math.floor(stage / 3);
        const totalSlots   = stage;
        const regularCount = Math.max(0, totalSlots - giantCount * 2);

        for (let i = 0; i < regularCount; i++) {
            game.bgEnemies.push(mkDef('enemy', 0.08, 0.88, {
                isAttacking: false, hp: ENEMY_HP, maxHp: ENEMY_HP, hitFlash: 0,
            }));
        }
        for (let i = 0; i < giantCount; i++) {
            game.bgEnemies.push(mkDef('enemy', 0.06, 0.86, {
                isAttacking: false, hp: ENEMY_HP * 2, maxHp: ENEMY_HP * 2, hitFlash: 0,
                isGiant: true,
            }));
        }
    }

    game.maxFuryfish     = game.bgFuryfish.length;
    game.maxEnemies      = game.bgEnemies.length;

    game.maxTinyfish     = game.bgTinyfish.length;
    game.maxClownfish    = game.bgClownfish.length;
    game.maxGoldfish     = game.bgGoldfish.length;
    game.maxSecondfish   = game.bgSecondfish.length;
    game.maxTertiaryfish = game.bgTertiaryfish.length;
    game.maxTunafish     = game.bgTunafish.length;

    game.edibleRespawnTimers = {
        tinyfish:     0,
        clownfish:    0,
        goldfish:     0,
        secondfish:   0,
        tertiaryfish: 0,
        tunafish:     0,
    };

    for (let i = 0; i < 2; i++) {
        game.clams.push({
            x: W * 0.12 + Math.random() * W * 0.76,
            y: H * 0.92 + Math.random() * H * 0.03,
            hasPearl: true, openAnim: 0, pearlCollected: false,
            respawnTimer: 0,
        });
    }

    spawnDecorations(game);
    spawnAmbientBubbles(game);
    spawnAmbientSchools(game);
    spawnAmbientSilhouettes(game);

    if (def.hasBoss) {
        if (game.stage === 3) {
            game.boss           = null;
            game.kingCrab       = null;
            game.kingCrabActive = false;
        } else {
            game.boss = {
                type: 'boss',
                x: W * 0.75, y: H * 0.40, vx: -60, vy: 0,
                hp: 12, maxHp: 12, chargeTimer: 0,
                chargeCooldown: 4, chargeDuration: 0.7,
                isCharging: false, chargeVx: 0, chargeVy: 0,
                frameOffset: 0, bobOffset: Math.random() * Math.PI * 2,
                hitFlash: 0, facingLeft: true,
            };
        }
    }
}

function spawnParticles(game) {
    if (game.particles.length > 0) return;
    for (let i = 0; i < 80; i++) {
        game.particles.push({
            x: Math.random() * 3000, y: Math.random() * 3000,
            r: 0.5 + Math.random() * 1.5,
            speed: 0.2 + Math.random() * 0.5,
            phase: Math.random() * Math.PI * 2,
        });
    }
}

// ────────────────────────────────────────────────────────────────
//  Ambient rising bubbles
// ────────────────────────────────────────────────────────────────

function spawnAmbientBubbles(game) {
    const W = game.world.w;
    const H = game.world.h;
    game.ambientBubbles = Array.from({ length: 75 }, () => ({
        x:  Math.random() * W,
        y:  H * 0.3 + Math.random() * H * 0.7,
        r:  1.2 + Math.random() * 5.5,
        vy: 0.4 + Math.random() * 1.1,
        dx: (Math.random() - 0.5) * 0.3,
        a:  0.08 + Math.random() * 0.28,
        ph: Math.random() * Math.PI * 2,
    }));
}

// ────────────────────────────────────────────────────────────────
//  Ambient fish schools
// ────────────────────────────────────────────────────────────────

function _mkGameSchool(game) {
    const W = game.world.w;
    const H = game.world.h;
    const dir   = Math.random() > 0.5 ? 1 : -1;
    const count = 18 + Math.floor(Math.random() * 30);
    const cx    = dir === 1 ? -200 : W + 200;
    const cy    = H * 0.08 + Math.random() * H * 0.78;
    const spd   = 18 + Math.random() * 28;
    const spread = 90 + Math.random() * 120;
    const fish  = Array.from({ length: count }, () => ({
        ox: (Math.random() - 0.5) * spread,
        oy: (Math.random() - 0.5) * spread * 0.45,
        sz: 6 + Math.random() * 18,
        wobble:    Math.random() * Math.PI * 2,
        wobbleSpd: 0.8 + Math.random() * 0.6,
    }));
    return { cx, cy, dir, spd, fish, alpha: 0.06 + Math.random() * 0.12 };
}

function spawnAmbientSchools(game) {
    game.ambientSchools = Array.from({ length: 5 }, () => _mkGameSchool(game));
}

// ────────────────────────────────────────────────────────────────
//  Ambient fish silhouettes
// ────────────────────────────────────────────────────────────────

function _mkGameSilh(game) {
    const W = game.world.w;
    const H = game.world.h;
    const dir = Math.random() > 0.5 ? 1 : -1;
    return {
        x:   dir === 1 ? -100 : W + 100,
        y:   H * 0.1 + Math.random() * H * 0.8,
        sz:  10 + Math.random() * 28,
        vx:  (25 + Math.random() * 55) * dir,
        a:   0.03 + Math.random() * 0.07,
        dir,
    };
}

function spawnAmbientSilhouettes(game) {
    game.ambientSilhouettes = Array.from({ length: 7 }, () => _mkGameSilh(game));
}

// ────────────────────────────────────────────────────────────────
//  Per-frame update for all three ambient systems
// ────────────────────────────────────────────────────────────────

function updateAmbient(game, dt) {
    const W = game.world.w;
    const H = game.world.h;
    const e = game.elapsed;

    if (game.ambientBubbles) {
        for (const b of game.ambientBubbles) {
            b.y -= b.vy;
            b.x += b.dx + Math.sin(e * 1.2 + b.ph) * 0.18;
            if (b.y < -12) { b.y = H + 8; b.x = Math.random() * W; }
        }
    }

    if (game.ambientSchools) {
        for (let i = 0; i < game.ambientSchools.length; i++) {
            const s = game.ambientSchools[i];
            s.cx += s.spd * s.dir * dt;
            const gone = s.dir === 1 ? s.cx > W + 300 : s.cx < -300;
            if (gone) game.ambientSchools[i] = _mkGameSchool(game);
        }
    }

    if (game.ambientSilhouettes) {
        for (let i = 0; i < game.ambientSilhouettes.length; i++) {
            const f = game.ambientSilhouettes[i];
            f.x += f.vx * dt;
            const gone = (f.dir === 1 && f.x > W + 120) || (f.dir === -1 && f.x < -120);
            if (gone) game.ambientSilhouettes[i] = _mkGameSilh(game);
        }
    }
}

// ────────────────────────────────────────────────────────────────
//  Fish world-edge wrap
// ────────────────────────────────────────────────────────────────

function _screenWrapX(f, game, margin = 60) {
    const W = game.world.w;
    if (f.vx > 0 && f.x > W - margin) {
        f.x = margin + 10;
    } else if (f.vx < 0 && f.x < margin) {
        f.x = W - margin - 10;
    }
    f.y = Math.max(game.world.h * 0.03, Math.min(game.world.h * 0.97, f.y));
}

// ────────────────────────────────────────────────────────────────
//  Per-frame updates
// ────────────────────────────────────────────────────────────────

function updateEdibleFish(game, dt) {
    const tick = f => {
        f.x += f.vx * dt;
        if (f._warnTimer > 0) f._warnTimer -= dt;
        _screenWrapX(f, game);
    };
    for (const f of game.bgTinyfish)     tick(f);
    for (const f of game.bgClownfish)    tick(f);
    for (const f of game.bgGoldfish)     tick(f);
    for (const f of game.bgSecondfish)   tick(f);
    for (const f of game.bgTertiaryfish) tick(f);
    for (const f of game.bgTunafish)     tick(f);

    const EDIBLE_RESPAWN_DELAY = 4.0;
    const mkDef = (type, yMin, yMax) => makeFish(
        game.world.w, game.world.h, yMin, yMax,
        FISH_DEF[type].speedMin, FISH_DEF[type].speedMax,
        { type }
    );

    const t = game.edibleRespawnTimers;
    if (!t) return;

    const respawnOne = (arr, maxKey, type, yMin, yMax, timerKey) => {
        if (arr.length >= game[maxKey]) { t[timerKey] = 0; return; }
        t[timerKey] += dt;
        if (t[timerKey] >= EDIBLE_RESPAWN_DELAY) {
            arr.push(mkDef(type, yMin, yMax));
            t[timerKey] = 0;
        }
    };

    respawnOne(game.bgTinyfish,     'maxTinyfish',     'tinyfish',   0.05, 0.90, 'tinyfish');
    respawnOne(game.bgClownfish,    'maxClownfish',    'clownfish',  0.04, 0.88, 'clownfish');
    respawnOne(game.bgGoldfish,     'maxGoldfish',     'goldfish',   0.06, 0.86, 'goldfish');
    respawnOne(game.bgSecondfish,   'maxSecondfish',   'secondfish', 0.08, 0.84, 'secondfish');
    respawnOne(game.bgTertiaryfish, 'maxTertiaryfish', 'tertiary',   0.10, 0.82, 'tertiaryfish');
    respawnOne(game.bgTunafish,     'maxTunafish',     'tunafish',   0.12, 0.78, 'tunafish');
}

// ────────────────────────────────────────────────────────────────
//  Line-of-sight / field-of-view check
//  FOV_HALF_DEG = 100° — wide forward cone; behind the enemy = invisible
// ────────────────────────────────────────────────────────────────

const FOV_HALF_RAD = (100 * Math.PI) / 180;

/**
 * Returns true if Fin is inside the enemy's forward FOV cone.
 */
function _inFOV(f, targetX, targetY) {
    const dx = targetX - f.x;
    const dy = targetY - f.y;
    const toFinAngle  = Math.atan2(dy, dx);
    const facingAngle = f.vx >= 0 ? 0 : Math.PI;
    let delta = Math.abs(toFinAngle - facingAngle);
    if (delta > Math.PI) delta = 2 * Math.PI - delta;
    return delta <= FOV_HALF_RAD;
}

/**
 * Returns true when Fin is deep enough in the seafloor plant zone
 * (corals, seagrass, seaweed) to be hidden from enemies.
 * 82%+ world depth = inside the plant canopy = hidden.
 */
function _finIsHidden(game) {
    const yFrac = game.fishY / game.world.h;
    return yFrac >= 0.82;
}

function updateFuryfish(game, dt) {
    for (const f of game.bgFuryfish) {
        if (f._warnTimer > 0) f._warnTimer -= dt;
        if (f.hitFlash > 0)   f.hitFlash   -= dt;
        const onScreen   = isOnScreen(game, f.x, f.y, 80);
        const canSeesFin = onScreen && _inFOV(f, game.fishX, game.fishY) && !_finIsHidden(game);
        if (canSeesFin) {
            f.isAttacking = true;
            const dx   = game.fishX - f.x;
            const dy   = game.fishY - f.y;
            const dist = Math.hypot(dx, dy);
            const closeBonus = dist < 220 ? FURY_CLOSEIN_BONUS * (1 - dist / 220) : 0;
            const spd  = FURY_SCREEN_CHASE + closeBonus;
            const ang  = Math.atan2(dy, dx);
            f.vx = Math.cos(ang) * spd;
            f.vy = Math.sin(ang) * spd;
        } else {
            // Fin is off-screen, behind furyfish, or hidden in plants — patrol only
            f.isAttacking = false;
            f.vy *= 0.96;
            if (Math.abs(f.vx) < FURY_PATROL_SPEED) f.vx = (f.vx >= 0 ? 1 : -1) * FURY_PATROL_SPEED;
        }
        f.x += f.vx * dt; f.y += f.vy * dt;
        _screenWrapX(f, game);
    }
}

function updateEnemies(game, dt) {
    for (const f of game.bgEnemies) {
        if (f._warnTimer > 0) f._warnTimer -= dt;
        if (f.hitFlash > 0)   f.hitFlash   -= dt;
        const onScreen   = isOnScreen(game, f.x, f.y, 80);
        const canSeesFin = onScreen && _inFOV(f, game.fishX, game.fishY) && !_finIsHidden(game);
        if (canSeesFin) {
            f.isAttacking = true;
            const dx  = game.fishX - f.x;
            const dy  = game.fishY - f.y;
            const ang = Math.atan2(dy, dx);
            f.vx = Math.cos(ang) * ENEMY_CHASE_SPEED;
            f.vy = Math.sin(ang) * ENEMY_CHASE_SPEED;
        } else {
            // Fin is off-screen, behind enemy, or hidden in plants — patrol only
            f.isAttacking = false;
            f.vy *= 0.96;
            if (Math.abs(f.vx) < ENEMY_PATROL_SPEED) f.vx = (f.vx >= 0 ? 1 : -1) * ENEMY_PATROL_SPEED;
        }
        f.x += f.vx * dt; f.y += f.vy * dt;
        _screenWrapX(f, game);
    }
}

function updateBoss(game, dt) {
    const b = game.boss;
    const W = game.world.w;
    const H = game.world.h;
    if (b.hitFlash > 0) b.hitFlash -= dt;
    b.chargeTimer += dt;
    if (!b.isCharging) {
        // Boss only homes in on Fin if he isn't hidden in the plant canopy
        if (!_finIsHidden(game)) {
            b._lastKnownX = game.fishX;
            b._lastKnownY = game.fishY;
        }
        const tx   = b._lastKnownX ?? game.fishX;
        const ty   = b._lastKnownY ?? game.fishY;
        const dx   = tx - b.x;
        const dy   = ty - b.y;
        const dist = Math.hypot(dx, dy);
        b.vx += (dx / dist) * 50 * dt;
        b.vy += (dy / dist) * 50 * dt;
        b.vx *= 0.96; b.vy *= 0.96;
        const mag = Math.hypot(b.vx, b.vy);
        if (mag > 95) { b.vx = b.vx / mag * 95; b.vy = b.vy / mag * 95; }
        if (b.chargeTimer >= b.chargeCooldown) {
            b.isCharging = true; b.chargeTimer = 0;
            const ang = Math.atan2(dy, dx);
            b.chargeVx = Math.cos(ang) * 460;
            b.chargeVy = Math.sin(ang) * 460;
            game._spawnFloatingText(b.x, b.y - 80, '⚡ CHARGE!', '#ff4444');
        }
    } else {
        b.x += b.chargeVx * dt; b.y += b.chargeVy * dt;
        if (b.chargeTimer >= b.chargeDuration) {
            b.isCharging = false; b.chargeTimer = 0;
            b.vx = b.chargeVx * 0.1; b.vy = b.chargeVy * 0.1;
        }
    }
    if (!b.isCharging) { b.x += b.vx * dt; b.y += b.vy * dt; }
    b.facingLeft = b.vx < 0;
    b.x = Math.max(120, Math.min(W - 120, b.x));
    b.y = Math.max(120, Math.min(H - 120, b.y));
}

// ────────────────────────────────────────────────────────────────
//  Manta ray
// ────────────────────────────────────────────────────────────────

function updateMantaRay(game, dt) {
    const m = game.mantaRay;
    if (!m) return;

    m.frameTimer += dt;
    if (m.frameTimer >= 0.45) {
        m.frameTimer = 0;
        m.frameCol   = (m.frameCol + 1) % m.COLS;
        m.frameRow   = 0;
    }

    m.vx = -MANTA_SPEED;
    m.x += m.vx * dt;

    const img   = game.mantaRayImg;
    const halfW = img && img.complete && img.naturalWidth > 0
        ? (img.naturalWidth / m.COLS) * 5 / 2
        : 300;
    const worldW = game.world.w;

    if (m.x < -halfW) {
        m.x = worldW + halfW;
        m.y = game.world.h * 0.08 + Math.random() * game.world.h * 0.22;
    }
}

function checkKingCrabTrigger(game) {
    if (game.stage !== 3) return;
    if (game.kingCrabActive) return;
    if (game.isEaten || game.isRespawning) return;

    const edibleCount = (game.bgTinyfish     ? game.bgTinyfish.length     : 0)
                      + (game.bgClownfish    ? game.bgClownfish.length    : 0)
                      + (game.bgGoldfish     ? game.bgGoldfish.length     : 0)
                      + (game.bgSecondfish   ? game.bgSecondfish.length   : 0)
                      + (game.bgTertiaryfish ? game.bgTertiaryfish.length : 0)
                      + (game.bgTunafish     ? game.bgTunafish.length     : 0);

    if (edibleCount === 0) triggerKingCrab(game);
}

// ────────────────────────────────────────────────────────────────
//  King Crab — Stage 3 boss
// ────────────────────────────────────────────────────────────────

const KC_COLS     = 4;
const KC_ROWS     = 4;
const KC_ROW_WALK = 0;
const KC_ROW_CLAW = 1;
const KC_ROW_FIRE = 2;
const KC_ROW_HURT = 3;

function triggerKingCrab(game) {
    if (game.kingCrabActive) return;
    game.kingCrabActive = true;

    game.camZoom     = 1.0;
    game._targetZoom = 1.0;

    const W = game.world.w;
    const H = game.world.h;

    game.kingCrab = {
        x:            W * 0.75,
        y:            H * 0.55,
        vx:           -FISH_DEF.kingCrab.speedMin,
        vy:           0,
        hp:           10,
        maxHp:        10,
        facingLeft:   true,
        frameCol:     0,
        frameRow:     KC_ROW_WALK,
        frameTimer:   0,
        hitFlash:     0,
        clawCooldown: 0,
        clawActive:   false,
        clawTimer:    0,
        bobOffset:    Math.random() * Math.PI * 2,
        defeated:     false,
    };

    game.finHp    = FIN_MAX_HP;
    game.finMaxHp = FIN_MAX_HP;

    game._spawnFloatingText(W / 2, H / 2 - 100, '👑 KING CRAB APPEARS!', '#ff4040');
    game._spawnFloatingText(W / 2, H / 2 - 60,  'Shoot or outmanoeuvre it!', '#ffcc40');
}

function updateKingCrab(game, dt) {
    const kc = game.kingCrab;
    if (!kc || kc.defeated) return;

    const W = game.world.w;
    const H = game.world.h;

    if (kc.hitFlash > 0) kc.hitFlash -= dt;
    if (kc.clawCooldown > 0) kc.clawCooldown -= dt;

    if (kc.clawActive) {
        kc.clawTimer -= dt;
        kc.frameRow   = KC_ROW_CLAW;
        if (kc.clawTimer <= 0) {
            kc.clawActive = false;
            kc.frameRow   = KC_ROW_WALK;
        }
    }

    kc.frameTimer += dt;
    if (kc.frameTimer >= 0.125) {
        kc.frameTimer = 0;
        kc.frameCol   = (kc.frameCol + 1) % KC_COLS;
    }

    // ── Movement — loses target when Fin hides in plants ────────
    if (!_finIsHidden(game)) {
        kc._lastKnownX = game.fishX;
        kc._lastKnownY = game.fishY;
    }
    const kcTX = kc._lastKnownX ?? game.fishX;
    const kcTY = kc._lastKnownY ?? game.fishY;
    const dx   = kcTX - kc.x;
    const dy   = kcTY - kc.y;
    const dist = Math.hypot(dx, dy);

    if (!kc.clawActive) {
        const speed = FISH_DEF.kingCrab.speedMin + Math.sin(game.elapsed * 0.5) * 12;
        const ang   = Math.atan2(dy, dx);
        kc.vx = Math.cos(ang) * speed;
        kc.vy = Math.sin(ang) * speed;
        kc.facingLeft = kc.vx < 0;

        if (dist < 180 && kc.clawCooldown <= 0) {
            kc.clawActive   = true;
            kc.clawTimer    = 0.7;
            kc.clawCooldown = KING_CRAB_COOLDOWN;
            kc.frameRow     = KC_ROW_CLAW;
            kc.frameCol     = 0;
        }
    } else {
        kc.vx *= 0.85;
        kc.vy *= 0.85;
    }

    kc.x += kc.vx * dt;
    kc.y += kc.vy * dt;
    kc.x = Math.max(120, Math.min(W - 120, kc.x));
    kc.y = Math.max(80,  Math.min(H - 80,  kc.y));
}

// ────────────────────────────────────────────────────────────────
//  Clam respawn
// ────────────────────────────────────────────────────────────────

function updateClams(game, dt) {
    const W = game.world.w;
    const H = game.world.h;
    for (const clam of game.clams) {
        if (clam.pearlCollected) {
            clam.respawnTimer = (clam.respawnTimer || 0) + dt;
            if (clam.respawnTimer >= CLAM_RESPAWN_TIME) {
                clam.x              = W * 0.12 + Math.random() * W * 0.76;
                clam.y              = H * 0.88 + Math.random() * H * 0.09;
                clam.pearlCollected = false;
                clam.hasPearl       = true;
                clam.openAnim       = 0;
                clam.respawnTimer   = 0;
                game._spawnFloatingText(clam.x, clam.y - 40, '🦪 PEARL RESTORED!', '#00c8ff');
            }
        }
    }
}

// ────────────────────────────────────────────────────────────────
//  Decorations — spawned once per stage from spawnStageEntities.
// ────────────────────────────────────────────────────────────────

function spawnDecorations(game) {
    const W = game.world.w;
    const H = game.world.h;

    // FLOOR_Y    — boat and surface decorations
    // FLOOR_Y_DEEP — coral/rock bases right at/just below the visual floor
    const FLOOR_Y      = H * 0.96;
    const FLOOR_Y_DEEP = H * 1.01;   // FIX: was 1.01 — putting items below world, invisible

    const pathIndex   = Math.floor((game.stage - 1) / 3);
    const stageInPath = (game.stage - 1) % 3;
    const rockImgIndex = pathIndex <= 1 ? pathIndex * 3 + stageInPath : -1;

    // ── Load all decoration images once (guard prevents re-creation each stage) ──
    const loadOnce = (prop, src) => {
        if (!game[prop] || game[prop]._src !== src) {
            const img = new Image();
            img.src  = src;
            img._src = src;
            game[prop] = img;
        }
    };
    loadOnce('decoSeagrass',   'backgrounds_new/seagras.png');
    loadOnce('decoSeaweed',    'backgrounds_new/seaweed_sprite.png');
    loadOnce('decoCoral3',     'backgrounds_new/coral3.png');
    loadOnce('decoCoral1',     'backgrounds_new/coral1.png');
    loadOnce('decoBoat',       'backgrounds_new/boat.png');
    loadOnce('decoFishShadow', 'fishshadow.png');
    loadOnce('decoTallRock',   'backgrounds_new/tall_rock.png');
    loadOnce('decoHugeRock',   'backgrounds_new/huge_rock.png');
    loadOnce('decoStone',      'backgrounds_new/stone.png');
    loadOnce('decoStone1',     'backgrounds_new/stone1.png');
    loadOnce('decoStone2',     'backgrounds_new/stone2.png');

    game.decoItems = [
        // ── Rock seabed backdrop ────────────────────────────────
        ...(rockImgIndex >= 0 ? [{
            type:      'rock',
            x:         W / 2,
            y:         H * 1,
            rockIndex: rockImgIndex,
        }] : []),

        // ── Sunken boat ─────────────────────────────────────────
        {
            type:  'boat',
            x:     W * 0.18 + Math.random() * W * 0.64,
            y:     FLOOR_Y + 1.01,
            scale: 3,
        },

        // ── Coral clusters (coral1) ─────────────────────────────
        { type: 'coral1', x: W * 0.10 + Math.random() * W * 0.20, y: FLOOR_Y_DEEP, scale: 0.45 },
        { type: 'coral1', x: W * 0.45 + Math.random() * W * 0.25, y: FLOOR_Y_DEEP, scale: 0.40 },
        { type: 'coral1', x: W * 0.65 + Math.random() * W * 0.22, y: FLOOR_Y_DEEP, scale: 0.40 },
        { type: 'coral1', x: W * 0.35 + Math.random() * W * 0.35, y: FLOOR_Y_DEEP, scale: 0.40 },
        { type: 'coral1', x: W * 0.55 + Math.random() * W * 0.25, y: FLOOR_Y_DEEP, scale: 0.40 },
        { type: 'coral1', x: W * 0.20 + Math.random() * W * 0.15, y: FLOOR_Y_DEEP, scale: 0.38 },
        { type: 'coral1', x: W * 0.75 + Math.random() * W * 0.15, y: FLOOR_Y_DEEP, scale: 0.38 },

        // coral3, seagrass, seaweed — drawn by drawGameSeaFloor() drawPlant() system

        // ── Fish shadow — drifts mid-water ──────────────────────
        {
            type:  'fishshadow',
            x:     W * 0.20 + Math.random() * W * 0.60,
            y:     H * 0.42 + Math.random() * H * 0.15,
            scale: 1.10,
            vx:    (Math.random() > 0.5 ? 1 : -1) * (25 + Math.random() * 20),
        },
    ];

    // ── Path 1 floor rock scatter ─────────────────────────────
    if (pathIndex === 0) {
        const FLOOR = H * 0.97;   // FIX: was H*1 — put rocks at world bottom, now at visible floor

        // huge_rock: 2-3 spread across floor
        const hugeCount = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < hugeCount; i++) {
            game.decoItems.push({
                type:  'huge_rock',
                x:     W * (0.05 + i * (0.88 / hugeCount)) + Math.random() * W * 0.14,
                y:     FLOOR_Y_DEEP,
                scale: 0.45 + Math.random() * 0.20,
            });
        }

        // small stones: 4-7 randomly scattered
        const stoneTypes = ['stone', 'stone1', 'stone2'];
        const stoneCount = 4 + Math.floor(Math.random() * 4);
        for (let i = 0; i < stoneCount; i++) {
            game.decoItems.push({
                type:  stoneTypes[Math.floor(Math.random() * stoneTypes.length)],
                x:     Math.random() * W * 0.92 + W * 0.04,
                y:     FLOOR_Y_DEEP + 25,
                scale: 0.22 + Math.random() * 0.18,
            });
        }

        // tall_rock: only on stage 3 of path 1 (stageInPath === 2)
        if (stageInPath === 2) {
            const tallCount = 3 + Math.floor(Math.random() * 3);
            for (let i = 0; i < tallCount; i++) {
                game.decoItems.push({
                    type:  'tall_rock',
                    x:     W * (0.08 + i * (0.84 / tallCount)) + Math.random() * W * 0.08,
                    y:     FLOOR_Y_DEEP,
                    scale: 0.55 + Math.random() * 0.30,
                });
            }
        }
    }
}