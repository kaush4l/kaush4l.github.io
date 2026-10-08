import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { SceneConfig, SceneView } from '../types';

/**
 * The desk scene, imperative half. Loaded only in the browser (DeskScene
 * dynamically imports this module inside an effect), so three never runs during
 * the static export. Everything it allocates is released by `dispose()`.
 */

export interface EngineOptions {
    host: HTMLElement;          // positioned wrapper; canvas is appended to it
    bubble: HTMLElement;        // DOM speech bubble, positioned by projection
    scene: SceneConfig;
    reactions: string[];
    initialView: SceneView;
    onReady: () => void;
    onAngle: (az: number, el: number, dist: number) => void;
    onUserOrbit: () => void;
}

export interface Engine {
    goTo: (view: SceneView) => void;
    setAutoRotate: (on: boolean) => void;
    dispose: () => void;
}

type Palette = Record<string, string>;
const DEG = Math.PI / 180;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Critically-ish damped spring — the "reaction" feel everywhere. */
class Spring {
    v = 0;
    constructor(public x: number, public t = x, public k = 140, public d = 18) {}
    step(dt: number) {
        const a = this.k * (this.t - this.x) - this.d * this.v;
        this.v += a * dt;
        this.x += this.v * dt;
        return this.x;
    }
    snap(v: number) { this.x = this.t = v; this.v = 0; }
    get moving() { return Math.abs(this.t - this.x) > 1e-4 || Math.abs(this.v) > 1e-4; }
}

function isDark() {
    const t = document.documentElement.dataset.theme;
    if (t === 'dark') return true;
    if (t === 'light') return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
}
function reducedMotion() {
    return document.documentElement.hasAttribute('data-reduce-motion')
        || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export async function createEngine(o: EngineOptions): Promise<Engine> {
    const { host, scene: cfg } = o;
    const mobile = window.matchMedia('(max-width: 767px), (pointer: coarse)').matches;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    let reduce = reducedMotion();
    let visible = true, raf = 0, last = performance.now(), dirty = true, disposed = false;
    let pal: Palette = isDark() ? cfg.colors.dark : cfg.colors.light;
    const c = (k: string, fb = '#888888') => new THREE.Color(pal[k] ?? cfg.colors.light[k] ?? fb);

    // ── renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.5 : 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const canvas = renderer.domElement;
    canvas.setAttribute('aria-hidden', 'true');
    canvas.className = 'ds-canvas';
    host.prepend(canvas);

    const scene = new THREE.Scene();
    scene.background = c('background');
    scene.fog = new THREE.Fog(c('background'), 7, 16);
    const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 60);

    const textures: THREE.Texture[] = [];
    const bindings: { key: string; color: THREE.Color; from: THREE.Color }[] = [];
    const bind = (key: string, color: THREE.Color) => { color.copy(c(key)); bindings.push({ key, color, from: color.clone() }); return color; };
    bind('background', scene.background as THREE.Color);
    bind('background', (scene.fog as THREE.Fog).color);

    const std = (key: string, p: THREE.MeshStandardMaterialParameters = {}) => {
        const m = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0, ...p });
        bind(key, m.color);
        return m;
    };
    const mesh = (g: THREE.BufferGeometry, m: THREE.Material, shadow = true) => {
        const x = new THREE.Mesh(g, m);
        x.castShadow = shadow; x.receiveShadow = true;
        return x;
    };

    // ── lights ──────────────────────────────────────────────────────────────
    const hemi = new THREE.HemisphereLight(c('ambient'), c('floor'), 0.9);
    bind('ambient', hemi.color); bind('floor', hemi.groundColor);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(c('key'), 2.4);
    bind('key', key.color);
    key.position.set(2.2, 4.2, 2.6);
    key.castShadow = true;
    key.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
    key.shadow.camera.left = -1.6; key.shadow.camera.right = 1.6;
    key.shadow.camera.top = 1.6; key.shadow.camera.bottom = -1.6;
    key.shadow.camera.near = 1; key.shadow.camera.far = 10;
    key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
    key.target.position.set(0, 0.8, 0);
    scene.add(key, key.target);
    const rim = new THREE.DirectionalLight(c('key'), 1.3);
    bind('key', rim.color);
    rim.position.set(-2.5, 2.6, -3.2);
    scene.add(rim);

    // ── floor + contact shadow ──────────────────────────────────────────────
    const floor = mesh(new THREE.CircleGeometry(14, 64), std('floor', { roughness: 0.95 }), false);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);
    const blob = document.createElement('canvas');
    blob.width = blob.height = 128;
    const bx = blob.getContext('2d')!;
    const grd = bx.createRadialGradient(64, 64, 4, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    bx.fillStyle = grd; bx.fillRect(0, 0, 128, 128);
    const blobTex = new THREE.CanvasTexture(blob); textures.push(blobTex);
    const contactMat = new THREE.MeshBasicMaterial({ alphaMap: blobTex, transparent: true, opacity: 0.22, depthWrite: false });
    bind('keyboard', contactMat.color);
    const contact = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), contactMat);
    contact.rotation.x = -Math.PI / 2; contact.position.y = 0.002;
    scene.add(contact);

    const root = new THREE.Group();
    scene.add(root);

    // ── desk ────────────────────────────────────────────────────────────────
    const TOP = 0.78;
    const desk = new THREE.Group();
    const top = mesh(new RoundedBoxGeometry(1.6, 0.05, 0.8, 4, 0.02), std('desk', { roughness: 0.55 }));
    top.position.y = TOP - 0.025;
    desk.add(top);
    const legMat = std('deskLeg', { roughness: 0.4, metalness: 0.6 });
    const legGeo = new THREE.CylinderGeometry(0.016, 0.012, TOP - 0.05, 16);
    for (const [x, z] of [[-0.72, -0.32], [0.72, -0.32], [-0.72, 0.32], [0.72, 0.32]]) {
        const l = mesh(legGeo, legMat); l.position.set(x, (TOP - 0.05) / 2, z); desk.add(l);
    }
    root.add(desk);

    // ── MacBook ─────────────────────────────────────────────────────────────
    const W = 0.62, D = 0.43, BH = 0.016, LT = 0.008;
    const mac = new THREE.Group();
    const MS = cfg.macScale;
    const PS = 1 + (MS - 1) * 0.7;   // props grow a little less than the Mac
    mac.scale.setScalar(MS);
    mac.position.set(-0.14, TOP, 0.0);
    mac.rotation.y = 0.12;
    const alu = std('aluminum', { roughness: 0.32, metalness: 0.75 });
    const base = mesh(new RoundedBoxGeometry(W, BH, D, 3, 0.006), alu);
    base.position.y = BH / 2;
    mac.add(base);
    const kbMat = std('keyboard', { roughness: 0.8 });
    const kb = mesh(new THREE.PlaneGeometry(W * 0.86, D * 0.4), kbMat, false);
    kb.rotation.x = -Math.PI / 2; kb.position.set(0, BH + 0.0006, -D * 0.17);
    mac.add(kb);
    const pad = mesh(new RoundedBoxGeometry(W * 0.36, 0.001, D * 0.32, 2, 0.0005), std('aluminum', { roughness: 0.2, metalness: 0.6 }), false);
    pad.position.set(0, BH + 0.0005, D * 0.27);
    mac.add(pad);
    const lidPivot = new THREE.Group();
    lidPivot.position.set(0, BH, -D / 2);
    const lid = mesh(new RoundedBoxGeometry(W, LT, D, 3, 0.004), alu);
    lid.position.set(0, LT / 2, D / 2);
    lidPivot.add(lid);
    const bezelMat = std('keyboard', { roughness: 0.3 });
    const bezel = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.97, D * 0.96), bezelMat);
    bezel.rotation.x = Math.PI / 2; bezel.position.set(0, -0.0005, D / 2);
    lidPivot.add(bezel);
    const notch = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.012), bezelMat);
    notch.rotation.x = Math.PI / 2; notch.position.set(0, -0.0012, D * 0.965 - 0.003);
    lidPivot.add(notch);
    // screen texture
    const sc = document.createElement('canvas');
    sc.width = 1024; sc.height = 680;
    const screenTex = new THREE.CanvasTexture(sc);
    screenTex.colorSpace = THREE.SRGBColorSpace;
    screenTex.anisotropy = 4;
    textures.push(screenTex);
    const screenMat = new THREE.MeshStandardMaterial({ map: screenTex, emissiveMap: screenTex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.9, roughness: 0.25 });
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(W * 0.92, D * 0.88), screenMat);
    screen.rotation.x = Math.PI / 2; screen.position.set(0, -0.001, D / 2 - D * 0.01);
    lidPivot.add(screen);
    mac.add(lidPivot);
    const screenGlow = new THREE.PointLight(c('screenAccent'), 0.35, 0.9, 2);
    bind('screenAccent', screenGlow.color);
    screenGlow.position.set(0, 0.2, 0.05);
    mac.add(screenGlow);
    root.add(mac);
    mac.traverse((x) => { x.userData.hit = 'mac'; });

    let highlight = -1;
    const lines = cfg.screenLines.length ? cfg.screenLines : [''];
    const bodyFont = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
    const displayFont = getComputedStyle(document.body).getPropertyValue('--font-display').trim() || 'Amarante, serif';
    const drawScreen = () => {
        const g = sc.getContext('2d')!;
        g.fillStyle = pal.screen ?? '#000'; g.fillRect(0, 0, sc.width, sc.height);
        const glow = g.createRadialGradient(sc.width * 0.5, sc.height * 0.3, 10, sc.width * 0.5, sc.height * 0.3, sc.width * 0.7);
        glow.addColorStop(0, `${pal.screenAccent ?? '#2997FF'}40`); glow.addColorStop(1, `${pal.screenAccent ?? '#2997FF'}00`);
        g.fillStyle = glow; g.fillRect(0, 0, sc.width, sc.height);
        g.textAlign = 'center'; g.textBaseline = 'middle';
        lines.forEach((line, i) => {
            const y = sc.height * (i === 0 ? 0.36 : 0.5 + i * 0.1);
            const size = i === 0 ? 84 : 40;
            g.font = i === 0 ? `${size}px ${displayFont}` : `500 ${size}px ${bodyFont}`;
            const hl = i === highlight;
            if (hl) {
                const w = g.measureText(line).width + 48;
                g.fillStyle = `${pal.screenAccent ?? '#2997FF'}33`;
                g.beginPath(); g.roundRect(sc.width / 2 - w / 2, y - size * 0.75, w, size * 1.5, size * 0.4); g.fill();
            }
            g.fillStyle = hl ? (pal.screenAccent ?? '#2997FF') : (pal.screenText ?? '#fff');
            g.globalAlpha = i === 0 || hl ? 1 : 0.72;
            g.fillText(line, sc.width / 2, y);
            g.globalAlpha = 1;
        });
        screenTex.needsUpdate = true;
    };
    drawScreen();
    try { await document.fonts.load(`48px ${displayFont}`); } catch { /* fallback font is fine */ }
    drawScreen();

    // ── mug + steam ─────────────────────────────────────────────────────────
    const mug = new THREE.Group();
    mug.scale.setScalar(PS);
    mug.position.set(-0.66, TOP, 0.26);
    const mugMat = std('mug', { roughness: 0.35 });
    const cup = mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.1, 32, 1, true), mugMat);
    mugMat.side = THREE.DoubleSide;
    cup.position.y = 0.05; mug.add(cup);
    const mugBottom = mesh(new THREE.CircleGeometry(0.038, 32), mugMat); mugBottom.rotation.x = -Math.PI / 2; mugBottom.position.y = 0.004; mug.add(mugBottom);
    const coffee = mesh(new THREE.CircleGeometry(0.04, 32), std('desk', { roughness: 0.2 }), false);
    coffee.rotation.x = -Math.PI / 2; coffee.position.y = 0.085; mug.add(coffee);
    const handle = mesh(new THREE.TorusGeometry(0.026, 0.007, 12, 24, Math.PI), mugMat);
    handle.rotation.z = -Math.PI / 2; handle.position.set(0.042, 0.05, 0); mug.add(handle);
    root.add(mug);
    const STEAM = 22;
    const steamPos = new Float32Array(STEAM * 3);
    const steamLife = Array.from({ length: STEAM }, (_, i) => i / STEAM);
    const steamSeed = Array.from({ length: STEAM }, () => Math.random() * Math.PI * 2);
    const steamGeo = new THREE.BufferGeometry();
    steamGeo.setAttribute('position', new THREE.BufferAttribute(steamPos, 3));
    const steamMat = new THREE.PointsMaterial({ size: 0.045, map: blobTex, alphaMap: blobTex, transparent: true, opacity: 0.32, depthWrite: false });
    bind('steam', steamMat.color);
    const steam = new THREE.Points(steamGeo, steamMat);
    steam.scale.setScalar(PS);
    steam.position.set(-0.66, TOP + 0.09 * PS, 0.26);
    root.add(steam);

    // ── plant ───────────────────────────────────────────────────────────────
    const plant = new THREE.Group();
    plant.scale.setScalar(PS);
    plant.position.set(0.66, TOP, -0.27);
    const pot = mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.13, 32), std('pot', { roughness: 0.8 }));
    pot.position.y = 0.065; plant.add(pot);
    const leafMat = std('plant', { roughness: 0.55 });
    const leafGeo = new THREE.SphereGeometry(0.05, 16, 12);
    const leaves: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const leaf = mesh(leafGeo, leafMat);
        const h = 0.17 + (i % 3) * 0.05;
        leaf.scale.set(0.45, 1.6, 0.25);
        leaf.position.set(Math.cos(a) * 0.04, h, Math.sin(a) * 0.04);
        leaf.rotation.set(Math.sin(a) * 0.5, -a, Math.cos(a) * -0.5);
        plant.add(leaf); leaves.push(leaf);
    }
    root.add(plant);

    // ── lamp ────────────────────────────────────────────────────────────────
    const lamp = new THREE.Group();
    lamp.scale.setScalar(PS);
    lamp.position.set(-0.66, TOP, -0.27);
    lamp.rotation.y = 0.6;
    const lampMat = std('lamp', { roughness: 0.35, metalness: 0.5 });
    const lb = mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.015, 32), lampMat); lb.position.y = 0.0075; lamp.add(lb);
    const arm1 = mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.34, 12), lampMat);
    arm1.position.set(0, 0.17, -0.03); arm1.rotation.x = -0.2; lamp.add(arm1);
    const arm2 = mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.26, 12), lampMat);
    arm2.position.set(0, 0.36, 0.06); arm2.rotation.x = 1.0; lamp.add(arm2);
    const head = mesh(new THREE.ConeGeometry(0.06, 0.09, 32, 1, true), lampMat);
    lampMat.side = THREE.DoubleSide;
    head.position.set(0, 0.42, 0.18); head.rotation.x = 0.5; lamp.add(head);
    const bulbMat = new THREE.MeshStandardMaterial({ emissiveIntensity: 2.2 });
    bind('lampLight', bulbMat.color); bind('lampLight', bulbMat.emissive);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 12), bulbMat);
    bulb.position.set(0, 0.405, 0.19); lamp.add(bulb);
    const spot = new THREE.SpotLight(c('lampLight'), 3.2, 1.8, 0.75, 0.6, 1.4);
    bind('lampLight', spot.color);
    spot.position.set(0, 0.4, 0.19);
    spot.target.position.set(0, -0.4, 0.5);
    spot.castShadow = !mobile;
    spot.shadow.mapSize.set(512, 512);
    lamp.add(spot, spot.target);
    root.add(lamp);

    // ── figure standee ──────────────────────────────────────────────────────
    const FH = cfg.figure.height, FW = FH * (737 / 1290);
    const figTex = await new THREE.TextureLoader().loadAsync(cfg.figure.src).catch(() => null);
    const figure = new THREE.Group();          // placement + yaw
    figure.position.set(0.42, TOP, 0.08);
    const body = new THREE.Group();            // hop / squash / spin
    figure.add(body);
    const figGeo = new THREE.PlaneGeometry(FW, FH);
    figGeo.translate(0, FH / 2, 0);
    let figAspect = 737 / 1290;
    if (figTex) {
        figTex.colorSpace = THREE.SRGBColorSpace;
        figTex.anisotropy = 4;
        textures.push(figTex);
        const img = figTex.image as { width?: number; height?: number } | undefined;
        if (img?.width && img?.height) figAspect = img.width / img.height;
        const front = new THREE.Mesh(figGeo, new THREE.MeshStandardMaterial({ map: figTex, alphaTest: 0.5, side: THREE.FrontSide, roughness: 0.7 }));
        front.castShadow = true;
        front.customDepthMaterial = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: figTex, alphaTest: 0.5 });
        front.position.z = 0.003;
        // back plate: same silhouette, tinted dark — reads as the cardboard back of a cut-out.
        const backMat = new THREE.MeshStandardMaterial({ map: figTex, alphaTest: 0.5, side: THREE.FrontSide, roughness: 0.9, emissiveIntensity: 0.3 });
        bind('figureBack', backMat.color); bind('figureBack', backMat.emissive);
        const back = new THREE.Mesh(figGeo, backMat);
        back.rotation.y = Math.PI; back.position.z = -0.003;
        body.add(front, back);
        body.scale.x = figAspect / (737 / 1290);
    }
    // small stand foot
    const foot = mesh(new RoundedBoxGeometry(0.16, 0.008, 0.08, 2, 0.003), std('deskLeg', { roughness: 0.4, metalness: 0.5 }));
    foot.position.y = 0.004; figure.add(foot);
    figure.traverse((x) => { x.userData.hit = 'figure'; });
    root.add(figure);
    const bubbleAnchor = new THREE.Vector3();

    // ── camera + controls ───────────────────────────────────────────────────
    const target = new THREE.Vector3(0.05, TOP + 0.3, 0);
    const controls = new OrbitControls(camera, canvas);
    canvas.style.touchAction = 'pan-y';   // one-finger vertical = page scroll, horizontal = orbit
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.rotateSpeed = 0.7;
    controls.enableZoom = false;   // wheel scrolls the page; ctrl/⌘+wheel zooms (below)
    let fit = 1;                   // portrait canvases pull the camera back so the desk fits
    const MIN_D = 1.6, MAX_D = 6;
    controls.minPolarAngle = 0.08;
    controls.maxPolarAngle = Math.PI / 2 + 0.06;
    controls.autoRotateSpeed = cfg.autoRotateSpeed;
    controls.autoRotate = cfg.autoRotate && !reduce;

    const sph = () => {
        const off = camera.position.clone().sub(controls.target);
        const dist = off.length();
        return { az: Math.atan2(off.x, off.z), el: Math.asin(clamp(off.y / dist, -1, 1)), dist: dist / fit };
    };
    const place = (az: number, el: number, logical: number) => {
        const dist = logical * fit;
        camera.position.set(
            controls.target.x + dist * Math.cos(el) * Math.sin(az),
            controls.target.y + dist * Math.sin(el),
            controls.target.z + dist * Math.cos(el) * Math.cos(az),
        );
        camera.lookAt(controls.target);
    };
    place(o.initialView.azimuth * DEG, o.initialView.elevation * DEG, o.initialView.distance);
    controls.update();

    let fly: { az: Spring; el: Spring; dist: Spring } | null = null;
    const goTo = (v: SceneView) => {
        const s = sph();
        const az = s.az + wrap(v.azimuth * DEG - s.az);
        if (reduce) { place(az, v.elevation * DEG, v.distance); controls.update(); fly = null; dirty = true; return; }
        fly = { az: new Spring(s.az, az, 60, 14), el: new Spring(s.el, v.elevation * DEG, 60, 14), dist: new Spring(s.dist, v.distance, 60, 14) };
    };
    controls.addEventListener('start', () => { fly = null; o.onUserOrbit(); });
    controls.addEventListener('change', () => { dirty = true; });

    // ── interaction ─────────────────────────────────────────────────────────
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const hitables: THREE.Object3D[] = [];
    mac.traverse((x) => { if ((x as THREE.Mesh).isMesh) hitables.push(x); });
    figure.traverse((x) => { if ((x as THREE.Mesh).isMesh) hitables.push(x); });
    const pick = (e: PointerEvent): string | null => {
        const r = canvas.getBoundingClientRect();
        ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(hitables, false)[0];
        return (hit?.object.userData.hit as string) ?? null;
    };
    const pointer = { x: 0, y: 0 };
    const yaw = new Spring(0, 0, 60, 12);
    const parX = new Spring(0, 0, 40, 12), parY = new Spring(0, 0, 40, 12);
    const lidA = new Spring(105 * DEG, 105 * DEG, 180, 13);
    const zoom = new Spring(1, 1, 50, 14), tilt = new Spring(0, 0, 50, 14);
    let hopT = -1, reactionIdx = 0, bubbleUntil = 0;
    let winkTimer = 0;
    let down: { x: number; y: number; t: number } | null = null;

    const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        pointer.x = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
        pointer.y = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
        if (e.pointerType === 'mouse' && !down) canvas.style.cursor = pick(e) ? 'pointer' : 'grab';
        dirty = true;
    };
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; if (e.pointerType === 'mouse') canvas.style.cursor = 'grabbing'; };
    const onUp = (e: PointerEvent) => {
        const d = down; down = null;
        if (e.pointerType === 'mouse') canvas.style.cursor = 'grab';
        if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6 || performance.now() - d.t > 450) return;
        const what = pick(e);
        if (what === 'figure') {
            onMove(e);
            hopT = reduce ? -1 : 0;
            const text = o.reactions.length ? o.reactions[reactionIdx++ % o.reactions.length] : '';
            if (text) { o.bubble.textContent = text; bubbleUntil = performance.now() + 2600; o.bubble.dataset.show = 'true'; }
        } else if (what === 'mac') {
            highlight = (highlight + 1) % lines.length;
            drawScreen();
            if (!reduce) {
                lidA.t = 18 * DEG;
                window.clearTimeout(winkTimer);
                winkTimer = window.setTimeout(() => { lidA.t = 105 * DEG; }, 200);
            }
        }
        dirty = true;
    };
    const onWheel = (e: WheelEvent) => {
        if (!e.ctrlKey && !e.metaKey) return;   // plain wheel = page scroll
        e.preventDefault();
        fly = null;
        const s = sph();
        place(s.az, s.el, clamp(s.dist * Math.exp(e.deltaY * 0.002), MIN_D, MAX_D));
        controls.update();
        o.onUserOrbit();
        kick();
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointerleave', () => { pointer.x = 0; pointer.y = 0; });

    // scroll-linked: dolly + tilt as the hero leaves the viewport
    const scrollHost = host.parentElement ?? host;
    const onScroll = () => {
        const r = scrollHost.getBoundingClientRect();
        const p = clamp(-r.top / Math.max(1, r.height), 0, 1);
        zoom.t = 1 + 0.22 * p; tilt.t = p * 0.14;
        if (reduce) { zoom.snap(zoom.t); tilt.snap(tilt.t); }
        dirty = true;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // ── theme / motion observers ────────────────────────────────────────────
    let themeT = 1;
    const retheme = () => {
        const next = isDark() ? cfg.colors.dark : cfg.colors.light;
        reduce = reducedMotion();
        controls.autoRotate = controls.autoRotate && !reduce;
        if (next === pal) return;
        pal = next;
        for (const b of bindings) b.from.copy(b.color);
        themeT = reduce ? 1 : 0;
        if (reduce) for (const b of bindings) b.color.copy(c(b.key));
        drawScreen();
        dirty = true;
    };
    const mo = new MutationObserver(retheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'data-reduce-motion', 'class'] });
    const mqDark = window.matchMedia('(prefers-color-scheme: dark)');
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    mqDark.addEventListener('change', retheme);
    mqMotion.addEventListener('change', retheme);

    // ── sizing + visibility ─────────────────────────────────────────────────
    const resize = () => {
        const w = host.clientWidth || 1, h = host.clientHeight || 1;
        renderer.setSize(w, h, false);
        const s0 = sph();
        fit = Math.pow(Math.max(1, 1.4 / (w / h)), 0.85);
        controls.minDistance = MIN_D * fit; controls.maxDistance = MAX_D * fit;
        place(s0.az, s0.el, s0.dist);
        controls.update();
        camera.aspect = w / h;
        if (w / h > cfg.framing.minAspect) camera.setViewOffset(w, h, -cfg.framing.offsetX * w, 0, w, h);
        else camera.clearViewOffset();
        camera.updateProjectionMatrix();
        dirty = true;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); });
    io.observe(host);
    const onVis = () => kick();
    document.addEventListener('visibilitychange', onVis);

    let lastAngle = '';
    const tmp = new THREE.Vector3();
    const frame = (now: number) => {
        raf = 0;
        if (disposed || !visible || document.hidden) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const t = now / 1000;
        let anim = false;

        if (fly) {
            place(fly.az.step(dt), fly.el.step(dt), fly.dist.step(dt));
            if (!fly.az.moving && !fly.el.moving && !fly.dist.moving) fly = null;
            anim = true;
        }
        controls.update(dt);
        if (controls.autoRotate) anim = true;

        // reactive springs
        yaw.t = reduce ? 0 : clamp(pointer.x * 25, -25, 25) * DEG;
        parX.t = finePointer && !reduce ? pointer.x : 0;
        parY.t = finePointer && !reduce ? pointer.y : 0;
        for (const s of [yaw, parX, parY, lidA, zoom, tilt]) { s.step(dt); anim ||= s.moving; }
        figure.rotation.y = yaw.x - 0.15;
        root.rotation.y = parX.x * 0.04;
        root.rotation.x = parY.x * 0.02 + tilt.x;
        if (Math.abs(camera.zoom - zoom.x) > 1e-4) { camera.zoom = zoom.x; camera.updateProjectionMatrix(); }
        lidPivot.rotation.x = -lidA.x;

        // figure idle + hop
        let sy = 1, sxz = 1, hy = 0, spin = 0;
        if (!reduce) {
            sy = 1 + Math.sin(t * 1.7) * 0.012; sxz = 1 - Math.sin(t * 1.7) * 0.006;
            hy = Math.sin(t * 1.7) * 0.003;
            body.rotation.z = Math.sin(t * 0.7) * 0.014;
            anim = true;
        }
        if (hopT >= 0) {
            hopT += dt / 1.05;
            const h = hopT;
            if (h < 0.15) { const q = Math.sin((h / 0.15) * Math.PI); sy *= 1 - 0.14 * q; sxz *= 1 + 0.08 * q; }
            else if (h < 0.85) {
                const a = (h - 0.15) / 0.7;
                hy += Math.sin(a * Math.PI) * 0.24;
                const st = Math.sin(Math.min(1, a * 2) * Math.PI) * 0.08; sy *= 1 + st; sxz *= 1 - st * 0.5;
                spin = (a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2) * Math.PI * 2;
            } else if (h < 1) { const q = Math.sin(((h - 0.85) / 0.15) * Math.PI); sy *= 1 - 0.1 * q; sxz *= 1 + 0.06 * q; }
            else hopT = -1;
            anim = true;
        }
        body.position.y = hy;
        body.rotation.y = spin;
        body.scale.y = sy;
        body.scale.z = sxz;
        body.scale.x = sxz * (figAspect / (737 / 1290));
        for (let i = 0; i < leaves.length && !reduce; i++) leaves[i].rotation.z = Math.cos(i) * -0.5 + Math.sin(t * 1.1 + i) * 0.04;

        // steam
        steam.visible = !reduce;
        if (!reduce) {
            for (let i = 0; i < STEAM; i++) {
                steamLife[i] = (steamLife[i] + dt * 0.35) % 1;
                const l = steamLife[i], s = steamSeed[i];
                steamPos[i * 3] = Math.sin(s + l * 5 + t) * 0.012 * (1 + l * 2);
                steamPos[i * 3 + 1] = l * 0.22;
                steamPos[i * 3 + 2] = Math.cos(s + l * 4) * 0.01 * (1 + l * 2);
            }
            steamGeo.attributes.position.needsUpdate = true;
            steamMat.opacity = 0.3;
        }

        // theme lerp
        if (themeT < 1) {
            themeT = Math.min(1, themeT + dt / 0.6);
            const e = 1 - Math.pow(1 - themeT, 3);
            for (const b of bindings) b.color.copy(b.from).lerp(c(b.key), e);
            anim = true;
        }

        // bubble
        if (o.bubble.dataset.show === 'true') {
            if (now > bubbleUntil) o.bubble.dataset.show = 'false';
            body.updateWorldMatrix(true, false);
            tmp.set(0, FH * 1.02, 0);
            bubbleAnchor.copy(tmp).applyMatrix4(figure.matrixWorld).project(camera);
            const x = (bubbleAnchor.x * 0.5 + 0.5) * host.clientWidth;
            const y = (-bubbleAnchor.y * 0.5 + 0.5) * host.clientHeight;
            o.bubble.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
            anim = true;
        }

        if (anim || dirty) renderer.render(scene, camera);
        dirty = false;

        const s = sph();
        const az = Math.round(s.az / DEG), el = Math.round(s.el / DEG), dist = Math.round(s.dist * 10) / 10;
        const tag = `${az}|${el}|${dist}`;
        if (tag !== lastAngle) { lastAngle = tag; o.onAngle(az, el, dist); }

        if (anim || controls.autoRotate || fly) kick();
        else idleTimer = window.setTimeout(kick, 250); // cheap poll for damping tail / pointer
    };
    let idleTimer = 0;
    function kick() {
        if (disposed || raf || !visible || document.hidden) return;
        window.clearTimeout(idleTimer);
        last = performance.now();
        raf = requestAnimationFrame(frame);
    }
    controls.addEventListener('change', kick);
    canvas.addEventListener('pointermove', kick);
    canvas.addEventListener('pointerup', kick);
    window.addEventListener('scroll', kick, { passive: true });

    renderer.render(scene, camera);
    o.onReady();
    kick();

    return {
        goTo: (v) => { goTo(v); kick(); },
        setAutoRotate: (on) => { controls.autoRotate = on && !reduce; kick(); },
        dispose: () => {
            disposed = true;
            cancelAnimationFrame(raf);
            window.clearTimeout(idleTimer);
            window.clearTimeout(winkTimer);
            io.disconnect(); ro.disconnect(); mo.disconnect();
            mqDark.removeEventListener('change', retheme);
            mqMotion.removeEventListener('change', retheme);
            document.removeEventListener('visibilitychange', onVis);
            window.removeEventListener('scroll', onScroll);
            window.removeEventListener('scroll', kick);
            controls.dispose();
            const mats = new Set<THREE.Material>();
            scene.traverse((x) => {
                const m = x as THREE.Mesh;
                if (m.geometry) m.geometry.dispose();
                const mm = m.material;
                if (Array.isArray(mm)) mm.forEach((q) => mats.add(q)); else if (mm) mats.add(mm);
                if ((m as unknown as { customDepthMaterial?: THREE.Material }).customDepthMaterial) mats.add(m.customDepthMaterial!);
                const l = x as THREE.SpotLight;
                if (l.isLight && l.shadow?.map) l.shadow.map.dispose();
            });
            mats.forEach((m) => m.dispose());
            textures.forEach((t) => t.dispose());
            renderer.dispose();
            renderer.forceContextLoss();
            canvas.remove();
        },
    };
}
