"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { animate, stagger } from "animejs";
import { latLonToVec3 } from "@/lib/landDots";
import { HQ, KIND_META, SITES, type Site } from "@/lib/locations";
import { prefersReducedMotion } from "@/lib/motion";

const R = 1;
const FOCUS = { lat: 24, lon: 36 };
const TOUR = ["Riyadh", "Ras Al Khaimah", "Borg El Arab", "Vavatsinia", "Abuja", "Kumasi", "Dammam", "Assiut"];
const TOUR_MS = 5200;
const PRIORITY = { teleport: 0, tower: 1, future: 2 } as const;

/* ------------------------------------------------------------------ shaders */

// Earth: day/night blend, city lights, normal-mapped relief, ocean glint,
// cloud shadows and an inner atmospheric rim.
const earthVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWN, vWT, vWB;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec3 N = normalize(position);
    vec3 T = normalize(cross(vec3(0.0, 1.0, 0.0), N) + vec3(1e-5, 0.0, 0.0));
    vec3 B = cross(N, T);
    mat3 m = mat3(modelMatrix);
    vWN = normalize(m * N);
    vWT = normalize(m * T);
    vWB = normalize(m * B);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const earthFrag = /* glsl */ `
  uniform sampler2D uDay, uNight, uNormal, uSpec, uClouds;
  uniform vec3 uSun;
  uniform float uCloudOffset, uReveal;
  varying vec2 vUv;
  varying vec3 vWN, vWT, vWB;
  varying vec3 vWorldPos;

  void main() {
    vec3 Gw = normalize(vWN);                // geometric normal (world)
    vec3 nm = texture2D(uNormal, vUv).xyz * 2.0 - 1.0;
    vec3 Nw = normalize(vWT * nm.x * 0.55 + vWB * nm.y * 0.55 + Gw * nm.z);
    vec3 V = normalize(cameraPosition - vWorldPos);

    float ndl = dot(Nw, uSun);
    float gdl = dot(Gw, uSun);
    float dayMix = smoothstep(-0.18, 0.22, gdl);

    vec3 day = texture2D(uDay, vUv).rgb;
    vec3 night = texture2D(uNight, vUv).rgb;
    float clouds = texture2D(uClouds, vec2(vUv.x + uCloudOffset, vUv.y)).r;

    vec3 lit = day * (0.06 + 1.15 * max(ndl, 0.0));
    lit *= 1.0 - clouds * 0.45;                  // cloud shadows
    vec3 city = night * vec3(1.0, 0.78, 0.48) * 2.4 * (1.0 - clouds * 0.7);
    vec3 col = mix(city + day * 0.025, lit, dayMix);

    // ocean glint
    float ocean = texture2D(uSpec, vUv).r;
    vec3 H = normalize(uSun + V);
    float spec = pow(max(dot(Gw, H), 0.0), 60.0) * ocean * (1.0 - clouds) * dayMix;
    col += vec3(1.0, 0.92, 0.8) * spec * 0.9;

    // atmospheric rim, warmer at the terminator
    float fres = pow(1.0 - max(dot(Gw, V), 0.0), 2.6);
    float term = 1.0 - abs(gdl);
    vec3 rim = mix(vec3(0.32, 0.62, 1.0), vec3(1.0, 0.55, 0.3), smoothstep(0.75, 1.0, term) * 0.6);
    col += rim * fres * (0.12 + 0.95 * smoothstep(-0.25, 0.5, gdl));

    gl_FragColor = vec4(col * uReveal, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const cloudVert = /* glsl */ `
  varying vec2 vUv; varying vec3 vN; varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vN = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const cloudFrag = /* glsl */ `
  uniform sampler2D uClouds; uniform vec3 uSun; uniform float uReveal;
  varying vec2 vUv; varying vec3 vN; varying vec3 vWorldPos;
  void main() {
    float c = texture2D(uClouds, vUv).r;
    float l = dot(normalize(vN), uSun);
    float light = 0.04 + 0.96 * smoothstep(-0.15, 0.45, l);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float edge = smoothstep(0.0, 0.35, dot(normalize(vN), V)); // thin out at the limb
    gl_FragColor = vec4(vec3(light), c * 0.9 * edge * uReveal);
    #include <colorspace_fragment>
  }
`;

const atmoVert = /* glsl */ `
  varying vec3 vN, vV, vNW;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal);
    vNW = normalize(mat3(modelMatrix) * normal);
    vV = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;
const atmoFrag = /* glsl */ `
  uniform vec3 uSun; uniform float uStrength;
  varying vec3 vN, vV, vNW;
  void main() {
    float i = pow(max(-dot(vN, vV), 0.0), 2.2);
    float s = smoothstep(-0.5, 0.6, dot(-vNW, uSun) * -1.0);
    vec3 col = mix(vec3(0.08, 0.18, 0.5), vec3(0.35, 0.68, 1.0), s);
    gl_FragColor = vec4(col, i * uStrength * (0.35 + 0.65 * s));
  }
`;

const markerVert = /* glsl */ `
  attribute vec3 aColor; attribute float aPhase, aSize, aAppear;
  uniform float uPR;
  varying vec3 vColor; varying float vPhase, vFacing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * position);
    vFacing = smoothstep(0.02, 0.3, dot(n, normalize(-mv.xyz))) * aAppear;
    vColor = aColor; vPhase = aPhase;
    gl_PointSize = aSize * uPR * (0.4 + 0.6 * aAppear) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const markerFrag = /* glsl */ `
  uniform float uTime;
  varying vec3 vColor; varying float vPhase, vFacing;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(0.17, 0.08, d);
    float halo = smoothstep(0.5, 0.0, d) * 0.35;
    float r = fract(uTime * 0.5 + vPhase);
    float ring = smoothstep(0.07, 0.0, abs(d - r)) * (1.0 - r);
    gl_FragColor = vec4(mix(vColor, vec3(1.0), core * 0.6), (core + halo + ring) * vFacing);
  }
`;

// vertical light beams above active sites (instanced, additive)
const beamColVert = /* glsl */ `
  varying float vH; varying vec3 vColor; varying float vFacing;
  void main() {
    vH = position.y;
    vColor = instanceColor;
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vec3 base = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vFacing = smoothstep(0.0, 0.25, dot(normalize(base), normalize(cameraPosition - base)));
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const beamColFrag = /* glsl */ `
  uniform float uTime;
  varying float vH; varying vec3 vColor; varying float vFacing;
  void main() {
    float a = pow(1.0 - vH, 2.2) * (0.75 + 0.25 * sin(uTime * 3.0 + vH * 12.0));
    gl_FragColor = vec4(vColor, a * vFacing * 0.9);
  }
`;

const arcVert = /* glsl */ `
  attribute float aT, aOffset;
  varying float vT, vOffset, vFacing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * position);
    vFacing = smoothstep(-0.1, 0.3, dot(n, normalize(-mv.xyz)));
    vT = aT; vOffset = aOffset;
    gl_Position = projectionMatrix * mv;
  }
`;
const arcFrag = /* glsl */ `
  uniform float uTime, uArcs; uniform vec3 uColor;
  varying float vT, vOffset, vFacing;
  void main() {
    float head = fract(uTime * 0.2 + vOffset) * 1.4 - 0.2;
    float d = head - vT;
    float pulse = smoothstep(0.3, 0.0, d) * step(0.0, d);
    gl_FragColor = vec4(uColor, (0.08 + pulse * 0.9) * vFacing * uArcs);
  }
`;

const satVert = /* glsl */ `
  uniform float uPR, uSize;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = uSize * uPR / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const satFrag = /* glsl */ `
  uniform float uOpacity;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float a = smoothstep(1.0, 0.0, d);
    gl_FragColor = vec4(mix(vec3(0.5, 0.85, 1.0), vec3(1.0), pow(a, 4.0)), a * a * uOpacity);
  }
`;

const linkVert = /* glsl */ `
  attribute float aAlpha;
  varying float vAlpha;
  void main() { vAlpha = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const linkFrag = /* glsl */ `
  varying float vAlpha;
  void main() { gl_FragColor = vec4(0.55, 0.9, 1.0, vAlpha); }
`;

/* -------------------------------------------------------------- helpers */

const spinForLon = (lon: number) => -Math.PI / 2 - (lon * Math.PI) / 180;
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/* -------------------------------------------------------------- component */

export interface GlobeProps {
  onReady?: () => void;
  onFocusSite?: (site: Site) => void;
}

export default function GlobeCanvas({ onReady, onFocusSite }: GlobeProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const cbs = useRef({ onReady, onFocusSite });
  cbs.current = { onReady, onFocusSite };

  useEffect(() => {
    const host = hostRef.current;
    const labelHost = labelsRef.current;
    if (!host || !labelHost) return;
    const reduced = prefersReducedMotion();
    let disposed = false;

    /* renderer / scene ------------------------------------------------ */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    const PR = Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(PR);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab";
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const CAM_Z = 4.4;
    camera.position.set(0, 0, CAM_Z);

    const tilt = new THREE.Group();
    const spin = new THREE.Group();
    tilt.add(spin);
    scene.add(tilt);

    const sun = new THREE.Vector3(-0.85, 0.42, 0.62).normalize();
    const disposables: { dispose(): void }[] = [];
    const track = <T extends { dispose(): void }>(o: T) => (disposables.push(o), o);

    const U = {
      uTime: { value: 0 },
      uPR: { value: PR },
      uSun: { value: sun },
      uReveal: { value: reduced ? 1 : 0 },
    };

    /* textures --------------------------------------------------------- */
    const loader = new THREE.TextureLoader();
    const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    const load = (url: string, srgb: boolean) =>
      loader.loadAsync(url).then((t) => {
        t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        t.anisotropy = aniso;
        return track(t);
      });

    /* earth + clouds + atmosphere -------------------------------------- */
    const earthMat = track(
      new THREE.ShaderMaterial({
        vertexShader: earthVert,
        fragmentShader: earthFrag,
        uniforms: {
          ...U,
          uDay: { value: null },
          uNight: { value: null },
          uNormal: { value: null },
          uSpec: { value: null },
          uClouds: { value: null },
          uCloudOffset: { value: 0 },
        },
      })
    );
    const earth = new THREE.Mesh(track(new THREE.SphereGeometry(R, 128, 96)), earthMat);
    earth.visible = false;
    spin.add(earth);

    const cloudMat = track(
      new THREE.ShaderMaterial({
        vertexShader: cloudVert,
        fragmentShader: cloudFrag,
        uniforms: { ...U, uClouds: { value: null } },
        transparent: true,
        depthWrite: false,
      })
    );
    const clouds = new THREE.Mesh(track(new THREE.SphereGeometry(R * 1.009, 96, 72)), cloudMat);
    clouds.visible = false;
    spin.add(clouds);

    const atmoMat = track(
      new THREE.ShaderMaterial({
        vertexShader: atmoVert,
        fragmentShader: atmoFrag,
        uniforms: { uSun: U.uSun, uStrength: { value: 0 } },
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    const atmo = new THREE.Mesh(track(new THREE.SphereGeometry(R * 1.16, 64, 48)), atmoMat);
    scene.add(atmo);

    /* starfield -------------------------------------------------------- */
    {
      const N = 1400;
      const pos = new Float32Array(N * 3);
      const v = new THREE.Vector3();
      for (let i = 0; i < N; i++) v.randomDirection().multiplyScalar(20 + Math.random() * 15).toArray(pos, i * 3);
      const g = track(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      const stars = new THREE.Points(
        g,
        track(new THREE.PointsMaterial({ color: 0xbfd4ff, size: 0.05, transparent: true, opacity: 0.6, depthWrite: false }))
      );
      stars.name = "stars";
      scene.add(stars);
    }

    /* site markers ------------------------------------------------------ */
    const siteLocal = SITES.map((s) => new THREE.Vector3(...latLonToVec3(s.lat, s.lon, R * 1.004)));
    const appear = new Float32Array(SITES.length); // driven by anime.js, per site
    const markerGeo = track(new THREE.BufferGeometry());
    {
      const pos = new Float32Array(SITES.length * 3);
      const col = new Float32Array(SITES.length * 3);
      const phase = new Float32Array(SITES.length);
      const size = new Float32Array(SITES.length);
      const c = new THREE.Color();
      SITES.forEach((s, i) => {
        siteLocal[i].toArray(pos, i * 3);
        c.setHex(KIND_META[s.kind].hex).toArray(col, i * 3);
        phase[i] = Math.random();
        size[i] = s.kind === "future" ? 60 : 92;
        appear[i] = reduced ? 1 : 0;
      });
      markerGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      markerGeo.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
      markerGeo.setAttribute("aPhase", new THREE.BufferAttribute(phase, 1));
      markerGeo.setAttribute("aSize", new THREE.BufferAttribute(size, 1));
      markerGeo.setAttribute("aAppear", new THREE.BufferAttribute(appear, 1));
      const m = track(
        new THREE.ShaderMaterial({
          vertexShader: markerVert,
          fragmentShader: markerFrag,
          uniforms: U,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      spin.add(new THREE.Points(markerGeo, m));
    }

    /* light beams over teleports & towers ------------------------------ */
    const beamSites = SITES.map((s, i) => ({ s, i })).filter(({ s }) => s.kind !== "future");
    const beamGeo = track(new THREE.CylinderGeometry(0.0032, 0.0012, 1, 8, 1, true));
    beamGeo.translate(0, 0.5, 0);
    const beamMesh = new THREE.InstancedMesh(
      beamGeo,
      track(
        new THREE.ShaderMaterial({
          vertexShader: beamColVert,
          fragmentShader: beamColFrag,
          uniforms: U,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      ),
      beamSites.length
    );
    beamMesh.frustumCulled = false;
    spin.add(beamMesh);
    const beamHeights = beamSites.map(() => 0);
    const tmpM = new THREE.Matrix4();
    const tmpQ = new THREE.Quaternion();
    const tmpS = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    {
      const c = new THREE.Color();
      beamSites.forEach(({ s }, k) => beamMesh.setColorAt(k, c.setHex(KIND_META[s.kind].hex)));
    }
    const updateBeams = (focusIdx: number) => {
      beamSites.forEach(({ i }, k) => {
        const target = (i === focusIdx ? 0.16 : 0.055) * appear[i];
        beamHeights[k] += (target - beamHeights[k]) * 0.08;
        tmpQ.setFromUnitVectors(UP, siteLocal[i].clone().normalize());
        tmpS.set(1, Math.max(beamHeights[k], 1e-4), 1);
        tmpM.compose(siteLocal[i], tmpQ, tmpS);
        beamMesh.setMatrixAt(k, tmpM);
      });
      beamMesh.instanceMatrix.needsUpdate = true;
    };

    /* arcs from HQ ----------------------------------------------------- */
    const arcUniforms = { ...U, uColor: { value: new THREE.Color(0xfbbf24) }, uArcs: { value: 0 } };
    {
      const hq = new THREE.Vector3(...latLonToVec3(HQ.lat, HQ.lon, R * 1.002));
      const targets = SITES.filter((s) => s.kind !== "future" && s.country !== "UAE");
      const SEG = 48;
      const pos: number[] = [];
      const ts: number[] = [];
      const offs: number[] = [];
      const p = new THREE.Vector3();
      targets.forEach((s, k) => {
        const b = new THREE.Vector3(...latLonToVec3(s.lat, s.lon, R * 1.002));
        const mid = hq.clone().add(b).normalize().multiplyScalar(1 + hq.distanceTo(b) * 0.32);
        const curve = new THREE.QuadraticBezierCurve3(hq, mid, b);
        for (let i = 0; i < SEG; i++) {
          for (const t of [i / SEG, (i + 1) / SEG]) {
            curve.getPoint(t, p);
            pos.push(p.x, p.y, p.z);
            ts.push(t);
            offs.push(k / targets.length);
          }
        }
      });
      const g = track(new THREE.BufferGeometry());
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("aT", new THREE.Float32BufferAttribute(ts, 1));
      g.setAttribute("aOffset", new THREE.Float32BufferAttribute(offs, 1));
      const m = track(
        new THREE.ShaderMaterial({
          vertexShader: arcVert,
          fragmentShader: arcFrag,
          uniforms: arcUniforms,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      );
      spin.add(new THREE.LineSegments(g, m));
    }

    /* LEO satellites + orbits + downlinks ------------------------------ */
    const ORBIT_R = 1.2;
    const planes = [
      { inc: 53, raan: 0, n: 7, speed: 0.16 },
      { inc: 70, raan: 70, n: 6, speed: 0.13 },
      { inc: 97, raan: 140, n: 6, speed: 0.11 },
      { inc: 35, raan: 230, n: 5, speed: 0.19 },
    ];
    const orbitGroup = new THREE.Group();
    tilt.add(orbitGroup);
    const orbitMat = track(new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0, depthWrite: false }));
    const planeQuats = planes.map((pl) => {
      const q = new THREE.Quaternion().setFromEuler(
        new THREE.Euler((pl.inc * Math.PI) / 180, (pl.raan * Math.PI) / 180, 0, "YXZ")
      );
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R).applyQuaternion(q));
      }
      orbitGroup.add(new THREE.Line(track(new THREE.BufferGeometry().setFromPoints(pts)), orbitMat));
      return q;
    });
    const satCount = planes.reduce((a, p) => a + p.n, 0);
    const satPos = new Float32Array(satCount * 3);
    const satGeo = track(new THREE.BufferGeometry());
    satGeo.setAttribute("position", new THREE.BufferAttribute(satPos, 3));
    const satMat = track(
      new THREE.ShaderMaterial({
        vertexShader: satVert,
        fragmentShader: satFrag,
        uniforms: { ...U, uSize: { value: 30 }, uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    orbitGroup.add(new THREE.Points(satGeo, satMat));

    const linkPos = new Float32Array(satCount * 6);
    const linkAlpha = new Float32Array(satCount * 2);
    const linkGeo = track(new THREE.BufferGeometry());
    linkGeo.setAttribute("position", new THREE.BufferAttribute(linkPos, 3));
    linkGeo.setAttribute("aAlpha", new THREE.BufferAttribute(linkAlpha, 1));
    const links = new THREE.LineSegments(
      linkGeo,
      track(
        new THREE.ShaderMaterial({
          vertexShader: linkVert,
          fragmentShader: linkFrag,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        })
      )
    );
    links.frustumCulled = false;
    orbitGroup.add(links);

    /* HTML labels pinned to the globe ----------------------------------- */
    const labelEls = [...labelHost.querySelectorAll<HTMLElement>("[data-site-label]")];
    const labelInner = labelEls.map((el) => el.firstElementChild as HTMLElement);
    let labelSizes = labelInner.map((el) => [el.offsetWidth + 8, el.offsetHeight + 4]);
    const order = SITES.map((_, i) => i).sort((a, b) => PRIORITY[SITES[a].kind] - PRIORITY[SITES[b].kind]);

    /* state ------------------------------------------------------------ */
    const intro = { spin: reduced ? 0 : -2.4, camZ: reduced ? CAM_Z : 9.5, orbits: reduced ? 1 : 0 };
    let spinY = spinForLon(FOCUS.lon) + intro.spin;
    let tiltX = (FOCUS.lat * Math.PI) / 180;
    let targetSpin = spinForLon(FOCUS.lon);
    let targetTilt = tiltX;
    let focusIdx = -1;
    let tourStep = 0;
    let lastTour = performance.now();
    let pausedUntil = 0;
    let started = false;
    const anims: { revert(): unknown }[] = [];

    const focusOn = (idx: number) => {
      focusIdx = idx;
      const s = SITES[idx];
      targetSpin = spinY + wrapAngle(spinForLon(s.lon) - spinY);
      targetTilt = THREE.MathUtils.clamp((s.lat * Math.PI) / 180, -0.5, 0.75);
      labelEls.forEach((el, i) => el.classList.toggle("is-focus", i === idx));
      cbs.current.onFocusSite?.(s);
    };

    const start = () => {
      if (started) return;
      started = true;
      earth.visible = clouds.visible = true;
      labelSizes = labelInner.map((el) => [el.offsetWidth + 8, el.offsetHeight + 4]);
      cbs.current.onReady?.();
      if (reduced) {
        U.uReveal.value = 1;
        atmoMat.uniforms.uStrength.value = 1.2;
        arcUniforms.uArcs.value = 1;
        labelInner.forEach((el) => (el.style.opacity = "1"));
        focusOn(SITES.findIndex((s) => s.city === TOUR[0]));
        return;
      }
      const appearOrder = { v: 0 };
      anims.push(
        animate(U.uReveal, { value: [0, 1], duration: 1800, ease: "outQuad" }),
        animate(intro, { camZ: CAM_Z, spin: 0, duration: 3400, ease: "inOutExpo" }),
        animate(atmoMat.uniforms.uStrength, { value: [0, 1.2], duration: 2400, delay: 400, ease: "outSine" }),
        animate(intro, { orbits: 1, duration: 1800, delay: 2600, ease: "outQuad" }),
        animate(arcUniforms.uArcs, { value: [0, 1], duration: 1500, delay: 3600, ease: "outQuad" }),
        // sites pop onto the globe one after another, priority first
        animate(appearOrder, {
          v: SITES.length,
          duration: 2200,
          delay: 2600,
          ease: "inOutSine",
          onUpdate: () => {
            order.forEach((idx, rank) => {
              appear[idx] = THREE.MathUtils.clamp(appearOrder.v - rank, 0, 1);
            });
            markerGeo.attributes.aAppear.needsUpdate = true;
          },
        }),
        animate(order.map((i) => labelInner[i]), {
          opacity: [0, 1],
          translateY: [10, 0],
          scale: [0.7, 1],
          delay: stagger(80, { start: 2900 }),
          duration: 800,
          ease: "outBack(2)",
        })
      );
      setTimeout(() => {
        if (disposed) return;
        focusOn(SITES.findIndex((s) => s.city === TOUR[0]));
        lastTour = performance.now();
      }, 4200);
    };

    Promise.all([
      load("/earth/day.webp", true),
      load("/earth/night.webp", true),
      load("/earth/normal.webp", false),
      load("/earth/specular.webp", false),
      load("/earth/clouds.webp", false),
    ])
      .then(([day, night, normal, spec, cl]) => {
        if (disposed) return;
        const u = earthMat.uniforms;
        u.uDay.value = day;
        u.uNight.value = night;
        u.uNormal.value = normal;
        u.uSpec.value = spec;
        u.uClouds.value = cl;
        cloudMat.uniforms.uClouds.value = cl;
        renderer.compile(scene, camera);
        start();
      })
      .catch(() => start());

    /* interaction ------------------------------------------------------- */
    const canvas = renderer.domElement;
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let vel = 0;
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      pointer.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      pointer.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      vel = dx * 0.005;
      spinY += vel;
      targetSpin = spinY;
      tiltX = THREE.MathUtils.clamp(tiltX + dy * 0.004, -0.6, 0.9);
      targetTilt = tiltX;
      pausedUntil = performance.now() + 7000;
    };
    const onUp = (e: PointerEvent) => {
      dragging = false;
      canvas.style.cursor = "grab";
      if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    const onLeave = () => ((pointer.tx = 0), (pointer.ty = 0));
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("pointerleave", onLeave);
    const onLabelClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-site-label]");
      if (!el) return;
      focusOn(Number(el.dataset.idx));
      pausedUntil = performance.now() + 9000;
    };
    labelHost.addEventListener("click", onLabelClick);

    /* sizing ----------------------------------------------------------- */
    let W = 1;
    let H = 1;
    const resize = () => {
      W = host.clientWidth || 1;
      H = host.clientHeight || 1;
      renderer.setSize(W, H, false);
      camera.aspect = W / H;
      camera.updateProjectionMatrix();
      labelSizes = labelInner.map((el) => [el.offsetWidth + 8, el.offsetHeight + 4]);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    /* loop --------------------------------------------------------------- */
    let raf = 0;
    let visible = true;
    let last = performance.now();
    let elapsed = 0;
    const tmp = new THREE.Vector3();
    const tmpN = new THREE.Vector3();
    const camDir = new THREE.Vector3();
    const siteWorld = siteLocal.map(() => new THREE.Vector3());
    const siteOrbit = siteLocal.map(() => new THREE.Vector3());
    const invOrbit = new THREE.Matrix4();
    const placed: number[][] = [];
    const LINK_RANGE = 0.48;
    const stars = scene.getObjectByName("stars")!;

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += reduced ? dt * 0.25 : dt;
      U.uTime.value = elapsed;

      // guided tour between teleports
      if (started && !reduced && !dragging && now > pausedUntil && now - lastTour > TOUR_MS) {
        tourStep = (tourStep + 1) % TOUR.length;
        focusOn(SITES.findIndex((s) => s.city === TOUR[tourStep]));
        lastTour = now;
      }

      if (!dragging) {
        vel *= 0.93;
        spinY += vel;
        targetSpin += vel;
        if (now < pausedUntil) targetSpin += dt * 0.03; // gentle drift while user is in control
        spinY += (targetSpin - spinY) * 0.035;
        tiltX += (targetTilt - tiltX) * 0.035;
      }
      spin.rotation.y = spinY + intro.spin;
      tilt.rotation.x = tiltX;
      clouds.rotation.y += dt * 0.012;
      earthMat.uniforms.uCloudOffset.value = -clouds.rotation.y / (Math.PI * 2);

      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      camera.position.set(pointer.x * 0.16, -pointer.y * 0.1, intro.camZ);
      camera.lookAt(0, 0, 0);
      stars.rotation.y = elapsed * 0.004;

      orbitMat.opacity = 0.08 * intro.orbits;
      satMat.uniforms.uOpacity.value = intro.orbits;

      // satellites
      let k = 0;
      planes.forEach((pl, pi) => {
        for (let j = 0; j < pl.n; j++, k++) {
          const a = elapsed * pl.speed + (j / pl.n) * Math.PI * 2 + pi;
          tmp.set(Math.cos(a) * ORBIT_R, 0, Math.sin(a) * ORBIT_R).applyQuaternion(planeQuats[pi]).toArray(satPos, k * 3);
        }
      });
      satGeo.attributes.position.needsUpdate = true;

      scene.updateMatrixWorld();
      invOrbit.copy(orbitGroup.matrixWorld).invert();
      for (let i = 0; i < siteLocal.length; i++) {
        siteWorld[i].copy(siteLocal[i]).applyMatrix4(spin.matrixWorld);
        siteOrbit[i].copy(siteWorld[i]).applyMatrix4(invOrbit);
      }

      // downlinks: satellite -> closest visible site in range
      for (let s = 0; s < satCount; s++) {
        tmp.fromArray(satPos, s * 3);
        let best = -1;
        let bestD = LINK_RANGE;
        for (let i = 0; i < siteOrbit.length; i++) {
          if (appear[i] < 1) continue;
          const d = tmp.distanceTo(siteOrbit[i]);
          if (d < bestD) {
            bestD = d;
            best = i;
          }
        }
        if (best >= 0) {
          tmp.toArray(linkPos, s * 6);
          siteOrbit[best].toArray(linkPos, s * 6 + 3);
          const a = (1 - bestD / LINK_RANGE) * intro.orbits;
          linkAlpha[s * 2] = a * 0.9;
          linkAlpha[s * 2 + 1] = a * 0.3;
        } else {
          linkAlpha[s * 2] = linkAlpha[s * 2 + 1] = 0;
        }
      }
      linkGeo.attributes.position.needsUpdate = true;
      linkGeo.attributes.aAlpha.needsUpdate = true;

      updateBeams(focusIdx);

      // labels: project, hide on far side, avoid overlaps (priority order)
      placed.length = 0;
      camDir.copy(camera.position).normalize();
      const visit = focusIdx >= 0 ? [focusIdx, ...order.filter((i) => i !== focusIdx)] : order;
      for (const i of visit) {
        const el = labelEls[i];
        tmpN.copy(siteWorld[i]).normalize();
        const facing = tmpN.dot(tmp.copy(camera.position).sub(siteWorld[i]).normalize());
        tmp.copy(siteWorld[i]).project(camera);
        const x = (tmp.x * 0.5 + 0.5) * W;
        const y = (-tmp.y * 0.5 + 0.5) * H;
        let show = facing > 0.3;
        const [lw, lh] = labelSizes[i];
        const rect = [x - lw / 2, y - lh - 14, x + lw / 2, y - 6];
        if (show) {
          for (const p of placed) {
            if (rect[0] < p[2] && rect[2] > p[0] && rect[1] < p[3] && rect[3] > p[1]) {
              show = i === focusIdx;
              break;
            }
          }
        }
        if (show) placed.push(rect);
        const op = show ? Math.min(1, (facing - 0.3) * 5) : 0;
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
        el.style.opacity = op.toFixed(2);
        el.style.pointerEvents = op > 0.5 ? "auto" : "none";
      }

      renderer.render(scene, camera);
      schedule();
    };
    const schedule = () => {
      if (!raf && visible && !document.hidden && !disposed) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      schedule();
    });
    io.observe(host);
    const onVis = () => schedule();
    document.addEventListener("visibilitychange", onVis);
    schedule();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      anims.forEach((a) => a.revert());
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("pointerleave", onLeave);
      labelHost.removeEventListener("click", onLabelClick);
      beamMesh.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0">
      <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden">
        {SITES.map((s, i) => (
          <button
            key={s.city}
            type="button"
            data-site-label
            data-idx={i}
            className="globe-label"
            style={{ ["--c" as string]: KIND_META[s.kind].color, opacity: 0 }}
            aria-label={`${s.city}, ${s.country}`}
          >
            <span className={`globe-label-inner ${s.kind === "future" ? "is-future" : ""}`} style={{ opacity: 0 }}>
              <span className="globe-label-dot" />
              {s.city}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
