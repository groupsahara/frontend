"use client";

import type { ReactNode } from "react";
import type { TutorPhase } from "./tutor-avatar";

// Deterministic pseudo-random (index-seeded) so SSR and client render the
// same star field — Math.random() here would cause hydration mismatches.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const STARS = Array.from({ length: 90 }, (_, i) => ({
  left: rand(i, 1) * 100,
  top: rand(i, 2) * 100,
  size: 0.8 + rand(i, 3) * 1.8,
  duration: 2.5 + rand(i, 4) * 5,
  delay: -rand(i, 5) * 8,
  opacity: 0.3 + rand(i, 6) * 0.6,
}));

// The whole solar family circles the tutor — she sits where the sun would be.
// Orbits are ellipses (w/h in % of the scene), speeds roughly increase
// outward, and negative delays scatter the starting positions.
const PLANETS = [
  { name: "mercury", size: 8, w: 30, h: 11, speed: 14, c1: "#d8d4cc", c2: "#8a867e" },
  { name: "venus", size: 12, w: 38, h: 14.5, speed: 20, c1: "#f0d7a6", c2: "#c09a5e" },
  { name: "earth", size: 13, w: 46, h: 18, speed: 27, c1: "#8fd0ff", c2: "#2e6da8" },
  { name: "mars", size: 10, w: 54, h: 21.5, speed: 34, c1: "#f09a6e", c2: "#a04a28" },
  { name: "jupiter", size: 22, w: 63, h: 25, speed: 44, c1: "#ecc79a", c2: "#a87848" },
  { name: "saturn", size: 18, w: 72, h: 28.5, speed: 56, ring: true, c1: "#f0dcae", c2: "#b89860" },
  { name: "uranus", size: 14, w: 80, h: 32, speed: 70, c1: "#aef0e8", c2: "#4aa8a0" },
  { name: "neptune", size: 13, w: 88, h: 35.5, speed: 86, c1: "#8aa6f5", c2: "#2a4aa8" },
] as const;

interface TutorGalaxySceneProps {
  phase: TutorPhase;
  children: ReactNode;
}

/**
 * The cosmos: a slowly spinning spiral galaxy behind the tutor, the eight
 * planets orbiting her like she's the sun, twinkling stars, drifting nebulas
 * and the occasional shooting star. The avatar renders as `children` at the
 * center of it all.
 */
export function TutorGalaxyScene({ phase, children }: TutorGalaxySceneProps) {
  return (
    <div className={`tutor-galaxy tutor-galaxy-${phase}`}>
      {/* deep space */}
      <div className="tg-space" />

      {/* nebulas */}
      <div className="tg-nebula tg-nebula-violet" />
      <div className="tg-nebula tg-nebula-teal" />
      <div className="tg-nebula tg-nebula-rose" />

      {/* star field */}
      <div className="tg-stars">
        {STARS.map((s, i) => (
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

      {/* the spinning spiral galaxy, tilted like a disk, up in the sky */}
      <div className="tg-swirl" />
      <div className="tg-swirl tg-swirl-2" />

      {/* the black hole at the galaxy's heart — light pours out of it */}
      <div className="tg-bh">
        <span className="tg-bh-burst" />
        <span className="tg-bh-jet tg-bh-jet-up" />
        <span className="tg-bh-jet tg-bh-jet-down" />
        <span className="tg-bh-disk tg-bh-disk-back">
          <span className="tg-bh-flow" />
        </span>
        <span className="tg-bh-hole" />
        <span className="tg-bh-disk tg-bh-disk-front">
          <span className="tg-bh-flow" />
        </span>
      </div>

      {/* warm core glow where she sits */}
      <div className="tg-core" />

      {/* orbit rings + planets */}
      <div className="tg-orbits">
        {PLANETS.map((p, i) => (
          <div key={p.name} className="tg-orbit" style={{ width: `${p.w}%`, height: `${p.h}%` }}>
            <span
              className="tg-planet"
              style={{
                width: p.size,
                height: p.size,
                background: `radial-gradient(circle at 35% 30%, ${p.c1}, ${p.c2} 72%, #05060f 105%)`,
                boxShadow: `0 0 ${p.size * 0.7}px 1px ${p.c2}66`,
                animationDuration: `${p.speed}s`,
                animationDelay: `${-rand(i, 9) * p.speed}s`,
              }}
            >
              {"ring" in p && p.ring && <span className="tg-ring" />}
            </span>
          </div>
        ))}
      </div>

      {/* the tutor */}
      <div className="tg-stage">{children}</div>

      {/* shooting stars */}
      <div className="tg-shooting tg-shooting-1" />
      <div className="tg-shooting tg-shooting-2" />

      {/* soft dark edges */}
      <div className="tg-vignette" />

      <style>{`
        .tutor-galaxy { position: absolute; inset: 0; overflow: hidden; background: #04040c; }

        .tg-space {
          position: absolute; inset: 0;
          background:
            radial-gradient(110% 85% at 50% 30%, #10132b 0%, #090b1c 45%, #04040c 100%);
        }

        .tg-nebula {
          position: absolute; pointer-events: none; filter: blur(30px);
          animation: tgNebula 18s ease-in-out infinite alternate;
        }
        .tg-nebula-violet {
          left: 4%; top: 6%; width: 46%; height: 40%;
          background: radial-gradient(50% 50% at 50% 50%, rgba(124, 92, 220, 0.22), transparent 70%);
        }
        .tg-nebula-teal {
          right: 0%; top: 24%; width: 44%; height: 44%;
          background: radial-gradient(50% 50% at 50% 50%, rgba(52, 170, 180, 0.16), transparent 70%);
          animation-delay: -6s;
        }
        .tg-nebula-rose {
          left: 26%; bottom: -8%; width: 52%; height: 40%;
          background: radial-gradient(50% 50% at 50% 50%, rgba(200, 90, 150, 0.12), transparent 70%);
          animation-delay: -12s;
        }

        .tg-stars { position: absolute; inset: 0; pointer-events: none; }
        .tg-stars span {
          position: absolute; border-radius: 50%; background: #eef0ff;
          box-shadow: 0 0 4px 0.5px rgba(200, 210, 255, 0.9);
          animation-name: tgTwinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }

        /* tilted spinning disk: rotate runs first, then the squash — a galaxy seen at an angle */
        .tg-swirl {
          position: absolute; left: 50%; top: 30%;
          width: 130%; aspect-ratio: 1; pointer-events: none;
          background: repeating-conic-gradient(
            from 0deg,
            rgba(140, 130, 255, 0.10) 0deg 16deg,
            rgba(90, 140, 220, 0.03) 16deg 30deg,
            transparent 30deg 46deg
          );
          border-radius: 50%;
          -webkit-mask-image: radial-gradient(circle, rgba(0,0,0,0.9) 8%, rgba(0,0,0,0.5) 34%, transparent 62%);
          mask-image: radial-gradient(circle, rgba(0,0,0,0.9) 8%, rgba(0,0,0,0.5) 34%, transparent 62%);
          filter: blur(10px);
          animation: tgSpin 90s linear infinite;
        }
        .tg-swirl-2 {
          width: 92%;
          animation-duration: 60s;
          animation-direction: reverse;
          opacity: 0.7;
        }

        /* ------------------------- the black hole ------------------------- */
        .tg-bh {
          position: absolute; left: 50%; top: 27%;
          width: min(190px, 26vw); aspect-ratio: 1;
          transform: translate(-50%, -50%);
          pointer-events: none;
        }
        /* light escaping in every direction */
        .tg-bh-burst {
          position: absolute; inset: -85%;
          background: radial-gradient(50% 50% at 50% 50%, rgba(255, 216, 150, 0.30) 0%, rgba(190, 160, 255, 0.12) 40%, transparent 70%);
          animation: tgBurst 5.5s ease-in-out infinite;
        }
        /* polar jets shooting out above and below */
        .tg-bh-jet {
          position: absolute; left: 50%; width: 4px; height: 105%;
          transform: translateX(-50%);
          background: linear-gradient(rgba(210, 225, 255, 0), rgba(215, 230, 255, 0.9), rgba(210, 225, 255, 0));
          filter: blur(2px);
          animation: tgJet 3.6s ease-in-out infinite;
        }
        .tg-bh-jet-up { bottom: 78%; }
        .tg-bh-jet-down { top: 78%; opacity: 0.55; animation-delay: -1.8s; }
        /* the event horizon, rimmed by a blazing photon ring */
        .tg-bh-hole {
          position: absolute; inset: 28%;
          border-radius: 50%;
          background: #000;
          box-shadow:
            0 0 0 2.5px rgba(255, 238, 196, 0.95),
            0 0 26px 7px rgba(255, 198, 110, 0.6),
            0 0 70px 18px rgba(255, 170, 80, 0.25);
        }
        /* accretion disk: a spinning conic flow inside an elliptical window;
           the front band is a bottom-half clone layered over the hole */
        .tg-bh-disk {
          position: absolute; left: 50%; top: 50%;
          width: 165%; height: 44%;
          transform: translate(-50%, -50%);
          border-radius: 50%;
          overflow: hidden;
        }
        .tg-bh-disk-front { clip-path: inset(51% 0 0 0); }
        .tg-bh-flow {
          position: absolute; left: 50%; top: 50%;
          width: 300%; aspect-ratio: 1;
          transform: translate(-50%, -50%);
          background: conic-gradient(
            from 0deg,
            transparent 0deg,
            rgba(255, 168, 70, 0.7) 55deg,
            rgba(255, 238, 200, 0.95) 115deg,
            rgba(255, 168, 70, 0.7) 175deg,
            rgba(255, 120, 50, 0.3) 240deg,
            transparent 320deg
          );
          filter: blur(4px);
          animation: tgFlow 6.5s linear infinite;
        }
        .tutor-galaxy-speaking .tg-bh-burst { animation-duration: 2.6s; }

        .tg-core {
          position: absolute; left: 50%; top: 58%;
          width: 58%; height: 52%;
          transform: translate(-50%, -50%);
          background: radial-gradient(50% 50% at 50% 50%, rgba(255, 214, 140, 0.20) 0%, rgba(180, 150, 255, 0.10) 45%, transparent 72%);
          filter: blur(8px);
          pointer-events: none;
          animation: tgCore 7s ease-in-out infinite;
        }
        /* the cosmos answers her */
        .tutor-galaxy-speaking .tg-core { animation-duration: 3.2s; }
        .tutor-galaxy-thinking .tg-core { opacity: 0.7; }
        .tutor-galaxy-listening .tg-stars span { animation-duration: 1.8s; }

        .tg-orbits { position: absolute; inset: 0; pointer-events: none; }
        .tg-orbit {
          position: absolute; left: 50%; top: 62%;
          transform: translate(-50%, -50%);
          border: 1px solid rgba(150, 160, 255, 0.13);
          border-radius: 50%;
        }
        .tg-planet {
          position: absolute; border-radius: 50%;
          offset-path: ellipse(50% 50% at 50% 50%);
          offset-rotate: 0deg;
          animation-name: tgOrbit;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        .tg-ring {
          position: absolute; left: 50%; top: 50%;
          width: 185%; height: 38%;
          transform: translate(-50%, -50%) rotate(-18deg);
          border: 1.4px solid rgba(235, 214, 160, 0.85);
          border-radius: 50%;
        }

        .tg-stage {
          position: absolute; inset: 8% 0 4% 0;
          display: flex; align-items: flex-end; justify-content: center;
        }

        .tg-shooting {
          position: absolute; height: 1.5px; width: 130px;
          background: linear-gradient(90deg, rgba(230,240,255,0.95), transparent);
          border-radius: 2px; opacity: 0; pointer-events: none;
        }
        .tg-shooting-1 { top: 14%; left: 68%; transform: rotate(160deg); animation: tgShoot 9s linear infinite; }
        .tg-shooting-2 { top: 8%; left: 24%; transform: rotate(200deg); animation: tgShoot 13s linear infinite; animation-delay: -5s; }

        .tg-vignette {
          position: absolute; inset: 0; pointer-events: none;
          background: radial-gradient(85% 75% at 50% 45%, transparent 55%, rgba(2, 3, 10, 0.55) 85%, rgba(1, 2, 8, 0.9) 100%);
        }

        @keyframes tgTwinkle { 0%, 100% { opacity: 0.15; } 50% { opacity: 1; } }
        @keyframes tgSpin {
          from { transform: translate(-50%, -50%) scaleY(0.34) rotate(0deg); }
          to { transform: translate(-50%, -50%) scaleY(0.34) rotate(360deg); }
        }
        @keyframes tgNebula { from { opacity: 0.65; transform: translateX(-2%); } to { opacity: 1; transform: translateX(2%); } }
        @keyframes tgCore { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes tgOrbit { from { offset-distance: 0%; } to { offset-distance: 100%; } }
        @keyframes tgBurst { 0%, 100% { opacity: 0.65; } 50% { opacity: 1; } }
        @keyframes tgJet { 0%, 100% { opacity: 0.5; height: 96%; } 50% { opacity: 1; height: 112%; } }
        @keyframes tgFlow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes tgShoot {
          0%, 90% { opacity: 0; transform: translate(0, 0) rotate(var(--tg-rot, 160deg)); }
          91% { opacity: 0.9; }
          97%, 100% { opacity: 0; transform: translate(-220px, 80px) rotate(var(--tg-rot, 160deg)); }
        }
      `}</style>
    </div>
  );
}
