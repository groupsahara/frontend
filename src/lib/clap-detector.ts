

/**
 * Double-clap wake word, built to ignore the human voice.
 *
 * Loudness alone cannot tell a clap from a spoken syllable — a raised voice
 * clears any level threshold twice a second. What separates them is shape:
 *
 *  - a clap is broadband, so a large share of its energy sits above 3.5 kHz,
 *    where speech has almost none (vowels live under ~1 kHz);
 *  - a clap starts from near-silence, where a syllable rides on the tail of
 *    the syllable before it;
 *  - a clap is gone in ~100 ms, where a vowel sustains.
 *
 * A candidate has to pass all three before it counts, and two of them inside
 * the pairing window fire the wake.
 */

/** Loud enough to be a deliberate clap in a normal room, absolutely. */
const MIN_LEVEL = 0.3;
/** …and relative to the room's own noise, so an office raises the bar. */
const BACKGROUND_FACTOR = 8;
/** Share of energy above 3.5 kHz. Claps sit high; speech rarely clears this. */
const MIN_HIGH_RATIO = 0.3;
/** The frame before a clap must be near-silent — no riding on a vowel's tail. */
const QUIET_BEFORE_FACTOR = 3;
/** A clap has to collapse to this fraction of its peak, this fast. */
const DECAY_TO = 0.35;
const DECAY_WITHIN_MS = 150;
/** Two claps count as a pair inside this window, but not if they overlap. */
const PAIR_MIN_MS = 120;
const PAIR_MAX_MS = 1200;
/** After the page's own voice stops, the mic is ignored this long. */
const BUSY_COOLDOWN_MS = 1200;


/** One analysed frame of microphone audio. */
export interface ClapFrame {
  /** Peak amplitude 0..1. */
  peak: number;
  /** Share of spectral energy above 3.5 kHz, 0..1. */
  highRatio: number;
  /** performance.now()-style timestamp in ms. */
  at: number;
}

/**
 * The decision itself, with no Web Audio in it: frames in, verdicts out.
 *
 * Keeping it pure is what makes "a voice must never trigger this" a thing that
 * can actually be tested, rather than a hope about a threshold.
 */
export class ClapGate {
  private background = 0.02;
  private previous = 0;
  private pending: { at: number; peak: number } | null = null;
  private lastClapAt = 0;

  /** Drop all state — used when the page's own voice owns the room. */
  reset() {
    this.pending = null;
    this.previous = 0;
    this.lastClapAt = 0;
  }

  feed(frame: ClapFrame): "double" | "clap" | null {
    const { peak, highRatio, at } = frame;
    this.background = this.background * 0.995 + peak * 0.005;

    // A candidate waiting on its decay: a clap is already gone by now.
    if (this.pending) {
      if (peak < this.pending.peak * DECAY_TO) {
        const clapAt = this.pending.at;
        this.pending = null;
        this.previous = peak;
        const gap = clapAt - this.lastClapAt;
        if (this.lastClapAt && gap >= PAIR_MIN_MS && gap <= PAIR_MAX_MS) {
          this.lastClapAt = 0;
          return "double";
        }
        this.lastClapAt = clapAt;
        return "clap";
      }
      // Still loud after a clap would have died — that was a voice.
      if (at - this.pending.at > DECAY_WITHIN_MS) this.pending = null;
      this.previous = peak;
      return null;
    }

    const loudEnough = peak > Math.max(MIN_LEVEL, this.background * BACKGROUND_FACTOR);
    const startedFromQuiet = this.previous < this.background * QUIET_BEFORE_FACTOR;
    this.previous = peak;
    if (!loudEnough || !startedFromQuiet) return null;

    // Voice-shaped rather than clap-shaped: almost all of its energy is low.
    if (highRatio < MIN_HIGH_RATIO) return null;

    this.pending = { at, peak };
    return null;
  }
}


/** Barge-in: how long the echo canceller gets to settle before we listen. */
const AEC_GRACE_MS = 700;
/** Absolute floor for "someone is talking over her". */
const MIN_SPEECH_LEVEL = 0.12;
/** …and how far above the residual echo it has to sit. */
const RESIDUAL_FACTOR = 2.5;
/** Score at which sustained speech counts as a voice (~130ms of loud frames). */
const SUSTAIN_SCORE = 8;
/** How long a detected voice still vouches for a transcript that follows it. */
const VOICE_MEMORY_MS = 2000;
/**
 * Above this share of high-frequency energy it is not a voice.
 *
 * Speech puts most of its energy below 3.5 kHz. A fan, hiss, keyboard clatter
 * or a clap sit far higher, and used to clear a pure loudness bar and stop her
 * for nothing.
 */
const MAX_VOICE_HIGH_RATIO = 0.45;

/**
 * Decides when the admin has started talking over the answer.
 *
 * The microphone hears the answer itself through the speakers, so the browser's
 * echo canceller does the heavy lifting and this only has to reject what leaks
 * past it: a residual level is tracked while she talks, and a real interruption
 * has to sit well above it and *stay* there. One syllable of leaked echo cannot
 * hold that for a fifth of a second; a person asking a question can.
 */
export class BargeInGate {
  private residual = 0.02;
  private loudFrames = 0;
  private startedAt = 0;
  private fired = false;
  private firedAt = -Infinity;

  /** Her turn started: reset and give the echo canceller time to converge. */
  begin(at: number) {
    this.startedAt = at;
    this.residual = 0.02;
    this.loudFrames = 0;
    this.fired = false;
    this.firedAt = -Infinity;
  }

  /**
   * Was there real voice over the echo just now?
   *
   * This is a second opinion, not a trigger: recognition can transcribe her own
   * words leaking back through the speakers, and this says whether anything
   * louder than that leak was actually in the room.
   */
  firedRecently(at: number) {
    return at - this.firedAt < VOICE_MEMORY_MS;
  }

  /** True the moment a voice above the room's echo is heard. */
  feed(peak: number, highRatio: number, at: number): boolean {
    if (at - this.startedAt < AEC_GRACE_MS) {
      // The grace window doubles as calibration: whatever leaks past the echo
      // canceller in this room, at this volume, is measured here and becomes
      // the bar. A loud leak raises it; headphones leave it at the floor.
      this.residual = this.residual * 0.85 + peak * 0.15;
      return false;
    }
    if (this.fired) return false;

    const threshold = Math.max(MIN_SPEECH_LEVEL, this.residual * RESIDUAL_FACTOR);
    // Loud but hiss-shaped: noise, not a person asking something.
    if (peak >= threshold && highRatio > MAX_VOICE_HIGH_RATIO) {
      this.loudFrames = Math.max(0, this.loudFrames - 1);
      return false;
    }
    if (peak < threshold) {
      // Quiet enough to be echo — this is what the bar is measured against.
      this.residual = this.residual * 0.9 + peak * 0.1;
      // Speech dips between syllables, so this leaks away rather than resetting;
      // requiring consecutive loud frames would never fire on a real sentence.
      this.loudFrames = Math.max(0, this.loudFrames - 1);
      return false;
    }

    this.loudFrames += 1;
    if (this.loudFrames < SUSTAIN_SCORE) return false;
    this.fired = true;
    this.firedAt = at;
    return true;
  }
}

export interface ClapDetectorOptions {
  /** Fired once per confirmed double clap. */
  onDoubleClap: () => void;
  /** True while the mic belongs to something else (recognition, a pending turn). */
  isBusy?: () => boolean;
  /** True while the page's own voice is playing — enables barge-in watching. */
  isSpeaking?: () => boolean;
  /**
   * A voice clearly above this room's echo was heard while she was speaking.
   *
   * This is the cue to start listening properly, not a decision to interrupt —
   * a door slam reaches the same bar as a person, and only a transcript can
   * tell them apart.
   */
  onVoiceOverEcho?: () => void;
}

/** What the caller gets back: how to stop, and a second opinion on the room. */
export interface ClapDetectorHandle {
  stop: () => void;
  /**
   * True when a voice clearly above this room's echo was heard in the last
   * couple of seconds. Speech recognition alone cannot tell the admin from the
   * analyst's own voice coming back through the speakers; this can.
   */
  voiceOverEcho: () => boolean;
}


/** Starts listening. Resolves to a stop function; rejects if the mic is refused. */
export async function startClapDetector(
  opts: ClapDetectorOptions,
): Promise<ClapDetectorHandle> {
  const stream = await navigator.mediaDevices.getUserMedia({
    // The browser's own echo cancellation keeps our spoken answer out of the
    // clap analysis, which is exactly the feedback that used to self-trigger.
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
  });

  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctor();
  if (ctx.state === "suspended") await ctx.resume().catch(() => undefined);

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = 0; // transients must not be smoothed away
  ctx.createMediaStreamSource(stream).connect(analyser);

  const wave = new Uint8Array(new ArrayBuffer(analyser.fftSize));
  const spectrum = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
  const hzPerBin = ctx.sampleRate / analyser.fftSize;
  const highFrom = Math.floor(3500 / hzPerBin);

  const gate = new ClapGate();
  const bargeIn = new BargeInGate();
  let wasSpeaking = false;
  let busyUntil = 0;
  let raf = 0;

  const tick = () => {
    raf = requestAnimationFrame(tick);
    const now = performance.now();

    if (opts.isBusy?.()) {
      // Something else owns the mic (recognition, a turn being fetched).
      busyUntil = now + BUSY_COOLDOWN_MS;
      gate.reset();
      wasSpeaking = false;
      return;
    }

    analyser.getByteTimeDomainData(wave);
    let peak = 0;
    for (let i = 0; i < wave.length; i++) {
      peak = Math.max(peak, Math.abs(wave[i] - 128) / 128);
    }

    // While she talks the mic is for interruptions only — her own voice would
    // otherwise mislead the clap gate's background estimate and trigger it.
    const speaking = opts.isSpeaking?.() ?? false;
    if (speaking) {
      if (!wasSpeaking) bargeIn.begin(now);
      wasSpeaking = true;
      busyUntil = now + BUSY_COOLDOWN_MS;
      gate.reset();
      analyser.getByteFrequencyData(spectrum);
      let speechTotal = 0;
      let speechHigh = 0;
      for (let i = 0; i < spectrum.length; i++) {
        speechTotal += spectrum[i];
        if (i >= highFrom) speechHigh += spectrum[i];
      }
      const ratio = speechTotal ? speechHigh / speechTotal : 0;
      if (bargeIn.feed(peak, ratio, now)) opts.onVoiceOverEcho?.();
      return;
    }
    wasSpeaking = false;
    if (now < busyUntil) return;

    analyser.getByteFrequencyData(spectrum);
    let total = 0;
    let high = 0;
    for (let i = 0; i < spectrum.length; i++) {
      total += spectrum[i];
      if (i >= highFrom) high += spectrum[i];
    }

    if (gate.feed({ peak, highRatio: total ? high / total : 0, at: now }) === "double") {
      opts.onDoubleClap();
    }
  };

  raf = requestAnimationFrame(tick);

  return {
    stop: () => {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((t) => t.stop());
      void ctx.close();
    },
    voiceOverEcho: () => bargeIn.firedRecently(performance.now()),
  };
}
