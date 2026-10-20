class AudioController {
  #music = null;
  #ctx = null;
  #ambientGain = null;
  #isMuted = true;
  #usingFallback = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.#music = new Audio('/audio/kleiv-lofi.mp3');
      this.#music.loop = true;
      this.#music.volume = 0.28;
      this.#music.addEventListener('error', () => {
        this.#usingFallback = true;
      });
    }
  }

  async #ensureContext() {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!this.#ctx) {
      this.#ctx = new AudioCtx();
      this.#ambientGain = this.#ctx.createGain();
      this.#ambientGain.gain.value = 0;
      this.#ambientGain.connect(this.#ctx.destination);
      this.#setupWarmLofiSynth();
    }
    if (this.#ctx.state === 'suspended') {
      await this.#ctx.resume();
    }
    return this.#ctx;
  }

  #setupWarmLofiSynth() {
    if (!this.#ctx || !this.#ambientGain) return;
    // Warm Rhodes-like chord frequencies (Fmaj7 - Em7 vibe)
    const freqs = [174.61, 220.0, 261.63, 329.63];
    freqs.forEach((f, idx) => {
      const osc = this.#ctx.createOscillator();
      const filter = this.#ctx.createBiquadFilter();
      const gain = this.#ctx.createGain();
      osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      osc.frequency.value = f;
      filter.type = 'lowpass';
      filter.frequency.value = 480;
      gain.gain.value = 0.035;
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.#ambientGain);
      osc.start();
    });
  }

  async startMusic() {
    this.#isMuted = false;
    try {
      if (this.#music && !this.#usingFallback) {
        await this.#music.play();
      } else {
        const ctx = await this.#ensureContext();
        if (ctx && this.#ambientGain) {
          this.#ambientGain.gain.setTargetAtTime(0.6, ctx.currentTime, 0.4);
        }
      }
      this.#updateHeaderVisualizer(true);
    } catch {
      const ctx = await this.#ensureContext();
      if (ctx && this.#ambientGain) {
        this.#ambientGain.gain.setTargetAtTime(0.6, ctx.currentTime, 0.4);
        this.#updateHeaderVisualizer(true);
      }
    }
  }

  async toggleMusic() {
    if (this.#isMuted) {
      await this.startMusic();
    } else {
      this.#isMuted = true;
      if (this.#music) this.#music.pause();
      if (this.#ctx && this.#ambientGain) {
        this.#ambientGain.gain.setTargetAtTime(0, this.#ctx.currentTime, 0.2);
      }
      this.#updateHeaderVisualizer(false);
    }
    return !this.#isMuted;
  }

  async playClick(kind = 'click') {
    try {
      const ctx = await this.#ensureContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      if (kind === 'add') {
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.09);
      } else {
        osc.frequency.setValueAtTime(380, now);
        osc.frequency.exponentialRampToValueAtTime(640, now + 0.06);
      }
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.095);
    } catch {}
  }

  async playPop() {
    return this.playClick('add');
  }

  #updateHeaderVisualizer(active) {
    const btn = document.querySelector('#sound-toggle');
    if (btn) btn.setAttribute('aria-pressed', String(active));
    document.querySelectorAll('.sound-bars span').forEach((bar) => {
      bar.classList.toggle('is-dancing', active);
    });
  }
}

export const audioController = new AudioController();