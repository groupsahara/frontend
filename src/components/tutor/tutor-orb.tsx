"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import gsap from "gsap";

export type TutorPhase = "idle" | "listening" | "thinking" | "speaking";

interface TutorOrbProps {
  phase: TutorPhase;
  /**
   * Live speech amplitude 0..1 — the orb "boils" and glows with her voice,
   * sampled inside the render loop so it never re-renders React.
   */
  getLevel: () => number;
}

// Phase moods: core/rim colours + how energetic the shell is at rest.
const MOODS: Record<
  TutorPhase,
  { core: number; rim: number; shell: number; idle: number }
> = {
  idle: { core: 0x6c5ce7, rim: 0xb8aeff, shell: 0xb8c6ff, idle: 0.05 },
  listening: { core: 0xc98a1e, rim: 0xffd9a0, shell: 0xffe2a8, idle: 0.1 },
  thinking: { core: 0x4a3f9e, rim: 0x8f9fff, shell: 0x9aa8ff, idle: 0.14 },
  speaking: { core: 0x8b5cf6, rim: 0xe6dcff, shell: 0xd6ccff, idle: 0.08 },
};

/** Soft radial texture for glow sprites. */
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

/** Fresnel "energy sphere": deep centre, blazing rim, subtle moving bands. */
const CORE_VERTEX = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vView = normalize(-(viewMatrix * world).xyz);
    vPos = position;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;
const CORE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform vec3 uRim;
  uniform float uTime;
  uniform float uPulse;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec3 vPos;
  void main() {
    float fresnel = pow(1.0 - abs(dot(normalize(vNormal), normalize(vView))), 1.8);
    // Slow energy bands drifting over the surface.
    float bands = sin(vPos.y * 9.0 + uTime * 1.6) * sin(vPos.x * 7.0 - uTime * 1.1);
    float energy = 0.5 + 0.5 * bands;
    vec3 body = uColor * (0.35 + energy * 0.25 + uPulse * 0.5);
    vec3 color = mix(body, uRim, fresnel);
    float alpha = 0.6 + fresnel * 0.4;
    gl_FragColor = vec4(color, alpha);
  }
`;

/**
 * The tutor's presence and her whole universe in one Three.js canvas:
 * a fresnel-energy quantum orb (boiling particle shell, wireframe lattice,
 * electron rings) floating in front of a slowly turning spiral-galaxy dust
 * disk, layered starfields and nebula glows. Voice amplitude drives the
 * boil/glow/spin, the phase drives the colour mood, GSAP drives the intro
 * and the listening/speaking pulse ripples, and the camera follows the
 * pointer for parallax depth.
 */
export function TutorOrb({ phase, getLevel }: TutorOrbProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const phaseRef = useRef(phase);
  const levelFnRef = useRef(getLevel);
  const pulseRef = useRef<((color: number) => void) | null>(null);
  useEffect(() => {
    phaseRef.current = phase;
    levelFnRef.current = getLevel;
  }, [phase, getLevel]);

  // Phase transitions fire a visible ripple from the orb.
  useEffect(() => {
    if (phase === "speaking") pulseRef.current?.(MOODS.speaking.rim);
    else if (phase === "listening") pulseRef.current?.(MOODS.listening.rim);
  }, [phase]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    // Pin the canvas to its container — setSize(w, h, false) only sizes the
    // drawing buffer, and an unstyled canvas would display at buffer size.
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    camera.position.set(0, 0, 8);

    // Exact centre stage, a touch high so the controls don't crowd her.
    const ORB_Y = 0.15;
    const orb = new THREE.Group();
    orb.position.y = ORB_Y;
    scene.add(orb);

    // --- fresnel energy core ---------------------------------------------
    const coreUniforms = {
      uColor: { value: new THREE.Color(MOODS.idle.core) },
      uRim: { value: new THREE.Color(MOODS.idle.rim) },
      uTime: { value: 0 },
      uPulse: { value: 0 },
    };
    const coreMaterial = new THREE.ShaderMaterial({
      vertexShader: CORE_VERTEX,
      fragmentShader: CORE_FRAGMENT,
      uniforms: coreUniforms,
      transparent: true,
      depthWrite: false,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.72, 64, 64), coreMaterial);
    orb.add(core);

    const glowTexture = makeGlowTexture();
    const glowMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMaterial);
    glow.scale.setScalar(3.6);
    orb.add(glow);

    // --- boiling particle shell ------------------------------------------
    const COUNT = 3200;
    const SHELL_R = 1.55;
    const base = new Float32Array(COUNT * 3);
    const seed = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
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
      opacity: 0.28,
    });
    const lattice = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(1.16, 1)),
      latticeMaterial,
    );
    orb.add(lattice);

    // --- electron rings ---------------------------------------------------
    const rings: THREE.Group[] = [];
    const electrons: { pivot: THREE.Group; speed: number; angle: number }[] = [];
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
      electrons.push({ pivot, speed: 0.5 + i * 0.23, angle: i * 2.1 });
    }

    // --- pulse ripple (GSAP-driven on phase changes) ----------------------
    const rippleMaterial = new THREE.MeshBasicMaterial({
      color: 0xd6ccff,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ripple = new THREE.Mesh(new THREE.RingGeometry(1.66, 1.74, 96), rippleMaterial);
    orb.add(ripple);
    pulseRef.current = (color: number) => {
      rippleMaterial.color.set(color);
      gsap.killTweensOf([ripple.scale, rippleMaterial]);
      ripple.scale.setScalar(0.85);
      rippleMaterial.opacity = 0.55;
      gsap.to(ripple.scale, { x: 2.7, y: 2.7, z: 2.7, duration: 1.1, ease: "power2.out" });
      gsap.to(rippleMaterial, { opacity: 0, duration: 1.1, ease: "power2.out" });
    };

    // --- spiral galaxy dust disk (fills the deep background) --------------
    const DISK_COUNT = 4200;
    const diskPositions = new Float32Array(DISK_COUNT * 3);
    const diskColors = new Float32Array(DISK_COUNT * 3);
    const inner = new THREE.Color(0xcfc4ff);
    const outer = new THREE.Color(0x44549e);
    const tmp = new THREE.Color();
    for (let i = 0; i < DISK_COUNT; i++) {
      const arm = i % 3;
      const radius = 4.5 + Math.pow(Math.random(), 0.65) * 21;
      const spread = Math.max(0.22, 0.85 - radius * 0.02);
      const angle =
        arm * ((Math.PI * 2) / 3) + radius * 0.26 + (Math.random() - 0.5) * spread * 2;
      diskPositions[i * 3] = Math.cos(angle) * radius;
      diskPositions[i * 3 + 1] = (Math.random() - 0.5) * (0.3 + radius * 0.045);
      diskPositions[i * 3 + 2] = Math.sin(angle) * radius;
      tmp.copy(inner).lerp(outer, Math.min(1, radius / 24));
      const brightness = 0.5 + Math.random() * 0.5;
      diskColors[i * 3] = tmp.r * brightness;
      diskColors[i * 3 + 1] = tmp.g * brightness;
      diskColors[i * 3 + 2] = tmp.b * brightness;
    }
    const diskGeometry = new THREE.BufferGeometry();
    diskGeometry.setAttribute("position", new THREE.BufferAttribute(diskPositions, 3));
    diskGeometry.setAttribute("color", new THREE.BufferAttribute(diskColors, 3));
    const diskMaterial = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const disk = new THREE.Points(diskGeometry, diskMaterial);
    const diskTilt = new THREE.Group();
    diskTilt.rotation.set(1.02, 0, -0.18);
    diskTilt.position.set(0, -2.2, -14);
    diskTilt.add(disk);
    scene.add(diskTilt);

    // --- layered starfields ----------------------------------------------
    const makeStars = (count: number, size: number, opacity: number, near: boolean) => {
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const u = Math.random() * 2 - 1;
        const t = Math.random() * Math.PI * 2;
        const r = Math.sqrt(1 - u * u);
        const dist = (near ? 10 : 22) + Math.random() * (near ? 14 : 40);
        positions[i * 3] = r * Math.cos(t) * dist;
        positions[i * 3 + 1] = u * dist;
        positions[i * 3 + 2] = r * Math.sin(t) * dist - 8;
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      const material = new THREE.PointsMaterial({
        color: 0xdfe4ff,
        size,
        transparent: true,
        opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const points = new THREE.Points(geometry, material);
      scene.add(points);
      return { points, material };
    };
    const farStars = makeStars(1700, 0.07, 0.8, false);
    const nearStars = makeStars(350, 0.16, 0.35, true);

    const nebulaViolet = new THREE.SpriteMaterial({
      map: glowTexture,
      color: 0x5a48c8,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const nebulaTeal = nebulaViolet.clone();
    nebulaTeal.color = new THREE.Color(0x2fa8a8);
    nebulaTeal.opacity = 0.09;
    const nebula1 = new THREE.Sprite(nebulaViolet);
    nebula1.position.set(-11, 6, -20);
    nebula1.scale.setScalar(30);
    const nebula2 = new THREE.Sprite(nebulaTeal);
    nebula2.position.set(12, -5, -24);
    nebula2.scale.setScalar(34);
    scene.add(nebula1, nebula2);

    // --- pointer parallax -------------------------------------------------
    const pointer = { x: 0, y: 0 };
    const onPointerMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onPointerMove);

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

    // --- GSAP intro: she blooms into existence ----------------------------
    orb.scale.setScalar(0.001);
    const tweens = [
      gsap.to(orb.scale, { x: 1, y: 1, z: 1, duration: 1.6, ease: "elastic.out(1, 0.5)", delay: 0.15 }),
      gsap.fromTo(camera.position, { z: 14 }, { z: 8, duration: 1.9, ease: "power3.out" }),
      gsap.fromTo(diskMaterial, { opacity: 0 }, { opacity: 0.75, duration: 2.2, ease: "power2.out" }),
      gsap.fromTo(
        [farStars.material, nearStars.material],
        { opacity: 0 },
        { opacity: (i: number) => (i === 0 ? 0.8 : 0.35), duration: 2.4, ease: "power2.out" },
      ),
    ];

    // --- render loop ------------------------------------------------------
    const coreColor = new THREE.Color(MOODS.idle.core);
    const rimColor = new THREE.Color(MOODS.idle.rim);
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
      rimColor.lerp(new THREE.Color(mood.rim), 0.06);
      shellColor.lerp(new THREE.Color(mood.shell), 0.06);
      coreUniforms.uColor.value.copy(coreColor);
      coreUniforms.uRim.value.copy(rimColor);
      coreUniforms.uTime.value = t;
      coreUniforms.uPulse.value = smooth;
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

      // Core pulse + glow swell with the voice; gentle idle float.
      core.scale.setScalar(1 + Math.sin(t * 3.1) * 0.02 + smooth * 0.3);
      glow.scale.setScalar(3.6 * (1 + smooth * 0.55));
      glowMaterial.opacity = 0.65 + smooth * 0.35;
      orb.position.y = ORB_Y + Math.sin(t * 0.8) * 0.08;

      // The heavens drift; the galaxy turns.
      disk.rotation.y += 0.00045;
      farStars.points.rotation.y += 0.00012;
      nearStars.points.rotation.y -= 0.00008;

      // Pointer parallax — the camera leans with the mouse.
      camera.position.x += (pointer.x * 0.7 - camera.position.x) * 0.04;
      camera.position.y += (-pointer.y * 0.45 - camera.position.y) * 0.04;
      camera.lookAt(0, ORB_Y, 0);

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      pulseRef.current = null;
      tweens.forEach((tween) => tween.kill());
      gsap.killTweensOf([ripple.scale, rippleMaterial]);
      scene.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh ||
          obj instanceof THREE.Points ||
          obj instanceof THREE.LineSegments
        ) {
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
      rippleMaterial.dispose();
      diskMaterial.dispose();
      farStars.material.dispose();
      nearStars.material.dispose();
      nebulaViolet.dispose();
      nebulaTeal.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="h-full w-full" aria-label="AI tutor quantum orb" />;
}
