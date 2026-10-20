class AudioController {
  #context = null;
  #master = null;
  #ambientGain = null;
  #ambientNodes = [];
  #muted = true;

  async #ensureContext() {
    if (typeof window === 'undefined') return null;
    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) return null;

    if (!this.#context) {
      this.#context = new AudioContextConstructor();
      this.#master = this.#context.createGain();
      this.#master.gain.value = 0.22;
      this.#master.connect(this.#context.destination);
      this.#ambientGain = this.#context.createGain();
      this.#ambientGain.gain.value = 0;
      this.#ambientGain.connect(this.#master);
      this.#createAmbient();
    }
    if (this.#context.state === 'suspended') await this.#context.resume();
    return this.#context;
  }

  #createAmbient() {
    if (!this.#context || !this.#ambientGain) return;
    const now = this.#context.currentTime;
    for (const [frequency, type, volume] of [[110, 'sine', 0.24], [164.81, 'triangle', 0.08]]) {
      const oscillator = this.#context.createOscillator();
      const filter = this.#context.createBiquadFilter();
      const gain = this.#context.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      filter.type = 'lowpass';
      filter.frequency.value = 420;
      gain.gain.value = volume;
      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(this.#ambientGain);
      oscillator.start(now);
      this.#ambientNodes.push(oscillator);
    }
  }

  async playClick(kind = 'click') {
    const context = await this.#ensureContext();
    if (!context || !this.#master) return;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;
    const isAdd = kind === 'add';
    oscillator.type = isAdd ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(isAdd ? 660 : 440, now);
    oscillator.frequency.exponentialRampToValueAtTime(isAdd ? 880 : 330, now + 0.055);
    gain.gain.setValueAtTime(0.16, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    oscillator.connect(gain);
    gain.connect(this.#master);
    oscillator.start(now);
    oscillator.stop(now + 0.075);
  }

  async toggleAmbient() {
    const context = await this.#ensureContext();
    if (!context || !this.#ambientGain) return false;
    this.#muted = !this.#muted;
    this.#ambientGain.gain.setTargetAtTime(this.#muted ? 0 : 0.035, context.currentTime, 0.15);
    return !this.#muted;
  }

  async enableAmbient() {
    const context = await this.#ensureContext();
    if (!context || !this.#ambientGain || this.#muted) return;
    this.#ambientGain.gain.setTargetAtTime(0.035, context.currentTime, 0.2);
  }

  async pauseAmbient() {
    if (!this.#context || !this.#ambientGain) return;
    this.#ambientGain.gain.setTargetAtTime(0, this.#context.currentTime, 0.1);
  }
}

export const audioController = new AudioController();
