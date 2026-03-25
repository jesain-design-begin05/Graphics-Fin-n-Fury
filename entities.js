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
        game.bgFuryfish.push(mkDef('furyfish', 0.05, 0.90, { isAttacking: false, chaseSpeed: 0 }));
    }
    for (let i = 0; i < (def.enemies || 0); i++) {
        game.bgEnemies.push(mkDef('enemy', 0.08, 0.88, { isAttacking: false }));
    }

    for (let i = 0; i < 2; i++) {
        game.clams.push({
            x: W * 0.12 + Math.random() * W * 0.76,
            y: H * 0.88 + Math.random() * H * 0.09,
            hasPearl: true, openAnim: 0, pearlCollected: false,
        });
    }

    spawnDecorations(game);

    if (def.hasBoss) {
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
//  Screen-edge wrap helper
//  Fish wrap at the viewport edges so they always pass through
//  the visible screen, appearing on the opposite side.
//  margin = how far off-screen before teleporting (px, world space)
// ────────────────────────────────────────────────────────────────

// ────────────────────────────────────────────────────────────────
//  Fish world-edge wrap
//  Fish exit the right edge of the WORLD → reappear at world left
//  Fish exit the left  edge of the WORLD → reappear at world right
//  This means as the camera pans, fish swim across the entire world
//  and always reappear on the opposite side.
// ────────────────────────────────────────────────────────────────

function _screenWrapX(f, game, margin = 60) {
    const W = game.world.w;

    if (f.vx > 0 && f.x > W - margin) {
        // Exited right world edge → reappear at left world edge
        f.x = margin + 10;
    } else if (f.vx < 0 && f.x < margin) {
        // Exited left world edge → reappear at right world edge
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
//  Decorations — static world props (boat, corals, seagrass, shadow)
//  Called once per stage from spawnStageEntities.
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
}