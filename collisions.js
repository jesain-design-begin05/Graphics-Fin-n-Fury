/* ================================================================
   collisions.js

   Head-only collision:
   Eating/being-eaten only triggers when Fin's center touches the
   FRONT (mouth/head) of the fish — not its back or fins.
   The head is offset from the fish's world center by headFrac of
   its hitRadius in the direction the fish is facing (vx sign).
================================================================= */

// Fraction of hitRadius to offset toward the fish's head
const HEAD_FRAC = 0.55;

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
                game.playerSize = Math.min(game.playerSize + grow, 1.85);
                game.lastEatTime = game.elapsed;  // triggers bite animation in renderer
                playSound(game, 'eat');
            } else if (fishEatsFin) {
                // Fish eats Fin — start being-eaten animation, then trigger
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

function _checkBossContact(game, pr) {
    if (!game.boss || game.bossDefeated) return;
    const hitR = game.boss.isCharging ? 80 : FISH_DEF.boss.hitRadius;
    if (Math.hypot(game.fishX - game.boss.x, game.fishY - game.boss.y) < pr + hitR) {
        if (game.damageCooldown <= 0) {
            game._startBeingEaten(game.boss);
        }
    }
}

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

function _checkClamPickup(game, pr) {
    for (const clam of game.clams) {
        if (clam.hasPearl && !clam.pearlCollected) {
            if (Math.hypot(game.fishX - clam.x, game.fishY - clam.y) < pr + 36) {
                clam.hasPearl = false; clam.pearlCollected = true; clam.openAnim = 1.0;
                game.hasPearlPower = true;
                game._addScore(SCORE.PEARL);
                game._spawnFloatingText(clam.x, clam.y - 28, `🦪 PEARL POWER! +${SCORE.PEARL}`, '#00c8ff');
                playSound(game, 'collect');
            }
        }
    }
}

function _nudgeAway(f, ox, oy, dist) {
    const ang = Math.atan2(f.y - oy, f.x - ox);
    f.x += Math.cos(ang) * dist;
    f.y += Math.sin(ang) * dist;
}