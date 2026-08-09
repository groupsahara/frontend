"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type TutorPhase = "idle" | "listening" | "thinking" | "speaking";

interface TutorOrbProps {
  phase: TutorPhase;
  /**
   * Live speech amplitude 0..1 — the orb "boils" and glows with her voice,
   * sampled inside the render loop so it never re-renders React.
   */
  getLevel: () => number;
}

// Phase moods: core color + how energetic the quantum shell is at rest.
const MOODS: Record<TutorPhase, { core: number; shell: number; idle: number }> = {
  idle: { core: 0x8b7bff, shell: 0xb8c6ff, idle: 0.05 },
  listening: { core: 0xf5b942, shell: 0xffe2a8, idle: 0.1 },
  thinking: { core: 0x5a4fae, shell: 0x9aa8ff, idle: 0.14 },
  speaking: { core: 0xa78bfa, shell: 0xd6ccff, idle: 0.08 },
};

/** Soft radial texture for the core glow sprite. */
function makeGlowTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const g = canvas.getContext("2d")!;
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, "rgba(255,255,255,0.9)");
  grad.addColorStop(0.25, "rgba(190,175,255,0.55)");
  grad.addColorStop(0.6, "rgba(120,100,230,0.18)");
  grad.addColorStop(1, "rgba(120,100,230,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * The tutor's presence — a rotating "quantum globe": a glowing core inside a
 * boiling particle shell, an icosahedron wireframe, and three electron rings.
 * Voice amplitude drives the boil, the glow and the spin; the phase drives
 * the colour mood (amber listening, dim violet thinking, bright speaking).
 */
export function TutorOrb({ phase, getLevel }: TutorOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef(phase);
  const levelFnRef = useRef(getLevel);
  useEffect(() => {
    phaseRef.current = phase;
    levelFnRef.current = getLevel;
  }, [phase, getLevel]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    // Pin the canvas to its container — setSize(w, h, false) only sizes the
    // drawing buffer, and an unstyled canvas would display at buffer size
    // (devicePixelRatio× too big, spilling out of the stage).
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 0, 8);

    // Slightly below center — the title floats above, the controls below.
    const orb = new THREE.Group();
    orb.position.y = -0.2;
    scene.add(orb);

    // --- glowing core -----------------------------------------------------
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: MOODS.idle.core,
      transparent: true,
      opacity: 0.92,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.62, 48, 48), coreMaterial);
    orb.add(core);

    const glowTexture = makeGlowTexture();
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.setScalar(3.4);
    orb.add(glow);

    // --- boiling particle shell ------------------------------------------
    const COUNT = 3200;
    const SHELL_R = 1.55;
    const base = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // Even-ish sphere distribution.
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      base[i * 3] = r * Math.cos(t) * SHELL_R;
      base[i * 3 + 1] = u * SHELL_R;
      base[i * 3 + 2] = r * Math.sin(t) * SHELL_R;
      seed[i] = Math.random() * Math.PI * 2;
    }
    const shellGeometry = new THREE.BufferGeometry();
    shellGeometry.setAttribute("position", new THREE.BufferAttribute(base.slice(), 3));
    const shellMaterial = new THREE.PointsMaterial({
      color: MOODS.idle.shell,
      size: 0.028,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const shell = new THREE.Points(shellGeometry, shellMaterial);
    orb.add(shell);

    // --- wireframe lattice ------------------------------------------------
    const latticeMaterial = new THREE.LineBasicMaterial({
      color: 0x6f63ff,
      transparent: true,
      opacity: 0.3,
    });
    const lattice = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.16, 1)),
      latticeMaterial,
    );
    orb.add(lattice);

    // --- electron rings ---------------------------------------------------
    const rings: THREE.Group[] = [];
    const electrons: { pivot: THREE.Group; dot: THREE.Mesh; speed: number; angle: number }[] = [];
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0x8f84e8,
      transparent: true,
      opacity: 0.22,
    });
    const electronMaterial = new THREE.MeshBasicMaterial({ color: 0xd6ccff });
    for (let i = 0; i < 3; i++) {
      const holder = new THREE.Group();
      holder.rotation.set(Math.PI / 2 + (i - 1) * 0.55, 0, i * (Math.PI / 3));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.009, 8, 128), ringMaterial);
      holder.add(ring);
      const pivot = new THREE.Group();
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 16), electronMaterial);
      dot.position.x = 2.15;
      pivot.add(dot);
      holder.add(pivot);
      orb.add(holder);
      rings.push(holder);
      electrons.push({ pivot, dot, speed: 0.5 + i * 0.23, angle: i * 2.1 });
    }

    // --- deep-space ambience (the canvas is the whole universe now) -------
    const STAR_COUNT = 1600;
    const starPositions = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      // Random directions on a far shell so stars surround the camera.
      const u = Math.random() * 2 - 1;
      const t = Math.random() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const dist = 18 + Math.random() * 34;
      starPositions[i * 3] = r * Math.cos(t) * dist;
      starPositions[i * 3 + 1] = u * dist;
      starPositions[i * 3 + 2] = r * Math.sin(t) * dist - 10;
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMaterial = new THREE.PointsMaterial({
      color: 0xdfe4ff,
      size: 0.07,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    const nebulaViolet = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x5a48c8,
      transparent: true,
      opacity: 0.16,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nebulaTeal = nebulaViolet.clone();
    nebulaTeal.color = new THREE.Color(0x2fa8a8);
    nebulaTeal.opacity = 0.1;
    const nebula1 = new THREE.Sprite(nebulaViolet);
    nebula1.position.set(-9, 5, -18);
    nebula1.scale.setScalar(28);
    const nebula2 = new THREE.Sprite(nebulaTeal);
    nebula2.position.set(10, -4, -22);
    nebula2.scale.setScalar(32);
    scene.add(nebula1, nebula2);

    // --- sizing -----------------------------------------------------------
    const resize = () => {
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    // --- render loop ------------------------------------------------------
    const coreColor = new THREE.Color(MOODS.idle.core);
    const shellColor = new THREE.Color(MOODS.idle.shell);
    const t0 = performance.now();
    let smooth = 0;
    let raf = 0;

    const tick = () => {
      const t = (performance.now() - t0) / 1000;
      const mood = MOODS[phaseRef.current];
      const speaking = phaseRef.current === "speaking";
      const target = speaking
        ? Math.min(1, Math.max(0, levelFnRef.current?.() ?? 0))
        : mood.idle;
      smooth += (target - smooth) * 0.12;

      // Colours ease toward the phase mood.
      coreColor.lerp(new THREE.Color(mood.core), 0.06);
      shellColor.lerp(new THREE.Color(mood.shell), 0.06);
      coreMaterial.color.copy(coreColor);
      shellMaterial.color.copy(shellColor);

      // The shell boils: each particle breathes along its radius.
      const positions = shellGeometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = positions.array as Float32Array;
      const amp = 0.05 + smooth * 0.6;
      for (let i = 0; i < COUNT; i++) {
        const k = 1 + Math.sin(t * 2.2 + seed[i] * 3.1) * amp * 0.35;
        arr[i * 3] = base[i * 3] * k;
        arr[i * 3 + 1] = base[i * 3 + 1] * k;
        arr[i * 3 + 2] = base[i * 3 + 2] * k;
      }
      positions.needsUpdate = true;

      // Spin — faster while she speaks.
      const spin = 0.0022 + smooth * 0.012;
      shell.rotation.y += spin;
      lattice.rotation.y -= spin * 0.7;
      lattice.rotation.x += spin * 0.25;
      rings.forEach((holder, i) => {
        holder.rotation.z += spin * (0.3 + i * 0.12);
      });
      electrons.forEach((e) => {
        e.angle += 0.012 * e.speed * (1 + smooth * 4);
        e.pivot.rotation.z = e.angle;
      });

      // The heavens drift, imperceptibly.
      stars.rotation.y += 0.00012;
      stars.rotation.x += 0.00003;

      // Core pulse + glow swell with the voice.
      const pulse = 1 + Math.sin(t * 3.1) * 0.02 + smooth * 0.35;
      core.scale.setScalar(pulse);
      glow.scale.setScalar(3.4 * (1 + smooth * 0.55));
      glowMaterial.opacity = 0.7 + smooth * 0.3;

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments) {
          obj.geometry.dispose();
        }
      });
      coreMaterial.dispose();
      glowMaterial.dispose();
      glowTexture.dispose();
      shellMaterial.dispose();
      latticeMaterial.dispose();
      ringMaterial.dispose();
      electronMaterial.dispose();
      starMaterial.dispose();
      nebulaViolet.dispose();
      nebulaTeal.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" aria-label="AI tutor quantum orb" />;
}
