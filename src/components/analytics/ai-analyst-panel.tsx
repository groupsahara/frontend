"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { io, type Socket } from "socket.io-client";
import { API_BASE_URL, getToken } from "@/src/api/apiClient";
import { PcmStreamPlayer, primeAudio } from "@/src/lib/pcm-audio";
import { startClapDetector, type ClapDetectorHandle } from "@/src/lib/clap-detector";
import { isEchoOfAnswer, isSignOff } from "@/src/lib/conversation";
import { hasPermission } from "@/src/lib/auth";


// The tutor's WebGL orb, loaded only in the browser — three.js has no business
// in the analytics page's server render or its initial bundle.
const TutorOrb = dynamic(
  () => import("@/src/components/tutor/tutor-orb").then((m) => m.TutorOrb),
  { ssr: false },
);


type AnswerLanguage = "en" | "hi" | "hinglish";

type Phase = "idle" | "listening" | "thinking" | "speaking";
type Language = "en" | "hi";

interface Turn {
  id: string;
  question: string;
  steps: string[];
  answer: string | null;
  error?: string;
}

const COPY = {
  en: {
    title: "Ask the analyst",
    hint: "Clap twice for the full week's report. Say \u201csleep now\u201d to close it.",
    weekQuestion: "The complete last 7 days",
    listening: "Listening — ask your question",
    thinking: "Working it out…",
    placeholder: "How are we doing today?",
    ask: "Ask",
    armed: "Clap detection on",
    disarmed: "Clap detection off",
    micDenied: "Microphone blocked — type instead.",
    connectError: "Could not reach the analyst — check that you are still signed in.",
    tapToStop: "Tap anywhere to stop",
    yourTurn: "Go ahead — ask anything, or say \u201csleep now\u201d to close",
    closing: "Closing — say the word any time.",
    examples: [
      "How are we doing today?",
      "Which restaurant generated the most revenue this month?",
      "Are bookings up or down vs last month?",
      "Give me the last one week data",
    ],
  },
  hi: {
    title: "एनालिस्ट से पूछें",
    hint: "पूरे हफ़्ते की रिपोर्ट के लिए दो बार ताली बजाएँ। बंद करने के लिए \u201cसो जाओ\u201d कहिए।",
    weekQuestion: "पिछले 7 दिनों का पूरा डेटा",
    listening: "सुन रहा हूँ — अपना सवाल पूछें",
    thinking: "पता लगा रहा हूँ…",
    placeholder: "आज का बिज़नेस कैसा रहा?",
    ask: "पूछें",
    armed: "ताली पहचान चालू",
    disarmed: "ताली पहचान बंद",
    micDenied: "माइक बंद है — लिखकर पूछें।",
    connectError: "एनालिस्ट से कनेक्ट नहीं हो पाया — जाँचें कि आप लॉग-इन हैं।",
    tapToStop: "रोकने के लिए कहीं भी टैप करें",
    yourTurn: "पूछिए — या \u201cसो जाओ\u201d कहिए",
    closing: "बंद कर रही हूँ — कभी भी बुला लीजिए।",
    examples: [
      "आज का बिज़नेस कैसा रहा?",
      "इस महीने सबसे ज़्यादा रेवेन्यू किस रेस्टोरेंट से आया?",
      "पिछले महीने के मुक़ाबले बुकिंग बढ़ी या घटी?",
      "पिछले एक हफ़्ते का डेटा दीजिए",
    ],
  },
} as const;


interface SpeechResultLike extends ArrayLike<{ transcript: string }> {
  isFinal?: boolean;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: ArrayLike<SpeechResultLike> }) => void) | null;
  /** The browser's own voice-activity detector — fires the moment it hears speech. */
  onspeechstart: (() => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

/** Why the mic is open: a button press, her handing back, or an interruption. */
type ListenMode = "manual" | "followUp" | "barge";

/**
 * How long after she starts speaking before an interruption counts.
 *
 * The microphone hears her through the speakers, and the browser's echo
 * canceller needs a moment to lock on; without this the first syllable of her
 * own answer would interrupt her.
 */
const BARGE_IN_GRACE_MS = 700;

const TOOL_LABEL: Record<string, string> = {
  run_business_report: "Pulling the full business report",
  get_booking_statistics: "Counting bookings",
  get_bookings: "Fetching bookings",
  get_booking_growth: "Comparing periods",
  get_revenue: "Adding up revenue",
  get_revenue_by_restaurant: "Ranking restaurants by revenue",
  get_sales: "Reading the sales pipeline",
  get_sales_statistics: "Summarising leads",
  get_customer: "Looking up the customer",
  search_customers: "Searching customers",
  get_restaurant: "Opening the restaurant record",
  get_campaign_performance: "Checking campaigns",
  get_user_activity: "Measuring signups and activity",
};

/**
 * The analytics page's AI analyst.
 *
 * Two claps ask for the week's numbers; the screen goes black, the tutor's orb
 * takes over, and Gemini speaks the report. When it finishes the mic reopens
 * on its own, so the admin can keep asking — the conversation ends when they
 * say so ("no thank you"), or on a click.
 */
export function AiAnalystPanel() {
  // The super admin decides who gets the analyst: it reads live revenue and
  // customer records aloud and holds the microphone open, so without the grant
  // the component renders nothing and never asks for the mic.
  if (!hasPermission("ai-analyst.view")) return null;
  return <AnalystPanel />;
}

function AnalystPanel() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [language, setLanguage] = useState<Language>("en");

  // The socket handlers are built once, so they read the language through a ref
  // rather than a stale closure.
  const languageRef = useRef<Language>("en");
  languageRef.current = language;
  /** Whether the full-screen stage is up — a clap opens it before she speaks. */
  const [clapArmed, setClapArmed] = useState(false);

  const [stage, setStage] = useState(false);
  const [micError, setMicError] = useState("");
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  // Gemini speaks the answer, so the orb rides the real waveform. The browser
  // voice only stands in when no audio arrives at all.
  const playerRef = useRef<PcmStreamPlayer | null>(null);
  const levelRef = useRef(0);
  const boundaryAtRef = useRef(0);
  const copy = COPY[language];

  // The clap detector and socket handlers are built once, so they reach the
  // current copy and the current week request through refs.
  const copyRef = useRef(copy);
  copyRef.current = copy;
  const askForWeekRef = useRef<() => void>(() => {});

  /** The clap detector and socket handlers read the live phase through this. */
  const phaseRef = useRef<Phase>("idle");
  phaseRef.current = phase;
  const micRef = useRef<ClapDetectorHandle | null>(null);

  /** Chunks from an abandoned turn keep arriving — only this one may be heard. */
  const currentTurnRef = useRef<string>("");
 
  /**
   * The running conversation. Each live turn is its own session on the server,
   * so a follow-up like "aur pichle mahine ka?" only makes sense if the recent
   * exchange travels with it.
   */
  const historyRef = useRef<Array<{ role: "admin" | "analyst"; text: string }>>([]);

  /** Language of the last answer — what the mic should expect to hear next. */
  const answerLangRef = useRef<AnswerLanguage>("en");

  /** Consecutive silent listens; two in a row end the conversation. */
  const silentTriesRef = useRef(0);
  const listenRef = useRef<(mode?: ListenMode) => void>(() => {});
  /**
   * Bumped every time listening starts or stops. A recognition session's own
   * `onend` fires *after* the next one has begun, so without this an abandoned
   * session restarts the loop — which is what kept the mic alive through
   * "sleep now".
   */
  const listenGenRef = useRef(0);
  /** False once the analyst is asleep: nothing may reopen the mic but a clap. */
  const awakeRef = useRef(false);
  /** What she has said so far this turn — kept if an interruption cuts it short. */
  const partialAnswerRef = useRef("");
  const bargeInRef = useRef<() => void>(() => {});
  /** True while a barge session is listening underneath her voice. */
  const bargeSessionRef = useRef(false);
  /** True once this turn has been interrupted — she is only cut off once. */
  const interruptedRef = useRef(false);
  /** True while she is actually producing sound. */
  const speakingRef = useRef(false);
  /** When the current answer started speaking, for the AEC grace window. */
  const speakingSinceRef = useRef(0);
  const beganSpeakingRef = useRef<() => void>(() => {});
  const sendRef = useRef<(question: string) => void>(() => {});
  const stageRef = useRef(false);
  const handBackToAdminRef = useRef<() => void>(() => {});

  // ── socket ────────────────────────────────────────────────────────────────
  const connect = useCallback(() => {
    if (socketRef.current) return socketRef.current;
    const origin = new URL(API_BASE_URL, window.location.origin).origin;

    const socket = io(`${origin}/ai-analyst`, {
      auth: { token: getToken() },
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("thinking", ({ turnId }: { turnId: string }) => {
      setPhase("thinking");
      setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, steps: [] } : x)));
    });
    socket.on("step", ({ turnId, tool }: { turnId: string; tool: string }) => {
      setTurns((t) =>
        t.map((x) =>
          x.id === turnId ? { ...x, steps: [...x.steps, TOOL_LABEL[tool] ?? tool] } : x,
        ),
      );
    });

    // Transcript pieces arrive while she is still talking.
    socket.on("text", ({ turnId, text }: { turnId: string; text: string }) => {
      if (turnId !== currentTurnRef.current) return;
      partialAnswerRef.current += text;
      setPhase((p) => (p === "thinking" ? "speaking" : p));
      stageRef.current = true;
      setStage(true);
      beganSpeakingRef.current();
      setTurns((t) =>
        t.map((x) => (x.id === turnId ? { ...x, answer: (x.answer ?? "") + text } : x)),
      );
    });

    socket.on(
      "audio",
      ({ turnId, data, mimeType }: { turnId: string; data: string; mimeType: string }) => {
        if (turnId !== currentTurnRef.current) return;

        // Gemini is speaking, so nothing else may: cancel any browser voice
        // that started before the first chunk arrived.
        window.speechSynthesis?.cancel();
        playerRef.current?.push(data, mimeType);
        setPhase((p) => (p === "thinking" ? "speaking" : p));
        stageRef.current = true;
        setStage(true);
        beganSpeakingRef.current();
      },
    );

    socket.on(
      "answer",
      ({
        turnId,
        answer,
        language: answerLanguage,
      }: {
        turnId: string;
        answer: string;
        language?: AnswerLanguage;
      }) => {
        // Only the current turn may speak; a turn that was abandoned mid-answer
        // still has chunks and an answer in flight.
        if (turnId !== currentTurnRef.current) return;
        if (answerLanguage) answerLangRef.current = answerLanguage;
        if (answer) {
          historyRef.current = [
            ...historyRef.current,
            { role: "analyst" as const, text: answer },
          ].slice(-12);
        }
        if (answer) setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, answer } : x)));
        const player = playerRef.current;
        if (player?.hasAudio) {
          // Audio is still playing out — the turn ends when it drains.
          player.seal();
          setPhase("speaking");
        } else {
          setPhase("speaking");
          speakLocally(answer, answerLanguage ?? "en");
        }
      },
    );
    socket.on("turn_error", ({ turnId, message }: { turnId: string; message: string }) => {
      if (turnId !== currentTurnRef.current) return;
      playerRef.current?.stop();
      stageRef.current = false;
      setStage(false);
      setTurns((t) => t.map((x) => (x.id === turnId ? { ...x, error: message } : x)));
      setPhase("idle");
    });

    // A rejected handshake (expired token, no analytics.view) must say so
    // instead of leaving the orb spinning forever.
    socket.on("connect_error", () => {
      setConnected(false);
      setPhase("idle");
      setTurns((t) =>
        t.map((x, i) =>
          i === t.length - 1 && !x.answer && !x.error
            ? { ...x, error: COPY[languageRef.current].connectError }
            : x,
        ),
      );
    });

    socketRef.current = socket;
    return socket;
  }, []);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
      stopClapListener();
      window.speechSynthesis?.cancel();
    };
  }, []);


  /** Last resort only: the turn produced no audio, so the browser reads it. */
  const speakLocally = (text: string, answerLanguage: AnswerLanguage) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth) return setPhase("idle");
      synth.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      // Hinglish is Roman script, so an Indian-English voice reads it the way
      // it is written; Devanagari needs the Hindi voice.
      utter.lang = answerLanguage === "hi" ? "hi-IN" : "en-IN";
      utter.onboundary = () => {
        levelRef.current = 0.9;
        boundaryAtRef.current = performance.now();
      };
      // cancel() also fires onend — an interruption already cleared the turn,
      // and must not have the mic reopened underneath it.
      utter.onend = () => {
        if (currentTurnRef.current) handBackToAdminRef.current();
      };
      utter.onerror = () => {
        if (currentTurnRef.current) handBackToAdminRef.current();
      };
      synth.speak(utter);
      beganSpeakingRef.current();
    } catch {
      setPhase("idle");
    }
  };


  /**
   * Orb amplitude: Gemini's own waveform while it plays, otherwise the decay
   * from the browser voice's word boundaries, over a resting breath.
   */
  const getLevel = useCallback(() => {
    const now = performance.now();
    const live = playerRef.current?.level() ?? 0;
    const decayed = levelRef.current * Math.exp(-(now - boundaryAtRef.current) / 260);
    const breath = 0.12 + 0.05 * Math.sin(now / 420);
    return Math.min(1, Math.max(breath, live, decayed));
  }, []);

  /**
   * Asleep. Nothing of the analyst runs after this but the clap listener.
   *
   * Every in-flight recognition session is invalidated first so none of their
   * callbacks can reopen the mic, then the voice, the socket and the blackout
   * go — the connection included, so no turn can arrive from the server while
   * nobody is listening. Two claps build all of it again.
   */
  const closeStage = useCallback(() => {
    awakeRef.current = false;
    speakingRef.current = false;
    bargeSessionRef.current = false;
    listenGenRef.current += 1;
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    playerRef.current?.stop();
    playerRef.current = null;
    window.speechSynthesis?.cancel();
    socketRef.current?.disconnect();
    socketRef.current = null;
    currentTurnRef.current = "";
    partialAnswerRef.current = "";
    silentTriesRef.current = 0;
    stageRef.current = false;
    setConnected(false);
    setStage(false);
    setPhase("idle");
  }, []);

  /**
   * Her voice has started.
   *
   * The mic is NOT opened here: a recognition session running under her answer
   * transcribes her own voice back through the speakers, which reads as an
   * interruption that never happened. It opens only when the room is measurably
   * louder than that leak — see onVoiceOverEcho below.
   */
  const beganSpeaking = useCallback(() => {
    if (speakingRef.current) return;
    speakingRef.current = true;
    speakingSinceRef.current = performance.now();
    interruptedRef.current = false;
  }, []);
  beganSpeakingRef.current = beganSpeaking;

  /**
   * The admin started talking over her: stop mid-word and listen.
   *
   * Being talked over is itself a request to be heard, so the server is told to
   * abandon the turn (no point generating speech nobody is hearing), whatever
   * she managed to say is kept as context, and the mic opens immediately.
   */
  const handleBargeIn = useCallback(() => {
    // Both the browser's speech detector and the acoustic gate can call this;
    // she is only cut off once per turn.
    if (interruptedRef.current || !speakingRef.current) return;
    interruptedRef.current = true;
    speakingRef.current = false;
    playerRef.current?.stop();
    window.speechSynthesis?.cancel();
    socketRef.current?.emit("cancel", { turnId: currentTurnRef.current });
    // Whatever still arrives belongs to a turn that is over.
    currentTurnRef.current = "";
    const partial = partialAnswerRef.current.trim();
    if (partial) {
      historyRef.current = [
        ...historyRef.current,
        { role: "analyst" as const, text: partial },
      ].slice(-12);
    }
    partialAnswerRef.current = "";
    awakeRef.current = true;
    silentTriesRef.current = 0;
    setPhase("listening");
    // A barge session is already capturing the question — starting another
    // would abort it and clip the first words.
    if (!bargeSessionRef.current) listenRef.current("followUp");
  }, []);
  bargeInRef.current = handleBargeIn;

  /** She has finished talking: hand the mic straight back to the admin. */
  const handBackToAdmin = useCallback(() => {
    speakingRef.current = false;
    setPhase("idle");
    // A spoken conversation carries on with the mic; a typed question is
    // answered once and gives the dashboard straight back.
    if (stageRef.current && awakeRef.current) listenRef.current("followUp");
    else closeStage();
  }, [closeStage]);

  handBackToAdminRef.current = handBackToAdmin;


  /** Open a turn: a fresh player, a fresh row, and the socket doing the work. */
  const startTurn = (label: string, emit: (socket: Socket, turnId: string) => void) => {
    const socket = connect();
    const id = `turn_${Date.now()}`;
    currentTurnRef.current = id;
    partialAnswerRef.current = "";
    speakingRef.current = false;
    interruptedRef.current = false;
    playerRef.current?.stop();
    window.speechSynthesis?.cancel();
    const player = new PcmStreamPlayer(() => handBackToAdminRef.current());
    player.prime();
    playerRef.current = player;
    setTurns((t) => [...t, { id, question: label, steps: [], answer: null }].slice(-6));
    setPhase("thinking");
    emit(socket, id);
  };

  /** Ask a question and remember it — the next one may lean on this answer. */
  const send = (question: string) => {
    const q = question.trim();
    if (!q) return;
    setInput("");
    const history = historyRef.current.slice(-6);
    historyRef.current = [
      ...historyRef.current,
      { role: "admin" as const, text: q },
    ].slice(-12);
    startTurn(q, (socket, id) =>
      socket.emit("ask", { turnId: id, question: q, language, history }),
    );
  };
  sendRef.current = send;

 
  /**
   * Two claps: the whole week, spoken, without a question being asked. The
   * stage opens on the clap so the screen is already hers when she starts, and
   * the conversation starts from a clean slate.
   */
  const askForWeek = useCallback(() => {
    awakeRef.current = true;
    historyRef.current = [];
    silentTriesRef.current = 0;
    stageRef.current = true;
    setStage(true);
    startTurn(copyRef.current.weekQuestion, (socket, id) =>
      socket.emit("briefing", { turnId: id }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  askForWeekRef.current = askForWeek;

  /**
   * Open the mic.
   *
   *  - "manual"   — the 🎙 button.
   *  - "followUp" — she has finished; the conversation continues.
   *  - "barge"    — she is STILL TALKING. The browser's own speech detector is
   *    the trigger here: the moment it hears a voice, she is cut off and this
   *    same session goes on to capture the question, so no words are lost.
   *
   * A session's `onend` fires after the next one has begun, so every session
   * carries a generation and dies quietly if it is no longer the current one.
   */
  const listen = useCallback((mode: ListenMode = "manual") => {
    if (mode === "followUp" && !awakeRef.current) return;
    const w = window as unknown as {
      SpeechRecognition?: SpeechRecognitionCtor;
      webkitSpeechRecognition?: SpeechRecognitionCtor;
    };
    const Recognition = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Recognition) {
      setMicError(copyRef.current.micDenied);
      if (mode === "followUp") closeStage();
      return;
    }
    // abort(), not stop(): stop() still delivers whatever it has heard, which
    // arrives as a stray question after the admin has gone.
    recognitionRef.current?.abort();
    const barge = mode === "barge";
    // Listening under her voice is not itself a conversation — only an actual
    // interruption wakes her, so a typed question still ends when it ends.
    if (!barge) awakeRef.current = true;
    const generation = ++listenGenRef.current;
    const current = () =>
      generation === listenGenRef.current && (barge || awakeRef.current);
    // Whatever session is starting decides the flag: a stale one must never
    // leave it set, or the next answer would go uninterruptible.
    bargeSessionRef.current = barge;

    const recognition = new Recognition();
    recognition.lang = answerLangRef.current === "en" ? "en-IN" : "hi-IN";
    // Interim results are what make an interruption instant — waiting for the
    // final transcript would let her talk over the admin for another second.
    recognition.interimResults = barge;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let heard = false;

    /**
     * Cut her off — but only for a real person.
     *
     * Recognition alone is not proof: the mic hears her through the speakers,
     * so it transcribes her own words back. An interruption therefore needs a
     * word that is NOT part of what she just said, and a room that was louder
     * than her leak at the time. Either signal alone produced false stops.
     */
    const interrupt = (text: string) => {
      if (!barge || !current()) return;
      if (performance.now() - speakingSinceRef.current < BARGE_IN_GRACE_MS) return;
      if (!text || isEchoOfAnswer(text, partialAnswerRef.current)) return;
      if (micRef.current && !micRef.current.voiceOverEcho()) return;
      bargeInRef.current();
    };

    // The browser's speech detector fires on her own leaked voice too, so it
    // only marks that something was heard — the transcript decides.
    recognition.onspeechstart = null;
    recognition.onresult = (event) => {
      if (!current()) return;
      const results = Array.from({ length: event.results.length }, (_, i) => event.results[i]);
      const text = results.map((r) => r?.[0]?.transcript ?? "").join(" ").trim();
      // Interim text is what makes an interruption instant — waiting for the
      // final transcript would let her talk over the admin for another second.
      interrupt(text);
      if (!results.some((r) => r.isFinal) || !text) return;

      heard = true;
      silentTriesRef.current = 0;
      if (isSignOff(text)) {
        setTurns((t) =>
          [...t, { id: `said_${Date.now()}`, question: text, steps: [], answer: null }].slice(-6),
        );
        closeStage();
        return;
      }
      sendRef.current(text);
    };
    recognition.onerror = () => {
      if (!current()) return;
      if (barge) return; // she is still talking — her turn simply carries on
      if (mode === "followUp") closeStage();
      else setPhase("idle");
    };
    recognition.onend = () => {
      if (barge && generation === listenGenRef.current) bargeSessionRef.current = false;
      // An abandoned session must die quietly instead of restarting the loop.
      if (!current() || heard) return;
      if (barge) {
        // Heard nothing worth stopping her for — that was a noise, not a
        // person. Let her finish; the room will cue us again if someone talks.
        if (interruptedRef.current) listenRef.current("followUp");
        return;
      }
      if (mode !== "followUp") {
        setPhase((p) => (p === "listening" ? "idle" : p));
        return;
      }
      silentTriesRef.current += 1;
      if (silentTriesRef.current >= 2) closeStage();
      else listenRef.current("followUp");
    };

    recognitionRef.current = recognition;
    // A barge session listens underneath her voice — the phase stays "speaking"
    // until she is actually interrupted.
    if (!barge) setPhase("listening");
    try {
      recognition.start();
    } catch {
      // Already running — the session already open keeps this turn.
    }
  }, [closeStage]);
  listenRef.current = listen;

  // ── clap detection ────────────────────────────────────────────────────────
  function stopClapListener() {
    micRef.current?.stop();
    micRef.current = null;
  }


  const startClapListener = useCallback(async () => {
    try {
      micRef.current = await startClapDetector({
        onDoubleClap: () => {
          if (phaseRef.current === "idle") askForWeekRef.current();
        },
        // Recognition owns the mic while listening, and a turn being fetched
        // has nothing to interrupt yet.
        isBusy: () =>
          phaseRef.current === "listening" || phaseRef.current === "thinking",
        isSpeaking: () =>
          !!playerRef.current?.playing || !!window.speechSynthesis?.speaking,
        // Someone in the room out-talked her leak: start listening for real.
        onVoiceOverEcho: () => {
          if (speakingRef.current && !interruptedRef.current && !bargeSessionRef.current) {
            listenRef.current("barge");
          }
        },
      });
      setClapArmed(true);
      setMicError("");
    } catch {
      setMicError(copy.micDenied);
      setClapArmed(false);
    }
  }, [copy.micDenied]);


  const autoArmRef = useRef(false);
  useEffect(() => {
    if (autoArmRef.current) return;
    autoArmRef.current = true;
    void startClapListener();

    document.addEventListener("pointerdown", () => primeAudio(), { once: true });
  }, [startClapListener]);

  const toggleClap = () => {
    if (clapArmed) {
      stopClapListener();
      setClapArmed(false);
    } else {
      void startClapListener();
    }
  };

  const latest = turns[turns.length - 1];

  const panel = (
    <section className="overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <QuantumOrb phase={phase} />
          <div>
            <h2 className="text-base font-semibold">{copy.title}</h2>
            <p className="text-xs text-violet-200/70">
              {phase === "listening"
                ? copy.listening
                : phase === "thinking"
                  ? copy.thinking
                  : copy.hint}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-full border border-white/15">
            {(["en", "hi"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLanguage(l)}
                className={`px-3 py-1 text-xs font-semibold transition-colors ${
                  language === l ? "bg-violet-500 text-white" : "text-violet-200 hover:bg-white/10"
                }`}
              >
                {l === "en" ? "EN" : "हिं"}
              </button>
            ))}
          </div>
          <button
            onClick={toggleClap}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              clapArmed
                ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                : "border-white/15 text-violet-200 hover:bg-white/10"
            }`}
          >
            👏 {clapArmed ? copy.armed : copy.disarmed}
          </button>
          <span
            className={`h-2 w-2 rounded-full ${connected ? "bg-emerald-400" : "bg-white/25"}`}
            title={connected ? "live" : "offline"}
          />
        </div>
      </div>

      <div className="max-h-80 space-y-4 overflow-y-auto px-5 py-4">
        {!turns.length && (
          <div className="flex flex-wrap gap-2">
            {copy.examples.map((ex) => (
              <button
                key={ex}
                onClick={() => send(ex)}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-violet-100 transition-colors hover:bg-white/15"
              >
                {ex}
              </button>
            ))}
          </div>
        )}

        {turns.map((turn) => (
          <div key={turn.id} className="space-y-2">
            <p className="text-sm font-medium text-violet-100">{turn.question}</p>
            {turn.steps.map((s, i) => (
              <p key={i} className="flex items-center gap-2 text-xs text-violet-300/70">
                <span className="h-1 w-1 rounded-full bg-violet-400" />
                {s}
              </p>
            ))}
            {turn.answer && (
              <p className="rounded-xl bg-white/5 px-4 py-3 text-sm leading-relaxed text-white">
                {turn.answer}
              </p>
            )}
            {turn.error && <p className="text-sm text-rose-300">{turn.error}</p>}
            {!turn.answer && !turn.error && turn.id === latest?.id && (
              <p className="text-xs text-violet-300/60">{copy.thinking}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 border-t border-white/10 px-5 py-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send(input)}
          placeholder={copy.placeholder}
          className="flex-1 rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-violet-300/40 focus:border-violet-400"
        />
        <button
          onClick={() => listen()}
          title="Speak"
          className="rounded-xl border border-white/15 px-3 py-2 text-sm transition-colors hover:bg-white/10"
        >
          🎙
        </button>
        <button
          onClick={() => send(input)}
          className="rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-90"
        >
          {copy.ask}
        </button>
      </div>

      {micError && <p className="px-5 pb-3 text-xs text-amber-300">{micError}</p>}
    </section>
  );


  return (
    <>
      {panel}
      {stage &&
        createPortal(
          <SpeakingStage
            phase={phase}
            text={latest?.answer ?? ""}
            getLevel={getLevel}
            onClose={closeStage}
            label={phase === "listening" ? copy.yourTurn : copy.tapToStop}
          />,
          document.body,
        )}
    </>
  );
}

function SpeakingStage({
  phase,
  text,
  getLevel,
  onClose,
  label,
}: {
  phase: Phase;
  text: string;
  getLevel: () => number;
  onClose: () => void;
  label: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      role="presentation"
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/95 backdrop-blur-sm"
    >
      <div className="h-[min(58vmin,460px)] w-[min(58vmin,460px)]">
        <TutorOrb phase={phase === "idle" ? "speaking" : phase} getLevel={getLevel} />
      </div>
      {text && (
        <p className="mt-8 max-w-3xl px-8 text-center text-lg leading-relaxed text-white/90 sm:text-xl">
          {text}
        </p>
      )}
      <p className="mt-8 text-[11px] uppercase tracking-[0.2em] text-white/35">{label}</p>
    </div>
  );
}

function QuantumOrb({ phase }: { phase: Phase }) {
  const tone =
    phase === "listening"
      ? "from-emerald-400 to-teal-500"
      : phase === "thinking"
        ? "from-violet-400 to-fuchsia-500"
        : phase === "speaking"
          ? "from-sky-400 to-indigo-500"
          : "from-slate-500 to-slate-700";
  return (
    <span className="relative grid h-10 w-10 place-items-center">
      <span
        className={`absolute inset-0 rounded-full bg-gradient-to-br ${tone} ${
          phase === "idle" ? "opacity-40" : "animate-ping opacity-60"
        }`}
      />
      <span className={`relative h-6 w-6 rounded-full bg-gradient-to-br ${tone} shadow-lg`} />
    </span>
  );
}
