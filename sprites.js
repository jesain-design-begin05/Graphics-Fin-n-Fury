/* ================================================================
   sprites.js
   All sprite/image loading for GameSystem.
   Call initSpriteContainers(game) then loadSprites(game) on init.
================================================================= */

/**
 * Attaches empty sprite-map objects onto `game`.
 * Must be called before loadSprites().
 */
function initSpriteContainers(game) {
    // bgImages / fgImages removed — backgrounds now use CSS classes
    // (see STAGE_CSS_CLASS in constants.js + applyBgClass in game.js)

    game.clownfishRestLeft    = {}; game.clownfishRestRight   = {};
    game.clownfishSwimLeft    = {}; game.clownfishSwimRight   = {};
    game.furyfishRestLeft     = {}; game.furyfishRestRight    = {};
    game.furyfishSwimLeft     = {}; game.furyfishSwimRight    = {};
    game.furyfishAttackLeft   = {}; game.furyfishAttackRight  = {};
    game.furyfishAttackAltLeft  = {}; game.furyfishAttackAltRight = {};
    game.goldfishRestLeft     = {}; game.goldfishRestRight    = {};
    game.goldfishSwimLeft     = {}; game.goldfishSwimRight    = {};
    game.secondfishRestLeft   = {}; game.secondfishRestRight  = {};
    game.secondfishSwimLeft   = {}; game.secondfishSwimRight  = {};
    game.tertiaryRestLeft     = {}; game.tertiaryRestRight    = {};
    game.tertiarySwimLeft     = {}; game.tertiarySwimRight    = {};
    game.tunafishRestLeft     = {}; game.tunafishRestRight    = {};
    game.tunafishSwimLeft     = {}; game.tunafishSwimRight    = {};
    game.mainfishRestLeft     = {}; game.mainfishRestRight    = {};
    game.mainfishSwimLeft     = {}; game.mainfishSwimRight    = {};
    game.mainfishAttackLeft   = {}; game.mainfishAttackRight  = {};

    // ── New sprite sheets ─────────────────────────────────────
    // Fin  (4 cols × 4 rows): row0=idle-L, row1=swim-L, row2=attack-L, row3=shoot-L
    // All rows face LEFT naturally — renderer flips for right-facing
    game.finSheet  = null;
    // Fury (3 cols × 2 rows): row0=patrol-L, row1=attack-L
    game.furySheet = null;
    // Boss image (bigguy.jpg)
    game.bossImg   = null;

    // ── Manta ray ─────────────────────────────────────────────
    game.mantaRayImg = null;       // manta.png  (4 cols × 2 rows = 8 frames, faces left)

    game.clamSprite       = {};
    game.pearlSprite      = null;
    game.gameOverSprite   = null;
    game.projectileSprites = {};
    game.bossSprite       = {};
    
    // ── Abyss Monster Fish boss sprites ───────────────────────
    // Load individual frames for rest (mouth closed) and swim (mouth open)
    game.abyssBossRestLeft     = {};   // Mouth closed - left facing
    game.abyssBossRestRight    = {};   // Mouth closed - right facing
    game.abyssBossSwimLeft     = {};   // Mouth open - left facing
    game.abyssBossSwimRight    = {};   // Mouth open - right facing
    game.abyssBossAttackLeft   = {};   // Attack/blast - left facing
    game.abyssBossAttackRight  = {};   // Attack/blast - right facing

    // ── Decorative world assets ───────────────────────────────
    game.decoBoat        = null;
    game.decoCoral1      = null;
    game.decoCoral3      = null;
    game.decoFishShadow  = null;
    game.decoSeagrass    = null;
    game.decoSeaweed     = null;   // ← seaweed_sprite.png
    game.clamClosedSprite = null;  // pearl.png  = clam closed
    game.clamOpenSprite   = null;  // pearl1_2.png = clam open with pearl
}

/**
 * Creates and kicks off loading for every image asset.
 * Must be called after initSpriteContainers().
 */
function loadSprites(game) {
    const img = () => new Image();

    // ── Backgrounds ───────────────────────────────────────────
    // Backgrounds are now pure CSS gradients (maps_and_stages.css).
    // No image loading needed — applyBgClass() in game.js handles it.

    // ── Fish sprite sheets ────────────────────────────────────
    const types = [
        ['clownfish',  'clownfish_sprite',  game.clownfishRestLeft,  game.clownfishRestRight,  game.clownfishSwimLeft,  game.clownfishSwimRight],
        ['goldfish',   'goldfish_sprite',   game.goldfishRestLeft,   game.goldfishRestRight,   game.goldfishSwimLeft,   game.goldfishSwimRight],
        ['secondfish', 'secondfish_sprite', game.secondfishRestLeft, game.secondfishRestRight, game.secondfishSwimLeft, game.secondfishSwimRight],
        ['tertiary',   'tertiary_sprite',   game.tertiaryRestLeft,   game.tertiaryRestRight,   game.tertiarySwimLeft,   game.tertiarySwimRight],
        ['tunafish',   'tunafish_sprite',   game.tunafishRestLeft,   game.tunafishRestRight,   game.tunafishSwimLeft,   game.tunafishSwimRight],
        ['furyfish',   'furyfish_sprite',   game.furyfishRestLeft,   game.furyfishRestRight,   game.furyfishSwimLeft,   game.furyfishSwimRight],
        ['mainfish',   'mainfish_sprite',   game.mainfishRestLeft,   game.mainfishRestRight,   game.mainfishSwimLeft,   game.mainfishSwimRight],
    ];

    for (const [name, folder, rL, rR, sL, sR] of types) {
        for (let f = 1; f <= 6; f++) {
            rL[f] = img(); rL[f].src = `fish_sprites/${folder}/${name}-rest-left-${f}.png`;
            rR[f] = img(); rR[f].src = `fish_sprites/${folder}/${name}-rest-right-${f}.png`;
            sL[f] = img(); sL[f].src = `fish_sprites/${folder}/${name}-swim-left-${f}.png`;
            sR[f] = img(); sR[f].src = `fish_sprites/${folder}/${name}-swim-right-${f}.png`;
        }
    }

    // ── Special animation frames ──────────────────────────────
    for (let f = 1; f <= 6; f++) {
        game.mainfishAttackLeft[f]      = img(); game.mainfishAttackLeft[f].src      = `fish_sprites/mainfish_attack_sprite/mainfish-attack-left-${f}.png`;
        game.mainfishAttackRight[f]     = img(); game.mainfishAttackRight[f].src     = `fish_sprites/mainfish_attack_sprite/mainfish-attack-right-${f}.png`;
        game.furyfishAttackLeft[f]      = img(); game.furyfishAttackLeft[f].src      = `fish_sprites/furyfish_attack_sprite/furyfish-attack-left-${f}.png`;
        game.furyfishAttackRight[f]     = img(); game.furyfishAttackRight[f].src     = `fish_sprites/furyfish_attack_sprite/furyfish-attack-right-${f}.png`;
        game.furyfishAttackAltLeft[f]   = img(); game.furyfishAttackAltLeft[f].src   = `fish_sprites/furyfish_attack_sprite/furyfish-attack-alt-left-${f}.png`;
        game.furyfishAttackAltRight[f]  = img(); game.furyfishAttackAltRight[f].src  = `fish_sprites/furyfish_attack_sprite/furyfish-attack-alt-right-${f}.png`;
    }

    // ── New sprite sheets ─────────────────────────────────────
    game.finSheet  = img();
    game.furySheet = img();

    game.finSheet.src  = 'fish_sprites/Finnew_sprite/fin_sprite-removebg-previeww.png';
    game.furySheet.src = 'fish_sprites/furyfish_sprite/furyfish.png';

    // Boss image — bigguy.jpg
    game.bossImg = img();
    game.bossImg.src = 'bigguy.jpg';
    
    // ── Abyss Monster Fish boss sprite frames ──────────────────
    // Load individual frames (6 frames each) for each animation type
    for (let f = 1; f <= 6; f++) {
        game.abyssBossRestLeft[f]   = img(); game.abyssBossRestLeft[f].src   = `fish_sprites/abyss/abyss_monster_fish-rest-left-${f}.png`;
        game.abyssBossRestRight[f]  = img(); game.abyssBossRestRight[f].src  = `fish_sprites/abyss/abyss_monster_fish-rest-right-${f}.png`;
        game.abyssBossSwimLeft[f]   = img(); game.abyssBossSwimLeft[f].src   = `fish_sprites/abyss/abyss_monster_fish-swim-left-${f}.png`;
        game.abyssBossSwimRight[f]  = img(); game.abyssBossSwimRight[f].src  = `fish_sprites/abyss/abyss_monster_fish-swim-right-${f}.png`;
        game.abyssBossAttackLeft[f]  = img(); game.abyssBossAttackLeft[f].src  = `fish_sprites/abyss/abyss_monster_fish-attack-left-${f}.png`;
        game.abyssBossAttackRight[f] = img(); game.abyssBossAttackRight[f].src = `fish_sprites/abyss/abyss_monster_fish-attack-right-${f}.png`;
    }

    // ── Collectibles ──────────────────────────────────────────
    game.clamSprite.closed = img(); game.clamSprite.closed.src = 'collectibles/clam_closed.png';
    game.clamSprite.open   = img(); game.clamSprite.open.src   = 'collectibles/clam_open.png';
    game.pearlSprite       = img(); game.pearlSprite.src        = 'pearl.png';
    game.gameOverSprite    = img(); game.gameOverSprite.src     = 'game_over.png';

    // ── Decorative world assets ───────────────────────────────
    game.decoBoat       = img(); game.decoBoat.src       = 'boat.png';
    game.decoCoral1     = img(); game.decoCoral1.src     = 'coral1.png';
    game.decoCoral3     = img(); game.decoCoral3.src     = 'coral3.png';
    game.decoFishShadow = img(); game.decoFishShadow.src = 'fishshadow.png';
    game.decoSeagrass   = img(); game.decoSeagrass.src   = 'seagras.png';
    game.decoSeaweed    = img(); game.decoSeaweed.src    = 'seaweed_sprite.png';
    game.clamClosedSprite = img(); game.clamClosedSprite.src = 'pearl.png';
    game.clamOpenSprite   = img(); game.clamOpenSprite.src   = 'pearl1_2.png';

    // ── Manta ray sprite sheet (4 cols × 2 rows = 8 frames, faces left) ──
    game.mantaRayImg = img();
    game.mantaRayImg.src = 'element_sprites/manta.png';

    // ── Projectile frames (8 frames, zero-padded) ─────────────
    for (let f = 1; f <= 8; f++) {
        const n = f < 10 ? `0${f}` : `${f}`;
        game.projectileSprites[f] = img();
        game.projectileSprites[f].src = `projectile_water/projectile_water${n}.png`;
    }
}