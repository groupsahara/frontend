
/**
 * Playback for Gemini's live audio: 16-bit little-endian mono PCM, streamed in
 * many small chunks whose sample rate rides on the mime type.
 *
 * The chunks arrive faster than they play, so each is scheduled to start where
 * the previous one ends — anything that waits for `onended` to queue the next
 * chunk stutters audibly.
 */

function getAudioCtxCtor(): typeof AudioContext {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  );
}

/** Gemini returns 16-bit little-endian mono PCM; the rate rides on the mime. */
function pcmToAudioBuffer(ctx: AudioContext, base64: string, mimeType: string): AudioBuffer {
  const rate = Number(/rate=(\d+)/.exec(mimeType)?.[1] ?? 24000);
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const view = new DataView(bytes.buffer);
  const samples = Math.floor(bytes.length / 2);
  const buffer = ctx.createBuffer(1, Math.max(samples, 1), rate);
  const channel = buffer.getChannelData(0);
  for (let i = 0; i < samples; i++) channel[i] = view.getInt16(i * 2, true) / 32768;
  return buffer;
}


/**
 * One AudioContext for the whole page, unlocked by the first real click.
 *
 * Browsers refuse to start audio that no gesture asked for, and a clap is not a
 * gesture — so the context is created and resumed early, while the admin is
 * still clicking around, and every later stream reuses it.
 */
let shared: AudioContext | null = null;

export function primeAudio(): AudioContext | null {
  try {
    shared ??= new (getAudioCtxCtor())();
    if (shared.state === "suspended") void shared.resume().catch(() => undefined);
  } catch {
    /* no Web Audio here — callers fall back to a browser voice */
  }
  return shared;
}


/**
 * How far ahead of the clock the first chunk is scheduled.
 *
 * Chunks arrive over a socket, so they arrive unevenly. With only a few
 * milliseconds of lead the queue runs dry between packets and the voice breaks
 * up; a quarter second rides out the jitter, at a delay nobody hears as late.
 */
const JITTER_LEAD_S = 0.25;

export class PcmStreamPlayer {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private levels = new Uint8Array(new ArrayBuffer(0));
  private nextTime = 0;
  private readonly sources = new Set<AudioBufferSourceNode>();
  private sealed = false;
  private played = false;
  private stopped = false;


  /** Called once the last queued chunk has finished, after `seal()`. */
  constructor(private readonly onDrained: () => void) {}

  /** True once any audio has actually been queued for this stream. */
  get hasAudio() {
    return this.played;
  }

  /** Warm the shared context early, so the first chunk is allowed to sound. */
  prime() {
    this.ctx ??= primeAudio();
  }

  push(base64: string, mimeType: string) {
    // A stopped stream is finished for good: late chunks from an abandoned
    // turn must never play over the turn that replaced it.
    if (this.stopped) return;
    try {
      const ctx = this.ctx ?? primeAudio();
      if (!ctx) return;
      this.ctx = ctx;

      if (!this.analyser) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.5;
        analyser.connect(ctx.destination);
        this.levels = new Uint8Array(new ArrayBuffer(analyser.fftSize));
        this.analyser = analyser;
      }

      const buffer = pcmToAudioBuffer(ctx, base64, mimeType);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.analyser);
      // Behind the clock means the queue ran dry: restart the buffer rather
      // than scheduling into the past, which plays instantly and doubles up
      // over whatever is still sounding.
      if (this.nextTime < ctx.currentTime + 0.02) {
        this.nextTime = ctx.currentTime + JITTER_LEAD_S;
      }
      const startAt = this.nextTime;
      this.nextTime = startAt + buffer.duration;
      this.sources.add(source);
      this.played = true;
      source.onended = () => {
        // A stopped stream was cut off deliberately — it has not "drained",
        // and must not hand the turn on as though it finished speaking.
        if (this.stopped) return;
        this.sources.delete(source);
        if (this.sealed && !this.sources.size) this.onDrained();
      };
      source.start(startAt);
    } catch {
      /* one bad chunk — skip it, the following chunks keep the clock */
    }
  }


  /** No more chunks are coming; report drained once what is queued finishes. */
  seal() {
    this.sealed = true;
    if (!this.sources.size) this.onDrained();
  }


  /** Current loudness 0..1, for anything that animates with the voice. */
  level() {
    if (!this.analyser) return 0;
    this.analyser.getByteTimeDomainData(this.levels);
    let peak = 0;
    for (let i = 0; i < this.levels.length; i++) {
      peak = Math.max(peak, Math.abs(this.levels[i] - 128) / 128);
    }
    return Math.min(1, peak * 1.6);
  }


  /** True while there is still audio scheduled to sound. */
  get playing() {
    return !!this.ctx && this.nextTime > this.ctx.currentTime;
  }


  /** Stop mid-sentence and forget everything queued, for good. */
  stop() {
    this.stopped = true;
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        /* already ended */
      }
    }
    this.sources.clear();
    this.nextTime = 0;
    this.sealed = false;
    this.played = false;
  }
}
