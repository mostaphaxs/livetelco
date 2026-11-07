"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { animate, stagger } from "animejs";
import { latLonToVec3 } from "@/lib/landDots";
import { KIND_META, SITES, type Site } from "@/lib/locations";
import { prefersReducedMotion } from "@/lib/motion";
import { createSatelliteKit } from "./satellite";

const R = 1;
const FOCUS = { lat: 24, lon: 36 };
const TOUR = ["Riyadh", "Ras Al Khaimah", "Borg El Arab", "Vavatsinia", "Abuja", "Kumasi", "Dammam", "Assiut"];
const TOUR_MS = 5200;
const PRIORITY = { teleport: 0, tower: 1, future: 2 } as const;

// A few satellites on inclined low orbits (radius in Earth radii, period in seconds).
// The first one is the "hero" satellite: larger, on an orbit close to the view
// plane so it circles the globe in full view and shows its details.
const SATS = [
  { r: 1.24, inc: -32, raan: 12, period: 58, phase: 1.2, scale: 0.058 },
  { r: 1.18, inc: -24, raan: 160, period: 46, phase: 2.6, scale: 0.04 },
  { r: 1.22, inc: 55, raan: -60, period: 52, phase: 4.4, scale: 0.04 },
];

/* ------------------------------------------------------------------ shaders */

// Earth: physically-inspired shading. Albedo is lit with a soft Lambert term,
// the night side shows city lights, oceans get a sharp sun glint plus a broad
// sheen, and aerial perspective adds a thin layer of blue haze towards the limb
// on the lit side only (no milky wash over the whole disc).
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
    vec3 Gw = normalize(vWN);
    vec3 nm = texture2D(uNormal, vUv).xyz * 2.0 - 1.0;
    vec3 Nw = normalize(vWT * nm.x * 0.35 + vWB * nm.y * 0.35 + Gw * nm.z);
    vec3 V = normalize(cameraPosition - vWorldPos);

    float gdl = dot(Gw, uSun);
    float ndl = max(dot(Nw, uSun), 0.0);
    float day = smoothstep(-0.12, 0.18, gdl);
    float ndv = max(dot(Gw, V), 0.0);

    vec3 albedo = texture2D(uDay, vUv).rgb;
    float ocean = texture2D(uSpec, vUv).r;
    // Blue Marble oceans are very bright: take them towards a deep, natural navy
    albedo = mix(albedo, albedo * vec3(0.42, 0.52, 0.62), ocean);
    float cl = texture2D(uClouds, vec2(vUv.x + uCloudOffset, vUv.y)).r;
    cl = smoothstep(0.08, 0.85, cl);

    // sunlight
    vec3 sunCol = vec3(1.0, 0.97, 0.92);
    vec3 col = albedo * sunCol * (ndl * 1.05) * (1.0 - cl * 0.35);

    // ocean: sharp glint + broad sheen
    vec3 H = normalize(uSun + V);
    float ndh = max(dot(Gw, H), 0.0);
    float glint = pow(ndh, 220.0) * 0.55 + pow(ndh, 24.0) * 0.07;
    col += sunCol * glint * ocean * (1.0 - cl) * day;

    // night side: warm city lights
    vec3 lights = texture2D(uNight, vUv).rgb;
    // 4K night map is already coloured (warm lights over a dim blue earth)
    lights = lights * 1.5 * (1.0 - cl * 0.75);
    col += lights * (1.0 - smoothstep(-0.2, 0.05, gdl));

    // aerial perspective: thin blue haze towards the limb, lit side only
    float haze = pow(1.0 - ndv, 3.5);
    vec3 skyCol = vec3(0.32, 0.58, 1.0);
    col = mix(col, skyCol * (0.15 + 0.85 * day), haze * 0.55 * smoothstep(-0.25, 0.35, gdl));

    // faint warm scattering along the terminator
    col += vec3(0.9, 0.42, 0.18) * pow(1.0 - abs(gdl), 16.0) * 0.03 * ndv;

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
    float c = smoothstep(0.08, 0.85, texture2D(uClouds, vUv).r);
    vec3 N = normalize(vN);
    float l = dot(N, uSun);
    float light = smoothstep(-0.1, 0.5, l);
    vec3 V = normalize(cameraPosition - vWorldPos);
    float ndv = max(dot(N, V), 0.0);
    // clouds catch a little blue sky light, and fade out at the limb
    vec3 col = mix(vec3(0.55, 0.65, 0.8) * 0.08, vec3(1.0, 0.98, 0.95), light);
    gl_FragColor = vec4(col, c * 0.8 * smoothstep(0.0, 0.3, ndv) * uReveal);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// Thin atmosphere shell seen from outside: bright, crisp band on the sunlit limb.
const atmoVert = /* glsl */ `
  varying vec3 vNW; varying vec3 vWorldPos;
  void main() {
    vNW = normalize(mat3(modelMatrix) * normal);
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;
const atmoFrag = /* glsl */ `
  uniform vec3 uSun; uniform float uStrength;
  varying vec3 vNW; varying vec3 vWorldPos;
  void main() {
    vec3 N = normalize(vNW);
    vec3 V = normalize(cameraPosition - vWorldPos);
    // Back faces of a shell 4.5% above the surface. -dot(N,V) is 0 at the shell's
    // silhouette and ~0.29 where the line of sight grazes the planet's limb, so the
    // glow is densest right at the horizon and fades out into space.
    float t = clamp(-dot(N, V) / 0.332, 0.0, 1.0);
    float glow = pow(t, 2.6);
    float sunSide = smoothstep(-0.25, 0.55, dot(N, uSun));
    vec3 col = mix(vec3(0.12, 0.3, 0.75), vec3(0.45, 0.75, 1.0), sunSide);
    gl_FragColor = vec4(col, glow * uStrength * (0.08 + 0.92 * sunSide));
  }
`;

const markerVert = /* glsl */ `
  attribute vec3 aColor; attribute float aPhase, aSize, aAppear;
  uniform float uPR;
  varying vec3 vColor; varying float vPhase, vFacing;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * position);
    vFacing = smoothstep(0.05, 0.3, dot(n, normalize(-mv.xyz))) * aAppear;
    vColor = aColor; vPhase = aPhase;
    gl_PointSize = aSize * uPR / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const markerFrag = /* glsl */ `
  uniform float uTime;
  varying vec3 vColor; varying float vPhase, vFacing;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(0.26, 0.18, d);
    float edge = smoothstep(0.34, 0.26, d) - core;           // thin white outline
    float r = fract(uTime * 0.35 + vPhase);
    float ring = smoothstep(0.05, 0.0, abs(d - (0.3 + r * 0.7))) * (1.0 - r) * 0.6;
    vec3 c = mix(vColor, vec3(1.0), edge);
    gl_FragColor = vec4(c, (core + edge + ring) * vFacing);
  }
`;

// Uplink beam between a satellite (y=0) and the teleport it serves (y=1):
// soft-edged cone with light pulses travelling down to the ground.
const beamVert = /* glsl */ `
  varying float vY; varying float vSoft;
  void main() {
    vY = position.y + 0.5;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vec3 n = normalize(normalMatrix * normal);
    vSoft = pow(abs(dot(n, normalize(-mv.xyz))), 1.4);
    gl_Position = projectionMatrix * mv;
  }
`;
const beamFrag = /* glsl */ `
  uniform float uTime, uFade, uPhase; uniform vec3 uColor;
  varying float vY; varying float vSoft;
  void main() {
    float base = 0.26 * smoothstep(0.0, 0.15, vY) * smoothstep(1.0, 0.85, vY);
    float p1 = fract(uTime * 0.55 + uPhase);
    float p2 = fract(uTime * 0.55 + uPhase + 0.5);
    float pulse = smoothstep(0.1, 0.0, abs(vY - p1)) + smoothstep(0.1, 0.0, abs(vY - p2));
    gl_FragColor = vec4(uColor, (base + pulse * 0.75) * vSoft * uFade);
  }
`;

// Signal rings spreading over the surface around the site in focus.
const rippleVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const rippleFrag = /* glsl */ `
  uniform float uTime, uFade; uniform vec3 uColor;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = 0.0;
    for (int k = 0; k < 3; k++) {
      float r = fract(uTime * 0.45 + float(k) / 3.0);
      a += smoothstep(0.035, 0.0, abs(d - r)) * (1.0 - r) * (1.0 - r);
    }
    a += smoothstep(0.12, 0.0, d) * 0.5; // bright core
    gl_FragColor = vec4(uColor, a * uFade * smoothstep(1.0, 0.9, d));
  }
`;

/* -------------------------------------------------------------- helpers */

const spinForLon = (lon: number) => -Math.PI / 2 - (lon * Math.PI) / 180;
const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/* -------------------------------------------------------------- component */

export interface GlobeProps {
  onReady?: () => void;
  onFocusSite?: (site: Site) => void;
  /** fly to this city (e.g. when it is hovered in a list); the guided tour pauses */
  focusCity?: string | null;
}

export default function GlobeCanvas({ onReady, onFocusSite, focusCity }: GlobeProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const cbs = useRef({ onReady, onFocusSite });
  cbs.current = { onReady, onFocusSite };
  const api = useRef<{ focus(city: string): void } | null>(null);

  useEffect(() => {
    if (focusCity) api.current?.focus(focusCity);
  }, [focusCity]);

  useEffect(() => {
    const host = hostRef.current;
    const labelHost = labelsRef.current;
    if (!host || !labelHost) return;
    const reduced = prefersReducedMotion();
    let disposed = false;

    /* renderer / scene ------------------------------------------------ */
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    const PR = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(PR);
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.NeutralToneMapping; // keeps colours true, no grey wash
    renderer.toneMappingExposure = 1.0;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:pan-y;cursor:grab";
    host.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const CAM_Z = 5.0;
    camera.position.set(0, 0, CAM_Z);

    const tilt = new THREE.Group();
    const spin = new THREE.Group();
    tilt.add(spin);
    scene.add(tilt);

    // sun from the upper left, slightly in front: a crescent of night on the right
    const sun = new THREE.Vector3(-0.75, 0.38, 0.55).normalize();
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
    const aniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
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
    const earth = new THREE.Mesh(track(new THREE.SphereGeometry(R, 160, 120)), earthMat);
    earth.visible = false;
    earth.castShadow = true; // satellites go dark in the Earth's shadow
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
    const clouds = new THREE.Mesh(track(new THREE.SphereGeometry(R * 1.006, 128, 96)), cloudMat);
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
    const atmo = new THREE.Mesh(track(new THREE.SphereGeometry(R * 1.06, 96, 72)), atmoMat);
    scene.add(atmo);

    /* satellites --------------------------------------------------------- */
    // image-based light for the metal parts, and the sun as a shadow-casting light
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmrem.dispose();
    track(envTex);
    const sunLight = new THREE.DirectionalLight(0xfff4e6, 3.2);
    sunLight.position.copy(sun).multiplyScalar(6);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    const sc = sunLight.shadow.camera as THREE.OrthographicCamera;
    sc.left = sc.bottom = -1.6;
    sc.right = sc.top = 1.6;
    sc.near = 3;
    sc.far = 9;
    sunLight.shadow.bias = -0.002;
    scene.add(sunLight, sunLight.target);
    scene.add(new THREE.AmbientLight(0x6f8fbf, 0.12));

    const kit = createSatelliteKit();
    const satGroup = new THREE.Group();
    scene.add(satGroup);
    const sats = SATS.map((o) => {
      const s = kit.build();
      s.root.scale.setScalar(0);
      satGroup.add(s.root);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler((o.inc * Math.PI) / 180, (o.raan * Math.PI) / 180, 0, "YXZ"));
      return { ...o, ...s, q };
    });
    const satShow = { v: reduced ? 1 : 0 };
    const sp = new THREE.Vector3();
    const sv = new THREE.Vector3();
    const bx = new THREE.Vector3();
    const by = new THREE.Vector3();
    const bz = new THREE.Vector3();
    const basis = new THREE.Matrix4();
    const sunLocal = new THREE.Vector3();
    const updateSats = (t: number) => {
      for (const s of sats) {
        const a = (t / s.period) * Math.PI * 2 + s.phase;
        sp.set(Math.cos(a) * s.r, 0, Math.sin(a) * s.r).applyQuaternion(s.q);
        sv.set(-Math.sin(a), 0, Math.cos(a)).applyQuaternion(s.q); // velocity direction
        s.root.position.copy(sp);
        // +Z to nadir (dish faces the Earth), X along the orbit normal (array axis)
        bz.copy(sp).negate().normalize();
        bx.crossVectors(sp, sv).normalize();
        by.crossVectors(bz, bx).normalize();
        basis.makeBasis(bx, by, bz);
        s.root.quaternion.setFromRotationMatrix(basis);
        s.root.scale.setScalar(s.scale * satShow.v);
        // solar arrays rotate about X so their cells face the sun
        sunLocal.set(sun.dot(bx), sun.dot(by), sun.dot(bz));
        const ang = Math.atan2(sunLocal.z, sunLocal.y);
        s.wings.forEach((w) => (w.rotation.x = ang));
      }
    };

    /* site markers ------------------------------------------------------ */
    const siteLocal = SITES.map((s) => new THREE.Vector3(...latLonToVec3(s.lat, s.lon, R * 1.008)));
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
        size[i] = s.kind === "future" ? 34 : 52;
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
        })
      );
      const pts = new THREE.Points(markerGeo, m);
      pts.renderOrder = 2;
      spin.add(pts);
    }

    /* uplink beams: satellite -> teleport below it ------------------------ */
    const ACCENT = new THREE.Color(0x3fc5ff);
    const beamGeo = track(new THREE.CylinderGeometry(1, 0.12, 1, 20, 1, true));
    const beams = sats.map((_, k) => {
      const m = track(
        new THREE.ShaderMaterial({
          vertexShader: beamVert,
          fragmentShader: beamFrag,
          uniforms: { uTime: U.uTime, uFade: { value: 0 }, uPhase: { value: k * 0.37 }, uColor: { value: ACCENT } },
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
        })
      );
      const mesh = new THREE.Mesh(beamGeo, m);
      mesh.frustumCulled = false;
      mesh.visible = false;
      scene.add(mesh);
      return { mesh, mat: m, target: -1, fade: 0 };
    });
    const linkable = SITES.map((s, i) => (s.kind === "future" ? -1 : i)).filter((i) => i >= 0);
    const Y_AXIS = new THREE.Vector3(0, 1, 0);
    const bDir = new THREE.Vector3();
    const bTmp = new THREE.Vector3();
    const bUp = new THREE.Vector3();
    // how high the satellite is above the site's horizon (1 = straight overhead)
    const elevation = (site: THREE.Vector3, sat: THREE.Vector3) => bTmp.copy(sat).sub(site).normalize().dot(bUp.copy(site).normalize());

    /* signal rings on the site in focus ------------------------------------ */
    const rippleMat = track(
      new THREE.ShaderMaterial({
        vertexShader: rippleVert,
        fragmentShader: rippleFrag,
        uniforms: { uTime: U.uTime, uFade: { value: 0 }, uColor: { value: ACCENT } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    const ripple = new THREE.Mesh(track(new THREE.PlaneGeometry(1, 1)), rippleMat);
    ripple.scale.setScalar(0.26);
    ripple.renderOrder = 3;
    spin.add(ripple);

    /* sun glare on the limb ------------------------------------------------ */
    const glareTex = (() => {
      const cv = document.createElement("canvas");
      cv.width = cv.height = 256;
      const g = cv.getContext("2d")!;
      const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      rg.addColorStop(0, "rgba(255,255,255,1)");
      rg.addColorStop(0.08, "rgba(255,244,225,0.85)");
      rg.addColorStop(0.3, "rgba(150,200,255,0.18)");
      rg.addColorStop(1, "rgba(80,140,255,0)");
      g.fillStyle = rg;
      g.fillRect(0, 0, 256, 256);
      // thin anamorphic streak
      const lg = g.createLinearGradient(0, 0, 256, 0);
      lg.addColorStop(0, "rgba(160,210,255,0)");
      lg.addColorStop(0.5, "rgba(220,240,255,0.55)");
      lg.addColorStop(1, "rgba(160,210,255,0)");
      g.fillStyle = lg;
      g.fillRect(0, 126, 256, 4);
      const t = new THREE.CanvasTexture(cv);
      t.colorSpace = THREE.SRGBColorSpace;
      return track(t);
    })();
    const glareMat = track(new THREE.SpriteMaterial({ map: glareTex, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 }));
    const glare = new THREE.Sprite(glareMat);
    glare.position.set(sun.x, sun.y, 0).normalize().multiplyScalar(R * 1.02);
    glare.scale.setScalar(0.85);
    glare.renderOrder = 4;
    scene.add(glare);
    const glareShow = { v: reduced ? 1 : 0 };

    /* HTML labels pinned to the globe (teleports & towers only) --------- */
    const labelEls = [...labelHost.querySelectorAll<HTMLElement>("[data-site-label]")];
    const labelIdx = labelEls.map((el) => Number(el.dataset.idx));
    const labelInner = labelEls.map((el) => el.firstElementChild as HTMLElement);
    let labelSizes = labelInner.map((el) => [el.offsetWidth + 10, el.offsetHeight + 6]);
    const order = labelEls.map((_, k) => k).sort((a, b) => PRIORITY[SITES[labelIdx[a]].kind] - PRIORITY[SITES[labelIdx[b]].kind]);
    const appearOrder = SITES.map((_, i) => i).sort((a, b) => PRIORITY[SITES[a].kind] - PRIORITY[SITES[b].kind]);

    /* state ------------------------------------------------------------ */
    const intro = { spin: reduced ? 0 : -1.6, camZ: reduced ? CAM_Z : 8.5 };
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
      targetTilt = THREE.MathUtils.clamp((s.lat * Math.PI) / 180, -0.45, 0.65);
      labelEls.forEach((el, k) => el.classList.toggle("is-focus", labelIdx[k] === idx));
      ripple.position.copy(siteLocal[idx]).setLength(R * 1.0095);
      ripple.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), siteLocal[idx].clone().normalize());
      rippleMat.uniforms.uFade.value = 0;
      cbs.current.onFocusSite?.(s);
    };
    api.current = {
      focus: (city) => {
        const i = SITES.findIndex((s) => s.city === city);
        if (i < 0 || !started) return;
        if (i !== focusIdx) focusOn(i);
        pausedUntil = performance.now() + 8000;
      },
    };

    const start = () => {
      if (started) return;
      started = true;
      earth.visible = clouds.visible = true;
      labelSizes = labelInner.map((el) => [el.offsetWidth + 10, el.offsetHeight + 6]);
      cbs.current.onReady?.();
      if (reduced) {
        U.uReveal.value = 1;
        atmoMat.uniforms.uStrength.value = 1.3;
        labelInner.forEach((el) => (el.style.opacity = "1"));
        focusOn(SITES.findIndex((s) => s.city === TOUR[0]));
        lastTour = performance.now();
        return;
      }
      const ap = { v: 0 };
      anims.push(
        animate(U.uReveal, { value: [0, 1], duration: 1600, ease: "outQuad" }),
        animate(intro, { camZ: CAM_Z, spin: 0, duration: 2800, ease: "inOutCubic" }),
        animate(atmoMat.uniforms.uStrength, { value: [0, 1.3], duration: 2000, delay: 300, ease: "outSine" }),
        animate(satShow, { v: [0, 1], duration: 1400, delay: 2000, ease: "outCubic" }),
        animate(glareShow, { v: [0, 1], duration: 2200, delay: 1200, ease: "outSine" }),
        animate(ap, {
          v: SITES.length,
          duration: 1600,
          delay: 2200,
          ease: "inOutSine",
          onUpdate: () => {
            appearOrder.forEach((idx, rank) => (appear[idx] = THREE.MathUtils.clamp(ap.v - rank, 0, 1)));
            markerGeo.attributes.aAppear.needsUpdate = true;
          },
        }),
        animate(order.map((k) => labelInner[k]), {
          opacity: [0, 1],
          translateY: [6, 0],
          delay: stagger(60, { start: 2500 }),
          duration: 600,
          ease: "outCubic",
        })
      );
      setTimeout(() => {
        if (disposed) return;
        focusOn(SITES.findIndex((s) => s.city === TOUR[0]));
        lastTour = performance.now();
      }, 3400);
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
    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.style.cursor = "grabbing";
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
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
    // subtle parallax: the camera drifts with the pointer anywhere on the page
    const par = { x: 0, y: 0, tx: 0, ty: 0 };
    const onWinMove = (e: PointerEvent) => {
      par.tx = (e.clientX / window.innerWidth - 0.5) * 2;
      par.ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    if (!reduced) window.addEventListener("pointermove", onWinMove, { passive: true });
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
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
      labelSizes = labelInner.map((el) => [el.offsetWidth + 10, el.offsetHeight + 6]);
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
    const siteWorld = siteLocal.map(() => new THREE.Vector3());
    const placed: number[][] = [];

    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt; // satellites, clouds and pulses keep their normal pace with reduced motion too
      U.uTime.value = elapsed;

      // guided tour between teleports
      // the guided tour also runs with reduced motion (slow and gentle); only the fly-in and parallax are skipped
      if (started && !dragging && now > pausedUntil && now - lastTour > TOUR_MS) {
        tourStep = (tourStep + 1) % TOUR.length;
        focusOn(SITES.findIndex((s) => s.city === TOUR[tourStep]));
        lastTour = now;
      }

      if (!dragging) {
        vel *= 0.93;
        spinY += vel;
        targetSpin += vel;
        if (now < pausedUntil) targetSpin += dt * 0.03;
        spinY += (targetSpin - spinY) * 0.03;
        tiltX += (targetTilt - tiltX) * 0.03;
      }
      spin.rotation.y = spinY + intro.spin;
      tilt.rotation.x = tiltX;
      clouds.rotation.y += dt * 0.008;
      earthMat.uniforms.uCloudOffset.value = -clouds.rotation.y / (Math.PI * 2);

      updateSats(elapsed);
      par.x += (par.tx - par.x) * 0.035;
      par.y += (par.ty - par.y) * 0.035;
      camera.position.set(par.x * 0.28, -par.y * 0.2, intro.camZ);
      camera.lookAt(0, 0, 0);

      scene.updateMatrixWorld();
      for (let i = 0; i < siteLocal.length; i++) siteWorld[i].copy(siteLocal[i]).applyMatrix4(spin.matrixWorld);

      // uplinks: each satellite talks to the highest teleport in view (with hysteresis)
      sats.forEach((s, k) => {
        const b = beams[k];
        const sat = s.root.position;
        const keep = b.target >= 0 && elevation(siteWorld[b.target], sat) > 0.08 && sat.distanceTo(siteWorld[b.target]) < 1.0;
        let best = keep ? b.target : -1;
        if (!keep) {
          let bestE = 0.18;
          for (const i of linkable) {
            if (appear[i] < 1 || sat.distanceTo(siteWorld[i]) > 0.85) continue;
            const e = elevation(siteWorld[i], sat);
            if (e > bestE) {
              bestE = e;
              best = i;
            }
          }
        }
        const want = best >= 0 && best === b.target ? 1 : 0;
        b.fade += (want - b.fade) * Math.min(1, dt * 3);
        if (b.fade < 0.02 && best !== b.target) b.target = best; // switch once faded out
        b.mesh.visible = b.target >= 0 && b.fade > 0.01 && satShow.v > 0.5;
        if (b.mesh.visible) {
          bDir.copy(siteWorld[b.target]).sub(sat);
          const len = bDir.length();
          b.mesh.position.copy(sat).addScaledVector(bDir, 0.5);
          b.mesh.quaternion.setFromUnitVectors(Y_AXIS, bDir.normalize());
          b.mesh.scale.set(0.03, len, 0.03);
          b.mat.uniforms.uFade.value = b.fade * satShow.v;
        }
      });

      const rf = rippleMat.uniforms.uFade;
      rf.value += ((focusIdx >= 0 ? 1 : 0) - rf.value) * Math.min(1, dt * 2);
      glareMat.opacity = glareShow.v * (0.55 + 0.08 * Math.sin(elapsed * 0.6));

      // labels: project, hide on far side, avoid overlaps (focused first, then priority)
      placed.length = 0;
      const focusK = labelIdx.indexOf(focusIdx);
      const visit = focusK >= 0 ? [focusK, ...order.filter((k) => k !== focusK)] : order;
      for (const k of visit) {
        const i = labelIdx[k];
        const el = labelEls[k];
        tmpN.copy(siteWorld[i]).normalize();
        const facing = tmpN.dot(tmp.copy(camera.position).sub(siteWorld[i]).normalize());
        tmp.copy(siteWorld[i]).project(camera);
        const x = (tmp.x * 0.5 + 0.5) * W;
        const y = (-tmp.y * 0.5 + 0.5) * H;
        let show = facing > 0.35;
        const [lw, lh] = labelSizes[k];
        const rect = [x - lw / 2, y - lh - 9, x + lw / 2, y - 5];
        if (show) {
          for (const p of placed) {
            if (rect[0] < p[2] && rect[2] > p[0] && rect[1] < p[3] && rect[3] > p[1]) {
              show = k === focusK;
              break;
            }
          }
        }
        if (show) placed.push(rect);
        const op = show ? Math.min(1, (facing - 0.35) * 5) : 0;
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
      window.removeEventListener("pointermove", onWinMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      labelHost.removeEventListener("click", onLabelClick);
      disposables.forEach((d) => d.dispose());
      kit.dispose();
      renderer.dispose();
      canvas.remove();
    };
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0">
      <div ref={labelsRef} className="pointer-events-none absolute inset-0 overflow-hidden">
        {SITES.map((s, i) =>
          s.kind === "future" ? null : (
            <button
              key={s.city}
              type="button"
              data-site-label
              data-idx={i}
              className="globe-label"
              style={{ ["--c" as string]: KIND_META[s.kind].color, opacity: 0 }}
              aria-label={`${s.city}, ${s.country}`}
            >
              <span className="globe-label-inner" style={{ opacity: 0 }}>
                {s.city}
              </span>
            </button>
          )
        )}
      </div>
    </div>
  );
}
