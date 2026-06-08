"use client";

import { useEffect, useRef } from "react";

const ACCENT = "#e2563b";

/**
 * A custom cursor: a small accent dot that tracks the pointer exactly, plus a
 * larger ring that trails behind with easing and grows over interactive
 * elements. Desktop (fine pointer) only; disabled for touch / reduced-motion.
 */
export function CursorFollower() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia?.("(pointer: fine)").matches;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = 0;
    let mouseY = 0;
    let ringX = 0;
    let ringY = 0;
    let raf = 0;
    let shown = false;

    const onMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      dot.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
      if (!shown) {
        shown = true;
        dot.style.opacity = "1";
        ring.style.opacity = "1";
      }
    };

    const isInteractive = (t: EventTarget | null) =>
      t instanceof Element && t.closest("a, button, [role='button'], input, select, textarea, label");

    const onOver = (e: MouseEvent) => {
      if (isInteractive(e.target)) ring.dataset.active = "true";
    };
    const onOut = (e: MouseEvent) => {
      if (isInteractive(e.target)) ring.dataset.active = "false";
    };
    const onLeave = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
      shown = false;
    };

    const loop = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      const scale = ring.dataset.active === "true" ? 1.8 : 1;
      ring.style.transform = `translate(${ringX}px, ${ringY}px) scale(${scale})`;
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseover", onOver);
    window.addEventListener("mouseout", onOut);
    document.addEventListener("mouseleave", onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      document.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] -ml-4 -mt-4 h-8 w-8 rounded-full opacity-0 transition-[opacity,border-color] duration-200"
        style={{ border: `2px solid ${ACCENT}99`, transformOrigin: "center" }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[60] -ml-1 -mt-1 h-2 w-2 rounded-full opacity-0 transition-opacity duration-200"
        style={{ backgroundColor: ACCENT }}
      />
    </>
  );
}
