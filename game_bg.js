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