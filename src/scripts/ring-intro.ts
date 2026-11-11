/**
 * Original opening for brandonchiesa.com: a photoreal gold ring
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
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

export const RING_SESSION_KEY = "bc-ring-entered";
export const RING_ENTERED_EVENT = "bc:ring-entered";

const TORUS_RADIUS = 1.05;
const TUBE_RADIUS = 0.34;
const RING_RADIUS = TORUS_RADIUS + TUBE_RADIUS;
const HDRI_URL = `${import.meta.env.BASE_URL}intro/studio_small_08_1k.hdr`;

type Vec2 = { x: number; y: number };

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
  let renderer: THREE.WebGLRenderer | null = null;
  let composer: EffectComposer | null = null;
  let envTexture: THREE.Texture | null = null;
  let inscription: THREE.CanvasTexture | null = null;
  let disposed = false;

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
      // Dispose after the overlay is out of the document flow so a
      // cleared WebGL buffer cannot flash over the homepage.
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

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(raf);
    window.removeEventListener("keydown", onKey);
    skip?.removeEventListener("click", onSkip);
    renderer?.dispose();
    composer?.dispose();
    envTexture?.dispose();
    inscription?.dispose();
    renderer = null;
    composer = null;
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
    });
    renderer = gl;
    gl.toneMapping = THREE.ACESFilmicToneMapping;
    gl.toneMappingExposure = 1.15;
    gl.outputColorSpace = THREE.SRGBColorSpace;
    gl.setClearColor(0x000000, 1);

    const isPhone =
      /iP(hone|ad|od)/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ||
      (window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 800);

    const useBloom = !reduce() && !isPhone;

    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.08, 0.22, 0.92);
    const outputPass = new OutputPass();
    if (useBloom) {
      composer = new EffectComposer(gl);
      composer.addPass(renderPass);
      composer.addPass(bloomPass);
      composer.addPass(outputPass);
    }

    const maps = makeInscriptionMaps();
    inscription = maps.color;

    const material = new THREE.MeshPhysicalMaterial({
      color: 0xd7b056,
      metalness: 1,
      roughness: 0.07,
      clearcoat: 0.55,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.55,
      bumpMap: maps.bump,
      bumpScale: 0.085,
      roughnessMap: maps.roughness,
      metalnessMap: maps.metalness,
      emissive: new THREE.Color(0xb24a14),
      emissiveIntensity: 0.34,
      emissiveMap: maps.emissive,
      map: maps.color,
    });

    const geometry = new THREE.TorusGeometry(TORUS_RADIUS, TUBE_RADIUS, 96, 256);
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.set(0.42, 0.35, 0.12);
    scene.add(ring);

    // Physics state lives on a parent so squash scale does not fight rotation.
    const physics = new THREE.Group();
    const squashPivot = new THREE.Group();
    scene.add(physics);
    physics.add(squashPivot);
    squashPivot.add(ring);

    const pos: Vec2 = { x: 0, y: 0 };
    const vel: Vec2 = { x: 0, y: 0 };
    const angVel = new THREE.Vector3(0, reduce() ? 0 : 0.32, 0);
    const quat = ring.quaternion.clone();

    const squash = { amount: 0, target: 0, vel: 0, nx: 1, ny: 0 };

    let bounds = { halfW: 2, halfH: 2 };
    let held = false;
    let moved = false;
    let pointerId = -1;
    let grabOff: Vec2 = { x: 0, y: 0 };
    let lastPointer: Vec2 = { x: 0, y: 0 };
    let lastT = 0;
    const prevArc = new THREE.Vector3();
    const samples: { t: number; x: number; y: number; ax: number; ay: number; az: number }[] = [];

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const worldPtr = new THREE.Vector3();
    const tmpA = new THREE.Vector3();
    const tmpB = new THREE.Vector3();
    const tmpQ = new THREE.Quaternion();
    const tmpAxis = new THREE.Vector3();

    function fit() {
      const w = Math.max(1, target.clientWidth || window.innerWidth);
      const h = Math.max(1, target.clientHeight || window.innerHeight);
      const dpr = Math.min(isPhone ? 1.75 : 2, window.devicePixelRatio || 1);
      gl.setPixelRatio(dpr);
      gl.setSize(w, h, false);
      camera.aspect = w / h;
      const fov = (camera.fov * Math.PI) / 180;
      const fraction = w < 520 ? 0.58 : 0.46;
      camera.position.z = RING_RADIUS / (fraction * Math.tan(fov / 2));
      camera.updateProjectionMatrix();
      const halfH = Math.tan(fov / 2) * camera.position.z;
      const halfW = halfH * camera.aspect;
      bounds = { halfW, halfH };
      if (composer) {
        composer.setSize(w, h);
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
        ring.quaternion.copy(quat);
        return;
      }
      // Scale along the impact normal without changing the ring's spin.
      const angle = Math.atan2(squash.ny, squash.nx);
      const sx = 1 - a * 0.55;
      const peri = 1 / Math.sqrt(Math.max(0.45, sx));
      squashPivot.rotation.set(0, 0, angle);
      squashPivot.scale.set(sx, peri, peri);
      tmpQ.setFromAxisAngle(tmpAxis.set(0, 0, 1), angle).invert();
      ring.quaternion.copy(tmpQ).multiply(quat);
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

    function onDown(event: PointerEvent) {
      if (entered) return;
      if (!hitTest(event.clientX, event.clientY)) return;
      held = true;
      moved = false;
      pointerId = event.pointerId;
      target.setPointerCapture?.(event.pointerId);
      target.classList.add("is-held");
      pointerToWorld(event.clientX, event.clientY, worldPtr);
      grabOff = { x: pos.x - worldPtr.x, y: pos.y - worldPtr.y };
      lastPointer = { x: event.clientX, y: event.clientY };
      lastT = performance.now();
      samples.length = 0;
      vel.x = 0;
      vel.y = 0;
      arcballVec(event.clientX, event.clientY, prevArc);
      event.preventDefault();
    }

    function onMove(event: PointerEvent) {
      if (!held || event.pointerId !== pointerId) return;
      const now = performance.now();
      const dt = Math.max(0.001, (now - lastT) / 1000);
      pointerToWorld(event.clientX, event.clientY, worldPtr);
      const nx = worldPtr.x + grabOff.x;
      const ny = worldPtr.y + grabOff.y;
      const dxp = event.clientX - lastPointer.x;
      const dyp = event.clientY - lastPointer.y;
      if (Math.hypot(dxp, dyp) > 4) moved = true;
      pos.x = nx;
      pos.y = ny;

      arcballVec(event.clientX, event.clientY, tmpB);
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
            samples.push({ t: now, x: worldPtr.x, y: worldPtr.y, ax, ay, az });
            if (samples.length > 8) samples.shift();
          }
        }
      }
      prevArc.copy(tmpB);
      lastPointer = { x: event.clientX, y: event.clientY };
      lastT = now;
      event.preventDefault();
    }

    function onUp(event: PointerEvent) {
      if (!held || (pointerId !== -1 && event.pointerId !== pointerId)) return;
      held = false;
      target.classList.remove("is-held");
      try {
        target.releasePointerCapture?.(event.pointerId);
      } catch {
        /* already released */
      }
      const now = performance.now();
      pointerToWorld(event.clientX, event.clientY, worldPtr);
      const recent = samples.filter((s) => now - s.t < 120);
      if (recent.length >= 2) {
        const a = recent[0];
        const b = recent[recent.length - 1];
        const dt = Math.max(0.016, (b.t - a.t) / 1000);
        vel.x = (b.x - a.x) / dt;
        vel.y = (b.y - a.y) / dt;
        angVel.set(b.ax, b.ay, b.az);
      } else if (moved && lastT) {
        const dt = Math.max(0.016, (now - lastT) / 1000);
        pointerToWorld(lastPointer.x, lastPointer.y, tmpA);
        vel.x = (worldPtr.x - tmpA.x) / dt;
        vel.y = (worldPtr.y - tmpA.y) / dt;
      }
      // Cap throw speed so it stays readable.
      const speed = Math.hypot(vel.x, vel.y);
      const maxSpeed = 18;
      if (speed > maxSpeed) {
        vel.x *= maxSpeed / speed;
        vel.y *= maxSpeed / speed;
      }
      if (!moved && !reduce()) {
        // A still tap enters the site. A drag or flick stays with the ring.
        enter();
      }
      pointerId = -1;
    }

    target.addEventListener("pointerdown", onDown);
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("resize", fit);
    fit();

    const onLost = () => {
      showFallback();
      dispose();
    };
    target.addEventListener("webglcontextlost", (event) => {
      event.preventDefault();
      onLost();
    });

    let last = performance.now();
    const tick = (now: number) => {
      if (disposed || entered) return;
      const rawDt = (now - last) / 1000;
      const dt = Math.min(0.032, Math.max(0.001, rawDt));
      last = now;

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

      ring.quaternion.copy(quat);
      layoutFree();

      if (composer && useBloom) composer.render();
      else gl.render(scene, camera);

      raf = requestAnimationFrame(tick);
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
        },
        undefined,
        () => {
          console.warn("Ring intro: HDRI did not load; using a simple studio light.");
          const light = new THREE.DirectionalLight(0xfff1d0, 2.2);
          light.position.set(3, 4, 6);
          scene.add(light);
          scene.add(new THREE.AmbientLight(0x2a2218, 0.6));
        },
      );
    }

    loadEnv();
    raf = requestAnimationFrame(tick);
    document.fonts?.ready?.then(() => {
      if (disposed) return;
      const fresh = makeInscriptionMaps();
      material.map = fresh.color;
      material.bumpMap = fresh.bump;
      material.roughnessMap = fresh.roughness;
      material.metalnessMap = fresh.metalness;
      material.emissiveMap = fresh.emissive;
      material.needsUpdate = true;
      inscription?.dispose();
      inscription = fresh.color;
    });
  }
}

function makeInscriptionMaps() {
  const w = 2048;
  const h = 256;
  const color = document.createElement("canvas");
  const bump = document.createElement("canvas");
  const rough = document.createElement("canvas");
  const metal = document.createElement("canvas");
  const emit = document.createElement("canvas");
  for (const c of [color, bump, rough, metal, emit]) {
    c.width = w;
    c.height = h;
  }
  const fillGold = color.getContext("2d")!;
  const fillBump = bump.getContext("2d")!;
  const fillRough = rough.getContext("2d")!;
  const fillMetal = metal.getContext("2d")!;
  const fillEmit = emit.getContext("2d")!;

  fillGold.fillStyle = "#d8b45c";
  fillGold.fillRect(0, 0, w, h);
  fillBump.fillStyle = "#808080";
  fillBump.fillRect(0, 0, w, h);
  fillRough.fillStyle = "#1c1c1c";
  fillRough.fillRect(0, 0, w, h);
  fillMetal.fillStyle = "#ffffff";
  fillMetal.fillRect(0, 0, w, h);
  fillEmit.fillStyle = "#000000";
  fillEmit.fillRect(0, 0, w, h);

  const font = '600 92px "Cormorant Garamond", "Palatino Linotype", Palatino, Georgia, serif';
  const phrase = "BRANDON  CHIESA";
  const centers = [w * 0.25, w * 0.75];

  function drawText(ctx: CanvasRenderingContext2D, fill: string, shadow?: string) {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "0.22em";
    if (shadow) {
      ctx.strokeStyle = shadow;
      ctx.lineWidth = 6;
      ctx.lineJoin = "round";
    }
    ctx.fillStyle = fill;
    for (const x of centers) {
      if (shadow) ctx.strokeText(phrase, x, h * 0.5);
      ctx.fillText(phrase, x, h * 0.5);
    }
    ctx.restore();
  }

  drawText(fillGold, "#4a2e0a", "#3a2208");
  drawText(fillBump, "#101010", "#000000");
  drawText(fillRough, "#8a8a8a");
  drawText(fillMetal, "#efefef");
  drawText(fillEmit, "#ff7a2a");

  function tex(canvas: HTMLCanvasElement, srgb = false) {
    const t = new THREE.CanvasTexture(canvas);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.ClampToEdgeWrapping;
    t.anisotropy = 8;
    t.needsUpdate = true;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // Shift V so the inscription sits on the outer equator of the torus, not the inner hole.
  const maps = {
    color: tex(color, true),
    bump: tex(bump),
    roughness: tex(rough),
    metalness: tex(metal),
    emissive: tex(emit, true),
  };
  for (const t of Object.values(maps)) t.offset.set(0, 0.5);
  return maps;
}
