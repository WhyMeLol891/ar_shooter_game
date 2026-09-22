export class GameAudio {
    constructor() {
        this.context = null;
        this.unlocked = false;
        this.enabled = true;
    }

    ensureContext() {
        if (!this.context) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.context = new AudioCtx();
        }

        if (this.context.state === 'suspended') {
            this.context.resume();
        }

        this.unlocked = true;
    }

    unlock() {
        this.ensureContext();
    }

    playTone({ frequency = 440, duration = 0.08, type = 'sine', volume = 0.05, sweep = 0 }) {
        if (!this.context || !this.enabled) return;
        const oscillator = this.context.createOscillator();
        const gain = this.context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.context.currentTime);
        if (sweep !== 0) {
            oscillator.frequency.exponentialRampToValueAtTime(Math.max(40, frequency + sweep), this.context.currentTime + duration);
        }
        gain.gain.setValueAtTime(0.0001, this.context.currentTime);
        gain.gain.exponentialRampToValueAtTime(volume, this.context.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.context.currentTime + duration);
        oscillator.connect(gain);
        gain.connect(this.context.destination);
        oscillator.start();
        oscillator.stop(this.context.currentTime + duration);
    }

    shoot() { this.playTone({ frequency: 180, duration: 0.05, type: 'square', volume: 0.08, sweep: -40 }); }
    reload() { this.playTone({ frequency: 260, duration: 0.12, type: 'triangle', volume: 0.04, sweep: -70 }); }
    hit() { this.playTone({ frequency: 220, duration: 0.08, type: 'sawtooth', volume: 0.06, sweep: -30 }); }
    death() { this.playTone({ frequency: 90, duration: 0.18, type: 'sawtooth', volume: 0.09, sweep: -100 }); }
    attack() { this.playTone({ frequency: 140, duration: 0.1, type: 'square', volume: 0.08, sweep: -60 }); }
    empty() { this.playTone({ frequency: 70, duration: 0.08, type: 'triangle', volume: 0.05, sweep: -30 }); }
    wave() { this.playTone({ frequency: 420, duration: 0.2, type: 'triangle', volume: 0.05, sweep: 80 }); }
}
