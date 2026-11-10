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
            if (AudioContextClass) {
                this.ctx = new AudioContextClass();
            }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }
    /** Unlock Web Audio on mobile touch gestures */
    unlockAudio() {
        this.initContext();
        if (this.ctx) {
            try {
                const buffer = this.ctx.createBuffer(1, 1, 22050);
                const source = this.ctx.createBufferSource();
                source.buffer = buffer;
                source.connect(this.ctx.destination);
                source.start(0);
            }
            catch {
                // Safe fallback
            }
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
    /** Play a score chime (pitch rises slightly with consecutive perfect streak) */
    playScore(combo = 0) {
        if (!this.enabled)
            return;
        this.initContext();
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const multiplier = Math.pow(1.06, Math.min(combo, 6));
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33 * multiplier, now);
        osc.frequency.setValueAtTime(880.00 * multiplier, now + 0.08);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.25);
    }
    /** Play golden pearl pickup sparkle */
    playPearl() {
        if (!this.enabled)
            return;
        this.initContext();
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        const notes = [880, 1174.66, 1567.98];
        notes.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const t = now + idx * 0.045;
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, t);
            gain.gain.setValueAtTime(0.14, t);
            gain.gain.exponentialRampToValueAtTime(0.01, t + 0.16);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start(t);
            osc.stop(t + 0.16);
        });
    }
    /** Play power-up activation sweep */
    playPowerUp() {
        if (!this.enabled)
            return;
        this.initContext();
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.28);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.3);
    }
    /** Play bubble shield pop/deflect sound */
    playShieldBreak() {
        if (!this.enabled)
            return;
        this.initContext();
        if (!this.ctx)
            return;
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(620, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.22);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.22);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
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
        const notes = [440, 392, 349.23, 293.66];
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
