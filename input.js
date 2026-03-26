/* ================================================================
   input.js
   Keyboard + Mouse input handling.

   Movement  : WASD / Arrow keys  OR  mouse cursor
   Shoot     : Space bar  OR  left mouse click / tap
   Speed     : PLAYER_SPEED_BASE from constants.js
               (always faster than furyfish so Fin can escape)
================================================================= */

function initInput(game) {
    game.keys = {};

    game.mouseWorld  = null;
    game.mouseScreen = null;
    game.mouseActive = false;

    // ── Keyboard ──────────────────────────────────────────────
    window.addEventListener('keydown', e => {
        const k = e.key.toLowerCase();
        if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
        if (e.key === 'Escape') { game._togglePause(); return; }
        if (e.key === ' ' && !game.keys[' ']) game.fishAttacking = true;
        game.keys[k] = true;
    });

    window.addEventListener('keyup', e => {
        game.keys[e.key.toLowerCase()] = false;
        if (e.key === ' ') game.fishAttacking = false;
    });

    window.addEventListener('blur', () => { game.keys = {}; game.fishAttacking = false; });

    // ── Mouse move ────────────────────────────────────────────
    game.canvas.addEventListener('mousemove', e => {
        const rect = game.canvas.getBoundingClientRect();
        const sx   = e.clientX - rect.left;
        const sy   = e.clientY - rect.top;
        game.mouseScreen = { x: sx, y: sy };
        // Only activate mouse-based movement when control mode is 'mouse'
        const mode = localStorage.getItem('finNFury_controlMode') || 'keyboard';
        if (mode === 'mouse' && game.cam) {
            game.mouseWorld  = screenToWorld(game, sx, sy);
            game.mouseActive = true;
        }
    });

    // ── Click / mousedown → shoot ─────────────────────────────
    game.canvas.addEventListener('click', e => {
        _routeCanvasClick(game, e);
    });

    game.canvas.addEventListener('mousedown', e => {
        if (e.button === 0) game.fishAttacking = true;
    });

    game.canvas.addEventListener('mouseup', e => {
        if (e.button === 0) game.fishAttacking = false;
    });

    // ── Touch ─────────────────────────────────────────────────
    game.canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const t    = e.touches[0];
        const rect = game.canvas.getBoundingClientRect();
        const sx   = t.clientX - rect.left;
        const sy   = t.clientY - rect.top;
        const mode = localStorage.getItem('finNFury_controlMode') || 'keyboard';
        if (mode === 'mouse' && game.cam) { game.mouseWorld = screenToWorld(game, sx, sy); game.mouseActive = true; }
        game.fishAttacking = true;
    }, { passive: false });

    game.canvas.addEventListener('touchmove', e => {
        e.preventDefault();
        const t    = e.touches[0];
        const rect = game.canvas.getBoundingClientRect();
        const sx   = t.clientX - rect.left;
        const sy   = t.clientY - rect.top;
        const mode = localStorage.getItem('finNFury_controlMode') || 'keyboard';
        if (mode === 'mouse' && game.cam) game.mouseWorld = screenToWorld(game, sx, sy);
    }, { passive: false });

    game.canvas.addEventListener('touchend', () => { game.fishAttacking = false; });
}

// ── Canvas click router ───────────────────────────────────────
function _routeCanvasClick(game, e) {
    const rect = game.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Settings panel interactions
    if (game.showSettings) {
        if (game.closeBtnRect) {
            const b = game.closeBtnRect;
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { game._closeSettings(); return; }
        }
        _handleSettingsClick(game, x, y);
        return;
    }

    // Pause screen resume button
    if (game.isPaused && game.resumeBtnRect) {
        const b = game.resumeBtnRect;
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { game._togglePause(); return; }
        // Also check if settings icon was clicked while paused
        if (game.settingsBtnRect) {
            const s = game.settingsBtnRect;
            if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) { game._openSettings(); return; }
        }
        return; // Block other clicks while paused
    }

    // Gear / settings button (top-right, always visible during play)
    if (game.settingsBtnRect && !game.gameOver && !game.stageClear) {
        const s = game.settingsBtnRect;
        if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) { game._openSettings(); return; }
    }

    if (game.gameOver && game.tryAgainButtonRect) {
        const b = game.tryAgainButtonRect;
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { game._restartGame(); return; }
    }
    if (game.stageClear && game.continueButtonRect) {
        const b = game.continueButtonRect;
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { game._nextStage(); return; }
    }
}

// Handle clicks inside the settings panel (control mode toggle, etc.)
function _handleSettingsClick(game, x, y) {
    if (!game._settingsRows) return;
    for (const row of game._settingsRows) {
        for (const opt of row.opts) {
            if (x >= opt.x && x <= opt.x + opt.w && y >= opt.y && y <= opt.y + opt.h) {
                localStorage.setItem(row.key, opt.value);
                // If switching away from mouse, clear mouse state
                if (row.key === 'finNFury_controlMode' && opt.value !== 'mouse') {
                    game.mouseActive = false;
                    game.mouseWorld  = null;
                }
                return;
            }
        }
    }
}

// ── Mouse movement ────────────────────────────────────────────
// Fish glides toward cursor at PLAYER_SPEED_BASE px/s
function applyMouseMovement(game, dt) {
    // If control mode is not mouse, clear mouse state and bail
    const mode = localStorage.getItem('finNFury_controlMode') || 'keyboard';
    if (mode !== 'mouse') { game.mouseActive = false; return; }
    if (!game.mouseActive || !game.mouseWorld) return;

    const DEAD_ZONE = 14;

    const dx   = game.mouseWorld.x - game.fishX;
    const dy   = game.mouseWorld.y - game.fishY;
    const dist = Math.hypot(dx, dy);

    if (dist < DEAD_ZONE) return;

    const move = Math.min(PLAYER_SPEED_BASE * dt, dist);
    game.fishX += (dx / dist) * move;
    game.fishY += (dy / dist) * move;
    game.fishMoving    = true;
    game.fishFacingLeft = dx < 0;
}

// ── Keyboard movement ─────────────────────────────────────────
function applyKeyboardMovement(game, dt) {
    // If control mode is mouse, keyboard movement is disabled
    const mode = localStorage.getItem('finNFury_controlMode') || 'keyboard';
    if (mode === 'mouse') return;

    const SPD = PLAYER_SPEED_BASE;
    let moved = false;

    if (game.keys['w'] || game.keys['arrowup'])    { game.fishY -= SPD * dt; moved = true; }
    if (game.keys['s'] || game.keys['arrowdown'])  { game.fishY += SPD * dt; moved = true; }
    if (game.keys['a'] || game.keys['arrowleft'])  { game.fishX -= SPD * dt; game.fishFacingLeft = true;  moved = true; }
    if (game.keys['d'] || game.keys['arrowright']) { game.fishX += SPD * dt; game.fishFacingLeft = false; moved = true; }

    if (moved) game.fishMoving = true;
}