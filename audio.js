/* ================================================================
   audio.js  —  BGM + synthesized SFX (no wav files needed)
================================================================= */

function initAudio(game) {
    try {
        game.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch(e) { game.audioCtx = null; }

    // Background music
    game.bgm = new Audio();
    game.bgm.src = 'sounds/bgm.mp3';
    game.bgm.loop = true;

    game.sfxVolume   = 0.9;
    game.musicVolume = 0.7;
    updateSfxVolume(game);
    updateMusicVolume(game);

    game.bgm.play().catch(() => {});

    const sfxSlider   = document.getElementById('sfxVol');
    const musicSlider = document.getElementById('musicVol');
    if (sfxSlider)   sfxSlider.addEventListener('input',   () => updateSfxVolume(game));
    if (musicSlider) musicSlider.addEventListener('input', () => updateMusicVolume(game));
}

function updateSfxVolume(game) {
    const sl = document.getElementById('sfxVol');
    if (sl) game.sfxVolume = sl.value / 100;
}

function updateMusicVolume(game) {
    const ml = document.getElementById('musicVol');
    if (ml) {
        game.musicVolume = ml.value / 100;
        if (game.bgm) game.bgm.volume = game.musicVolume;
    }
}

// Synthesized SFX — no .wav files needed
function playSound(game, soundId) {
    if (!game.audioCtx || game.sfxVolume <= 0) return;
    if (game.audioCtx.state === 'suspended') game.audioCtx.resume();
    const ctx = game.audioCtx, vol = game.sfxVolume, t = ctx.currentTime;

    const osc = (type, freq, endFreq, dur, gainMul=1) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.connect(g); g.connect(ctx.destination);
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + dur);
        g.gain.setValueAtTime(vol * gainMul, t);
        g.gain.exponentialRampToValueAtTime(0.01, t + dur);
        o.start(t); o.stop(t + dur + 0.02);
    };

    switch (soundId) {
        case 'eat':      osc('sine',     320,  55, 0.12); break;
        case 'shoot':    osc('triangle', 500, 1200, 0.13, 0.6); break;
        case 'damage':   osc('sawtooth', 180,  40, 0.22, 0.8); break;
        case 'dud':      osc('square',   200, 180, 0.10, 0.3); break;
        case 'collect':
            [0, 0.07, 0.14].forEach((d, i) => {
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'sine';
                o.frequency.setValueAtTime([600,800,1000][i], t+d);
                g.gain.setValueAtTime(vol*0.4, t+d);
                g.gain.exponentialRampToValueAtTime(0.01, t+d+0.12);
                o.start(t+d); o.stop(t+d+0.15);
            }); break;
        case 'shootHit': {
            const buf = ctx.createBuffer(1, ctx.sampleRate*0.07, ctx.sampleRate);
            const data = buf.getChannelData(0);
            for (let i=0; i<data.length; i++) data[i] = (Math.random()*2-1)*(1-i/data.length);
            const src = ctx.createBufferSource(), g = ctx.createGain();
            src.buffer = buf; src.connect(g); g.connect(ctx.destination);
            g.gain.setValueAtTime(vol*0.7, t); g.gain.exponentialRampToValueAtTime(0.01, t+0.08);
            src.start(t); break;
        }
    }
}
