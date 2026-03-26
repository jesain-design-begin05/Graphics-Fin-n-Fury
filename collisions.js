/* ================================================================
   collisions.js

   Head-only collision:
   Eating/being-eaten only triggers when Fin's center touches the
   FRONT (mouth/head) of the fish — not its back or fins.
   The head is offset from the fish's world center by headFrac of
   its hitRadius in the direction the fish is facing (vx sign).

   Bubble text:
   Random colourful speech-bubble messages (YUM, CHOMP, etc.)
   pop up RIGHT AT FIN'S MOUTH whenever he eats a fish, then
   float upward and fade out.
================================================================= */

// Fraction of hitRadius to offset toward the fish's head
const HEAD_FRAC = 0.55;

// ── Bubble-text phrases & colours ─────────────────────────────
const EAT_PHRASES = [
    "YUM!", "CHOMP!", "NOMNOMNOM!", "GULP!",
    "DELISH!", "WOMP!", "TASTY!", "BURP!",
    "CRUNCH!", "MUNCH!", "SO GOOD!", "SNACK TIME!"
];
const EAT_COLORS = [
    "#ff6b35", "#f7c948", "#4ecdc4", "#ff6b9d",
    "#a8e063", "#ff4f00", "#00c8ff", "#c77dff"
];

// ── Spawn a bubble-text entry AT FIN'S MOUTH ──────────────────
/**
 * Pushes a new speech-bubble message into game.bubbleTexts.
 * Spawns right at Fin's mouth (front of Fin, in facing direction).
 *
 * @param {object} game  - the main game state object
 * @param {number} finX  - Fin's current world X
 * @param {number} finY  - Fin's current world Y
 * @param {number} finVx - Fin's current horizontal velocity (for facing direction)
 * @param {number} pr    - Fin's current hit radius (to offset to mouth tip)
 */
function _spawnBubbleText(game, finX, finY, finVx, pr) {
    const phrase = EAT_PHRASES[Math.floor(Math.random() * EAT_PHRASES.length)];
    const color  = EAT_COLORS [Math.floor(Math.random() * EAT_COLORS.length)];

    // Offset to Fin's mouth tip in the direction he is facing
    const dir    = (finVx ?? 1) >= 0 ? 1 : -1;
    const mouthX = finX + dir * pr * 1.4;  // just ahead of Fin's nose
    const mouthY = finY - 35;              // slightly above body so it's readable

    game.bubbleTexts = game.bubbleTexts || [];
    game.bubbleTexts.push({
        x:      mouthX,
        y:      mouthY,
        phrase,
        color,
        life:   1.0,   // counts down 1 → 0
        vy:    -0.8,   // floats upward each frame
    });
}

// ── Draw all active bubble texts ──────────────────────────────
/**
 * Call this from your main render / draw loop AFTER drawing fish.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} game
 * @param {number} dt   - delta time in seconds (e.g. 0.016 for 60 fps)
 */
function drawBubbleTexts(ctx, game, dt) {
    if (!game.bubbleTexts || game.bubbleTexts.length === 0) return;

    ctx.save();
    ctx.font = "bold 18px 'Comic Sans MS', cursive";

    for (let i = game.bubbleTexts.length - 1; i >= 0; i--) {
        const b = game.bubbleTexts[i];

        // Advance animation
        b.life -= dt * 0.85;   // lower = lingers longer; raise = disappears faster
        b.y    += b.vy;

        if (b.life <= 0) {
            game.bubbleTexts.splice(i, 1);
            continue;
        }

        // Fade out during the last 40 % of life
        const alpha = Math.min(1, b.life / 0.4);
        ctx.globalAlpha = alpha;

        // Bubble dimensions
        const tw    = ctx.measureText(b.phrase).width;
        const padX  = 14;
        const bw    = tw + padX * 2;
        const bh    = 36;
        const bx    = b.x - bw / 2;
        const by    = b.y - bh / 2;
        const r     = 12;    // corner radius
        const tailH = 11;    // tail pointer height

        // ── Rounded bubble with downward tail ──────────────────
        ctx.beginPath();

        // Top edge
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by,      bx + bw, by + r);

        // Right edge down
        ctx.lineTo(bx + bw, by + bh - r);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);

        // Bottom edge + tail pointing down toward Fin
        ctx.lineTo(b.x + 7,  by + bh);
        ctx.lineTo(b.x,      by + bh + tailH);  // tail tip
        ctx.lineTo(b.x - 12, by + bh);
        ctx.lineTo(bx + r,   by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);

        // Left edge up
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);

        ctx.closePath();

        // Filled bubble
        ctx.fillStyle = b.color;
        ctx.fill();

        // Soft dark outline
        ctx.strokeStyle = "rgba(0,0,0,0.30)";
        ctx.lineWidth   = 2.5;
        ctx.stroke();

        // Shiny highlight strip on top half
        ctx.save();
        ctx.clip();
        const shine = ctx.createLinearGradient(bx, by, bx, by + bh * 0.55);
        shine.addColorStop(0, "rgba(255,255,255,0.38)");
        shine.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = shine;
        ctx.fillRect(bx, by, bw, bh);
        ctx.restore();

        // ── Phrase text ────────────────────────────────────────
        ctx.fillStyle    = "#ffffff";
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";

        // Drop shadow for readability
        ctx.shadowColor   = "rgba(0,0,0,0.50)";
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.shadowBlur    = 3;

        ctx.fillText(b.phrase, b.x, b.y);

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur  = 0;
    }

    ctx.globalAlpha = 1;
    ctx.restore();
}

// ─────────────────────────────────────────────────────────────
// Head helper
// ─────────────────────────────────────────────────────────────

/**
 * Returns the world position of a fish's head (mouth end).
 * Fish face the direction they're moving (vx).
 */
function _fishHead(f, fishR) {
    const dir = f.vx >= 0 ? 1 : -1;
    return {
        x: f.x + dir * fishR * HEAD_FRAC,
        y: f.y,
    };
}

// ─────────────────────────────────────────────────────────────
// Main collision entry point
// ─────────────────────────────────────────────────────────────

function checkCollisions(game) {
    if (game.isEaten || game.isRespawning) return;
    const pr   = Math.min(PLAYER_HIT_BASE * game.playerSize, 40);
    const rank = playerSizeRank(game.playerSize);

    _checkEatFish(game, pr, rank);
    _checkEnemyContact(game, pr);
    _checkBossContact(game, pr);
    _checkProjectileHits(game);
    _checkClamPickup(game, pr);
}

// ─────────────────────────────────────────────────────────────
// Eat fish
// ─────────────────────────────────────────────────────────────

function _checkEatFish(game, pr, rank) {
    const tryEat = (arr, fishR, pts, grow, reqRank, fishEatsFin) => {
        for (let i = arr.length - 1; i >= 0; i--) {
            const f    = arr[i];
            // Use head position — only the mouth end triggers eat/be-eaten
            const head = _fishHead(f, fishR);
            const dist = Math.hypot(game.fishX - head.x, game.fishY - head.y);
            if (dist >= pr + fishR * 0.5) continue;

            if (rank >= reqRank) {
                // Fin eats this fish
                arr.splice(i, 1);
                game._addScore(pts);
                game._spawnFloatingText(f.x, f.y, `+${pts}`);
                game.playerSize  = Math.min(game.playerSize + grow, 1.85);
                game.lastEatTime = game.elapsed;  // triggers bite animation in renderer

                // ── Bubble text RIGHT at Fin's mouth ──────────
                // Try every common velocity variable name as a fallback chain.
                const finVx = game.fishVx ?? game.vx ?? game.playerVx ?? game.velX ?? 1;
                _spawnBubbleText(game, game.fishX, game.fishY, finVx, pr);

                playSound(game, 'eat');
            } else if (fishEatsFin) {
                // Fish eats Fin — start being-eaten animation
                if (game.damageCooldown <= 0) {
                    game._startBeingEaten(f);
                }
            }
            // (no push-back — _startBeingEaten handles the state freeze)
        }
    };

    tryEat(game.bgTinyfish,
        FISH_DEF.tinyfish.hitRadius,   SCORE.TINY,   GROW.TINY,   0,
        FISH_DEF.tinyfish.eatsFin);

    tryEat(game.bgClownfish,
        FISH_DEF.clownfish.hitRadius,  SCORE.SMALL,  GROW.SMALL,  1,
        FISH_DEF.clownfish.eatsFin);

    tryEat(game.bgGoldfish,
        FISH_DEF.goldfish.hitRadius,   SCORE.SMALL,  GROW.SMALL,  1,
        FISH_DEF.goldfish.eatsFin);

    tryEat(game.bgSecondfish,
        FISH_DEF.secondfish.hitRadius, SCORE.MEDIUM, GROW.MEDIUM, 2,
        FISH_DEF.secondfish.eatsFin);

    tryEat(game.bgTertiaryfish,
        FISH_DEF.tertiary.hitRadius,   SCORE.MEDIUM, GROW.MEDIUM, 2,
        FISH_DEF.tertiary.eatsFin);

    tryEat(game.bgTunafish,
        FISH_DEF.tunafish.hitRadius,   SCORE.LARGE,  GROW.LARGE,  3,
        FISH_DEF.tunafish.eatsFin);
}

// ─────────────────────────────────────────────────────────────
// Enemy contact
// ─────────────────────────────────────────────────────────────

function _checkEnemyContact(game, pr) {
    for (let i = 0; i < game.bgFuryfish.length; i++) {
        const f    = game.bgFuryfish[i];
        const head = _fishHead(f, FISH_DEF.furyfish.hitRadius);
        if (Math.hypot(game.fishX - head.x, game.fishY - head.y) < pr + FISH_DEF.furyfish.hitRadius * 0.5) {
            if (game.damageCooldown <= 0) {
                game._startBeingEaten(f);
                _nudgeAway(f, game.fishX, game.fishY, 120);
            }
        }
    }
    for (let i = 0; i < game.bgEnemies.length; i++) {
        const f    = game.bgEnemies[i];
        const head = _fishHead(f, FISH_DEF.enemy.hitRadius);
        if (Math.hypot(game.fishX - head.x, game.fishY - head.y) < pr + FISH_DEF.enemy.hitRadius * 0.5) {
            if (game.damageCooldown <= 0) {
                game._startBeingEaten(f);
                _nudgeAway(f, game.fishX, game.fishY, 110);
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Boss contact
// ─────────────────────────────────────────────────────────────

function _checkBossContact(game, pr) {
    if (!game.boss || game.bossDefeated) return;
    const hitR = game.boss.isCharging ? 80 : FISH_DEF.boss.hitRadius;
    if (Math.hypot(game.fishX - game.boss.x, game.fishY - game.boss.y) < pr + hitR) {
        if (game.damageCooldown <= 0) {
            game._startBeingEaten(game.boss);
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Projectile hits
// ─────────────────────────────────────────────────────────────

function _checkProjectileHits(game) {
    for (let i = game.projectiles.length - 1; i >= 0; i--) {
        const p = game.projectiles[i];
        let hit = false;

        for (let j = game.bgFuryfish.length - 1; j >= 0; j--) {
            if (Math.hypot(p.x - game.bgFuryfish[j].x, p.y - game.bgFuryfish[j].y) < 48) {
                game._addScore(SCORE.POISON);
                game._spawnFloatingText(game.bgFuryfish[j].x, game.bgFuryfish[j].y, `+${SCORE.POISON}`, '#ff4f00');
                game.bgFuryfish.splice(j, 1);
                game.projectiles.splice(i, 1);
                playSound(game, 'shootHit');
                hit = true; break;
            }
        }
        if (hit) continue;

        for (let j = game.bgEnemies.length - 1; j >= 0; j--) {
            if (Math.hypot(p.x - game.bgEnemies[j].x, p.y - game.bgEnemies[j].y) < 48) {
                game._addScore(SCORE.ENEMY);
                game._spawnFloatingText(game.bgEnemies[j].x, game.bgEnemies[j].y, `+${SCORE.ENEMY}`, '#ff8800');
                game.bgEnemies.splice(j, 1);
                game.projectiles.splice(i, 1);
                playSound(game, 'shootHit');
                hit = true; break;
            }
        }
        if (hit) continue;

        if (game.boss && !game.bossDefeated) {
            if (Math.hypot(p.x - game.boss.x, p.y - game.boss.y) < 78) {
                game.boss.hp--;
                game.boss.hitFlash = 0.18;
                game.projectiles.splice(i, 1);
                game._addScore(SCORE.BOSS_HIT);
                game._spawnFloatingText(game.boss.x, game.boss.y - 55, `HIT! +${SCORE.BOSS_HIT}`, '#ff4f00');
                playSound(game, 'shootHit');
                if (game.boss.hp <= 0) {
                    game.bossDefeated = true;
                    game._addScore(SCORE.BOSS_KILL);
                    game._spawnFloatingText(game.boss.x, game.boss.y - 90, `BOSS DOWN! +${SCORE.BOSS_KILL}`, '#ffd060');
                }
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Clam / pearl pickup
// ─────────────────────────────────────────────────────────────

function _checkClamPickup(game, pr) {
    for (const clam of game.clams) {
        if (clam.hasPearl && !clam.pearlCollected) {
            if (Math.hypot(game.fishX - clam.x, game.fishY - clam.y) < pr + 36) {
                clam.hasPearl        = false;
                clam.pearlCollected  = true;
                clam.openAnim        = 1.0;
                game.hasPearlPower   = true;
                game._addScore(SCORE.PEARL);
                game._spawnFloatingText(clam.x, clam.y - 28, `🦪 PEARL POWER! +${SCORE.PEARL}`, '#00c8ff');
                playSound(game, 'collect');
            }
        }
    }
}

// ─────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────

function _nudgeAway(f, ox, oy, dist) {
    const ang = Math.atan2(f.y - oy, f.x - ox);
    f.x += Math.cos(ang) * dist;
    f.y += Math.sin(ang) * dist;
}