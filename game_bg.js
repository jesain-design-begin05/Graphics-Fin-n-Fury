/* ================================================================
   game_bg.js
   Applies the correct CSS background class (from maps_and_stages.css)
   to #gameCanvas whenever the stage changes.

   All background classes defined in maps_and_stages.css follow the
   pattern:  path{1-5}-stage{1-3}
   They are mapped in STAGE_CSS_CLASS (constants.js).
================================================================= */

// All possible background class names — used to clear the previous one
const ALL_BG_CLASSES = [
    'path1-stage1','path1-stage2','path1-stage3',
    'path2-stage1','path2-stage2','path2-stage3',
    'path3-stage1','path3-stage2','path3-stage3',
    'path4-stage1','path4-stage2','path4-stage3',
    'path5-stage1','path5-stage2','path5-stage3',
    'game-bg',
];

/**
 * Sets the CSS background class on the game canvas to match
 * the current stage.  Removes all other background classes first.
 *
 * Call this from game._initStage() each time a new stage starts.
 *
 * @param {GameSystem} game
 */
function applyBgClass(game) {
    const canvas    = game.canvas;
    const cssClass  = STAGE_CSS_CLASS[game.stage];

    // Strip every possible bg class so there's no leftover
    canvas.classList.remove(...ALL_BG_CLASSES);

    if (cssClass) {
        canvas.classList.add(cssClass);
    }
}

/**
 * Updates the CSS background-position of the game canvas every frame
 * so that background images (e.g. the rock PNG in path1-stage1) stay
 * anchored in world space instead of always centering on the viewport.
 *
 * How it works:
 *   - cam.x = 0             → player is at the far LEFT  of the world → bgPosX = 0%
 *   - cam.x = maxScroll     → player is at the far RIGHT of the world → bgPosX = 100%
 *   - Anywhere in between   → linearly interpolated
 *
 * The first background layer (the PNG image) gets the scrolling position.
 * All subsequent gradient layers stay at "50% 100%" so they fill correctly.
 *
 * Call this every frame, right after updateCamera().
 *
 * @param {GameSystem} game
 */
function updateBgPosition(game) {
    if (!game.cam || !game.world) return;

    const vW     = game.canvas.width / game.dpr;
    const maxScroll = game.world.w - vW;

    // Avoid divide-by-zero on tiny worlds
    const scrollRatio = maxScroll > 0 ? game.cam.x / maxScroll : 0;

    // Clamp to [0, 1] just in case camera overshoots slightly
    const bgPosX = Math.max(0, Math.min(1, scrollRatio)) * 100;

    // The PNG rock layer gets the world-anchored X position.
    // Every gradient layer beneath it uses "50% 100%" (their default).
    // Count the number of background layers for the current stage so we
    // can build the right number of position values.
    // Rather than counting layers, we simply set a large enough list —
    // extra values are ignored by the browser.
    const gradientPos = '50% 100%';
    const positions = [
        `${bgPosX.toFixed(2)}% bottom`, // layer 1: the PNG image
        gradientPos, gradientPos, gradientPos,
        gradientPos, gradientPos, gradientPos,
        gradientPos, gradientPos, gradientPos,
    ].join(', ');

    game.canvas.style.backgroundPosition = positions;
}