const NOTES = {
  interact: [440, 660],
  attack: [160, 110],
  defend: [280, 220],
  holy: [520, 780, 1040],
  dodge: [310, 225],
  hurt: [120, 82],
  victory: [392, 523, 659],
  defeat: [196, 147, 98],
  choice: [330, 494],
  complete: [261, 392, 523, 784]
};

export class AudioSystem {
  constructor(settings) {
    this.context = null;
    this.master = null;
    this.muted = settings.muted;
    this.volume = settings.volume;
  }

  ensureContext() {
    if (this.context) return true;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return false;
    this.context = new AudioContextClass();
    this.master = this.context.createGain();
    this.master.connect(this.context.destination);
    this.applyVolume();
    return true;
  }

  async resume() {
    if (!this.ensureContext()) return;
    if (this.context.state === 'suspended') {
      try {
        await this.context.resume();
      } catch {
        // A later explicit click/keypress retries the browser activation gate.
      }
    }
  }

  setMuted(muted) {
    this.muted = muted;
    this.applyVolume();
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.applyVolume();
  }

  applyVolume() {
    if (!this.master || !this.context) return;
    const value = this.muted ? 0 : this.volume * 0.16;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.setTargetAtTime(value, this.context.currentTime, 0.02);
  }

  play(name) {
    if (this.muted || !this.ensureContext()) return;
    if (this.context.state === 'suspended') {
      void this.context.resume().catch(() => {});
    }
    const frequencies = NOTES[name];
    if (!frequencies) return;
    const start = this.context.currentTime;
    frequencies.forEach((frequency, index) => {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = name === 'holy' || name === 'complete' ? 'sine' : 'triangle';
      oscillator.frequency.setValueAtTime(frequency, start + index * 0.055);
      oscillator.frequency.exponentialRampToValueAtTime(
        Math.max(50, frequency * 0.86),
        start + index * 0.055 + 0.16
      );
      gain.gain.setValueAtTime(0, start + index * 0.055);
      gain.gain.linearRampToValueAtTime(0.8, start + index * 0.055 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, start + index * 0.055 + 0.2);
      oscillator.connect(gain);
      gain.connect(this.master);
      oscillator.start(start + index * 0.055);
      oscillator.stop(start + index * 0.055 + 0.22);
    });
  }
}
