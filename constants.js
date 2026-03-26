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
const STAGE_DEFS = {
    1:  { tinyfish: 14, clownfish: 8,  goldfish: 6,  secondfish: 3,  enemies: 2 },
    2:  { tinyfish: 10, clownfish: 10, goldfish: 8,  secondfish: 6,  tertiaryfish: 4, furyfish: 2, enemies: 3 },
    3:  { tinyfish:  6, clownfish: 8,  goldfish: 6,  secondfish: 6,  tertiaryfish: 4, tunafish: 2, furyfish: 3, enemies: 4, hasBoss: true },

    4:  { tinyfish: 12, clownfish: 10, goldfish: 8,  secondfish: 6,  tertiaryfish: 4, enemies: 4 },
    5:  { tinyfish:  8, clownfish: 12, goldfish: 8,  secondfish: 8,  tertiaryfish: 6, tunafish: 3, furyfish: 3, enemies: 5 },
    6:  { tinyfish:  5, clownfish: 8,  goldfish: 6,  secondfish: 8,  tertiaryfish: 6, tunafish: 4, furyfish: 4, enemies: 5, hasBoss: true },

    7:  { tinyfish: 10, clownfish: 10, goldfish: 8,  secondfish: 8,  tertiaryfish: 6, tunafish: 3, furyfish: 3, enemies: 5 },
    8:  { tinyfish:  6, clownfish: 10, goldfish: 8,  secondfish: 8,  tertiaryfish: 8, tunafish: 5, furyfish: 4, enemies: 6 },
    9:  { tinyfish:  4, clownfish: 8,  goldfish: 6,  secondfish: 8,  tertiaryfish: 8, tunafish: 5, furyfish: 5, enemies: 6, hasBoss: true },

    10: { tinyfish:  8, clownfish: 8,  goldfish: 6,  secondfish: 8,  tertiaryfish: 8, tunafish: 5, furyfish: 4, enemies: 6 },
    11: { tinyfish:  5, clownfish: 6,  goldfish: 5,  secondfish: 8,  tertiaryfish: 8, tunafish: 6, furyfish: 5, enemies: 7 },
    12: { tinyfish:  3, clownfish: 5,  goldfish: 4,  secondfish: 6,  tertiaryfish: 8, tunafish: 7, furyfish: 6, enemies: 7, hasBoss: true },

    13: { tinyfish:  6, clownfish: 5,  goldfish: 4,  secondfish: 6,  tertiaryfish: 8, tunafish: 6, furyfish: 5, enemies: 7 },
    14: { tinyfish:  4, clownfish: 4,  goldfish: 3,  secondfish: 5,  tertiaryfish: 8, tunafish: 7, furyfish: 6, enemies: 8 },
    15: { tinyfish:  2, clownfish: 4,  goldfish: 3,  tunafish: 6,    furyfish: 7,     enemies: 8, hasBoss: true },
};

/* ================================================================
   STAGE_CSS_CLASS
   ─────────────────────────────────────────────────────────────
   Maps each global stage number (1-15) to a CSS class defined
   in maps_and_stages.css.  applyBgClass() in game.js sets this
   class on #gameCanvas so the CSS gradient shows as background.

   Class naming convention (from maps_and_stages.css):
     path{pathNum}-stage{localStage}
     e.g.  path1-stage1, path1-stage2, path1-stage3
================================================================= */
const STAGE_CSS_CLASS = {
    //  Path 1 — Kelp Forest
    1:  'path1-stage1',
    2:  'path1-stage2',
    3:  'path1-stage3',
    //  Path 2 — Abyssal Chasm
    4:  'path2-stage1',
    5:  'path2-stage2',
    6:  'path2-stage3',
    //  Path 3 — Kraken's Lair
    7:  'path3-stage1',
    8:  'path3-stage2',
    9:  'path3-stage3',
    //  Path 4 — Sunken Atlantis
    10: 'path4-stage1',
    11: 'path4-stage2',
    12: 'path4-stage3',
    //  Path 5 — Volcanic Vent
    13: 'path5-stage1',
    14: 'path5-stage2',
    15: 'path5-stage3',
};

// ── Fish definitions ──────────────────────────────────────────
const FISH_DEF = {
    tinyfish:   { scale: 0.50, hitRadius: 10,  sizeRank: 0,  eatsFin: false, speedMin: 150, speedMax: 240 },
    clownfish:  { scale: 0.90, hitRadius: 22,  sizeRank: 1,  eatsFin: true,  speedMin: 100, speedMax: 175 },
    goldfish:   { scale: 1.30, hitRadius: 20,  sizeRank: 1,  eatsFin: true,  speedMin:  90, speedMax: 160 },
    secondfish: { scale: 1.70, hitRadius: 44,  sizeRank: 2,  eatsFin: true,  speedMin:  55, speedMax: 105 },
    tertiary:   { scale: 0.88, hitRadius: 38,  sizeRank: 2,  eatsFin: true,  speedMin:  62, speedMax: 120 },
    tunafish:   { scale: 2.05, hitRadius: 64,  sizeRank: 3,  eatsFin: true,  speedMin:  35, speedMax:  75 },
    furyfish:   { scale: 2.40, hitRadius: 78,  sizeRank: 99, eatsFin: true,  speedMin:  45, speedMax:  85 },
    enemy:      { scale: 1.95, hitRadius: 70,  sizeRank: 99, eatsFin: true,  speedMin:  35, speedMax:  68 },
    boss:       { scale: 3.00, hitRadius: 108, sizeRank: 99, eatsFin: true,  speedMin:   0, speedMax:   0 },
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
};

function playerSizeRank(playerSize) {
    if (playerSize >= 1.55) return 3;
    if (playerSize >= 1.15) return 2;
    if (playerSize >= 0.70) return 1;
    return 0;
}

const PLAYER_START_SIZE     = 0.60;
const PLAYER_MAX_SIZE       = 1.85;
const MAX_ATTEMPTS          = 5;
const RESPAWN_COUNTDOWN     = 3;
const RESPAWN_FALL_DURATION = 1.0;

const GROW = {
    TINY:   0.040,
    SMALL:  0.080,
    MEDIUM: 0.130,
    LARGE:  0.210,
};

const PLAYER_HIT_BASE    = 22;
const PLAYER_SPEED_BASE  = 340;
const FURY_SCREEN_CHASE  = 250;
const FURY_CLOSEIN_BONUS = 70;
const FURY_PATROL_SPEED  = 68;
const ENEMY_CHASE_SPEED  = 165;
const ENEMY_PATROL_SPEED = 50;

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