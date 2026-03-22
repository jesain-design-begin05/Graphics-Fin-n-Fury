/* ================================================================
   audio.js
   Sound effect loading, volume control, and playback helpers.
   Attach to a GameSystem instance via initAudio(game).
================================================================= */

/**
 * Loads all SFX files and wires up the volume slider.
 * @param {GameSystem} game
 */
function initAudio(game) {
    game.sfx = {
        shoot:    new Audio('sfx/shoot.wav'),
        shootHit: new Audio('sfx/shoot_hit.wav'),
        collect:  new Audio('sfx/collect.wav'),
        dud:      new Audio('sfx/dud.wav'),
        eat:      new Audio('sfx/eat.wav'),
        damage:   new Audio('sfx/damage.wav'),
    };
    game.sfxVolume = 0.9;
    updateSfxVolume(game);

    const sfxSlider = document.getElementById('sfxVol');
    if (sfxSlider) {
        sfxSlider.addEventListener('input', () => updateSfxVolume(game));
    }
}

/**
 * Reads the sfxVol slider and applies volume to all loaded sounds.
 * @param {GameSystem} game
 */
function updateSfxVolume(game) {
    const slider = document.getElementById('sfxVol');
    if (slider) {
        game.sfxVolume = slider.value / 100;
        for (const key in game.sfx) {
            if (game.sfx[key]) game.sfx[key].volume = game.sfxVolume;
        }
    }
}

/**
 * Plays a sound effect by cloning it so overlapping calls are fine.
 * @param {GameSystem} game
 * @param {HTMLAudioElement} sound
 */
function playSound(game, sound) {
    if (sound && sound.src && game.sfxVolume > 0) {
        const clone = sound.cloneNode();
        clone.volume = game.sfxVolume;
        clone.play().catch(() => {});
    }
}