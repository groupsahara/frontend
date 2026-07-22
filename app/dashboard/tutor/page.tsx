"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { aiTutorApi, type TutorTurn } from "@/src/api/api";
import { TutorAvatar, type TutorPhase } from "@/src/components/tutor/tutor-avatar";
import { TutorScene } from "@/src/components/tutor/tutor-scene";
import { CloseIcon, SpinnerIcon } from "@/src/components/icons";

/* ------------------------- SpeechRecognition typing ------------------------ */

type SRAlternative = { transcript: string };
type SRResult = ArrayLike<SRAlternative> & { isFinal: boolean };
type SRResultEvent = { resultIndex: number; results: ArrayLike<SRResult> };

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SRResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/* ------------------------------- audio utils ------------------------------- */

/** Gemini TTS returns 16-bit little-endian mono PCM; the rate rides the mime. */
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

function getAudioCtxCtor(): typeof AudioContext {
  return (
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  );
}

/**
 * Split an answer into sentence chunks for pipelined TTS: the first chunk is
 * kept short so her voice starts almost immediately; the rest synthesize in
 * parallel while the first one plays.
 */
function chunkForSpeech(text: string): string[] {
  const sentences = text.match(/[^.!?।…]+[.!?।…]+["'”]?|[^.!?।…]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  const flush = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };
  for (const s of sentences) {
    const limit = chunks.length === 0 ? 120 : 280;
    if (current && (current + s).length > limit) flush();
    current += s;
  }
  flush();
  return chunks.length ? chunks : [text];
}

const GREETING =
  "Hello, dear one… I am Aanya, your angel tutor. Come, sit with me in the light. Press the mic once and we can simply talk, or type below. Ask me anything you wish to learn.";

/* --------------------------------- page ----------------------------------- */

export default function TutorPage() {
  const [phase, setPhase] = useState<TutorPhase>("idle");
  const [messages, setMessages] = useState<TutorTurn[]>([{ role: "tutor", text: GREETING }]);
  const [draft, setDraft] = useState("");
  const [interim, setInterim] = useState("");
  const [conversation, setConversation] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [subtitle, setSubtitle] = useState("");

  const phaseRef = useRef<TutorPhase>("idle");
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserDataRef = useRef<Uint8Array | null>(null);
  const synthSpeakingRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef = useRef(false);
  const conversationRef = useRef(false);
  // Invalidates any in-flight playback loop when speech is stopped/replaced.
  const playTokenRef = useRef(0);
  // Lets speak/ask re-arm the mic without a circular useCallback dependency.
  const startListeningRef = useRef<() => void>(() => {});
  const logRef = useRef<HTMLDivElement | null>(null);
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const updatePhase = useCallback((p: TutorPhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  /* ------------------------- amplitude for lip-sync ------------------------ */

  const getLevel = useCallback(() => {
    const analyser = analyserRef.current;
    if (analyser && analyserDataRef.current) {
      const data = analyserDataRef.current;
      analyser.getByteTimeDomainData(data as Uint8Array<ArrayBuffer>);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      return Math.min(1, Math.sqrt(sum / data.length) * 4.5);
    }
    // Browser-TTS fallback: no analyser tap, so fake a talking cadence.
    if (synthSpeakingRef.current) {
      const t = performance.now() / 1000;
      return 0.3 + 0.28 * Math.abs(Math.sin(t * 9)) + 0.18 * Math.abs(Math.sin(t * 23.7));
    }
    return 0;
  }, []);

  /* ------------------------------ stop speaking ---------------------------- */

  const stopSpeaking = useCallback(() => {
    playTokenRef.current++;
    try {
      if (sourceRef.current) sourceRef.current.onended = null;
      sourceRef.current?.stop();
    } catch {
      /* already stopped */
    }
    try {
      analyserRef.current?.disconnect();
    } catch {
      /* not connected */
    }
    sourceRef.current = null;
    analyserRef.current = null;
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    synthSpeakingRef.current = false;
    setSubtitle("");
    if (phaseRef.current === "speaking") updatePhase("idle");
  }, [updatePhase]);

  /** Playback finished naturally — go back to idle, or straight back to the mic. */
  const finishSpeaking = useCallback(() => {
    sourceRef.current = null;
    try {
      analyserRef.current?.disconnect();
    } catch {
      /* not connected */
    }
    analyserRef.current = null;
    synthSpeakingRef.current = false;
    setSubtitle("");
    updatePhase("idle");
    if (conversationRef.current) {
      // Small gap so the mic doesn't catch the tail of her own voice.
      window.setTimeout(() => {
        if (conversationRef.current && phaseRef.current === "idle") startListeningRef.current();
      }, 350);
    }
  }, [updatePhase]);

  /* ----------------------------- speak an answer --------------------------- */

  const speakWithBrowser = useCallback(
    (text: string) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        finishSpeaking();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = synth.getVoices();
      const female = voices.find((v) =>
        /female|zira|samantha|veena|heera|lekha|google uk english female|google हिन्दी/i.test(
          `${v.name} ${v.voiceURI}`,
        ),
      );
      if (female) utterance.voice = female;
      utterance.pitch = 1.05;
      utterance.rate = 1;
      utterance.onend = () => finishSpeaking();
      utterance.onerror = utterance.onend as never;
      synthSpeakingRef.current = true;
      updatePhase("speaking");
      synth.speak(utterance);
    },
    [finishSpeaking, updatePhase],
  );

  const speak = useCallback(
    async (text: string) => {
      stopSpeaking();
      const token = ++playTokenRef.current;
      setSubtitle(text);

      // Fire every chunk's TTS request up front; play them back in order.
      // Wrapped so a late chunk failing never surfaces as an unhandled rejection.
      const chunks = chunkForSpeech(text);
      const fetches = chunks.map((c) =>
        aiTutorApi.speak(c).then(
          (r) => ({ ok: true as const, r }),
          () => ({ ok: false as const }),
        ),
      );

      let next = 0;
      let analyser: AnalyserNode | null = null;
      try {
        const ctx = (audioCtxRef.current ??= new (getAudioCtxCtor())());
        if (ctx.state === "suspended") await ctx.resume();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.5;
        analyser.connect(ctx.destination);
        analyserDataRef.current = new Uint8Array(analyser.fftSize);

        for (; next < fetches.length; next++) {
          const result = await fetches[next];
          if (playTokenRef.current !== token) return;
          if (!result.ok) throw new Error("tts chunk failed");
          const buffer = pcmToAudioBuffer(ctx, result.r.audio, result.r.mimeType);
          const source = ctx.createBufferSource();
          source.buffer = buffer;
          source.connect(analyser);
          analyserRef.current = analyser;
          sourceRef.current = source;
          if (phaseRef.current !== "speaking") updatePhase("speaking");
          await new Promise<void>((resolve) => {
            source.onended = () => resolve();
            source.start();
          });
          if (playTokenRef.current !== token) return;
        }
        finishSpeaking();
      } catch {
        if (playTokenRef.current !== token) return;
        // Server TTS unavailable — browser voice covers whatever wasn't spoken.
        speakWithBrowser(chunks.slice(next).join(" "));
      } finally {
        // The playback loop is over by the time we get here (every chunk is
        // awaited), so releasing the tap is always safe — even doubly so after
        // stopSpeaking/finishSpeaking already disconnected it.
        try {
          analyser?.disconnect();
        } catch {
          /* not connected */
        }
      }
    },
    [finishSpeaking, speakWithBrowser, stopSpeaking, updatePhase],
  );

  /* -------------------------------- ask flow ------------------------------- */

  const ask = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || phaseRef.current === "thinking") return;
      stopSpeaking();
      setDraft("");
      setInterim("");
      // History BEFORE appending, capped to the last 20 turns.
      const history = messagesRef.current.slice(-20);
      setMessages((prev) => [...prev, { role: "user", text: q }]);
      updatePhase("thinking");
      try {
        const { answer } = await aiTutorApi.ask({ question: q, history });
        setMessages((prev) => [...prev, { role: "tutor", text: answer }]);
        await speak(answer);
      } catch (err) {
        updatePhase("idle");
        toast.error(err instanceof Error ? err.message : "The tutor could not answer — try again");
        // Don't let one failure kill a hands-free session.
        if (conversationRef.current) window.setTimeout(() => startListeningRef.current(), 600);
      }
    },
    [speak, stopSpeaking, updatePhase],
  );

  /* ------------------------------- microphone ------------------------------ */

  // SSR-safe capability check, same pattern as the dashboard layout's auth
  // snapshot: assume supported on the server, read the real value on mount.
  const micSupported = useSyncExternalStore(
    () => () => {},
    () => !!getRecognitionCtor(),
    () => true,
  );

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    setInterim("");
    if (phaseRef.current === "listening") updatePhase("idle");
  }, [updatePhase]);

  const startListening = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      toast.error("Voice input is not supported in this browser — type your question instead");
      return;
    }
    if (listeningRef.current) return;
    stopSpeaking();
    // Warm the AudioContext inside this user gesture so playback is allowed.
    audioCtxRef.current ??= new (getAudioCtxCtor())();
    void audioCtxRef.current.resume().catch(() => undefined);

    const recognition = new Ctor();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let finalText = "";
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alt = e.results[i][0];
        if (e.results[i].isFinal) finalText += alt.transcript;
        else interimText += alt.transcript;
      }
      if (interimText) setInterim(interimText);
      if (finalText) {
        listeningRef.current = false;
        setInterim("");
        void ask(finalText);
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      if (!listeningRef.current) return;
      listeningRef.current = false;
      // Hands-free mode: silence just re-arms the mic instead of ending.
      if (conversationRef.current && phaseRef.current === "listening") {
        window.setTimeout(() => {
          if (conversationRef.current && phaseRef.current === "listening" && !listeningRef.current) {
            updatePhase("idle");
            startListeningRef.current();
          }
        }, 250);
        return;
      }
      if (phaseRef.current === "listening") updatePhase("idle");
    };
    recognition.onerror = (e) => {
      if (e.error === "not-allowed") {
        conversationRef.current = false;
        setConversation(false);
        toast.error("Microphone permission was denied");
      } else if (e.error !== "aborted" && e.error !== "no-speech") {
        toast.error("Could not hear you — try again");
      }
    };
    recognitionRef.current = recognition;
    listeningRef.current = true;
    updatePhase("listening");
    recognition.start();
  }, [ask, stopSpeaking, updatePhase]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  /** One click starts a hands-free session; the next click ends it. */
  const toggleConversation = useCallback(() => {
    if (conversationRef.current) {
      conversationRef.current = false;
      setConversation(false);
      stopListening();
      stopSpeaking();
    } else {
      conversationRef.current = true;
      setConversation(true);
      startListening();
    }
  }, [startListening, stopListening, stopSpeaking]);

  /* ------------------------------- lifecycle ------------------------------- */

  useEffect(() => {
    return () => {
      conversationRef.current = false;
      recognitionRef.current?.abort();
      try {
        sourceRef.current?.stop();
      } catch {
        /* noop */
      }
      window.speechSynthesis?.cancel();
      void audioCtxRef.current?.close().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, panelOpen]);

  const statusLabel =
    phase === "listening"
      ? "Listening…"
      : phase === "thinking"
        ? "Thinking…"
        : phase === "speaking"
          ? "Speaking…"
          : conversation
            ? "Conversation on"
            : "Waiting for you";

  return (
    <div className="tutor-page relative -mx-4 -my-6 h-[calc(100dvh-4rem)] min-h-[560px] overflow-hidden bg-[#cfdcf4] sm:-mx-6">
      <TutorScene phase={phase}>
        <TutorAvatar phase={phase} getLevel={getLevel} />
      </TutorScene>

      {/* title + status */}
      <div className="pointer-events-none absolute left-5 top-4 z-20 select-none">
        <h1 className="tutor-title text-2xl font-semibold tracking-[0.35em] text-amber-600 sm:text-3xl">
          AANYA
        </h1>
        <p className="mt-1 text-[10px] uppercase tracking-[0.3em] text-indigo-900/60 sm:text-xs">
          Angel Tutor · ask me anything
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/60 px-3 py-1 backdrop-blur">
          <span
            className={[
              "h-2 w-2 rounded-full",
              phase === "listening" && "animate-pulse bg-sky-500",
              phase === "thinking" && "animate-pulse bg-amber-400",
              phase === "speaking" && "animate-pulse bg-emerald-500",
              phase === "idle" && (conversation ? "animate-pulse bg-amber-400" : "bg-indigo-300"),
            ]
              .filter(Boolean)
              .join(" ")}
          />
          <span className="text-xs text-indigo-900/80">{statusLabel}</span>
        </div>
      </div>

      {/* transcript toggle */}
      <button
        type="button"
        onClick={() => setPanelOpen((v) => !v)}
        className="absolute right-4 top-4 z-30 rounded-full border border-white/60 bg-white/60 px-4 py-1.5 text-xs text-indigo-900/80 backdrop-blur transition-colors hover:bg-white/90 hover:text-indigo-950"
      >
        {panelOpen ? "Hide transcript" : "Transcript"}
      </button>

      {/* transcript panel */}
      {panelOpen && (
        <div className="absolute bottom-32 right-4 top-14 z-20 flex w-[19rem] max-w-[85vw] flex-col overflow-hidden rounded-2xl border border-white/70 bg-white/60 backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-indigo-100 px-4 py-2.5">
            <span className="text-xs uppercase tracking-widest text-indigo-400">Lesson transcript</span>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className="text-indigo-300 transition-colors hover:text-indigo-700"
            >
              <CloseIcon className="h-4 w-4" />
            </button>
          </div>
          <div ref={logRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={[
                    "max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-indigo-500/85 text-white"
                      : "rounded-bl-sm bg-white/85 text-slate-700 shadow-sm",
                  ].join(" ")}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {phase === "thinking" && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-white/85 px-3 py-2 text-[13px] text-indigo-400 shadow-sm">
                  <SpinnerIcon className="h-3.5 w-3.5" /> Aanya is thinking…
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* live subtitle while she speaks */}
      {phase === "speaking" && subtitle && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 w-[min(46rem,90vw)] -translate-x-1/2 text-center">
          <p className="mx-auto line-clamp-3 rounded-xl bg-white/65 px-4 py-2 text-sm italic leading-relaxed text-indigo-900/90 backdrop-blur-sm">
            “{subtitle}”
          </p>
        </div>
      )}

      {/* interim voice text */}
      {phase === "listening" && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 w-[min(40rem,90vw)] -translate-x-1/2 text-center">
          <p className="mx-auto rounded-xl bg-white/65 px-4 py-2 text-sm text-sky-800 backdrop-blur-sm">
            {interim || "I'm listening… speak your question."}
          </p>
        </div>
      )}

      {/* controls */}
      <div className="absolute bottom-5 left-1/2 z-30 w-[min(42rem,92vw)] -translate-x-1/2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(draft);
          }}
          className="flex items-center gap-2 rounded-2xl border border-white/70 bg-white/65 p-2 shadow-lg shadow-indigo-300/30 backdrop-blur-md"
        >
          {/* mic — one click for a hands-free conversation */}
          <button
            type="button"
            onClick={toggleConversation}
            disabled={!micSupported}
            title={
              !micSupported
                ? "Voice input not supported in this browser"
                : conversation
                  ? "End the conversation"
                  : "Start a hands-free conversation"
            }
            className={[
              "relative grid h-12 w-12 shrink-0 place-items-center rounded-full transition-all",
              conversation
                ? "bg-amber-400 text-white shadow-[0_0_24px_rgba(245,185,66,0.75)]"
                : "bg-indigo-900/10 text-indigo-800 hover:bg-indigo-900/20",
              !micSupported && "cursor-not-allowed opacity-40",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {phase === "listening" && (
              <span className="absolute inset-0 animate-ping rounded-full bg-amber-400/50" />
            )}
            {conversation ? (
              <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="currentColor">
                <rect x="7" y="7" width="10" height="10" rx="2" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="3" width="6" height="11" rx="3" />
                <path d="M5 11a7 7 0 0 0 14 0" />
                <path d="M12 18v3" />
              </svg>
            )}
          </button>

          <input
            value={interim && phase === "listening" ? interim : draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={conversation ? "Conversation on — just speak…" : "Ask Aanya anything…"}
            className="min-w-0 flex-1 bg-transparent px-2 text-sm text-indigo-950 placeholder:text-indigo-400 focus:outline-none"
          />

          {phase === "speaking" ? (
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                if (conversationRef.current) startListeningRef.current();
              }}
              className="shrink-0 rounded-xl bg-indigo-900/10 px-4 py-2.5 text-sm text-indigo-800 transition-colors hover:bg-indigo-900/20"
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim() || phase === "thinking"}
              className="shrink-0 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phase === "thinking" ? <SpinnerIcon className="h-4 w-4" /> : "Ask"}
            </button>
          )}
        </form>
      </div>

      <style>{`
        .tutor-title { text-shadow: 0 0 18px rgba(255, 214, 110, 0.85), 0 1px 2px rgba(255,255,255,0.9); }
      `}</style>
    </div>
  );
}
