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
    game.bgImages  = {};
    game.fgImages  = {};

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

    game.clamSprite       = {};
    game.pearlSprite      = null;
    game.gameOverSprite   = null;
    game.projectileSprites = {};
    game.bossSprite       = {};
}

/**
 * Creates and kicks off loading for every image asset.
 * Must be called after initSpriteContainers().
 */
function loadSprites(game) {
    const img = () => new Image();

    // ── Backgrounds (stages 1-5) ──────────────────────────────
    for (let i = 1; i <= 5; i++) {
        game.bgImages[i] = img(); game.bgImages[i].src = `backgrounds/stage${i}_bg.png`;
        game.fgImages[i] = img(); game.fgImages[i].src = `backgrounds/stage${i}_fg.png`;
    }

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

    // Boss re-uses furyfish swim + attack sprites
    game.bossSprite.left    = game.furyfishSwimLeft;
    game.bossSprite.right   = game.furyfishSwimRight;
    game.bossSprite.attackL = game.furyfishAttackLeft;
    game.bossSprite.attackR = game.furyfishAttackRight;

    // ── Collectibles ──────────────────────────────────────────
    game.clamSprite.closed = img(); game.clamSprite.closed.src = 'collectibles/clam_closed.png';
    game.clamSprite.open   = img(); game.clamSprite.open.src   = 'collectibles/clam_open.png';
    game.pearlSprite       = img(); game.pearlSprite.src        = 'collectibles/pearl.png';
    game.gameOverSprite    = img(); game.gameOverSprite.src     = 'game_over.png';

    // ── Projectile frames (8 frames, zero-padded) ─────────────
    for (let f = 1; f <= 8; f++) {
        const n = f < 10 ? `0${f}` : `${f}`;
        game.projectileSprites[f] = img();
        game.projectileSprites[f].src = `projectile_water/projectile_water${n}.png`;
    }
}