/**
 * Web Audio API Sound Synthesizer.
 * Generates procedural arcade sound effects without external audio files.
 */
export class SoundManager {
    ctx = null;
    enabled = true;
    constructor() {
        // AudioContext will be initialized on first user interaction
    }
    initContext() {
        if (!this.ctx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
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
