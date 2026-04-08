/* ================================================================
   camera.js
   Camera / viewport system.

   The WORLD is WORLD_SCALE × the canvas viewport.
   The camera is centered on the player and clamped to world edges.
   All game objects live in world coordinates.
   Use worldToScreen() to convert before drawing.

   OVERVIEW MODE (Tab key or toggleOverviewMode(game)):
   Zooms out to show the entire world. Press Tab again to return.
   An on-screen button is also drawn by drawOverviewButton(game).
================================================================= */

// ── Overview mode state ──────────────────────────────────────────
let _overviewActive = false;

/**
 * Toggle the full-world overview zoom on/off.
 * When active, the camera zooms out to fit the entire world in the
 * viewport and stops following the player.
 * When deactivated, normal camera follow resumes smoothly.
 *
 * @param {GameSystem} game
 */
function toggleOverviewMode(game) {
    _overviewActive = !_overviewActive;

    if (_overviewActive) {
        // Zoom out to fit the entire world in the viewport
        const vW   = game.canvas.width  / game.dpr;
        const vH   = game.canvas.height / game.dpr;
        const zoomX = vW / game.world.w;
        const zoomY = vH / game.world.h;
        game.camZoom        = Math.min(zoomX, zoomY);   // fit-all zoom
        game._overviewZoom  = game.camZoom;
        game.cam.x          = 0;
        game.cam.y          = 0;
        game._resetCamFrame = true;   // skip smoothing this frame
    } else {
        // Let updateCamera smoothly transition back to follow mode
        game._overviewZoom  = null;
        game._resetCamFrame = false;
    }
}

/**
 * Returns true while overview mode is active.
 * Use this in your renderer / HUD to skip player-relative drawing.
 *
 * @returns {boolean}
 */
function isOverviewActive() {
    return _overviewActive;
}

/**
 * Draws an on-screen toggle button for overview mode.
 * Call this in your HUD pass (screen space, after camera transform is popped).
 *
 * @param {GameSystem} game
 */
function drawOverviewButton(game) {
    const ctx   = game.ctx;
    const label = _overviewActive ? '🔍 Exit Overview [Tab]' : '🌐 Overview [Tab]';
    const x = 12;
    const y = game.canvas.height / game.dpr - 48;
    const w = 172;
    const h = 34;

    ctx.save();
    ctx.fillStyle   = _overviewActive ? '#cc4422cc' : '#1a3a5acc';
    ctx.strokeStyle = _overviewActive ? '#ffaa88cc' : '#88bbffcc';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 7);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle    = '#ffffff';
    ctx.font         = 'bold 12px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x + 10, y + h / 2);
    ctx.restore();
}

/**
 * Wires the Tab key to toggle overview mode.
 * Call once after the game object is created, e.g. in your init function.
 *
 * @param {GameSystem} game
 */
function initOverviewHotkey(game) {
    window.addEventListener('keydown', e => {
        if (e.code === 'Tab') {
            e.preventDefault();   // stop Tab from cycling focus on the page
            toggleOverviewMode(game);
        }
    });
}

// ────────────────────────────────────────────────────────────────

/**
 * Initialises camera state on game.
 * Call once per stage (or on resize) — world size is derived from
 * the current canvas / viewport size.
 *
 * @param {GameSystem} game
 */
function initCamera(game) {
    const vW = game.canvas.width  / game.dpr;
    const vH = game.canvas.height / game.dpr;

    game.world = {
        w: vW * WORLD_SCALE,
        h: vH * WORLD_SCALE,
    };

    // Camera top-left in world coords
    game.cam = { x: 0, y: 0 };

    // Zoom starts at 1.0 (no zoom)
    game.camZoom = 1.0;
}

/**
 * Resets camera zoom and centers the view around the player.
 * Use this when you want to remove any temporary zoom or target offsets.
 * Also exits overview mode if it was active.
 *
 * @param {GameSystem} game
 */
function resetCameraView(game) {
    if (!game.cam || !game.world || typeof game.fishX !== 'number') return;

    // Exit overview if active
    if (_overviewActive) {
        _overviewActive    = false;
        game._overviewZoom = null;
    }

    // Force default zoom
    game.camZoom = 1.0;

    const vW = game.canvas.width / game.dpr;
    const vH = game.canvas.height / game.dpr;
    const visW = vW / game.camZoom;
    const visH = vH / game.camZoom;

    // Center camera on player
    game.cam.x = Math.max(0, Math.min(game.world.w - visW, game.fishX - visW / 2));
    if (visH >= game.world.h) {
        game.cam.y = (game.world.h - visH) / 2;
    } else {
        game.cam.y = Math.max(0, Math.min(game.world.h - visH, game.fishY - visH / 2));
    }

    // Prevent updateCamera from immediately overriding the reset
    game._resetCamFrame = true;
}

/**
 * Updates the camera so it smoothly follows the player.
 * Clamps so the camera never shows beyond world edges.
 * Skips all logic while overview mode is active.
 *
 * @param {GameSystem} game
 * @param {number}     dt  Delta time in seconds
 */
function updateCamera(game, dt) {
    const vW = game.canvas.width  / game.dpr;
    const vH = game.canvas.height / game.dpr;

    // ── Overview mode: lock zoom to fit the full world, no follow ──
    if (_overviewActive) {
        const zoomX  = vW / game.world.w;
        const zoomY  = vH / game.world.h;
        game.camZoom = Math.min(zoomX, zoomY);
        game.cam.x   = 0;
        game.cam.y   = 0;
        return;   // skip normal follow logic entirely
    }

    // If we just reset, skip smoothing for one frame
    if (game._resetCamFrame) {
        game._resetCamFrame = false; // consume the flag
        return;
    }

    // Zoom is fixed at 1.0 — no zoom transitions
    game.camZoom = 1.0;

    const visW = vW / game.camZoom;
    const visH = vH / game.camZoom;

    const targetX = game.fishX - visW / 2;
    const targetY = game.fishY - visH / 2;

    const LERP = 8;
    game.cam.x += (targetX - game.cam.x) * Math.min(1, LERP * dt);
    game.cam.y += (targetY - game.cam.y) * Math.min(1, LERP * dt);

    // Clamp camera to world bounds
    game.cam.x = Math.max(0, Math.min(game.world.w - visW, game.cam.x));

    if (visH >= game.world.h) {
        game.cam.y = (game.world.h - visH) / 2;
    } else {
        game.cam.y = Math.max(0, Math.min(game.world.h - visH, game.cam.y));
    }
}

/**
 * Converts a world-space point to screen (canvas CSS) space,
 * accounting for the current camera offset AND zoom.
 *
 * renderer.js applies ctx.scale(camZoom, camZoom) before all
 * world-space draw calls, so screen coords must reflect that:
 *   screen = (world - cam) * zoom
 *
 * @param {GameSystem} game
 * @param {number} wx  World X
 * @param {number} wy  World Y
 * @returns {{ x: number, y: number }}
 */
function worldToScreen(game, wx, wy) {
    const zoom = game.camZoom || 1;
    return {
        x: (wx - game.cam.x) * zoom,
        y: (wy - game.cam.y) * zoom,
    };
}

/**
 * Converts a screen-space point to world space.
 * Useful for translating mouse clicks into world coords.
 *
 * @param {GameSystem} game
 * @param {number} sx  Screen X
 * @param {number} sy  Screen Y
 * @returns {{ x: number, y: number }}
 */
function screenToWorld(game, sx, sy) {
    const zoom = game.camZoom || 1;
    return {
        x: sx / zoom + game.cam.x,
        y: sy / zoom + game.cam.y,
    };
}

/**
 * Returns true if a world-space circle is at least partially
 * visible in the current viewport (with a generous margin).
 * Accounts for camZoom so culling stays accurate as zoom changes.
 * Always returns true in overview mode so all entities are drawn.
 *
 * @param {GameSystem} game
 * @param {number} wx   World X centre
 * @param {number} wy   World Y centre
 * @param {number} r    Radius (world space)
 * @returns {boolean}
 */
function isOnScreen(game, wx, wy, r = 80) {
    // In overview mode everything is visible — skip culling
    if (_overviewActive) return true;

    const vW   = game.canvas.width  / game.dpr;
    const vH   = game.canvas.height / game.dpr;
    const zoom = game.camZoom || 1;

    // Convert world pos → screen pos (same formula as worldToScreen)
    const sx = (wx - game.cam.x) * zoom;
    const sy = (wy - game.cam.y) * zoom;

    // Scale the radius to screen space too so the margin stays correct
    const sr = r * zoom;

    return sx + sr > 0 && sx - sr < vW
        && sy + sr > 0 && sy - sr < vH;
}