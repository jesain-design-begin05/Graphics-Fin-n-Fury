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
        // Pause / settings menu hover
        _routeCanvasMouseMove(game, sx, sy);
        // Drag sliders in settings
        if (game.showSettings && game._settingsDragging) {
            _handleSettingsDrag(game, sx, sy);
            return;
        }
        // Only activate mouse-based movement when control mode is 'mouse'
        const mode = localStorage.getItem('finNFury_controlMode') || 'keyboard';
        if (mode === 'mouse' && game.cam && !game.isPaused) {
            game.mouseWorld  = screenToWorld(game, sx, sy);
            game.mouseActive = true;
        }
    });

    // ── Click / mousedown → shoot ─────────────────────────────
    game.canvas.addEventListener('click', e => {
        _routeCanvasClick(game, e);
    });

    game.canvas.addEventListener('mousedown', e => {
        if (e.button === 0) {
            const mode = localStorage.getItem('finNFury_controlMode') || 'keyboard';
            if (game.showSettings) {
                game._settingsDragging = true;
                return;
            }
            // In mouse control mode, left-click moves the fish — don't also shoot
            if (mode !== 'mouse') game.fishAttacking = true;
        }
    });

    game.canvas.addEventListener('mouseup', e => {
        if (e.button === 0) {
            game._settingsDragging = false;
            game.fishAttacking = false;
        }
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

    // ── Settings panel ────────────────────────────────────
    if (game.showSettings) {
        // Back link (stored in closeBtnRect by renderer)
        if (game.closeBtnRect) {
            const b = game.closeBtnRect;
            if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { game._closeSettings(); return; }
        }
        _handleSettingsClick(game, x, y);
        return;
    }

    // ── Pause menu ────────────────────────────────────────
    if (game.isPaused) {
        const items = game._pauseMenuItems || [];
        for (const item of items) {
            if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) {
                if (item.key === 'resume')   { game._togglePause(); return; }
                if (item.key === 'settings') { game._openSettings(); return; }
                if (item.key === 'home')     { game._goHome(); return; }
            }
        }
        // Also allow gear icon to open settings while paused
        if (game.settingsBtnRect) {
            const s = game.settingsBtnRect;
            if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) { game._openSettings(); return; }
        }
        return; // block other clicks while paused
    }

    // ── Gear / settings button (top-right, during normal play) ──
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

// ── Hover detection for pause menu ───────────────────────────────
function _routeCanvasMouseMove(game, x, y) {
    if (game.showSettings) {
        // Hover over Back link
        const b = game.closeBtnRect;
        game._pauseHover = (b && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h)
            ? 'settingsBack' : null;
        return;
    }
    if (!game.isPaused) { game._pauseHover = null; return; }
    const items = game._pauseMenuItems || [];
    game._pauseHover = null;
    for (const item of items) {
        if (x >= item.x && x <= item.x + item.w && y >= item.y && y <= item.y + item.h) {
            game._pauseHover = item.key; break;
        }
    }
}

// Handle clicks + drags inside the settings panel
function _handleSettingsClick(game, x, y) {
    const hr = game._settingsHitRects;
    if (!hr) return;

    // Save & Close button
    const sb = hr.saveBtn;
    if (x >= sb.x && x <= sb.x + sb.w && y >= sb.y && y <= sb.y + sb.h) {
        game._closeSettings();
        return;
    }

    // Music volume slider
    const s1 = hr.s1;
    if (x >= s1.x && x <= s1.x + s1.w && y >= s1.y && y <= s1.y + s1.h) {
        game._settings.musicVol = Math.max(0, Math.min(1, (x - s1.x) / s1.w));
        if (game.bgm) game.bgm.volume = game._settings.musicVol;
        return;
    }

    // SFX volume slider
    const s2 = hr.s2;
    if (x >= s2.x && x <= s2.x + s2.w && y >= s2.y && y <= s2.y + s2.h) {
        game._settings.sfxVol = Math.max(0, Math.min(1, (x - s2.x) / s2.w));
        return;
    }

    // Control mode dropdown — cycle on click
    const m = hr.modeHitRect;
    if (x >= m.x && x <= m.x + m.w && y >= m.y && y <= m.y + m.h) {
        const cur = m.values.indexOf(game._settings.controlMode);
        game._settings.controlMode = m.values[(cur + 1) % m.values.length];
        return;
    }

    // Fullscreen toggle
    const f = hr.fsHitRect;
    if (x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h) {
        game._settings.fullscreen = !game._settings.fullscreen;
        return;
    }
}

// Drag support for sliders — track mousedown inside settings panel
function _handleSettingsDrag(game, x, y) {
    const hr = game._settingsHitRects;
    if (!hr) return;
    const s1 = hr.s1;
    if (x >= s1.x && x <= s1.x + s1.w && y >= s1.y && y <= s1.y + s1.h) {
        game._settings.musicVol = Math.max(0, Math.min(1, (x - s1.x) / s1.w));
        if (game.bgm) game.bgm.volume = game._settings.musicVol;
    }
    const s2 = hr.s2;
    if (x >= s2.x && x <= s2.x + s2.w && y >= s2.y && y <= s2.y + s2.h) {
        game._settings.sfxVol = Math.max(0, Math.min(1, (x - s2.x) / s2.w));
    }
}

// ── Mouse movement ────────────────────────────────────────────
// Fish glides toward cursor at PLAYER_SPEED_BASE px/s
function applyMouseMovement(game, dt) {
    // Use saved (committed) control mode from localStorage — _settings may be mid-edit
    const mode = localStorage.getItem('finNFury_controlMode') || 'keyboard';
    if (mode !== 'mouse') { game.mouseActive = false; return; }
    if (!game.mouseActive || !game.mouseWorld) return;
    if (game.isPaused) return;

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