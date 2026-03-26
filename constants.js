/* ================================================================
   constants.js
================================================================= */

const BTN_DEFS = [
    { id: 'play',      label: '▶   PLAY',          primary: true  },
    { id: 'howtoplay', label: '📖   HOW TO PLAY',   primary: false },
    { id: 'settings',  label: '⚙   SETTINGS',       primary: false },
];

const STAGE_BTN_DEFS = [
    { id: 'start_1',  label: 'STAGES 1–5',   theme: 'ocean',   src: 'thumbnail/day.png'      },
    { id: 'start_6',  label: 'STAGES 6–10',  theme: 'abyss',   src: 'thumbnail/abbys.png'    },
    { id: 'start_11', label: 'STAGES 11–15', theme: 'volcano', src: 'thumbnail/volcanic.png' },
    { id: 'back',     label: '🔙 BACK',       primary: false },
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

/* ================================================================
   STAGE STRUCTURE — 5 Paths × 3 Stages each = 15 stages total
================================================================= */

function furyHpForStage(stage) {
    return Math.min(8, 2 + Math.floor((stage - 1) / 2));
}

function enemyHpForStage(stage) {
    return Math.min(6, 2 + Math.floor((stage - 1) / 3));
}

const STAGE_DEFS = {
    // ── Path 1: Kelp Forest (stages 1–3) ──────────────────────────────
    1:  { tinyfish: 10, clownfish:  6, goldfish:  5,                                                              enemies: 2                             },
    2:  { tinyfish: 12, clownfish:  7, goldfish:  6,                                           furyfish:  3,      enemies: 4                             },
    3:  { tinyfish: 10, clownfish:  8, goldfish:  6, secondfish:  4,             tunafish:  2,  furyfish:  4,     enemies: 5, hasBoss: true               },

    // ── Path 2: Abyssal Chasm (stages 4–6) ────────────────────────────
    4:  { tinyfish: 12, clownfish:  9, goldfish:  8, secondfish:  5,                                              enemies: 5                             },
    5:  { tinyfish: 10, clownfish: 10, goldfish:  8, secondfish:  6, tertiaryfish:  4,         furyfish:  5,      enemies: 6                             },
    6:  { tinyfish:  8, clownfish: 10, goldfish:  8, secondfish:  7, tertiaryfish:  5, tunafish:  3, furyfish: 6, enemies: 6, hasBoss: true               },

    // ── Path 3: Kraken's Lair (stages 7–9) ────────────────────────────
    7:  { tinyfish:  8, clownfish: 11, goldfish:  9, secondfish:  8, tertiaryfish:  7, tunafish:  5, furyfish: 6, enemies: 7                             },
    8:  { tinyfish:  6, clownfish: 11, goldfish:  9, secondfish:  9, tertiaryfish:  9, tunafish:  7, furyfish: 7, enemies: 8                             },
    9:  { tinyfish:  5, clownfish: 11, goldfish:  9, secondfish: 10, tertiaryfish: 10, tunafish: 10, furyfish: 8, enemies: 8, hasBoss: true               },

    // ── Path 4: Sunken Atlantis (stages 10–12) ────────────────────────
    10: { tinyfish:  4, clownfish: 10, goldfish:  8, secondfish: 11, tertiaryfish: 12, tunafish: 10, furyfish: 8, enemies: 9                             },
    11: { tinyfish:  3, clownfish:  9, goldfish:  8, secondfish: 12, tertiaryfish: 14, tunafish: 13, furyfish: 9, enemies:10                             },
    12: { tinyfish:  2, clownfish:  9, goldfish:  7, secondfish: 12, tertiaryfish: 16, tunafish: 18, furyfish:10, enemies:10, hasBoss: true               },

    // ── Path 5: Volcanic Vent (stages 13–15) ──────────────────────────
    13: { tinyfish:  2, clownfish:  8, goldfish:  7, secondfish: 12, tertiaryfish: 18, tunafish: 20, furyfish:10, enemies:11                             },
    14: { tinyfish:  2, clownfish:  7, goldfish:  6, secondfish: 12, tertiaryfish: 20, tunafish: 24, furyfish:11, enemies:12                             },
    15: { tinyfish:  2, clownfish:  7, goldfish:  6, secondfish: 13, tertiaryfish: 22, tunafish: 28, furyfish:12, enemies:12, hasBoss: true               },
};

const STAGE_CSS_CLASS = {
    1:  'path1-stage1',
    2:  'path1-stage2',
    3:  'path1-stage3',
    4:  'path2-stage1',
    5:  'path2-stage2',
    6:  'path2-stage3',
    7:  'path3-stage1',
    8:  'path3-stage2',
    9:  'path3-stage3',
    10: 'path4-stage1',
    11: 'path4-stage2',
    12: 'path4-stage3',
    13: 'path5-stage1',
    14: 'path5-stage2',
    15: 'path5-stage3',
};

/* ================================================================
   FISH DEFINITIONS
   ─────────────────────────────────────────────────────────────
   sizeRank controls which rank Fin must reach before eating a fish.
   playerSizeRank() maps Fin's playerSize float → rank 0–3.

   Visual scale → sizeRank alignment (keep these in sync!):
     scale ~0.50  → sizeRank 0  (tinyfish, always edible)
     scale ~0.90  → sizeRank 1  (clownfish, needs small Fin)
     scale ~1.30  → sizeRank 2  (goldfish — BIG, needs medium Fin)
     scale ~1.70+ → sizeRank 2  (secondfish / tertiary)
     scale ~2.05+ → sizeRank 3  (tunafish, needs large Fin)
================================================================= */
const FISH_DEF = {
    // Always edible — rank 0
    tinyfish:   { scale: 0.50, hitRadius: 10,  sizeRank: 0,  eatsFin: false, speedMin: 150, speedMax: 240 },

    // Rank 1 — edible when Fin is small (playerSize ≥ 0.90)
    clownfish:  { scale: 0.90, hitRadius: 22,  sizeRank: 1,  eatsFin: true,  speedMin: 100, speedMax: 175 },

    // FIX: goldfish scale is 1.30 — visually much larger than clownfish.
    // Was sizeRank 1 (same as clownfish), so tiny Fin could eat a goldfish
    // that towered over him.  Bumped to sizeRank 2 so Fin must grow to
    // medium rank first.  hitRadius also corrected to match its larger body.
    goldfish:   { scale: 1.30, hitRadius: 28,  sizeRank: 2,  eatsFin: true,  speedMin:  90, speedMax: 160 },

    // Rank 2 — edible at medium rank (playerSize ≥ 1.10)
    secondfish: { scale: 1.70, hitRadius: 44,  sizeRank: 2,  eatsFin: true,  speedMin:  55, speedMax: 105 },
    tertiary:   { scale: 0.88, hitRadius: 38,  sizeRank: 2,  eatsFin: true,  speedMin:  62, speedMax: 120 },

    // Rank 3 — edible only when Fin is large (playerSize ≥ 1.55)
    tunafish:   { scale: 2.05, hitRadius: 64,  sizeRank: 3,  eatsFin: true,  speedMin:  35, speedMax:  75 },

    // Always dangerous — sizeRank 99 means Fin can never eat them
    furyfish:   { scale: 2.40, hitRadius: 78,  sizeRank: 99, eatsFin: true,  speedMin:  45, speedMax:  85 },
    enemy:      { scale: 1.95, hitRadius: 90,  sizeRank: 99, eatsFin: true,  speedMin:  35, speedMax:  68 },
    boss:       { scale: 3.00, hitRadius: 108, sizeRank: 99, eatsFin: true,  speedMin:   0, speedMax:   0 },
    kingCrab:   { scale: 2.60, hitRadius: 100, sizeRank: 99, eatsFin: true,  speedMin:  30, speedMax:  60 },
};

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
    kingCrab:   FISH_DEF.kingCrab.scale,
};

/* ================================================================
   playerSizeRank
   ─────────────────────────────────────────────────────────────
   Maps Fin's playerSize float to a discrete rank (0–3).
   Thresholds sit BETWEEN fish-scale groups so each rank-up
   feels like a clear visual milestone:

     Rank 0 (tiny)   playerSize < 0.90  → eat tinyfish only
     Rank 1 (small)  0.90 ≤ size < 1.10 → + clownfish
     Rank 2 (medium) 1.10 ≤ size < 1.55 → + goldfish, secondfish, tertiary
     Rank 3 (large)  size ≥ 1.55        → + tunafish

   FIX: rank-2 threshold changed 1.30 → 1.10.
   The old threshold of 1.30 matched goldfish's scale exactly,
   which meant Fin had to be AS BIG as a goldfish before eating one —
   visually confusing.  At 1.10 Fin is clearly bigger than clownfish
   (0.90) but still noticeably smaller than goldfish (1.30), so the
   "I'm finally big enough to eat that!" moment lands correctly.
================================================================= */
function playerSizeRank(playerSize) {
    if (playerSize >= 1.55) return 3;   // large  — eat tunafish
    if (playerSize >= 1.10) return 2;   // medium — eat goldfish / secondfish / tertiary
    if (playerSize >= 0.90) return 1;   // small  — eat clownfish
    return 0;                           // tiny   — eat tinyfish only
}

const PLAYER_START_SIZE     = 0.60;
const PLAYER_MAX_SIZE       = 2.55;
const MAX_ATTEMPTS          = 5;
const RESPAWN_COUNTDOWN     = 3;
const RESPAWN_FALL_DURATION = 1.0;

const GROW = {
    TINY:   0.060,
    SMALL:  0.090,
    MEDIUM: 0.130,
    LARGE:  0.210,
};

const PLAYER_HIT_BASE    = 22;
const PLAYER_SPEED_BASE  = 340;

const FIN_MAX_HP         = 5;
const KING_CRAB_DAMAGE   = 1;
const KING_CRAB_COOLDOWN = 2.5;
const FURY_SCREEN_CHASE  = 250;
const FURY_CLOSEIN_BONUS = 70;
const FURY_PATROL_SPEED  = 68;
const ENEMY_CHASE_SPEED  = 165;
const ENEMY_PATROL_SPEED = 50;

const FURYFISH_HP        = 3;
const ENEMY_HP           = 2;

const PEARL_FIRE_INTERVAL = 0.45;
const PEARL_FIRE_BURST    = 5;
const CLAM_RESPAWN_TIME   = 12.0;

// ── Enemy respawn constants ──────────────────────────────────
const ENEMY_RESPAWN_DELAY    = 8.0;  // seconds before enemy respawns
const FURYFISH_RESPAWN_DELAY = 10.0; // seconds before furyfish respawns

// ── Speed bubble powerup constants ───────────────────────────
// Shared by collisions.js (spawn/pickup) and input.js (movement).
const SPEED_BUBBLE_LIFESPAN       = 5.0;   // seconds bubble floats before auto-despawn
const SPEED_BUBBLE_DURATION       = 5.0;   // seconds the speed boost lasts after pickup
const SPEED_BUBBLE_MULTIPLIER     = 1.75;  // ×1.75 speed while boosted
const SPEED_BUBBLE_RADIUS         = 22;    // world-space pickup radius
const SPEED_BUBBLE_SPAWN_INTERVAL = 8;     // seconds between auto-spawns
const SPEED_BUBBLE_MAX            = 3;     // max bubbles alive at once

const MINIMAP = {
    SIZE:       150,
    MARGIN:     14,
    ALPHA:      0.82,
    DOT_TINY:   '#aaffff',
    DOT_SMALL:  '#ffffff',
    DOT_MEDIUM: '#ffe080',
    DOT_LARGE:  '#ff9020',
    DOT_PLAYER: '#00ff88',
};