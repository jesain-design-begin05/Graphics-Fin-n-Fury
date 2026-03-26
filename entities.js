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
}

// ────────────────────────────────────────────────────────────────
//  Boss spawning — triggered when all edible fish are eaten
// ────────────────────────────────────────────────────────────────

function spawnBoss(game) {
    // Safety checks
    if (!game || !game.world) return;
    if (game.boss) return;  // Boss already exists
    
    const stageDef = STAGE_DEFS[game.stage];
    if (!stageDef || !stageDef.hasBoss) return;  // Stage doesn't have a boss
    
    const W = game.world.w;
    const H = game.world.h;
    
    if (W <= 0 || H <= 0) return;  // Invalid world dimensions
    
    game.boss = {
        type: 'abyss_monster_fish',
        x: W * 0.75, y: H * 0.40, vx: 0, vy: 0,
        hp: 15, maxHp: 15, 
        
        // ── Movement parameters ──────────────────────────
        moveTargetX: W * 0.75, moveTargetY: H * 0.40,  // Wanders to random positions
        moveTimer: 0,
        moveChangeInterval: 2.5,  // Changes movement target every 2.5 seconds
        
        // ── Attack parameters ────────────────────────────
        attackTimer: 0,
        attackInterval: 5.0,  // Attacks every ~5 seconds
        isAttacking: false,
        attackDuration: 0.8,
        mouthOpenDuration: 0.6,  // Duration of mouth opening/closing animation
        mouthOpenTimer: 0,
        mouthOpenAmount: 0,
        
        // ── Animation parameters ─────────────────────────
        frameOffset: 0, 
        bobOffset: Math.random() * Math.PI * 2,
        
        hitFlash: 0, 
        facingLeft: true,
        bossIntroTimer: 2.0,  // Time to intro the boss when first spawned
        bossIntroPhase: true,  // Track if still in intro phase
    };
    
    spawnDecorations(game);
}

// ────────────────────────────────────────────────────────────────

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
    
    // ── Boss intro phase (zoom out effect, no movement) ──────────
    if (b.bossIntroPhase) {
        b.bossIntroTimer -= dt;
        if (b.bossIntroTimer <= 0) {
            b.bossIntroPhase = false;
        }
        // No movement during intro
        return;
    }
    
    // ── Free movement: wanders to random positions ─────────────
    b.moveTimer += dt;
    if (b.moveTimer >= b.moveChangeInterval) {
        // Pick new random target
        b.moveTargetX = 150 + Math.random() * (W - 300);
        b.moveTargetY = 150 + Math.random() * (H - 300);
        b.moveTimer = 0;
    }
    
    // Move toward target smoothly
    const dx = b.moveTargetX - b.x;
    const dy = b.moveTargetY - b.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist > 20) {
        const speed = 80;  // Free movement at moderate speed
        b.vx = (dx / dist) * speed;
        b.vy = (dy / dist) * speed;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
    } else {
        b.vx *= 0.9;
        b.vy *= 0.9;
    }
    
    b.facingLeft = b.vx < 0;
    b.x = Math.max(80, Math.min(W - 80, b.x));
    b.y = Math.max(80, Math.min(H - 80, b.y));
    
    // ── Attack cycle (every ~5 seconds, attack towards player) ───
    b.attackTimer += dt;
    if (b.attackTimer >= b.attackInterval) {
        b.isAttacking = true;
        b.attackTimer = 0;
        b.mouthOpenTimer = 0;  // Start mouth animation
    }
    
    if (b.isAttacking) {
        // Mouth opening animation
        b.mouthOpenTimer += dt;
        if (b.mouthOpenTimer < b.mouthOpenDuration / 2) {
            // Open mouth
            b.mouthOpenAmount = (b.mouthOpenTimer / (b.mouthOpenDuration / 2));
        } else if (b.mouthOpenTimer < b.mouthOpenDuration) {
            // Close mouth
            b.mouthOpenAmount = 1 - ((b.mouthOpenTimer - b.mouthOpenDuration / 2) / (b.mouthOpenDuration / 2));
        } else {
            // Attack done
            b.isAttacking = false;
            b.mouthOpenAmount = 0;
        }
    }
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

// ────────────────────────────────────────────────────────────────
//  Decorations — static world props (boat, corals, seagrass,
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