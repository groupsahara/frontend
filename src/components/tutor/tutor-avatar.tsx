"use client";

import { useEffect, useRef } from "react";

export type TutorPhase = "idle" | "listening" | "thinking" | "speaking";

interface TutorAvatarProps {
  phase: TutorPhase;
  /**
   * Live speech amplitude 0..1 (WebAudio analyser or a synthetic driver).
   * Sampled inside a rAF loop so the mouth/jaw never re-render React.
   */
  getLevel: () => number;
}

/**
 * The tutor herself — a stylized girl seated on a wooden chair, drawn in SVG
 * and rigged with CSS keyframes (breathing, blinking, hair sway) plus a
 * rAF-driven mouth + head-nod that follows the voice amplitude.
 */
export function TutorAvatar({ phase, getLevel }: TutorAvatarProps) {
  const mouthRef = useRef<SVGGElement | null>(null);
  const lipsRef = useRef<SVGPathElement | null>(null);
  const nodRef = useRef<SVGGElement | null>(null);
  const levelFnRef = useRef(getLevel);
  const phaseRef = useRef(phase);
  useEffect(() => {
    levelFnRef.current = getLevel;
    phaseRef.current = phase;
  }, [getLevel, phase]);

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
      <svg viewBox="0 0 360 480" className="h-full w-auto" aria-label="AI tutor Aanya">
        <defs>
          <radialGradient id="tutorSkin" cx="45%" cy="38%" r="75%">
            <stop offset="0%" stopColor="#dcc2b4" />
            <stop offset="70%" stopColor="#c2a394" />
            <stop offset="100%" stopColor="#9b7c6f" />
          </radialGradient>
          <linearGradient id="tutorHair" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#16161f" />
            <stop offset="55%" stopColor="#0b0b12" />
            <stop offset="100%" stopColor="#05050a" />
          </linearGradient>
          <linearGradient id="tutorDress" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3d1522" />
            <stop offset="70%" stopColor="#210a13" />
            <stop offset="100%" stopColor="#120509" />
          </linearGradient>
          <linearGradient id="tutorWood" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2b1c10" />
            <stop offset="100%" stopColor="#170e07" />
          </linearGradient>
          <radialGradient id="tutorIris" cx="35%" cy="35%" r="80%">
            <stop offset="0%" stopColor="#6b4438" />
            <stop offset="100%" stopColor="#241312" />
          </radialGradient>
        </defs>

        {/* ------------------------------ chair ----------------------------- */}
        <g className="tutor-chair">
          <rect x="112" y="128" width="136" height="190" rx="12" fill="url(#tutorWood)" stroke="#3a2817" strokeWidth="3" />
          <rect x="126" y="146" width="8" height="150" rx="4" fill="#0e0803" opacity="0.8" />
          <rect x="226" y="146" width="8" height="150" rx="4" fill="#0e0803" opacity="0.8" />
          <rect x="104" y="322" width="152" height="16" rx="6" fill="url(#tutorWood)" stroke="#3a2817" strokeWidth="2" />
          <rect x="116" y="338" width="11" height="112" rx="4" fill="#1c1109" />
          <rect x="233" y="338" width="11" height="112" rx="4" fill="#1c1109" />
          <rect x="138" y="338" width="9" height="96" rx="4" fill="#120a05" opacity="0.7" />
          <rect x="214" y="338" width="9" height="96" rx="4" fill="#120a05" opacity="0.7" />
        </g>

        <g className="tutor-girl">
          {/* hair behind the body — long, falling past the shoulders */}
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
          />
          {/* stray strands for the eerie touch */}
          <path d="M118 200 C 112 240 116 280 110 312" stroke="#0b0b12" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M243 204 C 250 244 244 284 252 316" stroke="#0b0b12" strokeWidth="3" fill="none" strokeLinecap="round" />

          {/* legs (seated) */}
          <path d="M140 330 C 142 352 150 362 180 362 C 210 362 218 352 220 330 L 214 318 H 146 Z" fill="#150a10" />
          <rect x="148" y="356" width="24" height="86" rx="10" fill="#171019" />
          <rect x="188" y="356" width="24" height="86" rx="10" fill="#171019" />
          <ellipse cx="160" cy="446" rx="17" ry="8" fill="#0a070c" />
          <ellipse cx="200" cy="446" rx="17" ry="8" fill="#0a070c" />

          {/* torso (breathing) */}
          <g className="tutor-torso">
            <path
              d="M180 208
                 C 158 208 140 218 136 236
                 C 130 262 132 300 138 330
                 L 222 330
                 C 228 300 230 262 224 236
                 C 220 218 202 208 180 208 Z"
              fill="url(#tutorDress)"
            />
            {/* cold rim light on her left edge */}
            <path d="M139 238 C 134 264 135 300 140 328" stroke="#7fd8d4" strokeWidth="2.5" fill="none" opacity="0.28" strokeLinecap="round" />
            {/* collar */}
            <path d="M166 210 L 180 226 L 194 210" stroke="#4d1f2e" strokeWidth="4" fill="none" strokeLinecap="round" />

            {/* left arm resting on lap */}
            <path d="M142 236 C 130 258 128 284 138 306 C 146 318 158 320 166 314" stroke="url(#tutorDress)" strokeWidth="19" fill="none" strokeLinecap="round" />
            <ellipse cx="168" cy="314" rx="10" ry="8" fill="url(#tutorSkin)" />

            {/* right arm — gestures while she speaks */}
            <g className="tutor-arm-r">
              <path d="M218 236 C 230 258 232 284 222 306 C 214 318 202 320 194 314" stroke="url(#tutorDress)" strokeWidth="19" fill="none" strokeLinecap="round" />
              <ellipse cx="192" cy="314" rx="10" ry="8" fill="url(#tutorSkin)" />
            </g>
          </g>

          {/* head (state tilt) + nod (rAF) */}
          <g className="tutor-head">
            <g ref={nodRef} className="tutor-nod">
              {/* neck */}
              <rect x="169" y="184" width="22" height="30" rx="9" fill="#b3937f" />
              <rect x="169" y="196" width="22" height="10" fill="#8a6a5c" opacity="0.5" />

              {/* face */}
              <path
                d="M180 96
                   C 148 96 138 124 139 148
                   C 140 172 152 196 180 199
                   C 208 196 220 172 221 148
                   C 222 124 212 96 180 96 Z"
                fill="url(#tutorSkin)"
              />
              {/* gaunt cheek shading */}
              <path d="M150 160 C 154 170 160 178 168 184" stroke="#8a6250" strokeWidth="4" opacity="0.18" fill="none" strokeLinecap="round" />
              <path d="M210 160 C 206 170 200 178 192 184" stroke="#8a6250" strokeWidth="4" opacity="0.18" fill="none" strokeLinecap="round" />

              {/* under-eye shadows (tired, slightly haunted) */}
              <ellipse cx="163" cy="156" rx="9" ry="3.4" fill="#5c3a3a" opacity="0.22" />
              <ellipse cx="197" cy="156" rx="9" ry="3.4" fill="#5c3a3a" opacity="0.22" />

              {/* brows */}
              <path className="tutor-brow-l" d="M152 136 Q 163 131 172 135" stroke="#241418" strokeWidth="2.6" fill="none" strokeLinecap="round" />
              <path className="tutor-brow-r" d="M188 135 Q 197 131 208 136" stroke="#241418" strokeWidth="2.6" fill="none" strokeLinecap="round" />

              {/* eyes */}
              <g className="tutor-eye">
                <ellipse cx="163" cy="148" rx="9.5" ry="5.8" fill="#e9ded4" />
                <ellipse cx="197" cy="148" rx="9.5" ry="5.8" fill="#e9ded4" />
                <g className="tutor-pupils">
                  <circle cx="163" cy="148" r="4.4" fill="url(#tutorIris)" />
                  <circle cx="197" cy="148" r="4.4" fill="url(#tutorIris)" />
                  <circle cx="163" cy="148" r="1.9" fill="#0c0708" />
                  <circle cx="197" cy="148" r="1.9" fill="#0c0708" />
                  <circle cx="164.6" cy="146.4" r="1" fill="#f4efe9" opacity="0.9" />
                  <circle cx="198.6" cy="146.4" r="1" fill="#f4efe9" opacity="0.9" />
                </g>
                {/* eyelids — blink */}
                <rect className="tutor-eyelid" x="152.5" y="141.6" width="21" height="13" rx="6" fill="url(#tutorSkin)" />
                <rect className="tutor-eyelid tutor-eyelid-2" x="186.5" y="141.6" width="21" height="13" rx="6" fill="url(#tutorSkin)" />
                <path d="M153 145 Q 163 140 173 145" stroke="#2a1a1e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
                <path d="M187 145 Q 197 140 207 145" stroke="#2a1a1e" strokeWidth="1.6" fill="none" strokeLinecap="round" />
              </g>

              {/* nose */}
              <path d="M180 156 C 179 161 177 164 176 166 C 178 168 182 168 184 166" stroke="#96705e" strokeWidth="1.8" fill="none" strokeLinecap="round" />

              {/* mouth rig: open mouth scales with the voice, lips fade out */}
              <g className="tutor-mouth-anchor">
                <g ref={mouthRef} className="tutor-mouth">
                  <ellipse cx="180" cy="180" rx="8.5" ry="7.5" fill="#26090e" />
                  <path d="M172.5 177.5 Q 180 174.5 187.5 177.5 L 187.5 179 Q 180 177 172.5 179 Z" fill="#e7dbd0" opacity="0.9" />
                  <ellipse cx="180" cy="183.5" rx="4.4" ry="2.6" fill="#6d2530" />
                </g>
                <path ref={lipsRef} className="tutor-lips" d="M170 180 Q 180 185.5 190 180" stroke="#7d4348" strokeWidth="2.4" fill="none" strokeLinecap="round" />
              </g>

              {/* bangs over the forehead + face-framing locks */}
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
            </g>
          </g>
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
        .tutor-avatar .tutor-hair-back {
          transform-box: fill-box;
        }

        /* gentle whole-body sway */
        .tutor-avatar .tutor-girl {
          transform-origin: 50% 100%;
          animation: tutorSway 7.5s ease-in-out infinite alternate;
        }
        /* breathing */
        .tutor-avatar .tutor-torso {
          transform-origin: 50% 100%;
          animation: tutorBreathe 4.2s ease-in-out infinite;
        }
        /* long hair drifts a touch, like a faint draft in the room */
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

        /* speaking: the right hand gestures */
        .tutor-avatar .tutor-arm-r { transform-origin: 80% 15%; }
        .tutor-speaking .tutor-arm-r { animation: tutorGesture 1.9s ease-in-out infinite alternate; }

        /* mouth transforms are set imperatively every frame */
        .tutor-avatar .tutor-mouth { transform-origin: 50% 50%; transform: scale(1, 0.06); }

        @keyframes tutorSway {
          from { transform: rotate(-0.6deg); }
          to { transform: rotate(0.7deg); }
        }
        @keyframes tutorBreathe {
          0%, 100% { transform: scaleY(1); }
          50% { transform: scaleY(1.016); }
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
