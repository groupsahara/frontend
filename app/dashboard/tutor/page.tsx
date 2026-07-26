"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  aiTutorApi,
  type TutorLook,
  type TutorPersona,
  type TutorSpeechLang,
  type TutorTurn,
  type TutorVisual,
} from "@/src/api/api";
import { TutorAvatar, type TutorPhase } from "@/src/components/tutor/tutor-avatar";
import { TutorBoard } from "@/src/components/tutor/tutor-board";
import { TutorCamera } from "@/src/components/tutor/tutor-camera";
import { TutorGalaxyScene } from "@/src/components/tutor/tutor-galaxy-scene";
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
 * Fallback browser voice: Indian accent only. Prefer a real hi-IN/en-IN
 * voice, then UK English (closest to Indian English on most systems) —
 * never a US voice while any alternative exists.
 */
function pickBrowserVoice(voices: SpeechSynthesisVoice[], lang: TutorSpeechLang) {
  const norm = (l: string | undefined) => (l ?? "").replace("_", "-").toLowerCase();
  const primary = lang.slice(0, 2);
  const isUS = (v: SpeechSynthesisVoice) => norm(v.lang) === "en-us" || /us english/i.test(v.name);
  const female = (v: SpeechSynthesisVoice) =>
    /female|lekha|swara|veena|heera|kalpana|neerja|isha/i.test(`${v.name} ${v.voiceURI}`);
  const exact = voices.filter((v) => norm(v.lang) === lang.toLowerCase());
  const sameLang = voices.filter((v) => norm(v.lang).startsWith(primary) && !isUS(v));
  const enIN = voices.filter((v) => norm(v.lang) === "en-in");
  const ukFemale = voices.filter((v) => norm(v.lang) === "en-gb" && female(v));
  const nonUsEnglish = voices.filter((v) => norm(v.lang).startsWith("en") && !isUS(v));
  // For Hindi with no Hindi voice installed, still land on an Indian/UK
  // English voice — never let the browser default (usually US) read Hindi.
  return (
    exact.find(female) ??
    exact[0] ??
    sameLang.find(female) ??
    sameLang[0] ??
    enIN.find(female) ??
    enIN[0] ??
    ukFemale[0] ??
    nonUsEnglish[0] ??
    voices.find((v) => norm(v.lang).startsWith(primary))
  );
}

/**
 * One language per answer, decided over the FULL text and reused for every
 * chunk — otherwise the accent could flip between chunks. Devanagari → Hindi;
 * romanized text with enough Hindi cue-words → Hinglish (the hi-IN voice
 * code-switches naturally); anything else → Indian English.
 */
const HINDI_CUES =
  /\b(hai|hain|nahi|nahin|kya|kyu|kyun|aap|tum|hum|mein|mera|meri|acha|accha|theek|thik|bahut|bohot|karo|karna|hota|hoti|wala|wali|aur|lekin|matlab|samajh|seekho|bilkul|zaroor|shukriya|chalo|dekho|suno|jaise|kaise|kitna|kuch|yeh|woh)\b/g;

function hindiCueCount(text: string): number {
  return text.toLowerCase().match(HINDI_CUES)?.length ?? 0;
}

function detectSpeechLang(text: string): TutorSpeechLang {
  if (/[ऀ-ॿ]/.test(text)) return "hi-IN";
  return hindiCueCount(text) >= 2 ? "hi-IN" : "en-IN";
}

/* ----------------------------- expert badges ------------------------------ */
// Selecting a badge locks Aanya into that expert role for every answer.

const BADGES: { key: TutorPersona; label: string; emoji: string }[] = [
  { key: "doctor", label: "Doctor", emoji: "🩺" },
  { key: "electrician", label: "Electrician", emoji: "⚡" },
  { key: "technician", label: "Technician", emoji: "🔧" },
  { key: "developer", label: "Developer", emoji: "💻" },
  { key: "scientist", label: "Scientist", emoji: "🔬" },
  { key: "astrologer", label: "Astrologer", emoji: "✨" },
  { key: "student", label: "Study Buddy", emoji: "📚" },
  { key: "chef", label: "Chef", emoji: "🍳" },
  { key: "lawyer", label: "Lawyer", emoji: "⚖️" },
  { key: "fitness", label: "Fitness Coach", emoji: "💪" },
];

/* --------------------------- "mirror me" store ---------------------------- */
// Only the derived traits persist (localStorage); the photo itself never
// leaves the scan request. useSyncExternalStore keeps hydration clean.

const LOOK_KEY = "rc.tutorLook";
let lookCache: TutorLook | null | undefined;
const lookListeners = new Set<() => void>();

function getLookSnapshot(): TutorLook | null {
  if (lookCache === undefined) {
    try {
      lookCache = JSON.parse(window.localStorage.getItem(LOOK_KEY) ?? "null") as TutorLook | null;
    } catch {
      lookCache = null;
    }
  }
  return lookCache ?? null;
}

function subscribeLook(cb: () => void): () => void {
  lookListeners.add(cb);
  return () => {
    lookListeners.delete(cb);
  };
}

function saveLook(look: TutorLook | null) {
  lookCache = look;
  try {
    if (look) window.localStorage.setItem(LOOK_KEY, JSON.stringify(look));
    else window.localStorage.removeItem(LOOK_KEY);
  } catch {
    /* private mode */
  }
  lookListeners.forEach((cb) => cb());
}

/* ------------------------------ theme store ------------------------------- */
// Galaxy is the default; the side tab switches to the angel theme and back.

type TutorTheme = "galaxy" | "angel";
const THEME_KEY = "rc.tutorTheme";
let themeCache: TutorTheme | undefined;
const themeListeners = new Set<() => void>();

function getThemeSnapshot(): TutorTheme {
  if (themeCache === undefined) {
    themeCache = window.localStorage.getItem(THEME_KEY) === "angel" ? "angel" : "galaxy";
  }
  return themeCache;
}

function subscribeTheme(cb: () => void): () => void {
  themeListeners.add(cb);
  return () => {
    themeListeners.delete(cb);
  };
}

function saveTheme(theme: TutorTheme) {
  themeCache = theme;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* private mode */
  }
  themeListeners.forEach((cb) => cb());
}

const GREETING =
  "Hello, dear one… I am Aanya, your tutor. Press the mic once and we can simply talk, or type below. Ask me anything you wish to learn.";

/* --------------------------------- page ----------------------------------- */

export default function TutorPage() {
  const [phase, setPhase] = useState<TutorPhase>("idle");
  const [messages, setMessages] = useState<TutorTurn[]>([{ role: "tutor", text: GREETING }]);
  const [draft, setDraft] = useState("");
  const [interim, setInterim] = useState("");
  const [conversation, setConversation] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [subtitle, setSubtitle] = useState("");
  const [visual, setVisual] = useState<Extract<TutorVisual, { applicable: true }> | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [persona, setPersona] = useState<TutorPersona | null>(null);
  const personaRef = useRef<TutorPersona | null>(null);
  // The student's scanned look — she transforms whenever this changes.
  const look = useSyncExternalStore(subscribeLook, getLookSnapshot, () => null);
  // Scene theme: galaxy (default) or angel, switched by the side tab.
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "galaxy" as const);
  const dark = theme === "galaxy";

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
  // Ties a background visualize() result to the question it belongs to.
  const askSeqRef = useRef(0);
  // Accent stickiness: an ongoing Hindi/Hinglish conversation stays hi-IN
  // through turns whose text alone would look ambiguous.
  const lastLangRef = useRef<TutorSpeechLang | null>(null);
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
    (text: string, lang: TutorSpeechLang) => {
      const synth = window.speechSynthesis;
      if (!synth) {
        finishSpeaking();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;
      const voice = pickBrowserVoice(synth.getVoices(), lang);
      if (voice) utterance.voice = voice;
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

  /** Play one live turn's audio (single PCM buffer) through the lip-sync tap. */
  const playAnswer = useCallback(
    async (turn: { answer: string; audio: string; mimeType: string; languageCode: string }) => {
      stopSpeaking();
      const token = ++playTokenRef.current;
      setSubtitle(turn.answer);
      const browserLang: TutorSpeechLang = turn.languageCode.toLowerCase().startsWith("hi")
        ? "hi-IN"
        : "en-IN";
      if (!turn.audio) {
        speakWithBrowser(turn.answer, browserLang);
        return;
      }

      let analyser: AnalyserNode | null = null;
      try {
        const ctx = (audioCtxRef.current ??= new (getAudioCtxCtor())());
        if (ctx.state === "suspended") await ctx.resume();
        analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.5;
        analyser.connect(ctx.destination);
        analyserDataRef.current = new Uint8Array(analyser.fftSize);
        const buffer = pcmToAudioBuffer(ctx, turn.audio, turn.mimeType);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(analyser);
        analyserRef.current = analyser;
        sourceRef.current = source;
        updatePhase("speaking");
        await new Promise<void>((resolve) => {
          source.onended = () => resolve();
          source.start();
        });
        if (playTokenRef.current !== token) return;
        finishSpeaking();
      } catch {
        if (playTokenRef.current !== token) return;
        // Audio failed to decode/play — the browser voice still answers.
        speakWithBrowser(turn.answer, browserLang);
      } finally {
        // Playback is over by the time we get here, so releasing the tap is
        // always safe — doubly so after stopSpeaking/finishSpeaking.
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

  /**
   * Which accent this turn should use, resolved BEFORE the live call from the
   * question + conversation stickiness: Hindi wins on any Hindi signal, an
   * ongoing Hindi conversation stays Hindi through ambiguous turns, and when
   * nothing is conclusive the server's env default decides (undefined).
   */
  const resolveSpeechLang = useCallback((question: string): TutorSpeechLang | undefined => {
    if (detectSpeechLang(question) === "hi-IN") return "hi-IN";
    if (lastLangRef.current === "hi-IN" && hindiCueCount(question) >= 1) return "hi-IN";
    return lastLangRef.current ?? undefined;
  }, []);

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
      const seq = ++askSeqRef.current;
      setVisual(null);
      try {
        const turn = await aiTutorApi.converse({
          question: q,
          history,
          persona: personaRef.current ?? undefined,
          languageCode: resolveSpeechLang(q),
        });
        const answer = turn.answer || "…";
        setMessages((prev) => [...prev, { role: "tutor", text: answer }]);
        // The accent the server actually used becomes the sticky one.
        lastLangRef.current = turn.languageCode.toLowerCase().startsWith("hi")
          ? "hi-IN"
          : "en-IN";
        // Whiteboard runs in the background while she starts speaking — the
        // board pops in whenever it's ready, and only for the latest question.
        aiTutorApi
          .visualize({ question: q, answer })
          .then((v) => {
            if (askSeqRef.current === seq && v.applicable) setVisual(v);
          })
          .catch(() => undefined);
        await playAnswer(turn);
      } catch (err) {
        updatePhase("idle");
        toast.error(err instanceof Error ? err.message : "The tutor could not answer — try again");
        // Don't let one failure kill a hands-free session.
        if (conversationRef.current) window.setTimeout(() => startListeningRef.current(), 600);
      }
    },
    [playAnswer, resolveSpeechLang, stopSpeaking, updatePhase],
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

  /* ---------------------------- expert badges ------------------------------ */

  const togglePersona = useCallback((key: TutorPersona) => {
    const next = personaRef.current === key ? null : key;
    personaRef.current = next;
    setPersona(next);
  }, []);

  /* ------------------------------ mirror me -------------------------------- */

  const handleCaptured = useCallback((dataUrl: string) => {
    setCameraOpen(false);
    setScanning(true);
    aiTutorApi
      .appearance(dataUrl)
      .then((r) => {
        if (r.person) {
          saveLook(r);
          toast.success("Scan complete — Aanya has taken your look ✨");
        } else {
          toast.error("I couldn't see a face clearly — try again with better light");
        }
      })
      .catch((err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Scan failed — try again"),
      )
      .finally(() => setScanning(false));
  }, []);

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
    <div
      className={`tutor-page relative -mx-4 -my-6 h-[calc(100dvh-4rem)] min-h-[560px] overflow-hidden sm:-mx-6 ${dark ? "bg-[#04040c]" : "bg-[#cfdcf4]"}`}
    >
      {dark ? (
        <TutorGalaxyScene phase={phase}>
          <TutorAvatar phase={phase} getLevel={getLevel} look={look} theme="galaxy" />
        </TutorGalaxyScene>
      ) : (
        <TutorScene phase={phase}>
          <TutorAvatar phase={phase} getLevel={getLevel} look={look} theme="angel" />
        </TutorScene>
      )}


      {cameraOpen && (
        <TutorCamera onCancel={() => setCameraOpen(false)} onCaptured={handleCaptured} />
      )}

      {/* title + status */}
      <div className="pointer-events-none absolute left-5 top-4 z-20 select-none">
        <h1
          className={`text-2xl font-semibold tracking-[0.35em] sm:text-3xl ${dark ? "tutor-title-galaxy text-violet-200" : "tutor-title-angel text-amber-600"}`}
        >
          AANYA
        </h1>
        <p
          className={`mt-1 text-[10px] uppercase tracking-[0.3em] sm:text-xs ${dark ? "text-indigo-200/60" : "text-indigo-900/60"}`}
        >
          {dark ? "Cosmic Tutor · ask me anything" : "Angel Tutor · ask me anything"}
        </p>
        <div
          className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1 backdrop-blur ${dark ? "border-white/15 bg-white/10" : "border-white/60 bg-white/60"}`}
        >
          <span
            className={[
              "h-2 w-2 rounded-full",
              phase === "listening" && "animate-pulse bg-sky-400",
              phase === "thinking" && "animate-pulse bg-amber-400",
              phase === "speaking" && "animate-pulse bg-emerald-400",
              phase === "idle" &&
                (conversation ? "animate-pulse bg-amber-400" : dark ? "bg-slate-400" : "bg-indigo-300"),
            ]
              .filter(Boolean)
              .join(" ")}
          />
          <span className={`text-xs ${dark ? "text-indigo-100/90" : "text-indigo-900/80"}`}>
            {statusLabel}
          </span>
        </div>
      </div>

      {/* whiteboard — floats beside her on wide screens, above the controls on small */}
      {visual && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-20 w-[min(24rem,92vw)] -translate-x-1/2 lg:left-6 lg:top-1/2 lg:w-[min(26rem,38vw)] lg:-translate-x-0 lg:-translate-y-1/2">
          <TutorBoard visual={visual} onClose={() => setVisual(null)} />
        </div>
      )}

      {/* top-right actions: theme tabs + mirror-me scan + transcript */}
      <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
        {/* theme tabs — galaxy by default, angel only when its tab is clicked */}
        <div
          className={`flex items-center rounded-full border p-0.5 backdrop-blur ${dark ? "border-white/15 bg-white/10" : "border-white/60 bg-white/60"}`}
        >
          <button
            type="button"
            onClick={() => saveTheme("galaxy")}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${dark ? "bg-violet-600 text-white shadow-[0_0_12px_rgba(140,110,255,0.5)]" : "text-indigo-900/60 hover:text-indigo-950"}`}
          >
            Galaxy
          </button>
          <button
            type="button"
            onClick={() => saveTheme("angel")}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${!dark ? "bg-amber-400 text-white shadow-[0_0_12px_rgba(245,185,66,0.5)]" : "text-indigo-200/70 hover:text-white"}`}
          >
            Angel
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCameraOpen(true)}
          disabled={scanning}
          title="Scan yourself once — Aanya transforms to match you"
          className={`flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs backdrop-blur transition-colors disabled:opacity-50 ${dark ? "border-violet-300/40 bg-white/10 text-violet-200 hover:bg-white/20" : "border-amber-300/70 bg-white/60 text-amber-700 hover:bg-white/90"}`}
        >
          {scanning ? (
            <>
              <SpinnerIcon className="h-3.5 w-3.5" /> Transforming…
            </>
          ) : (
            <>
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              {look ? "Rescan me" : "Mirror me"}
            </>
          )}
        </button>
        {look && !scanning && (
          <button
            type="button"
            onClick={() => saveLook(null)}
            title="Back to Aanya's own look"
            className={`rounded-full border px-3 py-1.5 text-xs backdrop-blur transition-colors ${dark ? "border-white/15 bg-white/10 text-indigo-100 hover:bg-white/20" : "border-white/60 bg-white/60 text-indigo-900/80 hover:bg-white/90"}`}
          >
            Reset look
          </button>
        )}
        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          className={`rounded-full border px-4 py-1.5 text-xs backdrop-blur transition-colors ${dark ? "border-white/15 bg-white/10 text-indigo-100 hover:bg-white/20 hover:text-white" : "border-white/60 bg-white/60 text-indigo-900/80 hover:bg-white/90 hover:text-indigo-950"}`}
        >
          {panelOpen ? "Hide transcript" : "Transcript"}
        </button>
      </div>

      {/* transcript panel */}
      {panelOpen && (
        <div
          className={`absolute bottom-32 right-4 top-14 z-20 flex w-[19rem] max-w-[85vw] flex-col overflow-hidden rounded-2xl border backdrop-blur-md ${dark ? "border-white/10 bg-black/50" : "border-white/70 bg-white/60"}`}
        >
          <div
            className={`flex items-center justify-between border-b px-4 py-2.5 ${dark ? "border-white/10" : "border-indigo-100"}`}
          >
            <span className={`text-xs uppercase tracking-widest ${dark ? "text-indigo-300" : "text-indigo-400"}`}>Lesson transcript</span>
            <button
              type="button"
              onClick={() => setPanelOpen(false)}
              className={`transition-colors ${dark ? "text-indigo-400 hover:text-white" : "text-indigo-300 hover:text-indigo-700"}`}
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
                      ? dark
                        ? "rounded-br-sm bg-violet-600/80 text-white"
                        : "rounded-br-sm bg-indigo-500/85 text-white"
                      : dark
                        ? "rounded-bl-sm bg-white/10 text-indigo-100"
                        : "rounded-bl-sm bg-white/85 text-slate-700 shadow-sm",
                  ].join(" ")}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {phase === "thinking" && (
              <div className="flex justify-start">
                <div
                  className={`flex items-center gap-2 rounded-2xl rounded-bl-sm px-3 py-2 text-[13px] ${dark ? "bg-white/10 text-indigo-300" : "bg-white/85 text-indigo-400 shadow-sm"}`}
                >
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
          <p
            className={`mx-auto line-clamp-3 rounded-xl px-4 py-2 text-sm italic leading-relaxed backdrop-blur-sm ${dark ? "bg-black/45 text-violet-100/90" : "bg-white/65 text-indigo-900/90"}`}
          >
            “{subtitle}”
          </p>
        </div>
      )}

      {/* interim voice text */}
      {phase === "listening" && (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 w-[min(40rem,90vw)] -translate-x-1/2 text-center">
          <p
            className={`mx-auto rounded-xl px-4 py-2 text-sm backdrop-blur-sm ${dark ? "bg-black/45 text-sky-200" : "bg-white/65 text-sky-800"}`}
          >
            {interim || "I'm listening… speak your question."}
          </p>
        </div>
      )}

      {/* controls */}
      <div className="absolute bottom-5 left-1/2 z-30 w-[min(42rem,92vw)] -translate-x-1/2">
        {/* expert badges — click one and she answers in that role */}
        <div className="mb-2 flex gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {BADGES.map((b) => {
            const active = persona === b.key;
            return (
              <button
                key={b.key}
                type="button"
                onClick={() => togglePersona(b.key)}
                title={active ? "Back to the general tutor" : `Ask her as a ${b.label.toLowerCase()}`}
                className={[
                  "flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1 text-xs backdrop-blur transition-colors",
                  active
                    ? dark
                      ? "border-violet-400/60 bg-violet-600 text-white shadow-[0_0_12px_rgba(140,110,255,0.5)]"
                      : "border-amber-300 bg-amber-400 text-white shadow-[0_0_12px_rgba(245,185,66,0.5)]"
                    : dark
                      ? "border-white/10 bg-white/10 text-indigo-100 hover:bg-white/20"
                      : "border-white/60 bg-white/60 text-indigo-900/70 hover:bg-white/90",
                ].join(" ")}
              >
                <span aria-hidden>{b.emoji}</span> {b.label}
              </button>
            );
          })}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void ask(draft);
          }}
          className={`flex items-center gap-2 rounded-2xl border p-2 backdrop-blur-md ${dark ? "border-white/10 bg-black/50 shadow-lg shadow-violet-900/40" : "border-white/70 bg-white/65 shadow-lg shadow-indigo-300/30"}`}
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
                : dark
                  ? "bg-white/10 text-indigo-100 hover:bg-white/20"
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
            placeholder={
              conversation
                ? "Conversation on — just speak…"
                : persona
                  ? `Ask your ${BADGES.find((b) => b.key === persona)?.label.toLowerCase()}…`
                  : "Ask Aanya anything…"
            }
            className={`min-w-0 flex-1 bg-transparent px-2 text-sm focus:outline-none ${dark ? "text-indigo-50 placeholder:text-indigo-400" : "text-indigo-950 placeholder:text-indigo-400"}`}
          />

          {phase === "speaking" ? (
            <button
              type="button"
              onClick={() => {
                stopSpeaking();
                if (conversationRef.current) startListeningRef.current();
              }}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm transition-colors ${dark ? "bg-white/10 text-indigo-100 hover:bg-white/20" : "bg-indigo-900/10 text-indigo-800 hover:bg-indigo-900/20"}`}
            >
              Stop
            </button>
          ) : (
            <button
              type="submit"
              disabled={!draft.trim() || phase === "thinking"}
              className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium text-white transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${dark ? "bg-violet-600 hover:bg-violet-500" : "bg-amber-500 hover:bg-amber-400"}`}
            >
              {phase === "thinking" ? <SpinnerIcon className="h-4 w-4" /> : "Ask"}
            </button>
          )}
        </form>
      </div>

      <style>{`
        .tutor-title-angel { text-shadow: 0 0 18px rgba(255, 214, 110, 0.85), 0 1px 2px rgba(255,255,255,0.9); }
        .tutor-title-galaxy { text-shadow: 0 0 20px rgba(150, 120, 255, 0.9), 0 0 3px rgba(220, 210, 255, 0.6); }
      `}</style>
    </div>
  );
}
