/**
 * Web Audio API Sound & Motivating BGM Synthesizer.
 * Generates procedural arcade SFX + dual-mode BGM (pre-game explorer & high-energy gameplay)
 * without external audio files.
 */
export class SoundManager {
    ctx = null;
    bgmGain = null;
    noiseBuffer = null;
    enabled = true;
    bgmMode = 'off';
    paused = false;
    levelIntensity = 1;
    stepIndex = 0;
    nextStepTime = 0;
    schedulerId = null;
    // Track 1: Pre-game / Lobby Ocean Explorer Groove (D Mixolydian, 16-step bar)
    menuBass = [
        146.83, 0, 146.83, 0, 110.0, 0, 110.0, 130.81,
        123.47, 0, 123.47, 0, 98.0, 0, 110.0, 130.81
    ];
    menuLead = [
        587.33, 0, 739.99, 880.0, 783.99, 0, 739.99, 587.33,
        659.25, 0, 739.99, 880.0, 987.77, 880.0, 739.99, 659.25
    ];
    // Track 2: Active Gameplay Confident High-Energy Anthem (E Minor uplifting hero, 32-step loop)
    playBass = [
        82.41, 82.41, 164.81, 82.41, 98.0, 98.0, 110.0, 98.0,
        130.81, 130.81, 196.0, 130.81, 146.83, 146.83, 123.47, 110.0,
        82.41, 82.41, 164.81, 82.41, 98.0, 98.0, 110.0, 123.47,
        130.81, 130.81, 146.83, 146.83, 164.81, 146.83, 123.47, 110.0
    ];
    playLead = [
        329.63, 0, 392.0, 493.88, 659.25, 0, 587.33, 493.88,
        523.25, 0, 587.33, 659.25, 783.99, 0, 739.99, 587.33,
        659.25, 0, 587.33, 493.88, 392.0, 440.0, 493.88, 0,
        523.25, 587.33, 659.25, 783.99, 880.0, 783.99, 659.25, 587.33
    ];
    constructor() {
        // AudioContext initializes cleanly on first user gesture
    }
    initContext() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass)
                return false;
            this.ctx = new AudioContextClass();
            this.bgmGain = this.ctx.createGain();
            this.bgmGain.gain.value = this.enabled && !this.paused ? 0.25 : 0;
            this.bgmGain.connect(this.ctx.destination);
            // Shared white-noise buffer for crisp snare/hi-hat percussion
            const bufSize = Math.floor(this.ctx.sampleRate * 0.15);
            const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            this.noiseBuffer = buffer;
        }
        if (this.ctx.state === 'suspended') {
            void this.ctx.resume();
        }
        return true;
    }
    /** Unlock audio on first browser interaction and begin active BGM mode. */
    unlock() {
        if (!this.initContext())
            return;
        this.syncBgmGain();
        if (this.enabled && !this.paused && this.bgmMode !== 'off' && this.schedulerId === null) {
            this.startScheduler();
        }
    }
    /** Switch between pre-game lobby groove ('menu'), active flight ('play'), or 'off'. */
    setBgmMode(mode) {
        if (this.bgmMode === mode)
            return;
        this.bgmMode = mode;
        this.stepIndex = 0;
        if (this.ctx) {
            this.nextStepTime = this.ctx.currentTime + 0.04;
        }
        if (mode === 'off') {
            this.stopScheduler();
        }
        else if (this.enabled && !this.paused && this.ctx && this.ctx.state === 'running') {
            this.startScheduler();
        }
    }
    setLevelIntensity(level) {
        this.levelIntensity = Math.max(1, level);
    }
    setPaused(paused) {
        if (this.paused === paused)
            return;
        this.paused = paused;
        this.syncBgmGain();
        if (paused) {
            this.stopScheduler();
        }
        else if (this.enabled && this.bgmMode !== 'off' && this.ctx) {
            this.startScheduler();
        }
    }
    syncBgmGain() {
        if (!this.ctx || !this.bgmGain)
            return;
        const target = this.enabled && !this.paused ? 0.25 : 0;
        this.bgmGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.04);
    }
    startScheduler() {
        if (this.schedulerId !== null || !this.ctx)
            return;
        this.nextStepTime = Math.max(this.nextStepTime, this.ctx.currentTime + 0.04);
        this.schedulerId = window.setInterval(() => this.pumpBgm(), 40);
    }
    stopScheduler() {
        if (this.schedulerId !== null) {
            clearInterval(this.schedulerId);
            this.schedulerId = null;
        }
    }
    pumpBgm() {
        if (!this.ctx || !this.bgmGain || !this.enabled || this.paused || this.bgmMode === 'off') {
            return;
        }
        if (this.ctx.state !== 'running')
            return;
        const lookahead = 0.14;
        while (this.nextStepTime < this.ctx.currentTime + lookahead) {
            const bpm = this.bgmMode === 'play'
                ? Math.min(168, 142 + (this.levelIntensity - 1) * 4)
                : 114;
            const stepSec = 60 / bpm / 2; // 8th-note steps
            this.scheduleBgmStep(this.nextStepTime, stepSec);
            this.nextStepTime += stepSec;
            this.stepIndex++;
        }
    }
    scheduleBgmStep(time, stepSec) {
        if (!this.ctx || !this.bgmGain)
            return;
        if (this.bgmMode === 'menu') {
            const i = this.stepIndex % this.menuBass.length;
            const bassFreq = this.menuBass[i];
            const leadFreq = this.menuLead[i];
            if (i % 4 === 0) {
                this.triggerKick(time, 95, 38, 0.26);
            }
            if (i % 2 === 1) {
                this.triggerHat(time, 0.04);
            }
            if (bassFreq > 0) {
                this.triggerTone(bassFreq, time, stepSec * 0.9, 'triangle', 0.24, 900);
            }
            if (leadFreq > 0) {
                this.triggerTone(leadFreq, time, stepSec * 1.15, 'sine', 0.16, 2600);
            }
            return;
        }
        // Active high-energy gameplay mode
        const i = this.stepIndex % this.playBass.length;
        const bassFreq = this.playBass[i];
        const leadFreq = this.playLead[i];
        // Driving four-on-the-floor kick + snappy backbeat snare + brisk hi-hats
        if (i % 4 === 0) {
            this.triggerKick(time, 125, 42, 0.38);
        }
        if (i % 8 === 4) {
            this.triggerSnare(time, 0.14);
        }
        if (i % 2 === 1) {
            this.triggerHat(time, 0.065);
        }
        // Pumping synth bassline
        if (bassFreq > 0) {
            this.triggerTone(bassFreq, time, stepSec * 0.85, 'sawtooth', 0.22, 620);
        }
        // Heroic dual-octave motivating lead melody
        if (leadFreq > 0) {
            this.triggerTone(leadFreq, time, stepSec * 1.15, 'square', 0.11, 2100);
            this.triggerTone(leadFreq * 2, time, stepSec * 0.9, 'triangle', 0.07, 3200);
        }
    }
    triggerTone(freq, time, duration, type, volume, cutoffHz) {
        if (!this.ctx || !this.bgmGain)
            return;
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoffHz, time);
        gain.gain.setValueAtTime(0.001, time);
        gain.gain.linearRampToValueAtTime(volume, time + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + duration + 0.02);
    }
    triggerKick(time, startHz, endHz, volume) {
        if (!this.ctx || !this.bgmGain)
            return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(startHz, time);
        osc.frequency.exponentialRampToValueAtTime(endHz, time + 0.09);
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.13);
        osc.connect(gain);
        gain.connect(this.bgmGain);
        osc.start(time);
        osc.stop(time + 0.14);
    }
    triggerSnare(time, volume) {
        if (!this.ctx || !this.bgmGain || !this.noiseBuffer)
            return;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1750, time);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.11);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        src.start(time);
        src.stop(time + 0.12);
    }
    triggerHat(time, volume) {
        if (!this.ctx || !this.bgmGain || !this.noiseBuffer)
            return;
        const src = this.ctx.createBufferSource();
        src.buffer = this.noiseBuffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(6500, time);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.045);
        src.connect(filter);
        filter.connect(gain);
        gain.connect(this.bgmGain);
        src.start(time);
        src.stop(time + 0.05);
    }
    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled) {
            this.initContext();
            this.syncBgmGain();
            if (!this.paused && this.bgmMode !== 'off') {
                this.startScheduler();
            }
        }
        else {
            this.syncBgmGain();
            this.stopScheduler();
        }
        return this.enabled;
    }
    /** Play triumphant level-up fanfare */
    playLevelUp() {
        if (!this.enabled)
            return;
        this.initContext();
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        const chord = [523.25, 659.25, 783.99, 1046.5];
        chord.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const start = now + idx * 0.055;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, start);
            gain.gain.setValueAtTime(0.16, start);
            gain.gain.exponentialRampToValueAtTime(0.005, start + 0.24);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(start);
            osc.stop(start + 0.25);
        });
    }
    /** Play a bubble swim / flap sound */
    playSwim() {
        if (!this.enabled)
            return;
        this.initContext();
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(540, now + 0.12);
        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.12);
    }
    /** Play a score chime */
    playScore() {
        if (!this.enabled)
            return;
        this.initContext();
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880.00, now + 0.08); // A5
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }
    /** Play a pipe / collision hit sound */
    playHit() {
        if (!this.enabled)
            return;
        this.initContext();
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.18);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.18);
    }
    /** Play game over tone */
    playGameOver() {
        if (!this.enabled)
            return;
        this.initContext();
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        const notes = [440, 392, 349.23, 293.66]; // A4, G4, F4, D4
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const startTime = now + idx * 0.1;
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);
            gain.gain.setValueAtTime(0.18, startTime);
            gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.18);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(startTime);
            osc.stop(startTime + 0.18);
        });
    }
}
