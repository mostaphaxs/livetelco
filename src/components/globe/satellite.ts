import * as THREE from "three";

/*
  Procedural geostationary-style communication satellite (no model file to download).
  Local frame: +Z points at the Earth (nadir), X is the solar-array axis, Y is east/west.

  - bus wrapped in crinkled gold MLI foil, with a silver band
  - mirror (OSR) radiator panels on the ±X faces
  - two large deployable reflectors on the ±Y faces, each lit by a feed horn
  - nadir deck with a small dish and horn antennas; anti-nadir deck with the
    apogee thruster and star trackers
  - two solar-array wings (yoke + 3 panels): glassy blue cells in a metal frame,
    grid on the back. Wings rotate about X to track the sun.
*/

function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  return t;
}

function facets(ctx: CanvasRenderingContext2D, size: number, color: (v: number) => string, base: string) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < size * 2.2; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const s = size * (0.04 + Math.random() * 0.12);
    ctx.fillStyle = color(Math.random());
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + s * (Math.random() - 0.3), y + s * Math.random());
    ctx.lineTo(x - s * Math.random(), y + s * (Math.random() - 0.2));
    ctx.closePath();
    ctx.fill();
  }
  // a few crease lines
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = "#000";
  for (let i = 0; i < 18; i++) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * size, Math.random() * size);
    ctx.lineTo(Math.random() * size, Math.random() * size);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function makeTextures() {
  const goldMap = canvasTexture(256, 256, (ctx) => facets(ctx, 256, (v) => `hsl(${36 + v * 12}, ${60 + v * 25}%, ${30 + v * 34}%)`, "#b8862b"));
  const goldBump = canvasTexture(256, 256, (ctx) => facets(ctx, 256, (v) => `rgb(${(v * 255) | 0},${(v * 255) | 0},${(v * 255) | 0})`, "#808080"), false);
  const silverMap = canvasTexture(256, 256, (ctx) => facets(ctx, 256, (v) => `hsl(215, 8%, ${55 + v * 35}%)`, "#9aa3ad"));

  // optical solar reflector tiles: small mirrors with dark seams
  const osr = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#1c2128";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 8; j++) {
        const v = 200 + Math.random() * 40;
        ctx.fillStyle = `rgb(${v},${v + 4},${v + 10})`;
        ctx.fillRect(i * 32 + 1.5, j * 32 + 1.5, 29, 29);
      }
  });

  // solar array front: 8 x 6 cells, each with fine fingers
  const cells = canvasTexture(1024, 736, (ctx) => {
    ctx.fillStyle = "#c5ccd6";
    ctx.fillRect(0, 0, 1024, 736);
    const cw = 1024 / 8;
    const ch = 736 / 6;
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 6; j++) {
        const x = i * cw + 3;
        const y = j * ch + 3;
        const g = ctx.createLinearGradient(x, y, x + cw, y + ch);
        g.addColorStop(0, "#1b3a78");
        g.addColorStop(0.55, "#10275a");
        g.addColorStop(1, "#0a1b43");
        ctx.fillStyle = g;
        ctx.fillRect(x, y, cw - 6, ch - 6);
        ctx.fillStyle = "rgba(170,195,235,0.22)";
        for (let k = 1; k < 10; k++) ctx.fillRect(x + (k * (cw - 6)) / 10, y + 4, 1, ch - 14);
        ctx.fillStyle = "rgba(200,215,240,0.45)";
        ctx.fillRect(x, y + (ch - 6) / 2 - 1, cw - 6, 2); // bus bar
      }
  });
  // solar array back: light composite with a structural grid
  const back = canvasTexture(256, 184, (ctx) => {
    ctx.fillStyle = "#b9bec6";
    ctx.fillRect(0, 0, 256, 184);
    ctx.strokeStyle = "rgba(60,70,85,0.45)";
    ctx.lineWidth = 2;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo((i * 256) / 8, 0);
      ctx.lineTo((i * 256) / 8, 184);
      ctx.stroke();
    }
    for (let j = 0; j <= 4; j++) {
      ctx.beginPath();
      ctx.moveTo(0, (j * 184) / 4);
      ctx.lineTo(256, (j * 184) / 4);
      ctx.stroke();
    }
  });
  // reflector: fine radial mesh on a warm white surface
  const reflector = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#e3ddd0";
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = "rgba(120,110,95,0.25)";
    for (let i = 0; i < 24; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 10.7, 0);
      ctx.lineTo(i * 10.7, 256);
      ctx.stroke();
    }
  });
  return { goldMap, goldBump, silverMap, osr, cells, back, reflector };
}

export interface Satellite {
  root: THREE.Group;
  wings: THREE.Group[];
}

export function createSatelliteKit() {
  const tx = makeTextures();
  const M = {
    gold: new THREE.MeshStandardMaterial({ map: tx.goldMap, bumpMap: tx.goldBump, bumpScale: 1.4, metalness: 1, roughness: 0.3, envMapIntensity: 0.7 }),
    silverFoil: new THREE.MeshStandardMaterial({ map: tx.silverMap, bumpMap: tx.goldBump, bumpScale: 1, metalness: 1, roughness: 0.25, envMapIntensity: 0.7 }),
    osr: new THREE.MeshStandardMaterial({ map: tx.osr, metalness: 1, roughness: 0.08, envMapIntensity: 1.1 }),
    white: new THREE.MeshStandardMaterial({ color: 0xeef1f5, metalness: 0.05, roughness: 0.55, envMapIntensity: 0.4 }),
    silver: new THREE.MeshStandardMaterial({ color: 0xcfd6df, metalness: 1, roughness: 0.22, envMapIntensity: 0.8 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.85, roughness: 0.38, envMapIntensity: 0.6 }),
    cells: new THREE.MeshPhysicalMaterial({
      map: tx.cells,
      metalness: 0.35,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.1,
    }),
    back: new THREE.MeshStandardMaterial({ map: tx.back, metalness: 0.2, roughness: 0.7, envMapIntensity: 0.4 }),
    reflector: new THREE.MeshStandardMaterial({ map: tx.reflector, metalness: 0.05, roughness: 0.6, side: THREE.DoubleSide, envMapIntensity: 0.4 }),
  };

  const paraboloid = (radius: number, depth: number) => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 16; i++) {
      const r = (i / 16) * radius;
      pts.push(new THREE.Vector2(r, (r * r * depth) / (radius * radius)));
    }
    const g = new THREE.LatheGeometry(pts, 40);
    g.rotateX(-Math.PI / 2); // opening towards +Z
    return g;
  };
  const rod = (len: number, r: number) => new THREE.CylinderGeometry(r, r, len, 8);

  const G = {
    bus: new THREE.BoxGeometry(1, 1, 1.3),
    band: new THREE.BoxGeometry(1.03, 1.03, 0.12),
    radiator: new THREE.BoxGeometry(0.02, 0.86, 1.12),
    deck: new THREE.BoxGeometry(1.04, 1.04, 0.05),
    nozzle: new THREE.CylinderGeometry(0.07, 0.16, 0.26, 20, 1, true),
    tracker: new THREE.CylinderGeometry(0.055, 0.055, 0.2, 12),
    smallDish: paraboloid(0.26, 0.08),
    bigDish: paraboloid(0.7, 0.16),
    horn: new THREE.CylinderGeometry(0.035, 0.1, 0.24, 12, 1, true),
    arm: rod(1, 0.018),
    boom: rod(1, 0.028),
    panel: new THREE.BoxGeometry(1, 0.03, 0.72),
  };
  G.nozzle.rotateX(-Math.PI / 2); // bell opens towards -Z
  G.horn.rotateX(Math.PI / 2); // mouth towards +Z
  G.boom.rotateZ(Math.PI / 2); // along X
  // front (+Y) face shows the cells, back (-Y) the grid, edges are the frame
  const panelMats = [M.dark, M.dark, M.cells, M.back, M.dark, M.dark];

  const mesh = (g: THREE.BufferGeometry, m: THREE.Material | THREE.Material[], p?: [number, number, number]) => {
    const o = new THREE.Mesh(g, m);
    if (p) o.position.set(...p);
    return o;
  };
  // a rod between two points
  const strut = (a: THREE.Vector3, b: THREE.Vector3, m: THREE.Material, g = G.arm) => {
    const o = new THREE.Mesh(g, m);
    o.position.copy(a).add(b).multiplyScalar(0.5);
    o.scale.y = a.distanceTo(b);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    return o;
  };

  const build = (): Satellite => {
    const root = new THREE.Group();

    // bus
    root.add(mesh(G.bus, M.gold));
    root.add(mesh(G.band, M.silverFoil, [0, 0, -0.25]));
    root.add(mesh(G.radiator, M.osr, [0.51, 0, -0.02]), mesh(G.radiator, M.osr, [-0.51, 0, -0.02]));

    // anti-nadir deck: thruster + star trackers
    root.add(mesh(G.deck, M.white, [0, 0, -0.67]));
    root.add(mesh(G.nozzle, M.dark, [0, 0, -0.82]));
    const t1 = mesh(G.tracker, M.dark, [0.3, 0.32, -0.76]);
    t1.rotation.set(0.5, 0, 0.3);
    const t2 = mesh(G.tracker, M.dark, [-0.32, 0.28, -0.76]);
    t2.rotation.set(0.5, 0, -0.4);
    root.add(t1, t2);

    // nadir deck: small dish + horn cluster
    root.add(mesh(G.deck, M.white, [0, 0, 0.67]));
    const sd = mesh(G.smallDish, M.reflector, [0.18, -0.18, 0.72]);
    root.add(sd);
    root.add(mesh(G.horn, M.silver, [-0.24, 0.22, 0.8]), mesh(G.horn, M.silver, [-0.02, 0.3, 0.8]));

    // two large reflectors on the east / west faces, looking down at the Earth
    for (const side of [-1, 1]) {
      const dish = mesh(G.bigDish, M.reflector, [0, side * 1.12, 0.55]);
      dish.rotation.x = side * -0.55; // tilt outwards
      root.add(dish);
      root.add(strut(new THREE.Vector3(0, side * 0.5, 0.15), new THREE.Vector3(0, side * 1.05, 0.42), M.silver));
      root.add(strut(new THREE.Vector3(0.25, side * 0.5, -0.2), new THREE.Vector3(0.2, side * 1.0, 0.38), M.silver));
      const horn = mesh(G.horn, M.gold, [0, side * 0.62, 0.72]);
      horn.rotation.x = side * 0.9;
      root.add(horn);
    }

    // solar-array wings
    const wings: THREE.Group[] = [];
    for (const side of [-1, 1]) {
      root.add(strut(new THREE.Vector3(side * 0.52, 0, 0), new THREE.Vector3(side * 0.98, 0, 0), M.silver, G.boom));
      const wing = new THREE.Group();
      wing.position.x = side * 0.98;
      // V-shaped yoke from the drive to the first panel
      wing.add(strut(new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * 0.42, 0, 0.3), M.silver));
      wing.add(strut(new THREE.Vector3(0, 0, 0), new THREE.Vector3(side * 0.42, 0, -0.3), M.silver));
      for (let k = 0; k < 3; k++) wing.add(mesh(G.panel, panelMats, [side * (0.94 + k * 1.03), 0, 0]));
      root.add(wing);
      wings.push(wing);
    }

    root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).receiveShadow = true;
    });
    return { root, wings };
  };

  const dispose = () => {
    Object.values(M).forEach((m) => m.dispose());
    Object.values(G).forEach((g) => g.dispose());
    Object.values(tx).forEach((t) => t.dispose());
  };

  return { build, dispose };
}
