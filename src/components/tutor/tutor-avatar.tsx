"use client";

import { useEffect, useMemo, useRef } from "react";
import type { TutorLook } from "@/src/api/api";

export type TutorPhase = "idle" | "listening" | "thinking" | "speaking";

interface TutorAvatarProps {
  phase: TutorPhase;
  /**
   * Live speech amplitude 0..1 (WebAudio analyser or a synthetic driver).
   * Sampled inside a rAF loop so the mouth/jaw never re-render React.
   */
  getLevel: () => number;
  /** "Mirror me" traits — when set, her face restyles to match the student. */
  look?: TutorLook | null;
  /** Scene theme: angel seats her on a cloud, galaxy on a crescent moon. */
  theme?: "angel" | "galaxy";
}

/* ------------------------- look → color palettes -------------------------- */

const SKIN_TONES: Record<
  TutorLook["skinTone"],
  { s1: string; s2: string; s3: string; neck: string; shade: string; nose: string; cheek: string }
> = {
  fair: { s1: "#fdeadd", s2: "#f6d6c2", s3: "#e0b69e", neck: "#f4d2b8", shade: "#ddb193", nose: "#d9a889", cheek: "#f2a48f" },
  light: { s1: "#fbe4d2", s2: "#f0cdb6", s3: "#d8ab92", neck: "#efc9ae", shade: "#d8a988", nose: "#d3a081", cheek: "#f0a28e" },
  medium: { s1: "#f2cfa8", s2: "#e2b285", s3: "#c19067", neck: "#e0b184", shade: "#c2905f", nose: "#b8865a", cheek: "#e09a7e" },
  tan: { s1: "#e3b183", s2: "#cf975f", s3: "#ad7844", neck: "#cd9560", shade: "#ad7743", nose: "#a06f42", cheek: "#c98866" },
  brown: { s1: "#c08a5a", s2: "#a76f3f", s3: "#855426", neck: "#a56e40", shade: "#875628", nose: "#7d4f26", cheek: "#a86a48" },
  deep: { s1: "#96613c", s2: "#7c4c28", s3: "#5e3719", neck: "#7a4b28", shade: "#5f3819", nose: "#54331d", cheek: "#8a5238" },
};

const HAIR_COLORS: Record<TutorLook["hairColor"], [string, string, string]> = {
  black: ["#3a3a44", "#22222c", "#101018"],
  darkbrown: ["#5b4230", "#3f2c1e", "#241811"],
  brown: ["#7a573b", "#5c3f28", "#3a2717"],
  auburn: ["#8a4a30", "#6b3520", "#452113"],
  red: ["#b0512e", "#8e3c1f", "#5e2713"],
  blonde: ["#f6dd9e", "#e2bc6c", "#c2953f"],
  gray: ["#c9c9cf", "#a8a8b2", "#84848e"],
  white: ["#f4f2ee", "#dedcd6", "#bcb9b2"],
};

const EYE_COLORS: Record<TutorLook["eyeColor"], [string, string]> = {
  black: ["#5a5a66", "#17141a"],
  brown: ["#8a5c40", "#3c2417"],
  hazel: ["#a58a4a", "#5c4a1e"],
  green: ["#7aa06a", "#33582c"],
  blue: ["#8fa8d8", "#3c5490"],
  gray: ["#a8b2bc", "#5a646e"],
};

const BROW_WIDTH: Record<TutorLook["eyebrows"], number> = { thin: 1.8, medium: 2.6, thick: 3.6 };

// Hair length shortens the back-hair silhouette from the crown down.
const HAIR_SCALE: Record<Exclude<TutorLook["hairLength"], "bald">, number> = {
  short: 0.48,
  medium: 0.72,
  long: 1,
};

// Default Aanya: the golden long-haired angel.
const DEFAULT_LOOK: TutorLook = {
  person: true,
  skinTone: "light",
  hairColor: "blonde",
  hairLength: "long",
  hairStyle: "wavy",
  eyeColor: "blue",
  eyebrows: "medium",
  glasses: false,
  facialHair: "none",
};

/**
 * The tutor herself — an angel seated on a cloud, drawn in SVG and rigged
 * with CSS keyframes (breathing, blinking, wing flap, halo float) plus a
 * rAF-driven mouth + head-nod that follows the voice amplitude. When a
 * "mirror me" look is set, her face restyles to the student's traits.
 */
export function TutorAvatar({ phase, getLevel, look, theme = "angel" }: TutorAvatarProps) {
  // Galaxy mode is a cosmic tutor, not an angel: no wings, no halo, and a
  // deep-violet gown with starlight trim instead of the heavenly white one.
  const angel = theme === "angel";
  const gown = angel ? "url(#tutorGown)" : "url(#tutorGownCosmic)";
  const trim = angel
    ? { rim: "#f3cd7e", sash: "#e5c377", collar: "#d9cfae", fold: "#ded5bc" }
    : { rim: "#b0a4ff", sash: "#b8aef5", collar: "#6f63c0", fold: "#6f63c0" };
  const mouthRef = useRef<SVGGElement | null>(null);
  const lipsRef = useRef<SVGPathElement | null>(null);
  const nodRef = useRef<SVGGElement | null>(null);
  const levelFnRef = useRef(getLevel);
  const phaseRef = useRef(phase);
  useEffect(() => {
    levelFnRef.current = getLevel;
    phaseRef.current = phase;
  }, [getLevel, phase]);

  const L = look ?? DEFAULT_LOOK;
  const p = useMemo(() => {
    const skin = SKIN_TONES[L.skinTone];
    const hair = HAIR_COLORS[L.hairColor];
    const eye = EYE_COLORS[L.eyeColor];
    return { skin, hair, eye };
  }, [L.skinTone, L.hairColor, L.eyeColor]);

  const bald = L.hairLength === "bald";
  const hairScale = L.hairLength === "bald" ? 0 : HAIR_SCALE[L.hairLength];
  // Curl/wave texture rides the hair silhouette as a dashed second stroke.
  const hairTexture =
    L.hairStyle === "curly"
      ? { strokeDasharray: "2 4.5", strokeWidth: 3 }
      : L.hairStyle === "wavy"
        ? { strokeDasharray: "14 10", strokeWidth: 2 }
        : null;

  useEffect(() => {
    let raf = 0;
    let smooth = 0;
    const tick = () => {
      const speaking = phaseRef.current === "speaking";
      const target = speaking ? Math.min(1, Math.max(0, levelFnRef.current?.() ?? 0)) : 0;
      smooth += (target - smooth) * 0.3;

      if (mouthRef.current) {
        const open = 0.06 + smooth * 0.94;
        mouthRef.current.style.transform = `scale(${1 + smooth * 0.12}, ${open})`;
      }
      if (lipsRef.current) {
        lipsRef.current.style.opacity = String(Math.max(0, 1 - smooth * 2.2));
      }
      if (nodRef.current) {
        const t = performance.now() / 1000;
        const nod = speaking ? Math.sin(t * 4.2) * 1.1 * (0.35 + smooth) : 0;
        nodRef.current.style.transform = `rotate(${nod}deg)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className={`tutor-avatar tutor-${phase}`}>
      <svg viewBox="0 0 360 480" className="h-full w-auto" aria-label="AI angel tutor Aanya">
        <defs>
          <radialGradient id="tutorSkin" cx="45%" cy="38%" r="75%">
            <stop offset="0%" stopColor={p.skin.s1} />
            <stop offset="70%" stopColor={p.skin.s2} />
            <stop offset="100%" stopColor={p.skin.s3} />
          </radialGradient>
          <linearGradient id="tutorHair" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor={p.hair[0]} />
            <stop offset="55%" stopColor={p.hair[1]} />
            <stop offset="100%" stopColor={p.hair[2]} />
          </linearGradient>
          <linearGradient id="tutorGown" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#f4efe2" />
            <stop offset="100%" stopColor="#e3ddca" />
          </linearGradient>
          <linearGradient id="tutorGownCosmic" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7e6fd8" />
            <stop offset="55%" stopColor="#4a3f9e" />
            <stop offset="100%" stopColor="#2a2260" />
          </linearGradient>
          <linearGradient id="tutorWing" x1="0" y1="1" x2="0.6" y2="0">
            <stop offset="0%" stopColor="#f2ead6" />
            <stop offset="55%" stopColor="#fbf7ec" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <radialGradient id="tutorIris" cx="35%" cy="35%" r="80%">
            <stop offset="0%" stopColor={p.eye[0]} />
            <stop offset="100%" stopColor={p.eye[1]} />
          </radialGradient>
          <linearGradient id="tutorHalo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#f8de8e" />
            <stop offset="50%" stopColor="#ffedb3" />
            <stop offset="100%" stopColor="#e9c05f" />
          </linearGradient>
          <radialGradient id="tutorCloud" cx="50%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="80%" stopColor="#eef2fb" />
            <stop offset="100%" stopColor="#dde6f7" />
          </radialGradient>
          <linearGradient id="tutorMoon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f4f2fc" />
            <stop offset="60%" stopColor="#dcd6f2" />
            <stop offset="100%" stopColor="#b5abdd" />
          </linearGradient>
          <filter id="tutorSoft" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <filter id="tutorGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <g className="tutor-girl">
          {/* ---------------- wings (angel theme only) ---------------- */}
          {angel && (
          <g className="tutor-wing tutor-wing-l">
            <path
              d="M152 236
                 C 116 214 82 178 60 130
                 C 54 116 50 100 50 84
                 C 66 102 78 118 90 136
                 C 91 124 92 112 92 102
                 C 104 120 114 138 122 156
                 C 124 146 126 136 128 128
                 C 138 148 146 168 150 188
                 C 152 180 154 172 156 166
                 C 160 190 160 216 152 236 Z"
              fill="url(#tutorWing)"
              opacity="0.96"
            />
            <path d="M70 120 C 92 140 112 164 132 196 M92 118 C 108 140 124 164 138 192" stroke="#e4d9ba" strokeWidth="1.6" fill="none" opacity="0.7" strokeLinecap="round" />
          </g>
          )}
          {angel && (
          <g className="tutor-wing tutor-wing-r">
            <path
              d="M208 236
                 C 244 214 278 178 300 130
                 C 306 116 310 100 310 84
                 C 294 102 282 118 270 136
                 C 269 124 268 112 268 102
                 C 256 120 246 138 238 156
                 C 236 146 234 136 232 128
                 C 222 148 214 168 210 188
                 C 208 180 206 172 204 166
                 C 200 190 200 216 208 236 Z"
              fill="url(#tutorWing)"
              opacity="0.96"
            />
            <path d="M290 120 C 268 140 248 164 228 196 M268 118 C 252 140 236 164 222 192" stroke="#e4d9ba" strokeWidth="1.6" fill="none" opacity="0.7" strokeLinecap="round" />
          </g>
          )}

          {/* hair behind the body — length scales the silhouette from the crown */}
          {!bald && (
            <g style={{ transform: `scaleY(${hairScale})`, transformBox: "fill-box", transformOrigin: "50% 6%" }}>
              <path
                className="tutor-hair-back"
                d="M180 84
                   C 130 84 112 126 114 168
                   C 115 210 108 258 116 300
                   C 120 322 138 330 148 322
                   L 150 250 L 154 318 C 162 330 178 330 180 318
                   C 182 330 198 330 206 318 L 210 250 L 212 322
                   C 222 330 240 322 244 300
                   C 252 258 245 210 246 168
                   C 248 126 230 84 180 84 Z"
                fill="url(#tutorHair)"
                stroke={hairTexture ? p.hair[2] : undefined}
                strokeWidth={hairTexture?.strokeWidth}
                strokeDasharray={hairTexture?.strokeDasharray}
                strokeLinecap="round"
              />
              {L.hairLength !== "short" && (
                <>
                  <path d="M118 200 C 112 240 116 280 110 312" stroke={p.hair[1]} strokeWidth="3" fill="none" strokeLinecap="round" />
                  <path d="M243 204 C 250 244 244 284 252 316" stroke={p.hair[1]} strokeWidth="3" fill="none" strokeLinecap="round" />
                </>
              )}
            </g>
          )}

          {/* flowing gown skirt (covers the legs down to the cloud) */}
          <path
            d="M142 320
               C 122 356 108 392 104 424
               C 128 436 160 442 180 442
               C 200 442 232 436 256 424
               C 252 392 238 356 218 320 Z"
            fill={gown}
          />
          <path d="M148 340 C 140 372 132 400 128 420 M212 340 C 220 372 228 400 232 420" stroke={trim.fold} strokeWidth="2" fill="none" opacity="0.8" strokeLinecap="round" />
          {/* starlight speckles on the cosmic gown */}
          {!angel && (
            <g fill="#cfd6ff" opacity="0.75">
              <path d="M150 376 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1 Z" />
              <path d="M206 396 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1 Z" />
              <path d="M172 414 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1 Z" />
              <circle cx="188" cy="372" r="1" />
              <circle cx="136" cy="398" r="1" />
              <circle cx="224" cy="410" r="1" />
            </g>
          )}

          {/* torso (breathing) */}
          <g className="tutor-torso">
            <path
              d="M180 208
                 C 158 208 140 218 136 236
                 C 130 262 132 300 138 330
                 L 222 330
                 C 228 300 230 262 224 236
                 C 220 218 202 208 180 208 Z"
              fill={gown}
            />
            <path d="M139 238 C 134 264 135 300 140 328" stroke={trim.rim} strokeWidth="2.5" fill="none" opacity="0.6" strokeLinecap="round" />
            <path d="M138 300 C 160 310 200 310 222 300" stroke={trim.sash} strokeWidth="5" fill="none" strokeLinecap="round" opacity="0.85" />
            <path d="M166 210 L 180 226 L 194 210" stroke={trim.collar} strokeWidth="4" fill="none" strokeLinecap="round" />

            {/* left arm resting on lap */}
            <path d="M142 236 C 130 258 128 284 138 306 C 146 318 158 320 166 314" stroke={gown} strokeWidth="19" fill="none" strokeLinecap="round" />
            <ellipse cx="168" cy="314" rx="10" ry="8" fill="url(#tutorSkin)" />

            {/* right arm — gestures while she speaks */}
            <g className="tutor-arm-r">
              <path d="M218 236 C 230 258 232 284 222 306 C 214 318 202 320 194 314" stroke={gown} strokeWidth="19" fill="none" strokeLinecap="round" />
              <ellipse cx="192" cy="314" rx="10" ry="8" fill="url(#tutorSkin)" />
            </g>
          </g>

          {/* head (state tilt) + nod (rAF) */}
          <g className="tutor-head">
            <g ref={nodRef} className="tutor-nod">
              {/* halo (angel theme only) */}
              {angel && (
                <g className="tutor-halo">
                  <ellipse cx="180" cy="70" rx="34" ry="10" fill="none" stroke="#ffe9a8" strokeWidth="10" opacity="0.55" filter="url(#tutorGlow)" />
                  <ellipse cx="180" cy="70" rx="30" ry="8" fill="none" stroke="url(#tutorHalo)" strokeWidth="5" />
                </g>
              )}

              {/* neck */}
              <rect x="169" y="184" width="22" height="30" rx="9" fill={p.skin.neck} />
              <rect x="169" y="196" width="22" height="10" fill={p.skin.shade} opacity="0.5" />

              {/* face */}
              <path
                d="M180 96
                   C 148 96 138 124 139 148
                   C 140 172 152 196 180 199
                   C 208 196 220 172 221 148
                   C 222 124 212 96 180 96 Z"
                fill="url(#tutorSkin)"
              />

              {/* rosy cheeks */}
              <ellipse cx="157" cy="164" rx="7" ry="4" fill={p.skin.cheek} opacity="0.35" />
              <ellipse cx="203" cy="164" rx="7" ry="4" fill={p.skin.cheek} opacity="0.35" />

              {/* brows — thickness and color follow the scan */}
              <path className="tutor-brow-l" d="M152 136 Q 163 131 172 135" stroke={p.hair[2]} strokeWidth={BROW_WIDTH[L.eyebrows]} fill="none" strokeLinecap="round" />
              <path className="tutor-brow-r" d="M188 135 Q 197 131 208 136" stroke={p.hair[2]} strokeWidth={BROW_WIDTH[L.eyebrows]} fill="none" strokeLinecap="round" />

              {/* eyes */}
              <g className="tutor-eye">
                <ellipse cx="163" cy="148" rx="9.5" ry="5.8" fill="#ffffff" />
                <ellipse cx="197" cy="148" rx="9.5" ry="5.8" fill="#ffffff" />
                <g className="tutor-pupils">
                  <circle cx="163" cy="148" r="4.4" fill="url(#tutorIris)" />
                  <circle cx="197" cy="148" r="4.4" fill="url(#tutorIris)" />
                  <circle cx="163" cy="148" r="1.9" fill="#0f0c10" />
                  <circle cx="197" cy="148" r="1.9" fill="#0f0c10" />
                  <circle cx="164.6" cy="146.4" r="1" fill="#ffffff" opacity="0.95" />
                  <circle cx="198.6" cy="146.4" r="1" fill="#ffffff" opacity="0.95" />
                </g>
                {/* eyelids — blink */}
                <rect className="tutor-eyelid" x="152.5" y="141.6" width="21" height="13" rx="6" fill="url(#tutorSkin)" />
                <rect className="tutor-eyelid tutor-eyelid-2" x="186.5" y="141.6" width="21" height="13" rx="6" fill="url(#tutorSkin)" />
                <path d="M153 145 Q 163 140 173 145" stroke={p.skin.shade} strokeWidth="1.6" fill="none" strokeLinecap="round" />
                <path d="M187 145 Q 197 140 207 145" stroke={p.skin.shade} strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </g>

              {/* nose */}
              <path d="M180 156 C 179 161 177 164 176 166 C 178 168 182 168 184 166" stroke={p.skin.nose} strokeWidth="1.8" fill="none" strokeLinecap="round" />

              {/* beard / stubble sits along the jaw, under the mouth rig */}
              {(L.facialHair === "beard" || L.facialHair === "stubble") && (
                <path
                  d="M150 162 C 154 192 164 206 180 208 C 196 206 206 192 210 162"
                  stroke={p.hair[2]}
                  strokeWidth={L.facialHair === "beard" ? 8 : 5}
                  opacity={L.facialHair === "beard" ? 0.92 : 0.35}
                  fill="none"
                  strokeLinecap="round"
                />
              )}

              {/* mouth rig: open mouth scales with the voice, lips fade out */}
              <g className="tutor-mouth-anchor">
                <g ref={mouthRef} className="tutor-mouth">
                  <ellipse cx="180" cy="180" rx="8.5" ry="7.5" fill="#5e2b2b" />
                  <path d="M172.5 177.5 Q 180 174.5 187.5 177.5 L 187.5 179 Q 180 177 172.5 179 Z" fill="#ffffff" opacity="0.95" />
                  <ellipse cx="180" cy="183.5" rx="4.4" ry="2.6" fill="#b05b5b" />
                </g>
                <path ref={lipsRef} className="tutor-lips" d="M170 180 Q 180 185.5 190 180" stroke="#c47b74" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              </g>

              {/* mustache rides above the lip, over the mouth rig */}
              {(L.facialHair === "mustache" || L.facialHair === "beard") && (
                <path d="M169 173.5 Q 180 169.5 191 173.5" stroke={p.hair[2]} strokeWidth="3.2" fill="none" strokeLinecap="round" />
              )}

              {/* bangs over the forehead + face-framing locks */}
              {!bald && (
                <>
                  <path
                    className="tutor-hair-front"
                    d="M180 82
                       C 142 82 132 112 136 140
                       C 140 128 146 124 150 112
                       C 154 122 162 124 168 114
                       C 174 124 186 124 192 114
                       C 198 124 206 122 210 112
                       C 214 124 220 128 224 140
                       C 228 112 218 82 180 82 Z"
                    fill="url(#tutorHair)"
                  />
                  <path d="M138 132 C 132 156 134 186 142 210 C 148 216 154 214 156 208 C 148 186 146 158 150 134 Z" fill="url(#tutorHair)" />
                  <path d="M222 132 C 228 156 226 186 218 210 C 212 216 206 214 204 208 C 212 186 214 158 210 134 Z" fill="url(#tutorHair)" />
                </>
              )}
              {bald && (
                /* a soft crown highlight so the bare head reads as lit, not flat */
                <ellipse cx="170" cy="108" rx="16" ry="8" fill="#ffffff" opacity="0.18" />
              )}

              {/* glasses — drawn last so the frames sit over everything */}
              {L.glasses && (
                <g className="tutor-glasses">
                  <circle cx="163" cy="148" r="10.5" stroke="#33333e" strokeWidth="1.4" fill="rgba(255,255,255,0.07)" />
                  <circle cx="197" cy="148" r="10.5" stroke="#33333e" strokeWidth="1.4" fill="rgba(255,255,255,0.07)" />
                  <path d="M173.5 147 Q 180 143.5 186.5 147" stroke="#33333e" strokeWidth="1.4" fill="none" />
                  <path d="M152.5 147 L 143 144.5 M207.5 147 L 217 144.5" stroke="#33333e" strokeWidth="1.4" strokeLinecap="round" />
                </g>
              )}
            </g>
          </g>

          {/* her seat, in front of the gown hem: cloud in heaven, moon in space */}
          {theme === "angel" ? (
            <g className="tutor-cloudseat" filter="url(#tutorSoft)">
              <ellipse cx="180" cy="432" rx="120" ry="26" fill="url(#tutorCloud)" />
              <ellipse cx="98" cy="424" rx="42" ry="18" fill="url(#tutorCloud)" />
              <ellipse cx="262" cy="424" rx="42" ry="18" fill="url(#tutorCloud)" />
              <ellipse cx="146" cy="416" rx="36" ry="16" fill="#ffffff" />
              <ellipse cx="218" cy="416" rx="36" ry="16" fill="#ffffff" />
            </g>
          ) : (
            <g className="tutor-cloudseat">
              {/* halo of moonlight behind the crescent */}
              <path
                d="M64 410 A 124 96 0 0 0 296 410 A 124 54 0 0 1 64 410 Z"
                fill="#b8aef5"
                opacity="0.5"
                filter="url(#tutorGlow)"
              />
              <path d="M64 410 A 124 96 0 0 0 296 410 A 124 54 0 0 1 64 410 Z" fill="url(#tutorMoon)" />
              {/* craters */}
              <ellipse cx="122" cy="446" rx="9" ry="5" fill="#a89ecf" opacity="0.5" />
              <ellipse cx="182" cy="456" rx="11" ry="6" fill="#a89ecf" opacity="0.45" />
              <ellipse cx="240" cy="447" rx="8" ry="4.5" fill="#a89ecf" opacity="0.5" />
            </g>
          )}
        </g>
      </svg>

      <style>{`
        .tutor-avatar { height: 100%; display: flex; align-items: flex-end; justify-content: center; }
        .tutor-avatar svg { overflow: visible; }

        .tutor-avatar .tutor-girl,
        .tutor-avatar .tutor-torso,
        .tutor-avatar .tutor-head,
        .tutor-avatar .tutor-nod,
        .tutor-avatar .tutor-arm-r,
        .tutor-avatar .tutor-pupils,
        .tutor-avatar .tutor-eyelid,
        .tutor-avatar .tutor-mouth,
        .tutor-avatar .tutor-brow-l,
        .tutor-avatar .tutor-brow-r,
        .tutor-avatar .tutor-hair-back,
        .tutor-avatar .tutor-halo,
        .tutor-avatar .tutor-wing,
        .tutor-avatar .tutor-cloudseat {
          transform-box: fill-box;
        }

        /* she hovers, gently, the whole time */
        .tutor-avatar .tutor-girl {
          transform-origin: 50% 100%;
          animation: tutorHover 7.5s ease-in-out infinite alternate;
        }
        /* breathing */
        .tutor-avatar .tutor-torso {
          transform-origin: 50% 100%;
          animation: tutorBreathe 4.2s ease-in-out infinite;
        }
        /* wings — slow serene flap from the shoulders */
        .tutor-avatar .tutor-wing-l { transform-origin: 95% 85%; animation: tutorFlapL 5.2s ease-in-out infinite alternate; }
        .tutor-avatar .tutor-wing-r { transform-origin: 5% 85%; animation: tutorFlapR 5.2s ease-in-out infinite alternate; }
        /* halo floats and glows */
        .tutor-avatar .tutor-halo {
          transform-origin: 50% 50%;
          animation: tutorHaloFloat 4.6s ease-in-out infinite alternate;
        }
        /* hair drifts a touch, like a breeze of light */
        .tutor-avatar .tutor-hair-back {
          transform-origin: 50% 10%;
          animation: tutorHairDrift 9s ease-in-out infinite alternate;
        }
        /* blink */
        .tutor-avatar .tutor-eyelid {
          transform-origin: 50% 0%;
          transform: scaleY(0.02);
          animation: tutorBlink 4.6s linear infinite;
        }
        .tutor-avatar .tutor-eyelid-2 { animation-delay: 0.05s; }

        /* head pose per phase */
        .tutor-avatar .tutor-head {
          transform-origin: 50% 85%;
          transition: transform 0.7s cubic-bezier(.4,0,.2,1);
        }
        .tutor-avatar .tutor-nod { transform-origin: 50% 85%; }
        .tutor-listening .tutor-head { transform: rotate(3.2deg) translateY(2px); }
        .tutor-thinking .tutor-head { transform: rotate(-3deg) translateY(-1px); }

        /* gaze */
        .tutor-avatar .tutor-pupils { transition: transform 0.45s ease; }
        .tutor-thinking .tutor-pupils { transform: translate(-2.6px, -2.4px); }
        .tutor-listening .tutor-pupils { transform: translate(0px, 0.8px); }

        /* brows: curious when listening, one raised when thinking */
        .tutor-avatar .tutor-brow-l, .tutor-avatar .tutor-brow-r { transition: transform 0.45s ease; }
        .tutor-listening .tutor-brow-l, .tutor-listening .tutor-brow-r { transform: translateY(-1.6px); }
        .tutor-thinking .tutor-brow-r { transform: translateY(-2.4px) rotate(-4deg); }

        /* speaking: the right hand gestures, the wings lift a little more */
        .tutor-avatar .tutor-arm-r { transform-origin: 80% 15%; }
        .tutor-speaking .tutor-arm-r { animation: tutorGesture 1.9s ease-in-out infinite alternate; }
        .tutor-speaking .tutor-wing-l, .tutor-speaking .tutor-wing-r { animation-duration: 3s; }

        /* mouth transforms are set imperatively every frame */
        .tutor-avatar .tutor-mouth { transform-origin: 50% 50%; transform: scale(1, 0.06); }

        @keyframes tutorHover {
          from { transform: rotate(-0.5deg) translateY(0px); }
          to { transform: rotate(0.6deg) translateY(-5px); }
        }
        @keyframes tutorBreathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.016); }
        }
        @keyframes tutorFlapL {
          from { transform: rotate(2.5deg); }
          to { transform: rotate(-4deg) translateY(-3px); }
        }
        @keyframes tutorFlapR {
          from { transform: rotate(-2.5deg); }
          to { transform: rotate(4deg) translateY(-3px); }
        }
        @keyframes tutorHaloFloat {
          from { transform: translateY(0px); opacity: 0.95; }
          to { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes tutorHairDrift {
          from { transform: skewX(-0.7deg); }
          to { transform: skewX(0.9deg); }
        }
        @keyframes tutorBlink {
          0%, 93.5%, 100% { transform: scaleY(0.02); }
          95.5% { transform: scaleY(1); }
          97.5% { transform: scaleY(0.02); }
        }
        @keyframes tutorGesture {
          from { transform: rotate(0deg); }
          to { transform: rotate(-10deg) translateY(-3px); }
        }
      `}</style>
    </div>
  );
}
