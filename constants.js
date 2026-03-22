/* ================================================================
   constants.js
================================================================= */

const BTN_DEFS = [
    { id: 'play',      label: '▶   PLAY',          primary: true  },
    { id: 'howtoplay', label: '📖   HOW TO PLAY',   primary: false },
    { id: 'settings',  label: '⚙   SETTINGS',       primary: false },
];

const C = {
    bg0: '#000d1a', bg1: '#001e3c', bg2: '#002f54',
    panelFill:   'rgba(5, 18, 42, 0.82)',
    panelBorder: 'rgba(80, 170, 230, 0.38)',
    panelSheen:  'rgba(255,255,255,0.06)',
    panelGlow:   'rgba(0, 160, 255, 0.22)',
    subtitle:    'rgba(100, 210, 255, 0.9)',
    titleYellow: '#ffc940',
    titleOrange: '#ff8c00',
    tagline:     'rgba(130, 220, 255, 0.75)',
    hint:        'rgba(100, 170, 210, 0.55)',
    playA: '#ff9520', playB: '#ff4f00',
    playHA:'#ffb040', playHB:'#ff6a10',
    subA:  'rgba(14,60,120,0.75)', subB:  'rgba(8,38,82,0.75)',
    subHA: 'rgba(22,90,170,0.90)', subHB: 'rgba(12,55,120,0.90)',
    btnBorder:    'rgba(60, 195, 255, 0.50)',
    btnBorderH:   'rgba(120, 230, 255, 1.00)',
    btnTextShadow:'rgba(0,0,0,0.6)',
};

const SCORE = {
    TINY:         5,
    SMALL:        15,
    MEDIUM:       35,
    LARGE:        80,
    POISON:       60,
    ENEMY:        80,
    GIANT_POISON: 120,
    PEARL:        50,
    BOSS_HIT:     200,
    BOSS_KILL:    2000,
};

const WORLD_SCALE = 2.8;

// ── Stage definitions ─────────────────────────────────────────
const STAGE_DEFS = {
    1: { tinyfish: 14, clownfish: 8,  goldfish: 6,  secondfish: 3,  enemies: 2 },
    2: { tinyfish: 10, clownfish: 10, goldfish: 8,  secondfish: 6,  tertiaryfish: 4, enemies: 3 },
    3: { tinyfish:  8, clownfish: 12, goldfish: 8,  secondfish: 7,  tertiaryfish: 6, furyfish: 3, enemies: 4 },
    4: { tinyfish:  6, clownfish: 12, goldfish: 8,  secondfish: 8,  tertiaryfish: 8, tunafish: 4, furyfish: 4, enemies: 5 },
    5: { tinyfish:  4, clownfish: 8,  goldfish: 6,  tunafish: 4,    furyfish: 3,     enemies: 4, hasBoss: true },
};

// ── Fish definitions ──────────────────────────────────────────
//
// SIZE TIER VISUAL HIERARCHY (what player sees on screen):
//   tinyfish  → very small   (scale 0.22)  — clearly bite-sized
//   clownfish → small        (scale 0.50)  — noticeably bigger than Fin at start
//   goldfish  → small        (scale 0.45)  — similar to clownfish
//   secondfish→ medium       (scale 1.00)  — clearly 2× bigger than Fin at start
//   tertiary  → medium       (scale 0.88)  — slightly smaller than secondfish
//   tunafish  → large        (scale 1.45)  — imposing
//   furyfish  → HUGE poison  (scale 2.10)  — unmistakably dangerous
//   enemy     → HUGE poison  (scale 1.95)  — large and threatening
//   boss      → MASSIVE      (scale 2.80)
//
// PLAYER START SIZE = 0.42
// At start Fin is between tinyfish (0.22) and clownfish (0.50):
//   bigger than tinyfish → can eat them
//   smaller than clownfish → clownfish eats Fin
//
// sizeRank gating:
//   0 = tinyfish   (playerSize < 0.50, rank 0)
//   1 = small      (playerSize >= 0.50, rank 1)
//   2 = medium     (playerSize >= 0.85, rank 2)
//   3 = large      (playerSize >= 1.25, rank 3)
//  99 = always dangerous
//
// eatsFin: true → fish eats Fin when rank < sizeRank (uses 1 attempt)
// eatsFin: false → fish just repels Fin (tiny fish never eat Fin back)
//
// hitRadius: fixed world-px collision radius (NOT scaled by playerSize)
// speedMin/Max: patrol px/s — smaller fish are faster
const FISH_DEF = {
    // ── Tier 0: VERY SMALL — only edible at the very start ──────
    tinyfish:   { scale: 0.22, hitRadius: 10, sizeRank: 0, eatsFin: false, speedMin: 150, speedMax: 240 },

    // ── Tier 1: SMALL — edible once Fin grows past tinyfish ─────
    // These eat Fin back if Fin is still rank-0 (tiny stage)
    clownfish:  { scale: 0.50, hitRadius: 22, sizeRank: 1, eatsFin: true,  speedMin: 100, speedMax: 175 },
    goldfish:   { scale: 0.45, hitRadius: 20, sizeRank: 1, eatsFin: true,  speedMin:  90, speedMax: 160 },

    // ── Tier 2: MEDIUM — clearly larger than Fin at start ───────
    secondfish: { scale: 1.00, hitRadius: 44, sizeRank: 2, eatsFin: true,  speedMin:  55, speedMax: 105 },
    tertiary:   { scale: 0.88, hitRadius: 38, sizeRank: 2, eatsFin: true,  speedMin:  62, speedMax: 120 },

    // ── Tier 3: LARGE — imposing, slow ──────────────────────────
    tunafish:   { scale: 1.45, hitRadius: 64, sizeRank: 3, eatsFin: true,  speedMin:  35, speedMax:  75 },

    // ── Tier 99: POISONOUS — massive, always eat Fin ────────────
    furyfish:   { scale: 2.10, hitRadius: 78, sizeRank: 99, eatsFin: true, speedMin:  45, speedMax:  85 },
    enemy:      { scale: 1.95, hitRadius: 70, sizeRank: 99, eatsFin: true, speedMin:  35, speedMax:  68 },
    boss:       { scale: 2.80, hitRadius: 108, sizeRank: 99, eatsFin: true, speedMin:  0,  speedMax:   0 },
};

// Legacy FISH_SCALE alias for renderer
const FISH_SCALE = {
    tinyfish:   FISH_DEF.tinyfish.scale,
    clownfish:  FISH_DEF.clownfish.scale,
    goldfish:   FISH_DEF.goldfish.scale,
    secondfish: FISH_DEF.secondfish.scale,
    tertiary:   FISH_DEF.tertiary.scale,
    tunafish:   FISH_DEF.tunafish.scale,
    furyfish:   FISH_DEF.furyfish.scale,
    enemy:      FISH_DEF.enemy.scale,
    boss:       FISH_DEF.boss.scale,
};

// ── Player size → rank ────────────────────────────────────────
// Rank 0: can only eat tinyfish (rank 0)
// Rank 1: can eat small fish    (clownfish, goldfish)
// Rank 2: can eat medium fish   (secondfish, tertiary)
// Rank 3: can eat large fish    (tunafish)
function playerSizeRank(playerSize) {
    if (playerSize >= 1.25) return 3;
    if (playerSize >= 0.85) return 2;
    if (playerSize >= 0.50) return 1;
    return 0;
}

// ── Player starting size ──────────────────────────────────────
// 0.42: visually bigger than tinyfish (0.22), smaller than clownfish (0.50)
// This makes it obvious what Fin can and cannot eat at the start
const PLAYER_START_SIZE = 0.42;

// ── Max player size ───────────────────────────────────────────
const PLAYER_MAX_SIZE = 1.85;

// ── Attempts ─────────────────────────────────────────────────
const MAX_ATTEMPTS = 5;

// ── Respawn timing ────────────────────────────────────────────
const RESPAWN_COUNTDOWN     = 3;    // seconds of countdown screen
const RESPAWN_FALL_DURATION = 1.0;  // seconds for Fin to fall in from top

// ── Growth per eat ────────────────────────────────────────────
// Bigger fish = bigger reward. Eating one large fish is very significant.
const GROW = {
    TINY:   0.040,   // small but noticeable per tiny fish (need ~2 to unlock small)
    SMALL:  0.080,   // clear jump per small fish
    MEDIUM: 0.130,
    LARGE:  0.210,
};

// ── Player hitbox ─────────────────────────────────────────────
// Actual radius = min(PLAYER_HIT_BASE * playerSize, 42)
const PLAYER_HIT_BASE = 22;

// ── Movement speeds (px/s) ────────────────────────────────────
const PLAYER_SPEED_BASE  = 340;

const FURY_SCREEN_CHASE  = 250;
const FURY_CLOSEIN_BONUS = 70;
const FURY_PATROL_SPEED  = 68;

const ENEMY_CHASE_SPEED  = 165;
const ENEMY_PATROL_SPEED = 50;

// ── Minimap settings ─────────────────────────────────────────
const MINIMAP = {
    SIZE:       150,
    MARGIN:     14,
    ALPHA:      0.82,
    DOT_TINY:   '#aaffff',
    DOT_SMALL:  '#ffffff',
    DOT_MEDIUM: '#ffe080',
    DOT_LARGE:  '#ff9020',
    DOT_PLAYER: '#00ff88',
    // No DOT_PEARL — pearls removed from minimap per request
};