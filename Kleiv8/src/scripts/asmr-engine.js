const PREFERENCE_KEY = 'kleiv8:asmr-enabled:v1';
const STATE_EVENT = 'kleiv8:asmr-state-change';

class AsmrEngine {
  #context = null;
  #output = null;
  #noiseBuffer = null;
  #ambientSource = null;
  #ambientGain = null;
  #enabled = false;
  #volume = 0.22;

  constructor() {
    if (typeof window === 'undefined') return;
    try {
      this.#enabled = window.localStorage.getItem(PREFERENCE_KEY) === 'true';
    } catch (error) {
      console.warn('Unable to read the saved ASMR sound preference.', error);
    }
  }

  get enabled() {
    return this.#enabled;
  }

  async enable() {
    const context = this.#getContext();
    if (!context || !this.#output) return false;

    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch (error) {
        console.warn('The browser could not enable ASMR audio.', error);
        return false;
      }
    }

    this.#enabled = true;
    this.#output.gain.setTargetAtTime(1, context.currentTime, 0.04);
    this.#startAmbientRain(context);
    this.#savePreference(true);
    this.#publishState();
    return true;
  }

  disable() {
    this.#enabled = false;
    if (this.#context && this.#output) {
      this.#output.gain.setTargetAtTime(0.0001, this.#context.currentTime, 0.025);
      this.#stopAmbientRain(this.#context);
    }
    this.#savePreference(false);
    this.#publishState();
    return false;
  }

  async toggle() {
    return this.#enabled ? this.disable() : this.enable();
  }

  async playCategory(category) {
    const value = String(category).trim().toLowerCase();
    if (value === 'coffee' || value.includes('hot coffee')) return this.playSteamWand();
    if (value.includes('cold') || value.includes('soda')) return this.playSodaCan();
    if (value.includes('bakery') || value.includes('pastry')) return this.playBakeryCrunch();
    if (value.includes('dessert') || value.includes('cake')) return this.playFudgeSpoon();
    if (value.includes('matcha')) return this.playMatchaWhisk();
    return false;
  }

  async playSodaCan() {
    const context = await this.#activeContext();
    if (!context) return false;

    const now = context.currentTime;
    this.#playNoise(context, {
      startAt: now,
      duration: 0.055,
      filter: 'bandpass',
      frequency: 1450,
      frequencyEnd: 520,
      q: 1.6,
      amplitude: 0.48,
      attack: 0.002,
    });
    this.#playNoise(context, {
      startAt: now + 0.025,
      duration: 0.78,
      filter: 'highpass',
      frequency: 2600,
      frequencyEnd: 3800,
      q: 0.65,
      amplitude: 0.46,
      attack: 0.045,
    });

    for (const delay of [0.16, 0.34, 0.55]) {
      this.#playNoise(context, {
        startAt: now + delay,
        duration: 0.045,
        filter: 'bandpass',
        frequency: 720 + Math.random() * 540,
        q: 1.2,
        amplitude: 0.2,
        attack: 0.002,
      });
    }
    return true;
  }

  async playSteamWand() {
    const context = await this.#activeContext();
    if (!context) return false;

    const now = context.currentTime;
    this.#playNoise(context, {
      startAt: now,
      duration: 0.94,
      filter: 'bandpass',
      frequency: 760,
      frequencyEnd: 1550,
      q: 1.15,
      amplitude: 0.44,
      attack: 0.12,
    });
    this.#playNoise(context, {
      startAt: now + 0.28,
      duration: 0.72,
      filter: 'bandpass',
      frequency: 360,
      frequencyEnd: 720,
      q: 0.9,
      amplitude: 0.2,
      attack: 0.16,
    });
    return true;
  }

  async playBakeryCrunch() {
    const context = await this.#activeContext();
    if (!context) return false;

    const now = context.currentTime;
    for (const [index, delay] of [0, 0.055, 0.13, 0.22].entries()) {
      this.#playNoise(context, {
        startAt: now + delay,
        duration: 0.045 + Math.random() * 0.035,
        filter: 'bandpass',
        frequency: 1750 + Math.random() * 1500,
        q: 0.7 + Math.random() * 0.5,
        amplitude: index === 0 ? 0.42 : 0.3,
        attack: 0.002,
      });
    }
    return true;
  }

  async playFudgeSpoon() {
    const context = await this.#activeContext();
    if (!context) return false;

    const now = context.currentTime;
    this.#playNoise(context, {
      startAt: now,
      duration: 0.52,
      filter: 'lowpass',
      frequency: 820,
      frequencyEnd: 420,
      q: 0.8,
      amplitude: 0.3,
      attack: 0.1,
    });
    this.#playNoise(context, {
      startAt: now + 0.08,
      duration: 0.075,
      filter: 'bandpass',
      frequency: 1150,
      frequencyEnd: 680,
      q: 1.1,
      amplitude: 0.22,
      attack: 0.003,
    });
    return true;
  }

  async playMatchaWhisk() {
    const context = await this.#activeContext();
    if (!context) return false;

    this.#playNoise(context, {
      startAt: context.currentTime,
      duration: 0.72,
      filter: 'bandpass',
      frequency: 1900,
      frequencyEnd: 1300,
      q: 1.4,
      amplitude: 0.22,
      attack: 0.12,
    });
    return true;
  }

  async playLatteRipple() {
    const context = await this.#activeContext();
    if (!context) return false;

    this.#playNoise(context, {
      startAt: context.currentTime,
      duration: 0.24,
      filter: 'lowpass',
      frequency: 1050,
      frequencyEnd: 520,
      q: 0.7,
      amplitude: 0.2,
      attack: 0.025,
    });
    return true;
  }

  async playClick(kind = 'click') {
    const context = await this.#activeContext();
    if (!context) return false;

    this.#playNoise(context, {
      startAt: context.currentTime,
      duration: kind === 'add' ? 0.075 : 0.045,
      filter: 'bandpass',
      frequency: kind === 'add' ? 1050 : 1500,
      frequencyEnd: kind === 'add' ? 520 : 780,
      q: 1.1,
      amplitude: kind === 'add' ? 0.27 : 0.16,
      attack: 0.002,
    });
    return true;
  }

  async #activeContext() {
    if (!this.#enabled) return null;
    const context = this.#getContext();
    if (!context) return null;

    if (context.state === 'suspended') {
      try {
        await context.resume();
      } catch (error) {
        console.warn('The browser blocked ASMR playback.', error);
        return null;
      }
    }
    this.#startAmbientRain(context);
    return context;
  }

  #getContext() {
    if (this.#context) return this.#context;
    if (typeof window === 'undefined') return null;

    const audioWindow = /** @type {Window & { webkitAudioContext?: typeof AudioContext }} */ (window);
    const AudioContextClass = window.AudioContext ?? audioWindow.webkitAudioContext;
    if (!AudioContextClass) return null;

    let context = null;
    try {
      context = new AudioContextClass();
      const output = context.createGain();
      output.gain.value = this.#enabled ? 1 : 0.0001;
      output.connect(context.destination);

      const length = Math.ceil(context.sampleRate * 1.4);
      const noiseBuffer = context.createBuffer(1, length, context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = Math.random() * 2 - 1;
      }

      this.#context = context;
      this.#output = output;
      this.#noiseBuffer = noiseBuffer;
      return context;
    } catch (error) {
      console.warn('Unable to initialize the Web Audio engine for ASMR.', error);
      if (context && context.state !== 'closed') {
        void context.close().catch((closeError) => {
          console.warn('Unable to close the failed Web Audio context.', closeError);
        });
      }
    }
    return null;
  }

  #startAmbientRain(context) {
    if (this.#ambientSource || !this.#noiseBuffer || !this.#output) return;

    const now = context.currentTime;
    const source = context.createBufferSource();
    const filter = context.createBiquadFilter();
    const gain = context.createGain();

    source.buffer = this.#noiseBuffer;
    source.loop = true;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(350, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.045, now + 0.6);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.#output);
    source.onended = () => {
      source.disconnect();
      filter.disconnect();
      gain.disconnect();
      if (this.#ambientSource === source) {
        this.#ambientSource = null;
        this.#ambientGain = null;
      }
    };
    source.start(now);
    this.#ambientSource = source;
    this.#ambientGain = gain;
  }

  #stopAmbientRain(context) {
    const source = this.#ambientSource;
    const gain = this.#ambientGain;
    if (!source || !gain) return;

    const stopAt = context.currentTime + 0.2;
    gain.gain.cancelScheduledValues(context.currentTime);
    gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.04);
    source.stop(stopAt);
    this.#ambientSource = null;
    this.#ambientGain = null;
  }

  #playNoise(context, options) {
    if (!this.#noiseBuffer || !this.#output) return;

    const {
      startAt,
      duration,
      filter,
      frequency,
      frequencyEnd = frequency,
      q = 1,
      amplitude,
      attack,
    } = options;
    const source = context.createBufferSource();
    const filterNode = context.createBiquadFilter();
    const gain = context.createGain();
    const attackTime = Math.min(attack, duration * 0.4);
    const peak = Math.max(0.0001, this.#volume * amplitude);

    source.buffer = this.#noiseBuffer;
    filterNode.type = filter;
    filterNode.Q.setValueAtTime(q, startAt);
    filterNode.frequency.setValueAtTime(frequency, startAt);
    if (frequencyEnd !== frequency) {
      filterNode.frequency.linearRampToValueAtTime(frequencyEnd, startAt + duration);
    }
    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.linearRampToValueAtTime(peak, startAt + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

    source.connect(filterNode);
    filterNode.connect(gain);
    gain.connect(this.#output);
    source.start(startAt);
    source.stop(startAt + duration + 0.01);
  }

  #savePreference(enabled) {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(PREFERENCE_KEY, String(enabled));
    } catch (error) {
      console.warn('Unable to save the ASMR sound preference.', error);
    }
  }

  #publishState() {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(STATE_EVENT, { detail: { enabled: this.#enabled } }));
  }
}

export const ASMR_STATE_EVENT = STATE_EVENT;
export const asmr = new AsmrEngine();
