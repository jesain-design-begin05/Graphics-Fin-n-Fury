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

    // Target: player at screen centre
    const targetX = game.fishX - vW / 2;
    const targetY = game.fishY - vH / 2;

    // Smooth follow (lerp factor — higher = snappier)
    const LERP = 8;
    game.cam.x += (targetX - game.cam.x) * Math.min(1, LERP * dt);
    game.cam.y += (targetY - game.cam.y) * Math.min(1, LERP * dt);

    // Clamp to world bounds
    game.cam.x = Math.max(0, Math.min(game.world.w - vW, game.cam.x));
    game.cam.y = Math.max(0, Math.min(game.world.h - vH, game.cam.y));
}

/**
 * Converts a world-space point to screen (canvas CSS) space.
 *
 * @param {GameSystem} game
 * @param {number} wx  World X
 * @param {number} wy  World Y
 * @returns {{ x: number, y: number }}
 */
function worldToScreen(game, wx, wy) {
    return {
        x: wx - game.cam.x,
        y: wy - game.cam.y,
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
    return {
        x: sx + game.cam.x,
        y: sy + game.cam.y,
    };
}

/**
 * Returns true if a world-space circle is at least partially
 * visible in the current viewport (with a generous margin).
 * Use to cull draw calls for off-screen fish.
 *
 * @param {GameSystem} game
 * @param {number} wx   World X centre
 * @param {number} wy   World Y centre
 * @param {number} r    Radius
 * @returns {boolean}
 */
function isOnScreen(game, wx, wy, r = 80) {
    const vW = game.canvas.width  / game.dpr;
    const vH = game.canvas.height / game.dpr;
    const sx = wx - game.cam.x;
    const sy = wy - game.cam.y;
    return sx + r > 0 && sx - r < vW && sy + r > 0 && sy - r < vH;
}