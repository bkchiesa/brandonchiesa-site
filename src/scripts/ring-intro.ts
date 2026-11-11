/**
 * Original opening for brandonchiesa.com: a photoreal gold wedding band
 * engraved "BRANDON CHIESA". Not a copy of any film, font, or site.
 *
 * Environment map: "Studio Small 08" from Poly Haven
 * https://polyhaven.com/a/studio_small_08
 * License: CC0 1.0 (https://creativecommons.org/publicdomain/zero/1.0/)
 */

import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export const RING_SESSION_KEY = "bc-ring-entered";
export const RING_ENTERED_EVENT = "bc:ring-entered";

const HDRI_URL = `${import.meta.env.BASE_URL}intro/studio_small_08_1k.hdr`;

/** Flat inner wall, gently domed outer. Width is noticeably larger than thickness. */
const INNER_RADIUS = 0.98;
const BAND_WIDTH = 0.52;
const BAND_THICKNESS = 0.2;
const INNER_FILLET = 0.042;
const OUTER_RADIUS = INNER_RADIUS + BAND_THICKNESS;
const RING_RADIUS = OUTER_RADIUS;
const LATHE_SEGMENTS = 320;

type Vec2 = { x: number; y: number };

type FpsStats = { samples: number; avg: number; min: number; max: number };

type RingIntroAPI = {
  pause: () => void;
  resume: () => void;
  step: (dt: number) => void;
  enter: () => void;
  getCanvas: () => HTMLCanvasElement;
  getFps: () => FpsStats;
  resetFps: () => void;
  beginDemo: () => void;
  setCameraDistance: (z: number) => void;
  setEuler: (x: number, y: number, z: number) => void;
  freeze: () => void;
  setOverlayOpacity: (value: number) => void;
  ready: Promise<void>;
  isReady: () => boolean;
};

export function bootRingIntro() {
  const root = document.querySelector<HTMLElement>("[data-ring-intro]");
  if (!root) return;

  if (document.documentElement.dataset.ringIntro !== "active") {
    root.hidden = true;
    return;
  }

  const canvas = root.querySelector<HTMLCanvasElement>("[data-ring-canvas]");
  const fallback = root.querySelector<HTMLElement>("[data-ring-fallback]");
  const enterBtn = root.querySelector<HTMLButtonElement>("[data-ring-enter]");
  const hint = root.querySelector<HTMLElement>("[data-ring-hint]");

  const reduce = () =>
    document.documentElement.dataset.reduceMotion === "true" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let entered = false;
  let raf = 0;
  let looping = true;
  let renderer: THREE.WebGLRenderer | null = null;
  let beautyComposer: EffectComposer | null = null;
  let bloomComposer: EffectComposer | null = null;
  let envTexture: THREE.Texture | null = null;
  let inscription: THREE.Texture | null = null;
  let disposed = false;
  let virtualTime: number | null = null;
  let readyResolve: () => void = () => {};
  let isReady = false;
  const ready = new Promise<void>((resolve) => {
    readyResolve = resolve;
  });

  const fps = { samples: 0, total: 0, min: 1000, max: 0, last: 0, windowStart: 0, windowCount: 0 };

  function currentTime() {
    return virtualTime ?? performance.now();
  }

  function enter() {
    if (entered) return;
    entered = true;
    try {
      sessionStorage.setItem(RING_SESSION_KEY, "1");
    } catch {
      /* private mode */
    }
    document.documentElement.dataset.ringIntro = "leaving";
    const theme = document.querySelector('meta[name="theme-color"]');
    if (theme) theme.setAttribute("content", "#3d4a38");
    root.classList.add("is-leaving");
    document.dispatchEvent(new CustomEvent(RING_ENTERED_EVENT));
    const delay = reduce() ? 80 : 700;
    window.setTimeout(() => {
      document.documentElement.dataset.ringIntro = "done";
      root.hidden = true;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => dispose());
      });
    }, delay);
  }

  enterBtn?.addEventListener("click", (event) => {
    event.preventDefault();
    enter();
  });

  const onKey = (event: KeyboardEvent) => {
    if (entered) return;
    if (event.key === "Enter" || event.key === "Escape") {
      event.preventDefault();
      enter();
    }
  };
  window.addEventListener("keydown", onKey);

  const skip = document.querySelector<HTMLAnchorElement>("a.skip-link");
  const onSkip = (event: Event) => {
    if (entered) return;
    event.preventDefault();
    enter();
    window.setTimeout(() => {
      document.getElementById("main")?.focus?.();
      document.getElementById("main")?.scrollIntoView?.({ block: "start" });
    }, reduce() ? 100 : 720);
  };
  skip?.addEventListener("click", onSkip);

  function showFallback() {
    if (canvas) canvas.hidden = true;
    if (fallback) fallback.hidden = false;
    if (hint) hint.textContent = "A gold ring engraved Brandon Chiesa";
  }

  function hasWebGL() {
    try {
      const probe = document.createElement("canvas");
      return Boolean(probe.getContext("webgl2") || probe.getContext("webgl"));
    } catch {
      return false;
    }
  }

  const cleanups: Array<() => void> = [];

  function dispose() {
    if (disposed) return;
    disposed = true;
    looping = false;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey);
    skip?.removeEventListener("click", onSkip);
    for (const fn of cleanups) fn();
    renderer?.dispose();
    beautyComposer?.dispose();
    bloomComposer?.dispose();
    envTexture?.dispose();
    inscription?.dispose();
    renderer = null;
    beautyComposer = null;
    bloomComposer = null;
    if (window.__ringIntro) delete window.__ringIntro;
  }

  if (!canvas || !hasWebGL()) {
    showFallback();
    return;
  }

  try {
    startWebGL(canvas);
  } catch (err) {
    console.warn("Ring intro: WebGL failed, using the static ring.", err);
    showFallback();
  }

  function startWebGL(target: HTMLCanvasElement) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);

    const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 80);
    camera.position.set(0, 0, 10);
    camera.lookAt(0, 0, 0);

    const gl = new THREE.WebGLRenderer({
      canvas: target,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
      stencil: false,
    });
    renderer = gl;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.0;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.setClearColor(0x000000, 1);
    gl.autoClear = true;

    const isPhone =
      /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
      (window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 800);

    const useBloom = !reduce() && !isPhone;

    const maps = makeInscriptionMaps();
    inscription = maps.color;

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xd6b45a,
      metalness: 1,
      roughness: 0.14,
      clearcoat: 0.12,
      clearcoatRoughness: 0.35,
      envMapIntensity: 1.12,
      ior: 1.5,
      bumpMap: maps.bump,
      bumpScale: 0.045,
      roughnessMap: maps.roughness,
      metalnessMap: maps.metalness,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 1.05,
      emissiveMap: maps.emissive,
      map: maps.color,
    });

    const geometry = makeWeddingBandGeometry();
    const ring = new THREE.Mesh(geometry, material);
    const glowMat = new THREE.MeshBasicMaterial({
      map: maps.glow,
      color: 0xffffff,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(geometry, glowMat);
    glow.visible = useBloom;

    const physics = new THREE.Group();
    const squashPivot = new THREE.Group();
    scene.add(physics);
    physics.add(squashPivot);
    squashPivot.add(ring);
    if (useBloom) squashPivot.add(glow);

    const bloomRing = useBloom ? glow : null;

    const pos: Vec2 = { x: 0, y: 0 };
    const vel: Vec2 = { x: 0, y: 0 };
    const angVel = new THREE.Vector3(0, reduce() ? 0 : 0.32, 0);
    // Start tilted so the flat inner wall is visible and the front inscription faces the camera.
    const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.18, 0.32, 0.04, "XYZ"));
    const displayQuat = quat.clone();

    const squash = { amount: 0, target: 0, vel: 0, nx: 1, ny: 0 };

    let bounds = { halfW: 2, halfH: 2 };
    let held = false;
    let moved = false;
    let pointerId = -1;
    let grabOff: Vec2 = { x: 0, y: 0 };
    let lastPointer: Vec2 = { x: 0, y: 0 };
    let lastPointerT = 0;
    const prevArc = new THREE.Vector3();
    const samples: { t: number; x: number; y: number; ax: number; ay: number; az: number }[] = [];

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const worldPtr = new THREE.Vector3();
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const tmpQ = new THREE.Quaternion();
    const tmpAxis = new THREE.Vector3();

    let demoActive = false;
    let demoT = 0;
    let demoFlicked = false;
    let demoEntered = false;

    function resetPhysics() {
      pos.x = 0;
      pos.y = 0;
      vel.x = 0;
      vel.y = 0;
      angVel.set(0, reduce() ? 0 : 0.32, 0);
      quat.setFromEuler(new THREE.Euler(-1.18, 0.32, 0.04, "XYZ"));
      displayQuat.copy(quat);
      squash.amount = 0;
      squash.target = 0;
      squash.vel = 0;
      held = false;
      moved = false;
      demoFlicked = false;
      demoEntered = false;
      demoT = 0;
    }

    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.34, 0.42, 0.22);
    if (useBloom) {
      const bloomRt = new THREE.WebGLRenderTarget(1, 1, {
        type: THREE.HalfFloatType,
        format: THREE.RGBAFormat,
      });
      bloomComposer = new EffectComposer(gl, bloomRt);
      bloomComposer.renderToScreen = false;
      bloomComposer.addPass(new RenderPass(scene, camera));
      bloomComposer.addPass(bloomPass);

      const composite = new ShaderPass({
        uniforms: {
          tDiffuse: { value: null },
          tBloom: { value: null },
        },
        vertexShader: `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform sampler2D tBloom;
          varying vec2 vUv;
          void main() {
            vec3 color = texture2D(tDiffuse, vUv).rgb;
            vec3 bloom = texture2D(tBloom, vUv).rgb;
            gl_FragColor = vec4(color + bloom, 1.0);
          }
        `,
      });
      beautyComposer = new EffectComposer(gl);
      const beautyPass = new RenderPass(scene, camera);
      beautyPass.clear = true;
      beautyComposer.addPass(beautyPass);
      beautyComposer.addPass(composite);
      beautyComposer.addPass(new OutputPass());
      composite.uniforms.tBloom.value = bloomComposer.readBuffer.texture;
    }

    function fit() {
      const w = Math.max(1, target.clientWidth || window.innerWidth);
      const h = Math.max(1, target.clientHeight || window.innerHeight);
      const dpr = Math.min(isPhone ? 1.75 : 2, window.devicePixelRatio || 1);
      gl.setPixelRatio(dpr);
      gl.setSize(w, h, false);
      camera.aspect = w / h;
      const fov = (camera.fov * Math.PI) / 180;
      const fraction = w < 520 ? 0.50 : 0.46;
      camera.position.z = RING_RADIUS / (fraction * Math.tan(fov / 2));
      camera.updateProjectionMatrix();
      const halfH = Math.tan(fov / 2) * camera.position.z;
      const halfW = halfH * camera.aspect;
      bounds = { halfW, halfH };
      if (beautyComposer) beautyComposer.setSize(w, h);
      if (bloomComposer) {
        bloomComposer.setSize(w, h);
        bloomPass.setSize(w, h);
      }
    }

    function pointerToWorld(cx: number, cy: number, out: THREE.Vector3) {
      const w = target.clientWidth || 1;
      const h = target.clientHeight || 1;
      const x = (cx / w) * 2 - 1;
      const y = -(cy / h) * 2 + 1;
      tmpA.set(x, y, 0.5).unproject(camera);
      tmpA.sub(camera.position).normalize();
      const t = -camera.position.z / tmpA.z;
      out.copy(camera.position).addScaledVector(tmpA, t);
    }

    function arcballVec(cx: number, cy: number, out: THREE.Vector3) {
      const rect = target.getBoundingClientRect();
      const px = THREE.MathUtils.mapLinear(pos.x, -bounds.halfW, bounds.halfW, 0, rect.width);
      const py = THREE.MathUtils.mapLinear(pos.y, -bounds.halfH, bounds.halfH, rect.height, 0);
      const radius = Math.min(rect.width, rect.height) * 0.38;
      const x = (cx - rect.left - px) / radius;
      const y = (py - (cy - rect.top)) / radius;
      const l2 = x * x + y * y;
      if (l2 <= 1) out.set(x, y, Math.sqrt(1 - l2));
      else {
        const inv = 1 / Math.sqrt(l2);
        out.set(x * inv, y * inv, 0);
      }
      out.normalize();
      return out;
    }

    function hitTest(cx: number, cy: number) {
      const w = target.clientWidth || 1;
      const h = target.clientHeight || 1;
      ndc.set((cx / w) * 2 - 1, -(cy / h) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.intersectObject(ring, false).length > 0) return true;
      pointerToWorld(cx, cy, worldPtr);
      const dx = worldPtr.x - pos.x;
      const dy = worldPtr.y - pos.y;
      return Math.hypot(dx, dy) <= RING_RADIUS * 1.25;
    }

    function layoutFree() {
      physics.position.set(pos.x, pos.y, 0);
      const a = squash.amount;
      if (a < 1e-4) {
        squashPivot.rotation.set(0, 0, 0);
        squashPivot.scale.set(1, 1, 1);
        ring.quaternion.copy(displayQuat);
        if (bloomRing) bloomRing.quaternion.copy(displayQuat);
        return;
      }
      const angle = Math.atan2(squash.ny, squash.nx);
      const sx = 1 - a * 0.55;
      const peri = 1 / Math.sqrt(Math.max(0.45, sx));
      squashPivot.rotation.set(0, 0, angle);
      squashPivot.scale.set(sx, peri, peri);
      tmpQ.setFromAxisAngle(tmpAxis.set(0, 0, 1), angle).invert();
      ring.quaternion.copy(tmpQ).multiply(displayQuat);
      if (bloomRing) bloomRing.quaternion.copy(ring.quaternion);
    }

    function clampAndSmoosh(heldNow: boolean) {
      const marginX = bounds.halfW - RING_RADIUS;
      const marginY = bounds.halfH - RING_RADIUS;
      const maxX = Math.max(0.05, marginX);
      const maxY = Math.max(0.05, marginY);
      let hitX = 0;
      let hitY = 0;
      if (pos.x > maxX) {
        hitX = pos.x - maxX;
        pos.x = maxX;
      } else if (pos.x < -maxX) {
        hitX = pos.x + maxX;
        pos.x = -maxX;
      }
      if (pos.y > maxY) {
        hitY = pos.y - maxY;
        pos.y = maxY;
      } else if (pos.y < -maxY) {
        hitY = pos.y + maxY;
        pos.y = -maxY;
      }
      if (hitX !== 0 || hitY !== 0) {
        const depth = Math.hypot(hitX, hitY);
        squash.nx = hitX !== 0 ? Math.sign(hitX) : 0;
        squash.ny = hitY !== 0 ? Math.sign(hitY) : 0;
        const len = Math.hypot(squash.nx, squash.ny) || 1;
        squash.nx /= len;
        squash.ny /= len;
        if (heldNow) {
          squash.target = THREE.MathUtils.clamp(depth / (RING_RADIUS * 0.7), 0, 0.7);
        } else {
          const impact = Math.abs(hitX ? vel.x : 0) + Math.abs(hitY ? vel.y : 0);
          squash.target = THREE.MathUtils.clamp(0.18 + impact * 0.18, 0.18, 0.68);
          squash.vel += impact * 1.4;
          if (hitX !== 0) vel.x *= -0.72;
          if (hitY !== 0) vel.y *= -0.72;
        }
      } else {
        squash.target = 0;
      }
    }

    function applyArcball(cx: number, cy: number, dt: number) {
      arcballVec(cx, cy, tmpB);
      if (prevArc.lengthSq() > 0 && tmpB.distanceToSquared(prevArc) > 1e-8) {
        tmpQ.setFromUnitVectors(prevArc, tmpB);
        quat.premultiply(tmpQ);
        const angle = 2 * Math.acos(Math.min(1, Math.abs(tmpQ.w)));
        if (angle > 1e-5) {
          tmpAxis.set(tmpQ.x, tmpQ.y, tmpQ.z);
          if (tmpAxis.lengthSq() > 1e-8) {
            tmpAxis.normalize();
            const ax = (tmpAxis.x * angle) / dt;
            const ay = (tmpAxis.y * angle) / dt;
            const az = (tmpAxis.z * angle) / dt;
            angVel.set(ax, ay, az);
            samples.push({ t: currentTime(), x: worldPtr.x, y: worldPtr.y, ax, ay, az });
            if (samples.length > 8) samples.shift();
          }
        }
      }
      prevArc.copy(tmpB);
    }

    function onDown(event: PointerEvent) {
      if (entered || demoActive) return;
      if (!hitTest(event.clientX, event.clientY)) return;
      held = true;
      moved = false;
      pointerId = event.pointerId;
      target.setPointerCapture?.(event.pointerId);
      target.classList.add("is-held");
      pointerToWorld(event.clientX, event.clientY, worldPtr);
      grabOff = { x: pos.x - worldPtr.x, y: pos.y - worldPtr.y };
      lastPointer = { x: event.clientX, y: event.clientY };
      lastPointerT = currentTime();
      samples.length = 0;
      vel.x = 0;
      vel.y = 0;
      arcballVec(event.clientX, event.clientY, prevArc);
      event.preventDefault();
    }

    function onMove(event: PointerEvent) {
      if (!held || demoActive || event.pointerId !== pointerId) return;
      const now = currentTime();
      const dt = Math.max(0.001, (now - lastPointerT) / 1000);
      pointerToWorld(event.clientX, event.clientY, worldPtr);
      const nx = worldPtr.x + grabOff.x;
      const ny = worldPtr.y + grabOff.y;
      const dxp = event.clientX - lastPointer.x;
      const dyp = event.clientY - lastPointer.y;
      if (Math.hypot(dxp, dyp) > 4) moved = true;
      pos.x = nx;
      pos.y = ny;
      applyArcball(event.clientX, event.clientY, dt);
      lastPointer = { x: event.clientX, y: event.clientY };
      lastPointerT = now;
      event.preventDefault();
    }

    function onUp(event: PointerEvent) {
      if (demoActive) return;
      if (!held || (pointerId !== -1 && event.pointerId !== pointerId)) return;
      held = false;
      target.classList.remove("is-held");
      try {
        target.releasePointerCapture?.(event.pointerId);
      } catch {
        /* already released */
      }
      const now = currentTime();
      pointerToWorld(event.clientX, event.clientY, worldPtr);
      const recent = samples.filter((s) => now - s.t < 120);
      if (recent.length >= 2) {
        const a = recent[0];
        const b = recent[recent.length - 1];
        const dt = Math.max(0.016, (b.t - a.t) / 1000);
        vel.x = (b.x - a.x) / dt;
        vel.y = (b.y - a.y) / dt;
        angVel.set(b.ax, b.ay, b.az);
      } else if (moved && lastPointerT) {
        const dt = Math.max(0.016, (now - lastPointerT) / 1000);
        pointerToWorld(lastPointer.x, lastPointer.y, tmpA);
        vel.x = (worldPtr.x - tmpA.x) / dt;
        vel.y = (worldPtr.y - tmpA.y) / dt;
      }
      const speed = Math.hypot(vel.x, vel.y);
      const maxSpeed = 18;
      if (speed > maxSpeed) {
        vel.x *= maxSpeed / speed;
        vel.y *= maxSpeed / speed;
      }
      if (!moved && !reduce()) {
        enter();
      }
      pointerId = -1;
    }

    target.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("resize", fit);
    cleanups.push(() => {
      target.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", fit);
      geometry.dispose();
      material.dispose();
      glowMat.dispose();
      maps.color.dispose();
      maps.bump.dispose();
      maps.roughness.dispose();
      maps.metalness.dispose();
      maps.emissive.dispose();
      maps.glow.dispose();
    });
    fit();

    const onLost = () => {
      showFallback();
      dispose();
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      onLost();
    };
    target.addEventListener("webglcontextlost", onContextLost);
    cleanups.push(() => target.removeEventListener("webglcontextlost", onContextLost));

    function applyDemo(t: number, dt: number) {
      const rect = target.getBoundingClientRect();
      const cx = (nx: number, ny: number) => {
        const px = THREE.MathUtils.mapLinear(nx, -bounds.halfW, bounds.halfW, 0, rect.width);
        const py = THREE.MathUtils.mapLinear(ny, -bounds.halfH, bounds.halfH, rect.height, 0);
        return { x: rect.left + px, y: rect.top + py };
      };

      if (t < 3.1) return;

      if (t < 6.2) {
        if (!held) {
          held = true;
          moved = true;
          vel.x = 0;
          vel.y = 0;
          pointerToWorld((cx(pos.x, pos.y).x), cx(pos.x, pos.y).y, worldPtr);
          grabOff = { x: 0, y: 0 };
          const p = cx(pos.x, pos.y);
          lastPointer = { x: p.x, y: p.y };
          lastPointerT = currentTime();
          samples.length = 0;
          arcballVec(p.x, p.y, prevArc);
        }
        const u = (t - 3.1) / (6.2 - 3.1);
        const ease = u * u * (3 - 2 * u);
        const tx = -0.35 + Math.sin(ease * Math.PI) * -0.55;
        const ty = 0.08 + Math.sin(ease * Math.PI * 1.2) * 0.22;
        pos.x = tx;
        pos.y = ty;
        const p = cx(pos.x + Math.sin(ease * Math.PI * 2) * 0.15, pos.y + Math.cos(ease * Math.PI) * 0.12);
        pointerToWorld(p.x, p.y, worldPtr);
        applyArcball(p.x, p.y, dt);
        lastPointer = { x: p.x, y: p.y };
        lastPointerT = currentTime();
        return;
      }

      if (!demoFlicked) {
        demoFlicked = true;
        held = false;
        target.classList.remove("is-held");
        vel.x = 13.5;
        vel.y = 0.9;
        angVel.set(2.1, 3.4, 1.15);
      }

    }

    // Bloom first (letters only), then beauty + add bloom + tonemap.
    function renderFrameOrdered() {
      if (useBloom && beautyComposer && bloomComposer && bloomRing) {
        const compositePass = beautyComposer.passes[1] as ShaderPass;
        ring.visible = false;
        bloomRing.visible = true;
        bloomComposer.render();
        compositePass.uniforms.tBloom.value = bloomComposer.readBuffer.texture;
        ring.visible = true;
        bloomRing.visible = false;
        beautyComposer.render();
      } else {
        gl.render(scene, camera);
      }
    }

    let last = currentTime();
    const tick = (now: number) => {
      if (disposed) return;
      const rawDt = (now - last) / 1000;
      const dt = Math.min(0.032, Math.max(0.001, rawDt || 1 / 60));
      last = now;

      if (!entered) {
        if (demoActive) {
          demoT += dt;
          applyDemo(demoT, dt);
        }

        if (!held) {
          pos.x += vel.x * dt;
          pos.y += vel.y * dt;
          const damp = reduce() ? 6 : 1.05;
          const decay = Math.exp(-damp * dt);
          vel.x *= decay;
          vel.y *= decay;
          const angle = angVel.length() * dt;
          if (angle > 1e-6) {
            tmpAxis.copy(angVel).normalize();
            tmpQ.setFromAxisAngle(tmpAxis, angle);
            quat.premultiply(tmpQ);
          }
          const angDamp = reduce() ? 8 : 0.55;
          angVel.multiplyScalar(Math.exp(-angDamp * dt));
          if (!reduce() && Math.hypot(vel.x, vel.y) < 0.12 && angVel.length() < 0.28) {
            angVel.y += (0.32 - angVel.y) * Math.min(1, dt * 1.6);
          }
        }

        clampAndSmoosh(held);

        const stiff = held ? 48 : 36;
        const sDamp = 8;
        const force = (squash.target - squash.amount) * stiff - squash.vel * sDamp;
        squash.vel += force * dt;
        squash.amount += squash.vel * dt;
        if (!held && squash.target === 0 && squash.amount < 0.002 && Math.abs(squash.vel) < 0.01) {
          squash.amount = 0;
          squash.vel = 0;
        }
        squash.amount = THREE.MathUtils.clamp(squash.amount, 0, 0.75);

        // Interpolate the visible pose toward the physics quaternion so drag stays fluid.
        const slerpRate = held ? 18 : 28;
        displayQuat.slerp(quat, 1 - Math.exp(-slerpRate * dt));
        if (!held && displayQuat.angleTo(quat) < 1e-4) displayQuat.copy(quat);

        layoutFree();
      }

      renderFrameOrdered();

      if (virtualTime === null) {
        const inst = rawDt > 1e-4 ? 1 / rawDt : 0;
        if (inst > 0 && inst < 1000) {
          fps.samples += 1;
          fps.total += inst;
          fps.min = Math.min(fps.min, inst);
          fps.max = Math.max(fps.max, inst);
          fps.last = inst;
          if (!fps.windowStart) fps.windowStart = now;
          fps.windowCount += 1;
          if (now - fps.windowStart >= 1000) {
            const windowFps = fps.windowCount / ((now - fps.windowStart) / 1000);
            console.log(
              `[ring-intro fps] window=${windowFps.toFixed(1)} avg=${(fps.total / fps.samples).toFixed(1)} min=${fps.min.toFixed(1)} max=${fps.max.toFixed(1)} n=${fps.samples}`,
            );
            fps.windowStart = now;
            fps.windowCount = 0;
          }
        }
      }

      if (looping && !disposed) raf = requestAnimationFrame(tick);
    };

    function loadEnv() {
      const loader = new RGBELoader();
      loader.load(
        HDRI_URL,
        (hdr) => {
          if (disposed) {
            hdr.dispose();
            return;
          }
          const pmrem = new THREE.PMREMGenerator(gl);
          const env = pmrem.fromEquirectangular(hdr);
          envTexture = env.texture;
          scene.environment = env.texture;
          material.envMap = env.texture;
          material.needsUpdate = true;
          hdr.dispose();
          pmrem.dispose();
          markReady();
        },
        undefined,
        () => {
          console.warn("Ring intro: HDRI did not load; using a simple studio light.");
          const light = new THREE.DirectionalLight(0xfff1d0, 2.2);
          light.position.set(3, 4, 6);
          scene.add(light);
          scene.add(new THREE.AmbientLight(0x2a2218, 0.6));
          markReady();
        },
      );
    }

    function applyMaps(next: ReturnType<typeof makeInscriptionMaps>) {
      material.map = next.color;
      material.bumpMap = next.bump;
      material.roughnessMap = next.roughness;
      material.metalnessMap = next.metalness;
      material.emissiveMap = next.emissive;
      material.needsUpdate = true;
      glowMat.map = next.glow;
      glowMat.needsUpdate = true;
      inscription?.dispose();
      maps.bump.dispose();
      maps.roughness.dispose();
      maps.metalness.dispose();
      maps.emissive.dispose();
      maps.glow.dispose();
      inscription = next.color;
      maps.color = next.color;
      maps.bump = next.bump;
      maps.roughness = next.roughness;
      maps.metalness = next.metalness;
      maps.emissive = next.emissive;
      maps.glow = next.glow;
    }

    let pendingReady = 2;
    function markReady() {
      pendingReady -= 1;
      if (pendingReady <= 0 && !isReady) {
        isReady = true;
        readyResolve();
      }
    }

    loadEnv();
    last = currentTime();
    raf = requestAnimationFrame(tick);
    document.fonts?.ready?.then(() => {
      if (disposed) return;
      applyMaps(makeInscriptionMaps());
      markReady();
    });
    window.setTimeout(() => {
      if (!isReady) {
        pendingReady = 0;
        markReady();
      }
    }, 2500);

    window.__ringIntro = {
      pause: () => {
        looping = false;
        cancelAnimationFrame(raf);
      },
      resume: () => {
        if (disposed) return;
        looping = true;
        virtualTime = null;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      },
      step: (dt: number) => {
        looping = false;
        cancelAnimationFrame(raf);
        const inc = Math.max(0, dt) * 1000;
        virtualTime = (virtualTime ?? last) + inc;
        tick(virtualTime);
      },
      enter,
      getCanvas: () => target,
      getFps: () => ({
        samples: fps.samples,
        avg: fps.samples ? fps.total / fps.samples : 0,
        min: fps.samples ? fps.min : 0,
        max: fps.max,
      }),
      resetFps: () => {
        fps.samples = 0;
        fps.total = 0;
        fps.min = 1000;
        fps.max = 0;
        fps.last = 0;
        fps.windowStart = 0;
        fps.windowCount = 0;
      },
      beginDemo: () => {
        resetPhysics();
        demoActive = true;
        demoT = 0;
      },
      setCameraDistance: (z: number) => {
        camera.position.z = z;
        camera.updateProjectionMatrix();
      },
      setEuler: (x: number, y: number, z: number) => {
        quat.setFromEuler(new THREE.Euler(x, y, z, "XYZ"));
        displayQuat.copy(quat);
        layoutFree();
      },
      freeze: () => {
        looping = false;
        cancelAnimationFrame(raf);
        angVel.set(0, 0, 0);
        vel.x = 0;
        vel.y = 0;
        displayQuat.copy(quat);
        layoutFree();
        renderFrameOrdered();
      },
      setOverlayOpacity: (value: number) => {
        root.style.transition = "none";
        root.style.opacity = String(THREE.MathUtils.clamp(value, 0, 1));
      },
      ready,
      isReady: () => isReady,
    };
  }
}

type ProfilePt = { x: number; y: number; v: number };

function makeWeddingBandGeometry() {
  const innerR = INNER_RADIUS;
  const halfW = BAND_WIDTH / 2;
  const fillet = INNER_FILLET;
  const apexX = OUTER_RADIUS;
  const cornerX = innerR + fillet;
  const pts: ProfilePt[] = [];

  const push = (x: number, y: number, v: number) => {
    const last = pts[pts.length - 1];
    if (last && Math.hypot(last.x - x, last.y - y) < 1e-6) {
      last.v = v;
      return;
    }
    pts.push({ x, y, v });
  };

  // Outer-surface V: band-width axis mapped so v=0.5 is the crown of the dome.
  const vFromY = (y: number) => {
    const t = THREE.MathUtils.clamp((y + halfW) / (2 * halfW), 0, 1);
    return t;
  };

  // Bottom inner fillet, starting on the inner wall.
  const fcx = innerR + fillet;
  const fcy = -halfW + fillet;
  const filletSteps = 16;
  for (let i = 0; i <= filletSteps; i++) {
    const a = Math.PI + (Math.PI * 0.5 * i) / filletSteps;
    push(fcx + fillet * Math.cos(a), fcy + fillet * Math.sin(a), 0);
  }

  // Elliptical outer dome with horizontal tangents at the shoulders (D-shape).
  const rx = apexX - cornerX;
  const ry = halfW;
  const outerSteps = 64;
  for (let i = 0; i <= outerSteps; i++) {
    const a = -Math.PI / 2 + (Math.PI * i) / outerSteps;
    const x = cornerX + rx * Math.cos(a);
    const y = ry * Math.sin(a);
    push(x, y, vFromY(y));
  }

  // Top inner fillet.
  const fcy2 = halfW - fillet;
  for (let i = 0; i <= filletSteps; i++) {
    const a = Math.PI * 0.5 + (Math.PI * 0.5 * i) / filletSteps;
    push(fcx + fillet * Math.cos(a), fcy2 + fillet * Math.sin(a), 0);
  }

  // Flat inner cylinder wall, top to bottom.
  const innerSteps = 20;
  for (let i = 1; i <= innerSteps; i++) {
    const t = i / innerSteps;
    const y = (halfW - fillet) * (1 - t) + (-halfW + fillet) * t;
    push(innerR, y, 0);
  }

  const vectors = pts.map((p) => new THREE.Vector2(p.x, p.y));
  let geometry = new THREE.LatheGeometry(vectors, LATHE_SEGMENTS, 0, Math.PI * 2);
  geometry.rotateX(Math.PI / 2);

  const profileCount = pts.length;
  const segs = LATHE_SEGMENTS;
  const uv = geometry.attributes.uv;
  const nor = geometry.attributes.normal;
  // rows = segs+1, cols = profileCount. After rotateX, the attribute order is unchanged.
  for (let j = 0; j <= segs; j++) {
    const u = j / segs;
    for (let i = 0; i < profileCount; i++) {
      const idx = j * profileCount + i;
      uv.setXY(idx, u, pts[i].v);
    }
  }
  uv.needsUpdate = true;

  // Average normals across the UV seam so lighting does not crease.
  for (let i = 0; i < profileCount; i++) {
    const a = i;
    const b = segs * profileCount + i;
    const nx = (nor.getX(a) + nor.getX(b)) * 0.5;
    const ny = (nor.getY(a) + nor.getY(b)) * 0.5;
    const nz = (nor.getZ(a) + nor.getZ(b)) * 0.5;
    const len = Math.hypot(nx, ny, nz) || 1;
    nor.setXYZ(a, nx / len, ny / len, nz / len);
    nor.setXYZ(b, nx / len, ny / len, nz / len);
  }
  nor.needsUpdate = true;

  geometry = mergeVertices(geometry, 1e-6);
  // mergeVertices can weld the UV seam and break the inscription wrap; rebuild a non-welded
  // copy of UVs is risky. Skip welding the seam: only merge identical vertices with same UVs.
  // The 1e-6 merge will not weld u=0 to u=1, so the seam stays, with averaged normals already set.
  geometry.computeVertexNormals();
  // Re-apply seam-averaged normals after computeVertexNormals, which splits them again.
  // After mergeVertices the index layout may change, so walk by position + u extremeness.
  {
    const pos = geometry.attributes.position;
    const nrm = geometry.attributes.normal;
    const uvs = geometry.attributes.uv;
    const buckets = new Map<string, number[]>();
    for (let i = 0; i < pos.count; i++) {
      const key = `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
      let arr = buckets.get(key);
      if (!arr) {
        arr = [];
        buckets.set(key, arr);
      }
      arr.push(i);
    }
    for (const ids of buckets.values()) {
      if (ids.length < 2) continue;
      let nx = 0;
      let ny = 0;
      let nz = 0;
      for (const i of ids) {
        nx += nrm.getX(i);
        ny += nrm.getY(i);
        nz += nrm.getZ(i);
      }
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len;
      ny /= len;
      nz /= len;
      for (const i of ids) nrm.setXYZ(i, nx, ny, nz);
    }
    nrm.needsUpdate = true;
    // Keep UVs as-is (u=0 and u=1 stay distinct on the seam).
    void uvs;
  }

  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();
  return geometry;
}

function makeInscriptionMaps() {
  const w = 4096;
  const h = 512;
  const color = document.createElement("canvas");
  const bump = document.createElement("canvas");
  const rough = document.createElement("canvas");
  const metal = document.createElement("canvas");
  const emit = document.createElement("canvas");
  const glow = document.createElement("canvas");
  for (const c of [color, bump, rough, metal, emit, glow]) {
    c.width = w;
    c.height = h;
  }
  const fillGold = color.getContext("2d")!;
  const fillBump = bump.getContext("2d")!;
  const fillRough = rough.getContext("2d")!;
  const fillMetal = metal.getContext("2d")!;
  const fillEmit = emit.getContext("2d")!;
  const fillGlow = glow.getContext("2d")!;

  fillGold.fillStyle = "#d6b45a";
  fillGold.fillRect(0, 0, w, h);
  fillBump.fillStyle = "#808080";
  fillBump.fillRect(0, 0, w, h);
  fillRough.fillStyle = "#242424";
  fillRough.fillRect(0, 0, w, h);
  fillMetal.fillStyle = "#ffffff";
  fillMetal.fillRect(0, 0, w, h);
  fillEmit.fillStyle = "#000000";
  fillEmit.fillRect(0, 0, w, h);
  fillGlow.clearRect(0, 0, w, h);
  fillGlow.fillStyle = "#000000";
  fillGlow.fillRect(0, 0, w, h);

  const phrase = "BRANDON CHIESA";
  const fontSize = 128;
  const tracking = fontSize * 0.07;
  const font = `600 ${fontSize}px "Cormorant Garamond", "Palatino Linotype", Palatino, Georgia, serif`;

  function prep(ctx: CanvasRenderingContext2D) {
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "0px";
  }

  function measureSpaced(ctx: CanvasRenderingContext2D, text: string, gap: number) {
    prep(ctx);
    let total = 0;
    for (let i = 0; i < text.length; i++) {
      total += ctx.measureText(text[i]).width;
      if (i < text.length - 1) total += gap;
    }
    return total;
  }

  function drawSpaced(
    ctx: CanvasRenderingContext2D,
    text: string,
    startX: number,
    y: number,
    gap: number,
    strokeWidth: number,
  ) {
    prep(ctx);
    let x = startX;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const wrapped = ((x % w) + w) % w;
      if (strokeWidth > 0) ctx.strokeText(ch, wrapped, y);
      ctx.fillText(ch, wrapped, y);
      x += ctx.measureText(ch).width + gap;
    }
  }

  prep(fillGold);
  const nameWidth = measureSpaced(fillGold, phrase, tracking);
  // Draw the name away from the texture seam (u=0). A 0.5 wrap offset
  // on the maps then places this at the camera-facing bottom of the band.
  const nameCenter = w * 0.5;
  const nameX = nameCenter - nameWidth / 2;
  const midY = h * 0.5;

  const ornaments = layoutOrnaments(w, nameX, nameWidth, fillGold);

  function drawGlyphs(ctx: CanvasRenderingContext2D, fill: string, width: number, blur = 0) {
    ctx.save();
    prep(ctx);
    if (blur) ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = fill;
    ctx.lineJoin = "round";
    ctx.miterLimit = 2;
    if (width > 0) {
      ctx.strokeStyle = fill;
      ctx.lineWidth = width;
    }
    drawSpaced(ctx, phrase, nameX, midY, tracking, width);
    for (const o of ornaments) {
      ctx.font = o.font;
      const x = ((o.x % w) + w) % w;
      if (width > 0) ctx.strokeText(o.ch, x, midY);
      ctx.fillText(o.ch, x, midY);
    }
    ctx.restore();
  }

  // Engraved trough in the metal, with bright yellow-gold light in the letters.
  drawGlyphs(fillGold, "#f4d56a", 1.2);
  drawGlyphs(fillBump, "#2a2a2a", 2.2);
  drawGlyphs(fillRough, "#6a6a6a", 1.4);
  drawGlyphs(fillMetal, "#c8c8c8", 1.2);
  drawGlyphs(fillEmit, "#000000", 0);
  drawGlyphs(fillEmit, "#114400", 10, 8);
  drawGlyphs(fillEmit, "#886600", 6, 4);
  drawGlyphs(fillEmit, "#ffe566", 1.5, 1);
  drawGlyphs(fillEmit, "#fff1a0", 0, 0);

  drawGlyphs(fillGlow, "#3a2800", 10, 8);
  drawGlyphs(fillGlow, "#c49a18", 5, 4);
  drawGlyphs(fillGlow, "#ffe566", 2, 1.5);
  drawGlyphs(fillGlow, "#fff4b0", 0, 0);

  function tex(canvas: HTMLCanvasElement, srgb = false, unwrap = true) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    t.needsUpdate = true;
    t.generateMipmaps = true;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.magFilter = THREE.LinearFilter;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.offset.x = 0.5;
    t.needsUpdate = true;
    return t;
  }

  return {
    color: tex(color, true),
    bump: tex(bump),
    roughness: tex(rough),
    metalness: tex(metal),
    emissive: tex(emit, true),
    glow: tex(glow, true),
  };
}

function layoutOrnaments(
  width: number,
  nameX: number,
  nameWidth: number,
  ctx: CanvasRenderingContext2D,
) {
  const pad = 90;
  const start = nameX + nameWidth + pad;
  const end = nameX + width - pad;
  const span = end - start;
  const marks = ["·", "◆", "·", "·", "◆", "·"];
  const fontFor = (ch: string) =>
    ch === "◆"
      ? '500 52px "Cormorant Garamond", "Palatino Linotype", Palatino, Georgia, serif'
      : '500 64px "Cormorant Garamond", "Palatino Linotype", Palatino, Georgia, serif';
  const items: { ch: string; x: number; font: string }[] = [];
  const count = 8;
  const step = span / count;
  for (let i = 0; i < count; i++) {
    const ch = marks[i % marks.length];
    const font = fontFor(ch);
    ctx.save();
    ctx.font = font;
    ctx.letterSpacing = "0px";
    const cw = ctx.measureText(ch).width;
    ctx.restore();
    items.push({ ch, x: start + step * (i + 0.5) - cw / 2, font });
  }
  return items;
}

declare global {
  interface Window {
    __ringIntro?: RingIntroAPI;
  }
}
