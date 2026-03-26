/* ================================================================
   camera.js
   Camera / viewport system.

   The WORLD is WORLD_SCALE × the canvas viewport.
   The camera is centered on the player and clamped to world edges.
   All game objects live in world coordinates.
   Use worldToScreen() to convert before drawing.
================================================================= */

/**
 * Initialises camera state on `game`.
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
 * Updates the camera so it smoothly follows the player.
 * Clamps so the camera never shows beyond world edges.
 *
 * @param {GameSystem} game
 * @param {number}     dt  Delta time in seconds
 */
function updateCamera(game, dt) {
    const vW = game.canvas.width  / game.dpr;
    const vH = game.canvas.height / game.dpr;

    const SIZE_MIN   = 0.42;
    const SIZE_MAX   = 1.85;
    const ZOOM_BIG   = 1.00;   // zoom when Fin is tiny
    const ZOOM_SMALL = 0.65;   // zoom when Fin is at max size
    const t = Math.max(0, Math.min(1, (game.playerSize - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)));
    const targetZoom = ZOOM_BIG + (ZOOM_SMALL - ZOOM_BIG) * t;

    // Smooth zoom transition
    if (!game.camZoom) game.camZoom = ZOOM_BIG;
    game.camZoom += (targetZoom - game.camZoom) * Math.min(1, 3 * dt);

    // ── Camera follow ─────────────────────────────────────────
    // visW/visH = how much of the world is visible at current zoom.
    // A zoom of 0.65 means the viewport shows MORE world (wider view).
    const visW = vW / game.camZoom;
    const visH = vH / game.camZoom;

    const targetX = game.fishX - visW / 2;
    const targetY = game.fishY - visH / 2;

    const LERP = 8;
    game.cam.x += (targetX - game.cam.x) * Math.min(1, LERP * dt);
    game.cam.y += (targetY - game.cam.y) * Math.min(1, LERP * dt);

    // Clamp so camera never shows outside world bounds
    game.cam.x = Math.max(0, Math.min(game.world.w - visW, game.cam.x));
    game.cam.y = Math.max(0, Math.min(game.world.h - visH, game.cam.y));
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
 *
 * @param {GameSystem} game
 * @param {number} wx   World X centre
 * @param {number} wy   World Y centre
 * @param {number} r    Radius (world space)
 * @returns {boolean}
 */
function isOnScreen(game, wx, wy, r = 80) {
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