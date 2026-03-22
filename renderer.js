/* ================================================================
   renderer.js  —  All canvas drawing for GameSystem
================================================================= */

// ────────────────────────────────────────────────────────────────
//  Master draw call  (called every frame from game._animate)
// ────────────────────────────────────────────────────────────────

function drawFrame(game) {
    const { ctx, canvas, dpr } = game;
    const vW = canvas.width  / dpr;
    const vH = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, vW, vH);

    const bgIdx = Math.min(game.stage, 5);

    // ── Background stretched over full world (Feeding Frenzy style) ──
    const bg = game.bgImages[bgIdx];
    if (bg && bg.complete && bg.naturalWidth !== 0) {
        ctx.drawImage(bg,
            -game.cam.x, -game.cam.y,
            game.world.w, game.world.h
        );
    } else {
        // Fallback: vivid ocean gradient (NOT near-black)
        const g = ctx.createLinearGradient(0, 0, 0, vH);
        g.addColorStop(0,   '#003a6e');
        g.addColorStop(0.5, '#005a9e');
        g.addColorStop(1,   '#007abf');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, vW, vH);
    }

    drawAtmosphere(game, ctx, vW, vH);
    drawDecorations(game, ctx);
    drawBgFish(game, ctx);
    drawBoss(game, ctx);
    drawCollectibles(game, ctx);
    drawProjectiles(game, ctx);
    drawPlayerFish(game, ctx);
    drawFloatingTexts(game, ctx);

    // ── Foreground layer (parallax) ──
    const fg = game.fgImages[bgIdx];
    if (fg && fg.complete && fg.naturalWidth !== 0) {
        ctx.save();
        ctx.globalAlpha = 0.88;
        ctx.drawImage(fg,
            -game.cam.x * 1.08, -game.cam.y * 1.08,
            game.world.w * 1.08, game.world.h * 1.08
        );
        ctx.restore();
    }

    drawHUD(game, ctx, vW, vH);
    drawHitFlash(game, ctx, vW, vH);
    drawStageIntro(game, ctx, vW, vH);

    ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  Atmosphere + marine snow
// ────────────────────────────────────────────────────────────────

function drawAtmosphere(game, ctx, W, H) {
    const e = game.elapsed;
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (let i = 0; i < 5; i++) {
        const sx = W * (0.1 + i * 0.2);
        const sh = Math.sin(e * 0.5 + i) * 25;
        const gr = ctx.createLinearGradient(sx + sh, 0, sx + sh, H);
        gr.addColorStop(0,   `rgba(100,210,255,${0.06 + Math.sin(e + i) * 0.02})`);
        gr.addColorStop(0.8, 'rgba(0,50,100,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.moveTo(sx + sh - 18, 0); ctx.lineTo(sx + sh + 18, 0);
        ctx.lineTo(sx + sh + 130, H); ctx.lineTo(sx + sh - 130, H);
        ctx.fill();
    }
    ctx.restore();

    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    for (const p of game.particles) {
        const drift = Math.sin(e * 0.5 + p.phase) * 20;
        const sx = ((p.x + drift - game.cam.x * 0.25) % W + W) % W;
        const sy = ((p.y + e * p.speed * 38 - game.cam.y * 0.15) % H + H) % H;
        ctx.beginPath(); ctx.arc(sx, sy, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  Decorations — boat, corals, seagrass, fish shadow
// ────────────────────────────────────────────────────────────────

function drawDecorations(game, ctx) {
    if (!game.decoItems) return;
    const e = game.elapsed;

    for (const d of game.decoItems) {
        if (!isOnScreen(game, d.x, d.y, 220)) continue;

        let img = null;
        let alpha = 1.0;
        let bob = 0;

        switch (d.type) {
            case 'boat':
                img   = game.decoBoat;
                bob   = Math.sin(e * 0.6 + 1.2) * 4;  // gentle sway
                break;
            case 'coral1':
                img   = game.decoCoral1;
                bob   = Math.sin(e * 0.8 + d.x) * 2;
                break;
            case 'coral3':
                img   = game.decoCoral3;
                bob   = Math.sin(e * 0.7 + d.x) * 2;
                break;
            case 'seagrass':
                img   = game.decoSeagrass;
                bob   = Math.sin(e * 1.1 + d.x * 0.01) * 3;
                break;
            case 'fishshadow':
                img   = game.decoFishShadow;
                alpha = 0.22 + Math.sin(e * 0.4) * 0.06;  // faint, ghostly
                bob   = Math.sin(e * 0.3) * 8;
                break;
        }

        if (!img || !img.complete || img.naturalWidth === 0) continue;

        const s  = worldToScreen(game, d.x, d.y);
        const w  = img.naturalWidth  * d.scale;
        const h  = img.naturalHeight * d.scale;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, s.x - w / 2, s.y - h / 2 + bob, w, h);
        ctx.restore();
    }
}

// ────────────────────────────────────────────────────────────────
//  NPC fish drawing
// ────────────────────────────────────────────────────────────────

function drawBgFish(game, ctx) {
    const e    = game.elapsed;
    const rank = playerSizeRank(game.playerSize);

    // ── Generic draw helper for edible fish tiers ──────────────
    const drawSet = (arr, rL, rR, sL, sR, scale, fishRank) => {
        for (const f of arr) {
            if (!isOnScreen(game, f.x, f.y, 140)) continue;
            const s     = worldToScreen(game, f.x, f.y);
            const frame = Math.floor((e * 10 + f.frameOffset) % 6) + 1;
            const isL   = f.vx < 0;
            let img = (isL ? sL : sR)[frame];
            if (!img || !img.complete || img.naturalWidth === 0) img = (isL ? rL : rR)[frame];
            if (!img || !img.complete || img.naturalWidth === 0) continue;

            const w   = img.naturalWidth  * scale;
            const h   = img.naturalHeight * scale;
            const bob = Math.sin(e * 2 + f.bobOffset) * 6;

            const tooLarge = rank < fishRank;
            ctx.save();
            if (tooLarge) {
                ctx.shadowColor = 'rgba(255,80,0,0.5)';
                ctx.shadowBlur  = 14;
            }
            ctx.drawImage(img, s.x - w / 2, s.y - h / 2 + bob, w, h);
            if (tooLarge) {
                ctx.font      = `${Math.max(11, w * 0.30)}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.globalAlpha = 0.70 + Math.sin(e * 4 + f.bobOffset) * 0.28;
                ctx.fillText('⚠', s.x, s.y - h / 2 - 4);
            }
            ctx.restore();
        }
    };

    // ── Tier 0: Tinyfish (reuse clownfish sprites at tiny scale) ─
    for (const f of (game.bgTinyfish || [])) {
        if (!isOnScreen(game, f.x, f.y, 50)) continue;
        const s     = worldToScreen(game, f.x, f.y);
        const frame = Math.floor((e * 14 + f.frameOffset) % 6) + 1;
        const isL   = f.vx < 0;
        let img = (isL ? game.clownfishSwimLeft : game.clownfishSwimRight)[frame];
        if (!img || !img.complete || img.naturalWidth === 0)
            img = (isL ? game.clownfishRestLeft : game.clownfishRestRight)[frame];
        if (!img || !img.complete || img.naturalWidth === 0) continue;
        const sc  = FISH_SCALE.tinyfish;
        const w   = img.naturalWidth  * sc;
        const h   = img.naturalHeight * sc;
        const bob = Math.sin(e * 3 + f.bobOffset) * 3;
        ctx.drawImage(img, s.x - w / 2, s.y - h / 2 + bob, w, h);
    }

    // ── Tiers 1-3: Edible fish with size-rank ⚠ warnings ────────
    drawSet(game.bgClownfish,    game.clownfishRestLeft,  game.clownfishRestRight,  game.clownfishSwimLeft,  game.clownfishSwimRight,  FISH_SCALE.clownfish,  1);
    drawSet(game.bgGoldfish,     game.goldfishRestLeft,   game.goldfishRestRight,   game.goldfishSwimLeft,   game.goldfishSwimRight,   FISH_SCALE.goldfish,   1);
    drawSet(game.bgSecondfish,   game.secondfishRestLeft, game.secondfishRestRight, game.secondfishSwimLeft, game.secondfishSwimRight, FISH_SCALE.secondfish, 2);
    drawSet(game.bgTertiaryfish, game.tertiaryRestLeft,   game.tertiaryRestRight,   game.tertiarySwimLeft,   game.tertiarySwimRight,   FISH_SCALE.tertiary,   2);
    drawSet(game.bgTunafish,     game.tunafishRestLeft,   game.tunafishRestRight,   game.tunafishSwimLeft,   game.tunafishSwimRight,   FISH_SCALE.tunafish,   3);

    // ── Furyfish + Enemy — share fury sheet ─────────────────────
    const fSheet        = game.furySheet;
    const hasFSheet     = fSheet && fSheet.complete && fSheet.naturalWidth > 0;
    const FURY_SHEET_SCALE = 0.9;
    {
        const FURY_SC  = FISH_SCALE.furyfish;

        for (const f of game.bgFuryfish) {
            if (!isOnScreen(game, f.x, f.y, 160)) continue;
            const s      = worldToScreen(game, f.x, f.y);
            const isL    = f.vx < 0;  // true = moving left (natural sheet direction)
            const sc     = FURY_SC * (f.isAttacking ? 1.12 : 1.0);
            const bob    = f.isAttacking ? 0 : Math.sin(e * 2 + f.bobOffset) * 6;
            const { dw, dh } = _furyFrameSize(fSheet, sc * FURY_SHEET_SCALE);

            ctx.save();
            ctx.translate(s.x, s.y + bob);

            if (f.isAttacking) {
                ctx.shadowColor = `rgba(255,30,0,${0.5 + Math.sin(e * 8) * 0.3})`;
                ctx.shadowBlur  = 20 + Math.sin(e * 8) * 8;
            }

            if (hasFSheet) {
                // Pick animation row
                let row;
                if (f.isAttacking) row = FURY_ROW_ATTACK;
                else               row = FURY_ROW_SWIM;
                const col = Math.floor((e * 7 + f.frameOffset) % SCOLS);
                // Sheet faces LEFT — flip when moving right
                if (!isL) ctx.scale(-1, 1);
                _drawFrame(ctx, fSheet, col, row, SCOLS, FURY_ROWS, dw, dh);
            } else {
                // Fallback old per-frame sprites
                const frame = Math.floor((e * 10 + f.frameOffset) % 6) + 1;
                let img = f.isAttacking
                    ? (isL ? game.furyfishAttackLeft : game.furyfishAttackRight)[frame]
                    : null;
                if (!img || !img.complete || img.naturalWidth === 0)
                    img = (isL ? game.furyfishSwimLeft : game.furyfishSwimRight)[frame];
                if (img && img.complete && img.naturalWidth !== 0) {
                    const w = img.naturalWidth * sc, h = img.naturalHeight * sc;
                    ctx.drawImage(img, -w/2, -h/2, w, h);
                }
            }
            ctx.restore();
        }
    }

    // ── Enemy fish ─────────────────────────────────────────────
    // ── Enemy fish — also use fury sheet ─────────────────────────
    for (const f of game.bgEnemies) {
        if (!isOnScreen(game, f.x, f.y, 150)) continue;
        const s    = worldToScreen(game, f.x, f.y);
        const isL  = f.vx < 0;
        const sc   = FISH_SCALE.enemy * (f.isAttacking ? 1.08 : 1.0);
        const bob  = f.isAttacking ? 0 : Math.sin(e * 2 + f.bobOffset) * 6;
        const { dw, dh } = _furyFrameSize(fSheet, sc * FURY_SHEET_SCALE);

        ctx.save();
        ctx.translate(s.x, s.y + bob);
        if (f.isAttacking) { ctx.shadowColor = 'rgba(200,80,0,0.4)'; ctx.shadowBlur = 12; }

        if (hasFSheet) {
            const row = f.isAttacking ? FURY_ROW_ATTACK : FURY_ROW_SWIM;
            const col = Math.floor((e * 7 + f.frameOffset) % SCOLS);
            if (!isL) ctx.scale(-1, 1);
            _drawFrame(ctx, fSheet, col, row, SCOLS, FURY_ROWS, dw, dh);
        } else {
            const frame = Math.floor((e * 10 + f.frameOffset) % 6) + 1;
            const img = (isL ? game.furyfishSwimLeft : game.furyfishSwimRight)[frame];
            if (img && img.complete && img.naturalWidth !== 0) {
                const w = img.naturalWidth * sc, h = img.naturalHeight * sc;
                ctx.drawImage(img, -w/2, -h/2, w, h);
            }
        }
        ctx.restore();
    }
}

// ────────────────────────────────────────────────────────────────
//  Boss
// ────────────────────────────────────────────────────────────────

function drawBoss(game, ctx) {
    if (!game.boss || game.bossDefeated) return;
    const b = game.boss;
    if (!isOnScreen(game, b.x, b.y, 220)) return;

    const s     = worldToScreen(game, b.x, b.y);
    const e     = game.elapsed;
    const frame = Math.floor((e * 10 + b.frameOffset) % 6) + 1;
    const set   = b.isCharging
        ? (b.facingLeft ? game.bossSprite.attackL : game.bossSprite.attackR)
        : (b.facingLeft ? game.bossSprite.left    : game.bossSprite.right);
    const img = set[frame];
    if (!img || !img.complete || img.naturalWidth === 0) return;

    const sc  = FISH_SCALE.boss + Math.sin(e * 2) * 0.05;
    const w   = img.naturalWidth  * sc;
    const h   = img.naturalHeight * sc;
    const bob = b.isCharging ? 0 : Math.sin(e * 1.5 + b.bobOffset) * 12;

    ctx.save();
    ctx.translate(s.x, s.y + bob);
    if (b.hitFlash > 0) { ctx.shadowColor = '#ff0000'; ctx.shadowBlur = 55; }

    const bSheet    = game.furySheet;
    const hasBSheet = bSheet && bSheet.complete && bSheet.naturalWidth > 0;
    const BOSS_SHEET_SCALE = 2.6;

    if (hasBSheet) {
        const { dw: bdw, dh: bdh } = _furyFrameSize(bSheet, sc * BOSS_SHEET_SCALE);
        const bRow = b.isCharging
            ? FURY_ROW_CHARGE
            : FURY_ROW_SWIM;
        const bCol = Math.floor((e * 7 + b.frameOffset) % SCOLS);
        // Sheet faces LEFT; b.facingLeft=true → no flip
        if (!b.facingLeft) ctx.scale(-1, 1);
        _drawFrame(ctx, bSheet, bCol, bRow, SCOLS, FURY_ROWS, bdw, bdh);
    } else {
        ctx.drawImage(img, -w / 2, -h / 2, w, h);
    }
    if (b.isCharging) {
        ctx.save();
        ctx.globalAlpha = 0.35 + Math.sin(e * 15) * 0.22;
        ctx.shadowColor = '#ff2200'; ctx.shadowBlur = 75;
        ctx.strokeStyle = '#ff4400'; ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(s.x, s.y, 85, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}


// ════════════════════════════════════════════════════════════════
//  Sprite-sheet helpers
//
//  Fin  sheet  (fin_sprite.png)  — 4 cols × 4 rows, all face LEFT:
//    row 0 = idle    (subtle tail sway, whisker)
//    row 1 = swim    (tail fanned out)
//    row 2 = attack  (mouth open wide)
//    row 3 = shoot   (flashlight / bubble projectile)
//
//  Fury sheet  (fury_sprite.png) — 4 cols × 5 rows, all face LEFT:
//    row 0 = idle
//    row 1 = swim    (antennas up)
//    row 2 = aggro   (body puffed)
//    row 3 = attack  (mouth wide open)
//    row 4 = charge  (alt / lunge)
//
//  All rows face LEFT naturally.
//  To draw facing RIGHT: ctx.scale(-1,1) around the draw call.
// ════════════════════════════════════════════════════════════════

const SCOLS      = 4;   // columns in every sheet
const FIN_ROWS   = 4;
const FURY_ROWS  = 5;

// Row indices — Fin
const FIN_ROW_IDLE   = 0;
const FIN_ROW_SWIM   = 1;
const FIN_ROW_ATTACK = 2;
const FIN_ROW_SHOOT  = 3;

// Row indices — Fury
const FURY_ROW_IDLE   = 0;
const FURY_ROW_SWIM   = 1;
const FURY_ROW_AGGRO  = 2;
const FURY_ROW_ATTACK = 3;
const FURY_ROW_CHARGE = 4;

/**
 * Draw one frame from a uniform sprite sheet.
 * The sheet is divided into COLS × ROWS equal cells.
 * ctx must already be translated to the draw-centre before calling.
 *
 * @param ctx        CanvasRenderingContext2D
 * @param sheet      HTMLImageElement  (full sprite sheet)
 * @param col        0-based column
 * @param row        0-based row
 * @param cols       total columns in sheet
 * @param rows       total rows in sheet
 * @param dw, dh     destination draw size (px)
 */
function _drawFrame(ctx, sheet, col, row, cols, rows, dw, dh) {
    if (!sheet || !sheet.complete || sheet.naturalWidth === 0) return false;
    const fw = sheet.naturalWidth  / cols;
    const fh = sheet.naturalHeight / rows;
    ctx.drawImage(sheet,
        col * fw, row * fh, fw, fh,
        -dw / 2,  -dh / 2, dw, dh);
    return true;
}

// Frame size helpers — returns {dw, dh} for display given a uniform scale factor
function _finFrameSize(sheet, scale) {
    if (!sheet || !sheet.complete || sheet.naturalWidth === 0)
        return { dw: 80 * scale, dh: 80 * scale };
    return {
        dw: (sheet.naturalWidth  / SCOLS) * scale,
        dh: (sheet.naturalHeight / FIN_ROWS) * scale,
    };
}
function _furyFrameSize(sheet, scale) {
    if (!sheet || !sheet.complete || sheet.naturalWidth === 0)
        return { dw: 100 * scale, dh: 100 * scale };
    return {
        dw: (sheet.naturalWidth  / SCOLS) * scale,
        dh: (sheet.naturalHeight / FURY_ROWS) * scale,
    };
}

// ────────────────────────────────────────────────────────────────
//  Player fish (+ respawn fall animation)
// ────────────────────────────────────────────────────────────────

function drawPlayerFish(game, ctx) {
    if (game.isEaten) return;

    const e         = game.elapsed;
    const timeSince = e - game.lastAttackTime;
    const attacking = timeSince < game.attackDuration;
    const sheet     = game.finSheet;
    const hasSheet  = sheet && sheet.complete && sheet.naturalWidth > 0;

    // One-time console log so you can verify the sheet loaded (remove after confirming)
    if (!game._sheetDebugLogged) {
        game._sheetDebugLogged = true;
        console.log('[Fin sheet]  src:', sheet ? sheet.src : 'null',
                    '| complete:', sheet ? sheet.complete : false,
                    '| size:', sheet ? sheet.naturalWidth + 'x' + sheet.naturalHeight : '0x0');
        const fs = game.furySheet;
        console.log('[Fury sheet] src:', fs ? fs.src : 'null',
                    '| complete:', fs ? fs.complete : false,
                    '| size:', fs ? fs.naturalWidth + 'x' + fs.naturalHeight : '0x0');
    }

    // Display scale — tune PLAYER_SHEET_SCALE to size Fin on screen
    const PLAYER_SHEET_SCALE = 0.4;
    const { dw, dh } = _finFrameSize(sheet, game.playerSize * PLAYER_SHEET_SCALE);

    // ── Respawn fall — Fin drops in from top ─────────────────
    if (game.isRespawning) {
        const t      = Math.min(game.respawnTimer / RESPAWN_FALL_DURATION, 1.0);
        const scaleY = t > 0.85 ? 1 - (t - 0.85) / 0.15 * 0.18 : 1;
        const col    = Math.floor((e * 7) % SCOLS);
        const s      = worldToScreen(game, game.fishX, game.fishY);

        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.scale(1, scaleY);

        // Splash ripple on landing
        if (t > 0.85) {
            const sp = (t - 0.85) / 0.15;
            ctx.save();
            ctx.globalAlpha = (1 - sp) * 0.5;
            ctx.strokeStyle = 'rgba(120,220,255,0.8)'; ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(0, dh / 2, dw * 0.65 * sp, dh * 0.1 * sp, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        if (hasSheet) {
            // Facing right during fall — flip (sheet faces left)
            ctx.scale(-1, 1);
            _drawFrame(ctx, sheet, col, FIN_ROW_SWIM, SCOLS, FIN_ROWS, dw, dh);
        } else {
            // Fallback old sprite
            const fi = (game.mainfishSwimRight[Math.floor((e*10)%6)+1] ||
                        game.mainfishRestRight[Math.floor((e*10)%6)+1]);
            if (fi && fi.complete && fi.naturalWidth)
                ctx.drawImage(fi, -dw/2, -dh/2, dw, dh);
        }
        ctx.restore();
        return;
    }

    // ── Normal / attacking ────────────────────────────────────
    let row, col;
    // Bite flash when Fin eats a fish — game.lastEatTime set in collisions.js
    const EAT_BITE_DURATION = 0.50;
    // lastEatTime is -100 until first eat, then set to game.elapsed by collisions.js
    // Safe check: only bite if lastEatTime is recent (within last 2 seconds of elapsed)
    const timeSinceEat = (game.lastEatTime > -50) ? (e - game.lastEatTime) : 999;
    const biting = timeSinceEat >= 0 && timeSinceEat < EAT_BITE_DURATION;

    if (biting) {
        // ── Eat bite — HIGHEST priority (row 2: col1=half open, col2=WIDE OPEN) ──
        const prog = Math.min(0.99, timeSinceEat / EAT_BITE_DURATION);
        if      (prog < 0.25) col = 1;   // opening
        else if (prog < 0.75) col = 2;   // WIDE OPEN — holds longest (your row2,col2)
        else                  col = 1;   // closing back
        row = FIN_ROW_ATTACK;            // row index 2
    } else if (attacking && game.hasPearlPower) {
        // Shoot animation — same frames as bite (row 2, col 1=half open, col 2=wide open)
        const prog = Math.min(0.99, timeSince / game.attackDuration);
        if      (prog < 0.25) col = 1;
        else if (prog < 0.75) col = 2;
        else                  col = 1;
        row = FIN_ROW_ATTACK;
    } else if (attacking && !game.hasPearlPower) {
        // Attack without pearl — also show bite face
        const prog = Math.min(0.99, timeSince / game.attackDuration);
        if      (prog < 0.25) col = 1;
        else if (prog < 0.75) col = 2;
        else                  col = 1;
        row = FIN_ROW_ATTACK;
    } else if (game.fishMoving) {
        // Row 1: cols 0 and 1 are the clean swim frames (no wide tail extension)
        col = Math.floor((e * 6) % 2);  // alternate between col 0 and col 1
        row = FIN_ROW_SWIM;
    } else {
        // Idle: col 0, row 1 — cleanest frame, no whiskers, no tail extension
        col = 0;
        row = FIN_ROW_SWIM;
    }

    const bob     = (game.fishMoving || attacking) ? 0 : Math.sin(e * 2) * 9;
    const s       = worldToScreen(game, game.fishX, game.fishY);
    const flicker = game.damageCooldown > 0 && Math.floor(e * 10) % 2 === 0;

    if (flicker) return;

    ctx.save();
    ctx.translate(s.x, s.y + bob);

    if (hasSheet) {
        // Sheet faces LEFT naturally.
        // fishFacingLeft=true → no flip.  fishFacingLeft=false → flip.
        if (!game.fishFacingLeft) ctx.scale(-1, 1);
        _drawFrame(ctx, sheet, col, row, SCOLS, FIN_ROWS, dw, dh);
    } else {
        // Fallback to old per-frame sprites
        let imgSet;
        if (attacking)           imgSet = game.fishFacingLeft ? game.mainfishAttackLeft : game.mainfishAttackRight;
        else if (game.fishMoving) imgSet = game.fishFacingLeft ? game.mainfishSwimLeft   : game.mainfishSwimRight;
        else                      imgSet = game.fishFacingLeft ? game.mainfishRestLeft    : game.mainfishRestRight;
        const frame = Math.floor((e * 10) % 6) + 1;
        let fi = imgSet[frame];
        if (!fi || !fi.complete || !fi.naturalWidth)
            fi = (game.fishFacingLeft ? game.mainfishSwimLeft : game.mainfishSwimRight)[frame];
        if (fi && fi.complete && fi.naturalWidth)
            ctx.drawImage(fi, -dw/2, -dh/2, dw, dh);
    }
    ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  Collectibles (clams)
// ────────────────────────────────────────────────────────────────

function drawCollectibles(game, ctx) {
    const e = game.elapsed;
    for (const clam of game.clams) {
        if (!isOnScreen(game, clam.x, clam.y, 90)) continue;
        const s   = worldToScreen(game, clam.x, clam.y);
        const img = (clam.hasPearl && !clam.pearlCollected)
            ? (game.clamClosedSprite && game.clamClosedSprite.complete && game.clamClosedSprite.naturalWidth ? game.clamClosedSprite : game.clamSprite.closed)
            : (game.clamOpenSprite  && game.clamOpenSprite.complete  && game.clamOpenSprite.naturalWidth  ? game.clamOpenSprite  : game.clamSprite.open);
        if (!img || !img.complete || img.naturalWidth === 0) continue;

        // Small clam — scale 0.28
        const sc = 0.28;
        const w  = img.naturalWidth  * sc;
        const h  = img.naturalHeight * sc;
        const ix = s.x - w / 2;
        const iy = s.y - h / 2;

        if (clam.hasPearl && !clam.pearlCollected) {
            // Draw closed clam (pearl.png) with cyan glow — pearl is inside the image
            ctx.save();
            ctx.shadowColor = `rgba(0,200,255,${0.4 + Math.sin(e * 3) * 0.2})`;
            ctx.shadowBlur  = 22 + Math.sin(e * 3) * 8;
            ctx.drawImage(img, ix, iy, w, h);
            ctx.restore();
            // "COLLECT TO SHOOT!" hint
            ctx.save();
            ctx.font = "bold 13px 'Exo 2', sans-serif"; ctx.textAlign = 'center';
            ctx.fillStyle   = '#00c8ff';
            ctx.globalAlpha = 0.65 + Math.sin(e * 3) * 0.35;
            ctx.fillText('COLLECT TO SHOOT!', s.x, iy - 8 + Math.sin(e * 2) * 4);
            ctx.restore();
        } else {
            // Draw open clam (pearl1_2.png — pearl already drawn inside it)
            ctx.drawImage(img, ix, iy, w, h);
        }

        // Collection pulse ring — no floating pearl sprite
        if (clam.openAnim > 0) {
            ctx.save();
            ctx.globalAlpha = clam.openAnim * 0.7;
            ctx.strokeStyle = '#00c8ff';
            ctx.lineWidth   = 3;
            ctx.shadowColor = '#00c8ff';
            ctx.shadowBlur  = 20;
            const pulseR = 20 + (1 - clam.openAnim) * 28;
            ctx.beginPath(); ctx.arc(s.x, s.y, pulseR, 0, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }
    }
}

// ────────────────────────────────────────────────────────────────
//  Projectiles
// ────────────────────────────────────────────────────────────────

function drawProjectiles(game, ctx) {
    const e = game.elapsed;
    for (const p of game.projectiles) {
        if (!isOnScreen(game, p.x, p.y, 60)) continue;
        const s     = worldToScreen(game, p.x, p.y);
        const frame = Math.floor((e * 15 + p.frameOffset) % 8) + 1;
        const img   = game.projectileSprites[frame];
        if (!img || !img.complete || img.naturalWidth === 0) continue;
        const ox = img.naturalWidth / 2, oy = img.naturalHeight / 2;
        ctx.save();
        ctx.translate(s.x, s.y);
        // Projectile sprite fires LEFT by default.
        // When going right (vx > 0) → flip so bubble leads rightward.
        if (p.vx > 0) ctx.scale(-1, 1);
        ctx.drawImage(img, -ox, -oy);
        ctx.restore();
    }
}

// ────────────────────────────────────────────────────────────────
//  Floating score texts
// ────────────────────────────────────────────────────────────────

function drawFloatingTexts(game, ctx) {
    ctx.save(); ctx.textAlign = 'center';
    for (const ft of game.floatingTexts) {
        if (!isOnScreen(game, ft.wx, ft.wy, 70)) continue;
        const s     = worldToScreen(game, ft.wx, ft.wy);
        const alpha = Math.max(0, ft.life / ft.maxLife);
        const size  = ft.text.length > 20 ? 16 : 22;
        ctx.globalAlpha = alpha;
        ctx.font        = `bold ${size}px 'Bangers', cursive`;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1.8;
        ctx.strokeText(ft.text, s.x, s.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, s.x, s.y);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  HUD  (screen-space)
// ────────────────────────────────────────────────────────────────

function drawHUD(game, ctx, W, H) {
    const pulse = 1 + Math.sin(game.elapsed * 4) * 0.06;

    const hudText = (text, x, y, color, shadow, size = 22) => {
        ctx.save();
        ctx.shadowColor = shadow; ctx.shadowBlur = 8;
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2.5;
        ctx.font = `bold ${Math.round(size * pulse)}px 'Bangers', cursive`;
        ctx.textAlign = 'left';
        ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
        ctx.restore();
    };

    hudText(`SCORE: ${game.score}`,                          40, 40,  '#ffd060', '#ffd060', 24);
    hudText(`BEST: ${game.highScore}`,                       40, 66,  '#ffaa40', '#ffaa40', 18);
    hudText(`STAGE ${game.stage} / ${game.MAX_STAGE}`,       40, 90,  '#ffffff', '#ffffff', 18);

    // ── 4-tier size rank indicator ─────────────────────────────
    const rank    = playerSizeRank(game.playerSize);
    const rankTxt = rank === 3 ? '🐋 LARGE — eat everything!'
                  : rank === 2 ? `🐟 MEDIUM — grow to 1.25 for tuna  (${game.playerSize.toFixed(2)})`
                  : rank === 1 ? `🐠 SMALL — grow to 0.85 for medium  (${game.playerSize.toFixed(2)})`
                  : `🦐 TINY — eat tiny fish first!  (${game.playerSize.toFixed(2)}/0.50)`;
    const rankCol = rank === 3 ? '#ffd060' : rank === 2 ? '#80ffb0' : rank === 1 ? '#80d0ff' : '#aaffff';
    ctx.save();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.font = "bold 15px 'Bangers', cursive"; ctx.textAlign = 'left';
    ctx.strokeText(rankTxt, 40, 113); ctx.fillStyle = rankCol; ctx.fillText(rankTxt, 40, 113);
    ctx.restore();

    // ── Attempt bubbles ────────────────────────────────────────
    // Normal: bright cyan-blue bubble
    // Last attempt (attempts === 1): the single remaining bubble pulses red/orange
    // Used: hollow dark circle
    const bubbleY   = 138;
    const bubbleR   = 10;
    const bubbleGap = 26;
    const lastAttempt = game.attempts === 1;
    ctx.save();
    for (let a = 0; a < MAX_ATTEMPTS; a++) {
        const bx   = 42 + a * bubbleGap;
        const used = a >= game.attempts;
        ctx.beginPath();
        ctx.arc(bx, bubbleY, bubbleR, 0, Math.PI * 2);
        if (used) {
            // Empty — used attempt
            ctx.fillStyle   = 'rgba(0,0,0,0.35)';
            ctx.strokeStyle = 'rgba(90,90,120,0.45)';
            ctx.shadowBlur  = 0;
        } else if (lastAttempt) {
            // Last remaining attempt — red/orange warning pulse
            const pulse = 0.5 + Math.sin(game.elapsed * 6) * 0.5;
            const grd   = ctx.createRadialGradient(bx-3, bubbleY-3, 1, bx, bubbleY, bubbleR);
            grd.addColorStop(0, '#ffdd80');
            grd.addColorStop(0.5, `rgb(255,${Math.floor(80+50*pulse)},0)`);
            grd.addColorStop(1, '#cc2000');
            ctx.fillStyle   = grd;
            ctx.shadowColor = '#ff4400';
            ctx.shadowBlur  = 10 + pulse * 8;
            ctx.strokeStyle = 'rgba(255,180,80,0.9)';
        } else {
            // Normal active attempt — cyan-blue
            const grd = ctx.createRadialGradient(bx-3, bubbleY-3, 1, bx, bubbleY, bubbleR);
            grd.addColorStop(0, '#80ffdd');
            grd.addColorStop(0.6, '#00c8ff');
            grd.addColorStop(1, '#0060cc');
            ctx.fillStyle   = grd;
            ctx.shadowColor = '#00c8ff';
            ctx.shadowBlur  = 8;
            ctx.strokeStyle = 'rgba(180,240,255,0.9)';
        }
        ctx.lineWidth = 1.5;
        ctx.fill(); ctx.stroke();
        ctx.shadowBlur = 0;
    }
    ctx.font = "bold 11px 'Exo 2', sans-serif";
    ctx.fillStyle = lastAttempt ? 'rgba(255,160,60,0.9)' : 'rgba(160,220,255,0.7)';
    ctx.textAlign = 'left';
    ctx.fillText(lastAttempt ? 'LAST ATTEMPT!' : 'ATTEMPTS', 42, bubbleY + bubbleR + 12);
    ctx.restore();

    // ── Pearl status ──────────────────────────────────────────
    const pearlCol = game.hasPearlPower ? '#00c8ff' : '#888';
    const pearlTxt = game.hasPearlPower ? '🦪 PEARL READY (CLICK / SPACE)' : '🦪 Find a clam to shoot!';
    ctx.save();
    ctx.shadowColor = game.hasPearlPower ? '#00c8ff' : 'transparent'; ctx.shadowBlur = 6;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.font = "bold 15px 'Bangers', cursive"; ctx.textAlign = 'left';
    ctx.strokeText(pearlTxt, 40, 168); ctx.fillStyle = pearlCol; ctx.fillText(pearlTxt, 40, 168);
    ctx.restore();

    // ── Fish remaining ─────────────────────────────────────────
    const rem    = countEdible(game);
    const remTxt = rem > 0
        ? `🐟 EAT ${rem} MORE FISH`
        : (game.boss && !game.bossDefeated ? '🔥 DEFEAT THE BOSS!' : '✅ STAGE CLEAR!');
    const remCol = rem > 0 ? '#80ffb0' : (game.boss && !game.bossDefeated ? '#ff8040' : '#ffd060');
    ctx.save();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
    ctx.font = "bold 15px 'Bangers', cursive"; ctx.textAlign = 'left';
    ctx.strokeText(remTxt, 40, 190); ctx.fillStyle = remCol; ctx.fillText(remTxt, 40, 190);
    ctx.restore();

    // ── Boss HP bar ────────────────────────────────────────────
    if (game.boss && !game.bossDefeated) {
        const barW = 320, barH = 22;
        const barX = (W - barW) / 2, barY = 24;
        const pct  = Math.max(0, game.boss.hp / game.boss.maxHp);
        ctx.save();
        ctx.font = "bold 18px 'Bangers', cursive"; ctx.textAlign = 'center';
        ctx.fillStyle = '#ff4040'; ctx.shadowColor = '#ff2020'; ctx.shadowBlur = 10;
        ctx.fillText('👹 BOSS', W / 2, barY - 4);
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(barX, barY, barW, barH);
        ctx.strokeStyle = '#ff4040'; ctx.lineWidth = 2; ctx.strokeRect(barX, barY, barW, barH);
        const bp = 0.5 + Math.sin(game.elapsed * 6) * 0.5;
        ctx.fillStyle = `rgb(${Math.floor(200+55*bp)},${Math.floor(20+60*(1-pct))},20)`;
        ctx.fillRect(barX + 2, barY + 2, Math.max(0, (barW - 4) * pct), barH - 4);
        ctx.fillStyle = '#fff'; ctx.font = "bold 14px 'Exo 2', sans-serif";
        ctx.fillText(`${game.boss.hp} / ${game.boss.maxHp}`, W / 2, barY + barH - 5);
        ctx.restore();
    }

    // ── Minimap ────────────────────────────────────────────────
    drawMinimap(game, ctx, W, H);
}

// ────────────────────────────────────────────────────────────────
//  Minimap  —  edible fish only, NO poison fish, NO pearls
// ────────────────────────────────────────────────────────────────

function drawMinimap(game, ctx, W, H) {
    const mm  = MINIMAP;
    const sz  = mm.SIZE;
    const mg  = mm.MARGIN;
    const mx  = W - sz - mg;
    const my  = mg;
    const wW  = game.world.w;
    const wH  = game.world.h;

    const rrect = (x, y, w, h, r) => {
        ctx.beginPath();
        ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.arcTo(x+w,y,x+w,y+r,r);
        ctx.lineTo(x+w,y+h-r); ctx.arcTo(x+w,y+h,x+w-r,y+h,r);
        ctx.lineTo(x+r,y+h); ctx.arcTo(x,y+h,x,y+h-r,r);
        ctx.lineTo(x,y+r); ctx.arcTo(x,y,x+r,y,r);
        ctx.closePath();
    };

    ctx.save();
    ctx.globalAlpha = mm.ALPHA;

    ctx.fillStyle = 'rgba(0,8,24,0.82)';
    rrect(mx, my, sz, sz, 6); ctx.fill();
    ctx.strokeStyle = 'rgba(60,190,255,0.50)'; ctx.lineWidth = 1.5;
    rrect(mx, my, sz, sz, 6); ctx.stroke();

    ctx.font = "bold 10px 'Exo 2', sans-serif";
    ctx.fillStyle = 'rgba(130,210,255,0.70)';
    ctx.textAlign = 'center';
    ctx.fillText('MAP', mx + sz / 2, my + sz + 12);

    rrect(mx+1, my+1, sz-2, sz-2, 5); ctx.clip();

    const toMap = (wx, wy) => ({ x: mx+(wx/wW)*sz, y: my+(wy/wH)*sz });

    const vW = game.canvas.width / game.dpr;
    const vH = game.canvas.height / game.dpr;
    ctx.strokeStyle = 'rgba(100,220,255,0.28)'; ctx.lineWidth = 1;
    ctx.strokeRect(mx+(game.cam.x/wW)*sz, my+(game.cam.y/wH)*sz, (vW/wW)*sz, (vH/wH)*sz);

    const dot = (wx, wy, color, r=2.0) => {
        const p = toMap(wx, wy);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI*2); ctx.fill();
    };

    // Edible fish only — no poison, no pearls
    for (const f of (game.bgTinyfish||[]))    dot(f.x, f.y, mm.DOT_TINY,   1.5);
    for (const f of game.bgClownfish)          dot(f.x, f.y, mm.DOT_SMALL,  2.0);
    for (const f of game.bgGoldfish)           dot(f.x, f.y, mm.DOT_SMALL,  2.0);
    for (const f of game.bgSecondfish)         dot(f.x, f.y, mm.DOT_MEDIUM, 2.6);
    for (const f of game.bgTertiaryfish)       dot(f.x, f.y, mm.DOT_MEDIUM, 2.6);
    for (const f of game.bgTunafish)           dot(f.x, f.y, mm.DOT_LARGE,  3.2);

    // Player — pulsing green
    const pp = toMap(game.fishX, game.fishY);
    const pPulse = 3.0 + Math.sin(game.elapsed * 6) * 0.8;
    ctx.save();
    ctx.shadowColor = mm.DOT_PLAYER; ctx.shadowBlur = 6;
    ctx.fillStyle   = mm.DOT_PLAYER;
    ctx.beginPath(); ctx.arc(pp.x, pp.y, pPulse, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  Overlays
// ────────────────────────────────────────────────────────────────

function drawHitFlash(game, ctx, W, H) {
    if (game.hitFlashTimer <= 0) return;
    const alpha = Math.min(0.55, game.hitFlashTimer * 1.4);
    ctx.save();
    ctx.fillStyle = `rgba(220,0,0,${alpha})`; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.25, W/2, H/2, H*0.8);
    vg.addColorStop(0, 'rgba(180,0,0,0)');
    vg.addColorStop(1, `rgba(220,0,0,${alpha*1.2})`);
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
    ctx.restore();
}

function drawStageIntro(game, ctx, W, H) {
    if (!game.stageIntroActive) return;
    const t       = game.stageIntroTimer;
    const total   = 2.8;
    const elapsed = total - t;
    let alpha = 1;
    if (elapsed < 0.4) alpha = elapsed / 0.4;
    else if (t < 0.5)  alpha = t / 0.5;

    ctx.save(); ctx.globalAlpha = alpha;
    const stripH = 160, stripY = H/2 - stripH/2;
    const stripG = ctx.createLinearGradient(0, stripY, 0, stripY+stripH);
    stripG.addColorStop(0, 'rgba(0,8,24,0)'); stripG.addColorStop(0.2, 'rgba(0,8,24,0.88)');
    stripG.addColorStop(0.8, 'rgba(0,8,24,0.88)'); stripG.addColorStop(1, 'rgba(0,8,24,0)');
    ctx.fillStyle = stripG; ctx.fillRect(0, stripY, W, stripH);

    const isBoss = game.stage === game.MAX_STAGE;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font      = "bold 22px 'Exo 2', sans-serif";
    ctx.fillStyle = isBoss ? '#ff6040' : 'rgba(130,220,255,0.9)';
    ctx.shadowColor = isBoss ? '#ff2000' : '#00aaff'; ctx.shadowBlur = 18;
    ctx.fillText(isBoss ? '⚠  FINAL STAGE  ⚠' : `— STAGE ${game.stage} OF ${game.MAX_STAGE} —`, W/2, H/2-32);

    const tSz = Math.min(W*0.14, 90);
    ctx.font = `bold ${tSz}px 'Bangers', cursive`;
    ctx.fillStyle = isBoss ? '#ff4030' : '#ffffff';
    ctx.shadowColor = isBoss ? '#ff2000' : '#00c8ff'; ctx.shadowBlur = 32;
    const bounce = 1 + Math.sin(Math.min(elapsed/0.4, 1) * Math.PI) * 0.08;
    ctx.save(); ctx.translate(W/2, H/2+18); ctx.scale(bounce, bounce);
    ctx.fillText(isBoss ? '👹  BOSS STAGE' : `STAGE  ${game.stage}`, 0, 0); ctx.restore();

    ctx.shadowBlur = 0;
    ctx.font = `italic 500 ${Math.min(W*0.028, 18)}px 'Exo 2', sans-serif`;
    ctx.fillStyle = isBoss ? '#ffaa80' : 'rgba(160,220,255,0.75)';
    ctx.fillText(
        isBoss ? 'Defeat the Boss to win!'
               : (game.stage === 1 ? 'Eat tiny fish to grow — find a clam to shoot!' : 'Eat all fish to advance!'),
        W/2, H/2+70
    );
    ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  Eaten screen  —  countdown only (no EATEN! text — shown during anim)
//  Shows after the being-eaten animation completes.
//  Displays: dark overlay + attempt bubbles + 3-2-1 countdown
// ────────────────────────────────────────────────────────────────

function drawEatenScreen(game) {
    const { ctx, canvas, dpr } = game;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.save(); ctx.scale(dpr, dpr);

    // Dark ocean overlay
    ctx.fillStyle = 'rgba(0,8,22,0.82)'; ctx.fillRect(0, 0, W, H);
    const vg = ctx.createRadialGradient(W/2, H/2, H*0.1, W/2, H/2, H*0.78);
    vg.addColorStop(0, 'rgba(0,20,50,0)');
    vg.addColorStop(1, 'rgba(0,10,30,0.55)');
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    // ── Attempt bubbles ───────────────────────────────────────
    const bubR   = 14;
    const bubGap = 36;
    const startX = W/2 - (MAX_ATTEMPTS * bubGap) / 2 + bubR;
    const bubY   = H/2 - 30;
    const isLast = game.attempts === 1;

    ctx.shadowBlur = 0;
    ctx.textAlign  = 'center'; ctx.textBaseline = 'middle';
    ctx.font       = "bold 16px 'Exo 2', sans-serif";
    ctx.fillStyle  = isLast ? 'rgba(255,160,60,0.95)' : 'rgba(160,210,255,0.85)';
    ctx.fillText(isLast ? 'LAST ATTEMPT!' : 'ATTEMPTS REMAINING', W/2, bubY - 34);

    for (let a = 0; a < MAX_ATTEMPTS; a++) {
        const bx   = startX + a * bubGap;
        const used = a >= game.attempts;
        ctx.beginPath();
        ctx.arc(bx, bubY, bubR, 0, Math.PI * 2);
        if (used) {
            ctx.fillStyle   = 'rgba(0,0,0,0.4)';
            ctx.strokeStyle = 'rgba(70,80,110,0.5)';
            ctx.shadowBlur  = 0;
        } else if (isLast) {
            const pulse = 0.5 + Math.sin(game.elapsed * 6) * 0.5;
            const grd   = ctx.createRadialGradient(bx-4, bubY-4, 1, bx, bubY, bubR);
            grd.addColorStop(0, '#fff0a0');
            grd.addColorStop(0.5, `rgba(255,${Math.floor(120+60*pulse)},0,1)`);
            grd.addColorStop(1, '#cc5500');
            ctx.fillStyle   = grd;
            ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 12 + pulse * 6;
            ctx.strokeStyle = 'rgba(255,200,80,0.9)';
        } else {
            const grd = ctx.createRadialGradient(bx-4, bubY-4, 1, bx, bubY, bubR);
            grd.addColorStop(0, '#80ffdd');
            grd.addColorStop(0.6, '#00c8ff');
            grd.addColorStop(1, '#0060cc');
            ctx.fillStyle   = grd;
            ctx.shadowColor = '#00c8ff'; ctx.shadowBlur = 10;
            ctx.strokeStyle = 'rgba(180,240,255,0.9)';
        }
        ctx.lineWidth = 1.8;
        ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
    }

    // ── Countdown number ──────────────────────────────────────
    const secsLeft = Math.ceil(Math.max(0, game.eatenTimer));
    if (secsLeft > 0) {
        const pulse = 1 + Math.sin(game.elapsed * 8) * 0.06;
        ctx.save();
        ctx.translate(W/2, H/2 + 55);
        ctx.scale(pulse, pulse);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.font = "bold 80px 'Bangers', cursive";
        ctx.shadowColor = '#00c8ff'; ctx.shadowBlur = 22;
        ctx.fillStyle   = '#ffffff';
        ctx.fillText(secsLeft, 0, 0);
        ctx.restore();

        ctx.shadowBlur = 0;
        ctx.font       = "16px 'Exo 2', sans-serif";
        ctx.fillStyle  = 'rgba(140,200,255,0.65)';
        ctx.fillText('respawning…', W/2, H/2 + 110);
    }

    ctx.restore();
}


// ────────────────────────────────────────────────────────────────
//  Game Over screen
// ────────────────────────────────────────────────────────────────

function drawGameOver(game) {
    const { ctx, canvas, dpr } = game;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.save(); ctx.scale(dpr, dpr);

    // Dark overlay
    ctx.fillStyle = 'rgba(0,0,0,0.78)';
    ctx.fillRect(0, 0, W, H);

    // Image zone: top 12% to 50% of screen height
    const imgAreaTop = H * 0.12;
    const imgAreaH   = H * 0.38;

    const img = game.gameOverSprite;
    if (img && img.complete && img.naturalWidth !== 0) {
        const sc = Math.min(W * 0.80 / img.naturalWidth, imgAreaH / img.naturalHeight);
        const iW = img.naturalWidth  * sc;
        const iH = img.naturalHeight * sc;
        const iX = (W - iW) / 2;
        const iY = imgAreaTop + (imgAreaH - iH) / 2;
        ctx.save();
        ctx.shadowColor = 'rgba(0,160,255,0.6)';
        ctx.shadowBlur  = 36;
        ctx.drawImage(img, iX, iY, iW, iH);
        ctx.restore();
    } else {
        ctx.save();
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.font         = "bold 90px 'Bangers', cursive";
        ctx.shadowColor  = '#ff4f00'; ctx.shadowBlur = 28;
        ctx.fillStyle    = '#ff4f00';
        ctx.fillText('GAME OVER', W / 2, imgAreaTop + imgAreaH / 2);
        ctx.restore();
    }

    // Score area below image zone
    const scoreY = imgAreaTop + imgAreaH + 18;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.shadowBlur   = 0;

    ctx.font      = "bold 26px 'Exo 2'";
    ctx.fillStyle = '#ffffff';
    ctx.fillText('Final Score: ' + game.score, W / 2, scoreY);

    ctx.font      = "20px 'Exo 2'";
    ctx.fillStyle = game.score >= game.highScore ? '#ffd060' : '#aaaaaa';
    ctx.fillText('Best: ' + game.highScore, W / 2, scoreY + 32);

    // Try Again button
    const bW = 240, bH = 55, bX = (W - bW) / 2, bY = scoreY + 70;
    game.tryAgainButtonRect = { x: bX, y: bY, w: bW, h: bH };
    const gd = ctx.createLinearGradient(bX, bY, bX, bY + bH);
    gd.addColorStop(0, '#00a8ff'); gd.addColorStop(1, '#0055aa');
    ctx.fillStyle   = gd;
    ctx.fillRect(bX, bY, bW, bH);
    ctx.strokeStyle = '#00d4ff'; ctx.lineWidth = 3;
    ctx.strokeRect(bX, bY, bW, bH);
    ctx.fillStyle    = '#fff';
    ctx.font         = "bold 28px 'Bangers', cursive";
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('TRY AGAIN', W / 2, bY + bH / 2 + 2);
    ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  Stage Clear screen
// ────────────────────────────────────────────────────────────────

function drawStageClearScreen(game) {
    const { ctx, canvas, dpr } = game;
    const W = canvas.width / dpr, H = canvas.height / dpr;
    ctx.save(); ctx.scale(dpr, dpr);
    ctx.fillStyle = 'rgba(0,18,38,0.88)'; ctx.fillRect(0, 0, W, H);

    const isVictory = game.stage >= game.MAX_STAGE;
    ctx.fillStyle = isVictory ? '#ffd060' : '#80ffc0';
    ctx.font = "bold 90px 'Bangers', cursive"; ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 15;
    ctx.fillText(isVictory ? '🏆 VICTORY! 🏆' : `STAGE ${game.stage} CLEAR!`, W/2, H/2-120);

    ctx.shadowBlur = 0;
    const lH = 30, sX = W/2-160, sY = H/2-40;
    if (game.stageClearInfo) {
        const { stageBonus, speedBonus, noDmgBonus } = game.stageClearInfo;
        const baseScore = game.score - stageBonus - speedBonus - noDmgBonus;
        const rows = [
            ['Stage Score:', baseScore, '#c0e0ff'],
            [`Stage ${game.stage} Bonus:`, `+${stageBonus}`, '#80ffb0'],
            ['Speed Bonus:', `+${speedBonus}`, '#80ffb0'],
            ['No-Damage Bonus:', `+${noDmgBonus}`, '#80ffb0'],
        ];
        rows.forEach(([lbl, val, col], idx) => {
            ctx.font = "22px 'Exo 2'"; ctx.textAlign = 'left'; ctx.fillStyle = '#c0e0ff';
            ctx.fillText(lbl, sX, sY+idx*lH);
            ctx.textAlign = 'right'; ctx.fillStyle = col;
            ctx.fillText(val, sX+320, sY+idx*lH);
        });
        ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(sX, sY+4*lH+5); ctx.lineTo(sX+320, sY+4*lH+5); ctx.stroke();
        ctx.font = "bold 24px 'Exo 2'"; ctx.textAlign = 'left'; ctx.fillStyle = '#c0e0ff';
        ctx.fillText('Total Score:', sX, sY+5*lH+10);
        ctx.textAlign = 'right'; ctx.fillStyle = '#ffd060';
        ctx.fillText(game.score, sX+320, sY+5*lH+10);
    }

    const tl = Math.max(0, Math.ceil(3.5 - game.stageClearTimer));
    ctx.font = "18px 'Exo 2'"; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(180,220,255,0.6)';
    ctx.fillText(isVictory ? '' : `Continuing in ${tl}s…`, W/2, H/2+120);

    const bW = 260, bH = 55, bX = (W-bW)/2, bY = H/2+148;
    game.continueButtonRect = { x: bX, y: bY, w: bW, h: bH };
    const gd = ctx.createLinearGradient(bX, bY, bX, bY+bH);
    gd.addColorStop(0, C.playA); gd.addColorStop(1, C.playB);
    ctx.fillStyle = gd; ctx.fillRect(bX, bY, bW, bH);
    ctx.strokeStyle = C.btnBorder; ctx.lineWidth = 2; ctx.strokeRect(bX, bY, bW, bH);
    ctx.fillStyle = '#fff'; ctx.font = "bold 28px 'Bangers', cursive";
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(isVictory ? '🔄 PLAY AGAIN' : 'CONTINUE ▶', W/2, bY+bH/2+2);
    ctx.restore();
}

// ────────────────────────────────────────────────────────────────
//  Utility
// ────────────────────────────────────────────────────────────────

function countEdible(game) {
    return (game.bgTinyfish ? game.bgTinyfish.length : 0)
        + game.bgClownfish.length  + game.bgGoldfish.length
        + game.bgSecondfish.length + game.bgTertiaryfish.length
        + game.bgTunafish.length;
}