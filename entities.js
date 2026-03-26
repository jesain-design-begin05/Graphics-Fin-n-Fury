/* ================================================================
   entities.js
   Spawning + per-frame NPC updates.

   WRAP BEHAVIOUR:
   Fish wrap at the screen/viewport edges, not the world edges.
   When a fish exits the right side of the screen it reappears
   at the left side (and vice versa), so they always pass through
   the visible play area and never disappear for long.
================================================================= */

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
    // Sheet: manta.png — 4 cols × 2 rows = 8 frames, faces LEFT naturally
    game.mantaRay = {
        x:          Math.random() * W,
        y:          H * 0.10 + Math.random() * H * 0.20, // 10%–30% down
        vx:         (Math.random() > 0.5 ? 1 : -1) * 55, // slow majestic glide
        bobOffset:  Math.random() * Math.PI * 2,
        frameCol:   0,
        frameRow:   0,
        frameTimer: 0,
        COLS: 4,         // 4 frames across
        ROWS: 2,         // 2 rows
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
    for (let i = 0; i < (def.enemies || 0); i++) {
        game.bgEnemies.push(mkDef('enemy', 0.08, 0.88, { isAttacking: false, hp: ENEMY_HP, maxHp: ENEMY_HP, hitFlash: 0 }));
    }

    for (let i = 0; i < 2; i++) {
        game.clams.push({
            x: W * 0.12 + Math.random() * W * 0.76,
            y: H * 0.88 + Math.random() * H * 0.09,
            hasPearl: true, openAnim: 0, pearlCollected: false,
            respawnTimer: 0,   // counts down after pearl is taken
        });
    }

    spawnDecorations(game);

    if (def.hasBoss) {
        // Stage 3 uses the King Crab — it appears ONLY after all edible fish are gone.
        // Other boss stages use the legacy furyfish-sheet boss that spawns immediately.
        if (game.stage === 3) {
            // King Crab will be created by triggerKingCrab() once the fish are cleared.
            game.boss         = null;
            game.kingCrab     = null;
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
//  Fish world-edge wrap
//  Fish exit the right edge of the WORLD → reappear at world left
//  Fish exit the left  edge of the WORLD → reappear at world right
// ────────────────────────────────────────────────────────────────

function _screenWrapX(f, game, margin = 60) {
    const W = game.world.w;

    if (f.vx > 0 && f.x > W - margin) {
        f.x = margin + 10;
    } else if (f.vx < 0 && f.x < margin) {
        f.x = W - margin - 10;
    }

    // Clamp Y to world bounds
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
}

function updateFuryfish(game, dt) {
    for (const f of game.bgFuryfish) {
        if (f._warnTimer > 0) f._warnTimer -= dt;
        if (f.hitFlash > 0)   f.hitFlash   -= dt;
        const onScreen = isOnScreen(game, f.x, f.y, 80);
        if (onScreen) {
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
        const onScreen = isOnScreen(game, f.x, f.y, 80);
        if (onScreen) {
            f.isAttacking = true;
            const dx  = game.fishX - f.x;
            const dy  = game.fishY - f.y;
            const ang = Math.atan2(dy, dx);
            f.vx = Math.cos(ang) * ENEMY_CHASE_SPEED;
            f.vy = Math.sin(ang) * ENEMY_CHASE_SPEED;
        } else {
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
        const dx   = game.fishX - b.x;
        const dy   = game.fishY - b.y;
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
//  Manta ray — slow gliding background creature, top/mid water
//  Sheet: manta.png — 4 cols × 2 rows = 8 frames, faces LEFT naturally
// ────────────────────────────────────────────────────────────────

function updateMantaRay(game, dt) {
    const m = game.mantaRay;
    if (!m) return;

    // Advance sprite frame every 0.12 s → ~8 fps animation
    m.frameTimer += dt;
    if (m.frameTimer >= 0.12) {
        m.frameTimer = 0;
        m.frameCol = (m.frameCol + 1) % m.COLS;
        // Advance row after each full column cycle (loops all 8 frames)
        if (m.frameCol === 0) m.frameRow = (m.frameRow + 1) % m.ROWS;
    }

    m.x += m.vx * dt;

    // World-edge wrap — same pattern as all other fish
    const margin = 80;
    if      (m.vx > 0 && m.x > game.world.w - margin) m.x = margin + 10;
    else if (m.vx < 0 && m.x < margin)                 m.x = game.world.w - margin - 10;
}

/**
 * Call this every frame from the main game loop (game._animate / updateGame).
 * Checks if Stage 3 edible fish are all gone and fires the King Crab entrance.
 */
function checkKingCrabTrigger(game) {
    if (game.stage !== 3) return;
    if (game.kingCrabActive) return;           // already triggered
    if (game.isEaten || game.isRespawning) return;

    const edibleCount = (game.bgTinyfish     ? game.bgTinyfish.length     : 0)
                      + (game.bgClownfish    ? game.bgClownfish.length    : 0)
                      + (game.bgGoldfish     ? game.bgGoldfish.length     : 0)
                      + (game.bgSecondfish   ? game.bgSecondfish.length   : 0)
                      + (game.bgTertiaryfish ? game.bgTertiaryfish.length : 0)
                      + (game.bgTunafish     ? game.bgTunafish.length     : 0);

    if (edibleCount === 0) {
        triggerKingCrab(game);
    }
}

// ────────────────────────────────────────────────────────────────
//  King Crab — Stage 3 boss
//  Sprite sheet: kingcrab.png — 4 cols × 4 rows
//    row 0 = idle/walk  row 1 = claw-swipe  row 2 = fire-burst  row 3 = hurt/death
//  Spawned only AFTER all edible fish are eaten (countEdible === 0).
//  Has its own HP system; hits Fin for HP damage (not instant death).
// ────────────────────────────────────────────────────────────────

const KC_COLS         = 4;
const KC_ROWS         = 4;
const KC_ROW_WALK     = 0;
const KC_ROW_CLAW     = 1;
const KC_ROW_FIRE     = 2;
const KC_ROW_HURT     = 3;

/**
 * Called once when all stage-3 fish are cleared.
 * Resets camera zoom, positions the crab, and initialises Fin HP.
 */
function triggerKingCrab(game) {
    if (game.kingCrabActive) return;
    game.kingCrabActive = true;

    // Reset camera zoom to default so the full arena is visible
    game.camZoom       = 1.0;
    game._targetZoom   = 1.0;

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
        clawCooldown: 0,        // time until next claw attack
        clawActive:   false,    // currently in claw-swipe animation
        clawTimer:    0,
        bobOffset:    Math.random() * Math.PI * 2,
        defeated:     false,
    };

    // Initialise Fin HP for the boss fight
    game.finHp    = FIN_MAX_HP;
    game.finMaxHp = FIN_MAX_HP;

    // Show dramatic intro text
    game._spawnFloatingText(W / 2, H / 2 - 100, '👑 KING CRAB APPEARS!', '#ff4040');
    game._spawnFloatingText(W / 2, H / 2 - 60,  'Shoot or outmanoeuvre it!', '#ffcc40');
}

function updateKingCrab(game, dt) {
    const kc = game.kingCrab;
    if (!kc || kc.defeated) return;

    const W = game.world.w;
    const H = game.world.h;

    // ── Hit flash decay ─────────────────────────────────────────
    if (kc.hitFlash > 0) kc.hitFlash -= dt;

    // ── Claw attack cooldown ────────────────────────────────────
    if (kc.clawCooldown > 0) kc.clawCooldown -= dt;

    // ── Claw-swipe animation phase ──────────────────────────────
    if (kc.clawActive) {
        kc.clawTimer -= dt;
        kc.frameRow   = KC_ROW_CLAW;
        if (kc.clawTimer <= 0) {
            kc.clawActive = false;
            kc.frameRow   = KC_ROW_WALK;
        }
    }

    // ── Frame animation (8 fps) ─────────────────────────────────
    kc.frameTimer += dt;
    if (kc.frameTimer >= 0.125) {
        kc.frameTimer = 0;
        kc.frameCol   = (kc.frameCol + 1) % KC_COLS;
    }

    // ── Movement — slow pursuit of Fin ──────────────────────────
    const dx   = game.fishX - kc.x;
    const dy   = game.fishY - kc.y;
    const dist = Math.hypot(dx, dy);

    if (!kc.clawActive) {
        const speed = FISH_DEF.kingCrab.speedMin + Math.sin(game.elapsed * 0.5) * 12;
        const ang   = Math.atan2(dy, dx);
        kc.vx = Math.cos(ang) * speed;
        kc.vy = Math.sin(ang) * speed;
        kc.facingLeft = kc.vx < 0;

        // Trigger claw swipe when close enough and cooldown expired
        if (dist < 180 && kc.clawCooldown <= 0) {
            kc.clawActive   = true;
            kc.clawTimer    = 0.7;           // animation duration
            kc.clawCooldown = KING_CRAB_COOLDOWN;
            kc.frameRow     = KC_ROW_CLAW;
            kc.frameCol     = 0;
        }
    } else {
        // Slow down during claw swipe
        kc.vx *= 0.85;
        kc.vy *= 0.85;
    }

    kc.x += kc.vx * dt;
    kc.y += kc.vy * dt;

    // World bounds clamp
    kc.x = Math.max(120, Math.min(W - 120, kc.x));
    kc.y = Math.max(80,  Math.min(H - 80,  kc.y));
}

// ────────────────────────────────────────────────────────────────
//  Clam respawn — after pearl is collected, clam reseals after CLAM_RESPAWN_TIME
// ────────────────────────────────────────────────────────────────

function updateClams(game, dt) {
    for (const clam of game.clams) {
        if (clam.pearlCollected) {
            clam.respawnTimer = (clam.respawnTimer || 0) + dt;
            if (clam.respawnTimer >= CLAM_RESPAWN_TIME) {
                clam.pearlCollected = false;
                clam.hasPearl       = true;
                clam.openAnim       = 0;
                clam.respawnTimer   = 0;
                game._spawnFloatingText(clam.x, clam.y - 40, '🦪 PEARL RESTORED!', '#00c8ff');
            }
        }
    }
}

//  seaweed, fish shadow).  Called once per stage from
//  spawnStageEntities.
// ────────────────────────────────────────────────────────────────

function spawnDecorations(game) {
    const W = game.world.w;
    const H = game.world.h;

    game.decoItems = [
        // One sunken boat in lower third
        { type: 'boat',       x: W * 0.18 + Math.random() * W * 0.64, y: H * 0.76 + Math.random() * H * 0.12, scale: 0.90 },
        // Coral clusters on sea floor
        { type: 'coral1',     x: W * 0.08 + Math.random() * W * 0.30, y: H * 0.88 + Math.random() * H * 0.06, scale: 0.70 },
        { type: 'coral1',     x: W * 0.55 + Math.random() * W * 0.35, y: H * 0.87 + Math.random() * H * 0.06, scale: 0.60 },
        { type: 'coral3',     x: W * 0.30 + Math.random() * W * 0.20, y: H * 0.89 + Math.random() * H * 0.05, scale: 0.65 },
        { type: 'coral3',     x: W * 0.72 + Math.random() * W * 0.20, y: H * 0.88 + Math.random() * H * 0.06, scale: 0.55 },
        // Seagrass patches along the floor
        { type: 'seagrass',   x: W * 0.12 + Math.random() * W * 0.18, y: H * 0.90, scale: 0.55 },
        { type: 'seagrass',   x: W * 0.40 + Math.random() * W * 0.22, y: H * 0.90, scale: 0.48 },
        { type: 'seagrass',   x: W * 0.65 + Math.random() * W * 0.22, y: H * 0.90, scale: 0.52 },
        // Large fish shadow drifting mid-water in background
        { type: 'fishshadow', x: W * 0.20 + Math.random() * W * 0.60, y: H * 0.38 + Math.random() * H * 0.20, scale: 1.10 },
    ];

    // ── Seaweed — 1 to 3 clumps per stage, random X along the floor ──
    const seaweedCount = 1 + Math.floor(Math.random() * 3); // 1, 2, or 3
    const zoneW = W / seaweedCount;
    for (let i = 0; i < seaweedCount; i++) {
        const zoneStart = zoneW * i;
        const safeStart = zoneStart + zoneW * 0.10;
        const safeRange = zoneW * 0.80;
        game.decoItems.push({
            type:  'seaweed',
            x:     safeStart + Math.random() * safeRange,
            y:     H * 0.88 + Math.random() * H * 0.05,
            scale: 0.55 + Math.random() * 0.25,
        });
    }
}