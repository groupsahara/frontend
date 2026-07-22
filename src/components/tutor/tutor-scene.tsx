"use client";

import type { ReactNode } from "react";
import type { TutorPhase } from "./tutor-avatar";

// Deterministic pseudo-random (index-seeded) so SSR and client render the
// same sparkle field — Math.random() here would cause hydration mismatches.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const SPARKLES = Array.from({ length: 30 }, (_, i) => ({
  left: rand(i, 1) * 100,
  top: 20 + rand(i, 2) * 80,
  size: 1.5 + rand(i, 3) * 3,
  duration: 10 + rand(i, 4) * 14,
  delay: -rand(i, 5) * 22,
  opacity: 0.25 + rand(i, 6) * 0.5,
}));

interface TutorSceneProps {
  phase: TutorPhase;
  children: ReactNode;
}

/**
 * The heavens: a radiant sky with god-rays falling from above, drifting
 * clouds, golden sparkles floating upward and a soft glory pulsing behind
 * the angel. The avatar renders as `children` inside the shaft of light.
 */
export function TutorScene({ phase, children }: TutorSceneProps) {
  return (
    <div className={`tutor-scene tutor-scene-${phase}`}>
      {/* sky + distant glow */}
      <div className="tutor-sky" />

      {/* god-rays fanning out from the light above */}
      <div className="tutor-rays" />

      {/* distant drifting clouds */}
      <div className="tutor-cloud tutor-cloud-1" />
      <div className="tutor-cloud tutor-cloud-2" />
      <div className="tutor-cloud tutor-cloud-3" />

      {/* glory — the halo of light behind the angel */}
      <div className="tutor-glory" />

      {/* the angel */}
      <div className="tutor-stage">{children}</div>

      {/* broad shaft of light falling on her */}
      <div className="tutor-shaft" />

      {/* cloud banks framing the bottom */}
      <div className="tutor-cloudbank" />

      {/* golden sparkles floating upward */}
      <div className="tutor-sparkles">
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            style={{
              left: `${s.left}%`,
              top: `${s.top}%`,
              width: s.size,
              height: s.size,
              opacity: s.opacity,
              animationDuration: `${s.duration}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

      {/* soft edges */}
      <div className="tutor-vignette" />

      <style>{`
        .tutor-scene {
          position: absolute; inset: 0; overflow: hidden;
          background: #cfdcf4;
        }

        .tutor-sky {
          position: absolute; inset: 0;
          background:
            radial-gradient(90% 70% at 50% 0%, #fff9e8 0%, #fdeecb 18%, #e8ecf7 48%, #c4d2ef 78%, #a9bce6 100%);
        }

        .tutor-rays {
          position: absolute; inset: -30% -20% 0 -20%;
          background: repeating-conic-gradient(
            from 168deg at 50% -12%,
            transparent 0deg,
            rgba(255, 241, 200, 0.5) 3deg,
            transparent 7deg,
            transparent 12deg
          );
          filter: blur(3px);
          mix-blend-mode: soft-light;
          animation: tutorRays 8s ease-in-out infinite alternate;
        }

        .tutor-cloud {
          position: absolute; pointer-events: none;
          background: radial-gradient(50% 55% at 50% 55%, rgba(255,255,255,0.95), rgba(255,255,255,0.45) 60%, transparent 75%);
          filter: blur(10px);
          border-radius: 50%;
        }
        .tutor-cloud-1 { top: 16%; left: -6%; width: 40%; height: 15%; animation: tutorDrift 70s linear infinite alternate; }
        .tutor-cloud-2 { top: 32%; right: -8%; width: 46%; height: 17%; animation: tutorDrift 55s linear infinite alternate-reverse; }
        .tutor-cloud-3 { top: 7%; left: 34%; width: 34%; height: 12%; opacity: 0.8; animation: tutorDrift 85s linear infinite alternate; }

        .tutor-glory {
          position: absolute; left: 50%; top: 26%;
          width: 68%; height: 62%;
          transform: translateX(-50%);
          background: radial-gradient(50% 50% at 50% 42%, rgba(255,236,180,0.65) 0%, rgba(255,244,214,0.28) 45%, transparent 72%);
          filter: blur(8px);
          animation: tutorGlory 6.5s ease-in-out infinite;
          pointer-events: none;
        }
        /* the light answers her: brighter while she speaks, hushed while she thinks */
        .tutor-scene-speaking .tutor-glory { animation-duration: 3.2s; }
        .tutor-scene-thinking .tutor-glory { opacity: 0.75; }
        .tutor-scene-listening .tutor-rays { animation-duration: 4s; }

        .tutor-stage {
          position: absolute; inset: 8% 0 4% 0;
          display: flex; align-items: flex-end; justify-content: center;
        }

        .tutor-shaft {
          position: absolute; top: -4%; left: 50%;
          width: 560px; max-width: 90%; height: 92%;
          transform: translateX(-50%);
          background: radial-gradient(50% 100% at 50% 0%, rgba(255,248,222,0.5) 0%, rgba(255,244,210,0.18) 45%, transparent 75%);
          clip-path: polygon(38% 0, 62% 0, 96% 100%, 4% 100%);
          filter: blur(4px);
          mix-blend-mode: screen;
          pointer-events: none;
          animation: tutorShaft 9s ease-in-out infinite alternate;
        }

        .tutor-cloudbank {
          position: absolute; left: -6%; right: -6%; bottom: -14%;
          height: 34%;
          background:
            radial-gradient(28% 70% at 12% 45%, rgba(255,255,255,0.98), transparent 70%),
            radial-gradient(30% 75% at 38% 55%, rgba(255,255,255,0.95), transparent 72%),
            radial-gradient(30% 75% at 64% 48%, rgba(255,255,255,0.97), transparent 70%),
            radial-gradient(28% 70% at 88% 55%, rgba(255,255,255,0.95), transparent 72%);
          filter: blur(9px);
          pointer-events: none;
          animation: tutorBankDrift 26s ease-in-out infinite alternate;
        }

        .tutor-sparkles { position: absolute; inset: 0; pointer-events: none; }
        .tutor-sparkles span {
          position: absolute; border-radius: 50%;
          background: #ffe9a8;
          box-shadow: 0 0 6px 1px rgba(255, 226, 150, 0.8);
          animation-name: tutorRise;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        .tutor-vignette {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(85% 75% at 50% 45%, transparent 55%, rgba(150,170,220,0.22) 82%, rgba(120,145,205,0.45) 100%);
        }

        @keyframes tutorRays { from { opacity: 0.55; } to { opacity: 1; } }
        @keyframes tutorDrift { from { transform: translateX(-3%); } to { transform: translateX(4%); } }
        @keyframes tutorGlory { 0%, 100% { opacity: 0.75; } 50% { opacity: 1; } }
        @keyframes tutorShaft { from { opacity: 0.75; } to { opacity: 1; } }
        @keyframes tutorBankDrift { from { transform: translateX(-1.5%); } to { transform: translateX(1.5%); } }
        @keyframes tutorRise {
          0% { transform: translateY(0); }
          50% { transform: translateY(-34px) translateX(6px); }
          100% { transform: translateY(-68px) translateX(-4px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
