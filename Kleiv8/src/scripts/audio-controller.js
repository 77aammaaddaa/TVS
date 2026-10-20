class AudioController {
  #context = null;
  #master = null;
  #ambientGain = null;
  #effectsGain = null;
  #ambientVoices = [];
  #muted = true;
  #paused = false;
  #progressionTimer = null;
  #interactionSoundsInstalled = false;
  #chordIndex = 0;

  get isPlaying() {
    return !this.#muted && !this.#paused;
  }

  async #ensureContext() {
    if (typeof window === 'undefined') return null;
    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) return null;

    if (!this.#context) {
      this.#context = new AudioContextConstructor();
      this.#master = this.#context.createGain();
      this.#master.gain.value = 0.34;
      this.#master.connect(this.#context.destination);
      this.#ambientGain = this.#context.createGain();
      this.#ambientGain.gain.value = 0;
      this.#ambientGain.connect(this.#master);
      this.#effectsGain = this.#context.createGain();
      this.#effectsGain.gain.value = 0.72;
      this.#effectsGain.connect(this.#master);
      this.#createWarmProgression();
    }
    if (this.#context.state === 'suspended') await this.#context.resume();
    return this.#context;
  }

  #createWarmProgression() {
    if (!this.#context || !this.#ambientGain) return;
    const now = this.#context.currentTime;
    const chord = [146.83, 220, 277.18, 329.63]; // D major 7: warm, low and intentionally not a buzzer.
    this.#ambientVoices = chord.map((frequency, index) => {
      const oscillator = this.#context.createOscillator();
      const tone = this.#context.createBiquadFilter();
      const voiceGain = this.#context.createGain();
      const tremolo = this.#context.createOscillator();
      const tremoloGain = this.#context.createGain();
      oscillator.type = index % 2 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillator.detune.value = index === 0 ? -5 : index * 2;
      tone.type = 'lowpass';
      tone.frequency.value = 880 + index * 170;
      tone.Q.value = 0.45;
      voiceGain.gain.value = index === 0 ? 0.09 : 0.052;
      tremolo.type = 'sine';
      tremolo.frequency.value = 0.08 + index * 0.015;
      tremoloGain.gain.value = 0.012;
      tremolo.connect(tremoloGain);
      tremoloGain.connect(voiceGain.gain);
      oscillator.connect(tone);
      tone.connect(voiceGain);
      voiceGain.connect(this.#ambientGain);
      oscillator.start(now);
      tremolo.start(now);
      return oscillator;
    });

    this.#progressionTimer = window.setInterval(() => this.#advanceChord(), 5200);
  }

  #advanceChord() {
    if (!this.#context || this.#ambientVoices.length === 0) return;
    const progression = [
      [146.83, 220, 277.18, 329.63], // Dmaj7
      [220, 261.63, 329.63, 415.3], // Am7, lifted into a soft midrange voicing
      [130.81, 196, 246.94, 329.63], // Cmaj7
      [98, 146.83, 220, 293.66], // G6
    ];
    this.#chordIndex = (this.#chordIndex + 1) % progression.length;
    const nextChord = progression[this.#chordIndex];
    const when = this.#context.currentTime;
    this.#ambientVoices.forEach((voice, index) => {
      voice.frequency.cancelScheduledValues(when);
      voice.frequency.setTargetAtTime(nextChord[index], when, 1.45);
    });
  }

  #emitState() {
    window.dispatchEvent(new CustomEvent('kleiv8:audio-change', { detail: { playing: this.isPlaying } }));
  }

  #setAmbientLevel(fade = 0.45) {
    if (!this.#context || !this.#ambientGain) return;
    const target = this.isPlaying ? 0.19 : 0;
    this.#ambientGain.gain.setTargetAtTime(target, this.#context.currentTime, fade);
  }

  #playNoiseBurst(duration, gainAmount, filterFrequency) {
    if (!this.#context || !this.#effectsGain) return;
    const sampleCount = Math.max(1, Math.floor(this.#context.sampleRate * duration));
    const buffer = this.#context.createBuffer(1, sampleCount, this.#context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < sampleCount; index += 1) {
      const envelope = 1 - index / sampleCount;
      data[index] = (Math.random() * 2 - 1) * envelope * envelope;
    }
    const source = this.#context.createBufferSource();
    const filter = this.#context.createBiquadFilter();
    const gain = this.#context.createGain();
    filter.type = 'bandpass';
    filter.frequency.value = filterFrequency;
    filter.Q.value = 0.7;
    gain.gain.setValueAtTime(gainAmount, this.#context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.#context.currentTime + duration);
    source.buffer = buffer;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.#effectsGain);
    source.start();
  }

  #playPourAndChime() {
    if (!this.#context || !this.#effectsGain) return;
    const now = this.#context.currentTime;
    this.#playNoiseBurst(0.78, 0.13, 920);
    [659.25, 783.99, 987.77].forEach((frequency, index) => {
      const oscillator = this.#context.createOscillator();
      const gain = this.#context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.095 / (index + 1), now + 0.035 + index * 0.045);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.15 + index * 0.08);
      oscillator.connect(gain);
      gain.connect(this.#effectsGain);
      oscillator.start(now + index * 0.045);
      oscillator.stop(now + 1.35);
    });
  }

  installInteractionSounds() {
    if (this.#interactionSoundsInstalled || typeof document === 'undefined') return;
    this.#interactionSoundsInstalled = true;
    document.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('#splash-screen')) return;
      const interactive = target.closest('button, a, [role="button"], .vibe-card, .quick-item');
      if (!interactive || interactive instanceof HTMLButtonElement && interactive.disabled) return;
      this.playClick(interactive.matches('.add-button, .quick-add, [data-change="1"]') ? 'add' : 'click');
    });
  }

  async enterExperience() {
    const context = await this.#ensureContext();
    if (!context) return false;
    this.#muted = false;
    this.#paused = false;
    this.#setAmbientLevel(0.36);
    this.#playPourAndChime();
    this.installInteractionSounds();
    this.#emitState();
    return true;
  }

  async playClick(kind = 'click') {
    const context = await this.#ensureContext();
    if (!context || !this.#effectsGain || !this.isPlaying) return;
    const now = context.currentTime;
    const isAdd = kind === 'add';
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(isAdd ? 1760 : 1480, now);
    oscillator.frequency.exponentialRampToValueAtTime(isAdd ? 2380 : 1220, now + 0.065);
    gain.gain.setValueAtTime(isAdd ? 0.07 : 0.045, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
    oscillator.connect(gain);
    gain.connect(this.#effectsGain);
    oscillator.start(now);
    oscillator.stop(now + 0.09);
    this.#playNoiseBurst(isAdd ? 0.11 : 0.055, isAdd ? 0.055 : 0.03, isAdd ? 3300 : 2600);
    if (navigator.vibrate) navigator.vibrate(isAdd ? [7, 18, 9] : 5);
  }

  async toggleAmbient() {
    const context = await this.#ensureContext();
    if (!context) return false;
    this.#muted = !this.#muted;
    this.#paused = false;
    this.#setAmbientLevel(0.18);
    this.#emitState();
    return this.isPlaying;
  }

  async enableAmbient() {
    const context = await this.#ensureContext();
    if (!context || this.#muted) return false;
    this.#paused = false;
    this.#setAmbientLevel(0.24);
    this.#emitState();
    return true;
  }

  async pauseAmbient() {
    if (!this.#context) return;
    this.#paused = true;
    this.#setAmbientLevel(0.14);
    this.#emitState();
  }
}

export const audioController = new AudioController();
