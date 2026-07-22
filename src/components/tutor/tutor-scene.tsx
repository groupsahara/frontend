"use client";

import type { ReactNode } from "react";
import type { TutorPhase } from "./tutor-avatar";

// Deterministic pseudo-random (index-seeded) so SSR and client render the
// same dust field — Math.random() here would cause hydration mismatches.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const DUST = Array.from({ length: 26 }, (_, i) => ({
  left: rand(i, 1) * 100,
  top: rand(i, 2) * 100,
  size: 1 + rand(i, 3) * 2.2,
  duration: 9 + rand(i, 4) * 16,
  delay: -rand(i, 5) * 20,
  opacity: 0.12 + rand(i, 6) * 0.3,
}));

interface TutorSceneProps {
  phase: TutorPhase;
  children: ReactNode;
}

/**
 * The room: a near-black study lit by one swinging, flickering bulb.
 * Boarded window, drifting fog, dust motes, film grain, vignette and a rare
 * lightning flash. The avatar renders as `children` under the light cone.
 */
export function TutorScene({ phase, children }: TutorSceneProps) {
  return (
    <div className={`tutor-scene tutor-scene-${phase}`}>
      {/* wall + floor */}
      <div className="tutor-wall" />
      <div className="tutor-floor" />

      {/* boarded window with cold moonlight */}
      <div className="tutor-window">
        <div className="tutor-window-glow" />
        <div className="tutor-plank tutor-plank-1" />
        <div className="tutor-plank tutor-plank-2" />
        <div className="tutor-plank tutor-plank-3" />
      </div>

      {/* cobweb corner */}
      <svg className="tutor-web" viewBox="0 0 120 120">
        <path d="M0 0 L120 8 M0 0 L96 34 M0 0 L60 62 M0 0 L28 92 M0 0 L6 118" stroke="#9aa4ad" strokeWidth="0.7" opacity="0.35" fill="none" />
        <path d="M30 4 Q28 16 22 24 M56 8 Q50 26 40 40 M84 12 Q72 34 56 52" stroke="#9aa4ad" strokeWidth="0.6" opacity="0.28" fill="none" />
      </svg>

      {/* back fog */}
      <div className="tutor-fog tutor-fog-back" />

      {/* floor spotlight pool under the chair */}
      <div className="tutor-pool" />

      {/* the girl */}
      <div className="tutor-stage">{children}</div>

      {/* hanging lamp + cone (above her, blended as light) */}
      <div className="tutor-lamp">
        <div className="tutor-cord" />
        <div className="tutor-shade" />
        <div className="tutor-bulb" />
        <div className="tutor-cone" />
      </div>

      {/* front fog, dust, red pulse, lightning, grain, vignette */}
      <div className="tutor-fog tutor-fog-front" />
      <div className="tutor-dust">
        {DUST.map((d, i) => (
          <span
            key={i}
            style={{
              left: `${d.left}%`,
              top: `${d.top}%`,
              width: d.size,
              height: d.size,
              opacity: d.opacity,
              animationDuration: `${d.duration}s`,
              animationDelay: `${d.delay}s`,
            }}
          />
        ))}
      </div>
      <div className="tutor-redpulse" />
      <div className="tutor-flash" />
      <svg className="tutor-grain" aria-hidden>
        <filter id="tutorNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="2" stitchTiles="stitch" />
        </filter>
        <rect width="100%" height="100%" filter="url(#tutorNoise)" />
      </svg>
      <div className="tutor-vignette" />

      <style>{`
        .tutor-scene {
          position: absolute; inset: 0; overflow: hidden;
          background: #030304;
        }

        .tutor-wall {
          position: absolute; inset: 0 0 22% 0;
          background:
            radial-gradient(120% 90% at 50% 0%, #0d1016 0%, #07080c 55%, #030304 100%),
            repeating-linear-gradient(90deg, transparent 0 118px, rgba(255,255,255,0.014) 118px 120px);
        }
        .tutor-floor {
          position: absolute; left: 0; right: 0; bottom: 0; height: 24%;
          background:
            linear-gradient(#0a0b0e, #040405 70%),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.35) 0 2px, transparent 2px 64px);
          transform: perspective(500px) rotateX(28deg);
          transform-origin: 50% 0%;
        }

        .tutor-window {
          position: absolute; top: 9%; left: 7%;
          width: 130px; height: 170px;
          border: 6px solid #0f0d0a;
          background: linear-gradient(160deg, #121a24 0%, #0a0f16 60%, #06080c 100%);
          box-shadow: 0 0 60px rgba(96,140,180,0.10), inset 0 0 24px rgba(0,0,0,0.9);
        }
        .tutor-window-glow {
          position: absolute; inset: 0;
          background: radial-gradient(60% 45% at 68% 26%, rgba(150,190,230,0.35), transparent 70%);
          animation: tutorMoon 11s ease-in-out infinite;
        }
        .tutor-plank {
          position: absolute; left: -10%; width: 120%; height: 16px;
          background: linear-gradient(#241a10, #120c06);
          box-shadow: 0 2px 6px rgba(0,0,0,0.8);
        }
        .tutor-plank-1 { top: 18%; transform: rotate(-7deg); }
        .tutor-plank-2 { top: 52%; transform: rotate(5deg); }
        .tutor-plank-3 { top: 80%; transform: rotate(-3deg); }

        .tutor-web { position: absolute; top: 0; right: 0; width: 130px; height: 130px; transform: scaleX(-1); }

        .tutor-fog {
          position: absolute; inset: -20%;
          pointer-events: none;
          background:
            radial-gradient(40% 30% at 30% 60%, rgba(120,140,160,0.05), transparent 70%),
            radial-gradient(50% 35% at 70% 70%, rgba(110,130,150,0.05), transparent 70%),
            radial-gradient(45% 30% at 50% 40%, rgba(100,120,145,0.04), transparent 70%);
          filter: blur(24px);
        }
        .tutor-fog-back { animation: tutorFogDrift 46s linear infinite alternate; }
        .tutor-fog-front { animation: tutorFogDrift 32s linear infinite alternate-reverse; opacity: 0.85; }

        .tutor-pool {
          position: absolute; left: 50%; bottom: 6%;
          width: 62%; height: 15%;
          transform: translateX(-50%);
          background: radial-gradient(50% 50% at 50% 50%, rgba(255,214,150,0.10), transparent 70%);
          filter: blur(6px);
        }

        .tutor-stage {
          position: absolute; inset: 8% 0 4% 0;
          display: flex; align-items: flex-end; justify-content: center;
        }

        .tutor-lamp {
          position: absolute; top: -6px; left: 50%;
          transform-origin: 50% 0;
          animation: tutorSwing 6.5s ease-in-out infinite alternate;
          pointer-events: none;
        }
        .tutor-cord { width: 2px; height: 74px; margin: 0 auto; background: linear-gradient(#1c1c22, #0c0c10); }
        .tutor-shade {
          width: 58px; height: 26px; margin: 0 auto;
          background: linear-gradient(#23252c, #101115);
          clip-path: polygon(28% 0, 72% 0, 100% 100%, 0 100%);
        }
        .tutor-bulb {
          width: 14px; height: 14px; margin: -4px auto 0;
          border-radius: 50%;
          background: radial-gradient(circle at 45% 35%, #fff6dd, #ffce7a 60%, #b97b2e);
          box-shadow: 0 0 22px 8px rgba(255,205,120,0.55);
          animation: tutorFlicker 4.7s steps(1, end) infinite;
        }
        .tutor-cone {
          width: 520px; height: 440px; margin: -10px auto 0;
          background: radial-gradient(50% 100% at 50% 0%, rgba(255,218,160,0.20) 0%, rgba(255,208,150,0.07) 45%, transparent 72%);
          clip-path: polygon(44% 0, 56% 0, 92% 100%, 8% 100%);
          filter: blur(2px);
          mix-blend-mode: screen;
          animation: tutorFlicker 4.7s steps(1, end) infinite;
        }
        /* the lamp steadies a little when she speaks, stutters when she thinks */
        .tutor-scene-thinking .tutor-bulb, .tutor-scene-thinking .tutor-cone { animation-duration: 1.6s; }
        .tutor-scene-speaking .tutor-bulb, .tutor-scene-speaking .tutor-cone { animation-duration: 8s; }

        .tutor-dust { position: absolute; inset: 0; pointer-events: none; }
        .tutor-dust span {
          position: absolute; border-radius: 50%;
          background: #d8cdbb;
          animation-name: tutorFloat;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .tutor-redpulse {
          position: absolute; right: -12%; bottom: -10%;
          width: 55%; height: 55%;
          background: radial-gradient(50% 50% at 50% 50%, rgba(150,20,30,0.10), transparent 70%);
          animation: tutorRed 9s ease-in-out infinite;
          pointer-events: none;
        }

        .tutor-flash {
          position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(180deg, rgba(190,210,240,0.5), rgba(160,180,220,0.12) 60%, transparent);
          opacity: 0;
          animation: tutorLightning 17s linear infinite;
          mix-blend-mode: screen;
        }

        .tutor-grain { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.05; pointer-events: none; }
        .tutor-vignette {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(80% 70% at 50% 45%, transparent 40%, rgba(0,0,0,0.55) 78%, rgba(0,0,0,0.9) 100%);
        }

        @keyframes tutorSwing { from { transform: translateX(-50%) rotate(-2.4deg); } to { transform: translateX(-50%) rotate(2.6deg); } }
        @keyframes tutorFlicker {
          0%, 100% { opacity: 1; }
          7% { opacity: 0.72; } 9% { opacity: 1; }
          38% { opacity: 0.85; } 40% { opacity: 1; }
          61% { opacity: 0.55; } 63% { opacity: 0.95; }
          64.5% { opacity: 0.7; } 66% { opacity: 1; }
        }
        @keyframes tutorFogDrift { from { transform: translateX(-4%); } to { transform: translateX(4%); } }
        @keyframes tutorFloat {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(9px, -14px); }
          50% { transform: translate(-7px, -26px); }
          75% { transform: translate(6px, -12px); }
        }
        @keyframes tutorRed { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes tutorMoon { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes tutorLightning {
          0%, 90.5%, 93.5%, 100% { opacity: 0; }
          91% { opacity: 0.55; }
          91.6% { opacity: 0.08; }
          92.2% { opacity: 0.7; }
          93% { opacity: 0.12; }
        }
      `}</style>
    </div>
  );
}
