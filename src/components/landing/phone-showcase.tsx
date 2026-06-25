"use client";

import { useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Float, Html, RoundedBox } from "@react-three/drei";
import { PhoneScreens } from "./phone-screens";

function Phone() {
  return (
    <Float speed={1.5} rotationIntensity={0.35} floatIntensity={0.45}>
      <group rotation={[0, -0.28, 0]}>
        {/* Phone body */}
        <RoundedBox args={[3.15, 6.25, 0.36]} radius={0.28} smoothness={8}>
          <meshStandardMaterial color="#0b1020" metalness={0.65} roughness={0.3} />
        </RoundedBox>

        {/* Black screen bezel */}
        <RoundedBox args={[2.92, 6.02, 0.38]} radius={0.22} position={[0, 0, 0.01]}>
          <meshStandardMaterial color="#05070d" metalness={0.2} roughness={0.7} />
        </RoundedBox>

        {/* Side button accents */}
        <mesh position={[1.6, 0.8, 0]}>
          <boxGeometry args={[0.06, 0.7, 0.18]} />
          <meshStandardMaterial color="#1b2540" metalness={0.7} roughness={0.4} />
        </mesh>

        {/* The live UI screen.
            drei transform Html renders at ~1px = 0.025 world units, so the
            290×600 screen is ~7.25×15 units at scale 1 — scale ~0.4 fills the
            phone face (~2.92 × 6 units) so no black bezel shows below it. */}
        <Html
          transform
          position={[0, 0, 0.21]}
          scale={0.4}
          zIndexRange={[10, 0]}
          occlude={false}
        >
          <PhoneScreens />
        </Html>
      </group>
    </Float>
  );
}

export function PhoneShowcase() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  return (
    <section className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-b from-gray-50 via-white to-white">
      {/* soft accent glows */}
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-blue-200/30 blur-3xl" />

      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-2 lg:py-14">
        {/* Copy */}
        <div className="text-center lg:order-2 lg:text-left">
          <span className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-700">
            See it in action
          </span>
          <h2 className="mt-4 text-xl font-bold tracking-tight text-gray-900 sm:text-[38px]">
            From booking to your doorstep — in real time
          </h2>
          <p className="mx-auto mt-3 max-w-md text-base text-gray-600 lg:mx-0">
            Customers book a service in a few taps. The moment they confirm, the
            nearest verified partner gets the lead allocated on the map and heads
            your way — all tracked live.
          </p>

          <div className="mt-6 grid max-w-md grid-cols-1 gap-3 sm:grid-cols-2">
            <FlowStep step="1" title="Customer books" desc="Pick a service & slot" />
            <FlowStep step="2" title="Lead allocated" desc="Nearest partner notified" />
            <FlowStep step="3" title="Partner accepts" desc="Routed via live map" />
            <FlowStep step="4" title="On the way" desc="Real-time tracking" />
          </div>
        </div>

        {/* 3D phone */}
        <div className="relative h-[520px] w-full sm:h-[640px] lg:order-1">
          {mounted && (
            <Canvas
              camera={{ position: [0, 0, 11.5], fov: 32 }}
              dpr={[1, 2]}
              gl={{ antialias: true, alpha: true }}
            >
              <ambientLight intensity={0.9} />
              <directionalLight position={[5, 6, 6]} intensity={1.3} />
              <directionalLight position={[-6, -2, 4]} intensity={0.5} color="#9bb8ff" />
              <Phone />
            </Canvas>
          )}
        </div>
      </div>
    </section>
  );
}

function FlowStep({ step, title, desc }: { step: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-3 text-left shadow-sm">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-xs font-bold text-white">
        {step}
      </span>
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
