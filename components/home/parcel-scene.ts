import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export type ParcelSceneState = { focused: boolean; packed: boolean; label: string };
export type ParcelScene = { update: (state: ParcelSceneState) => void; rotate: (direction: number) => void; dispose: () => void };

/** A decorative, locally drawn scene. It never requests product or shipping data. */
export function createParcelScene(host: HTMLElement, initial: ParcelSceneState, onUnavailable: () => void, onReady: () => void): ParcelScene {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  const scene = new THREE.Scene();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  let frame = 0;
  let disposed = false;
  let lost = false;
  let visible = true;
  let observer: IntersectionObserver | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let preference: MediaQueryList | undefined;
  let cleanupListeners = () => {};

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frame);
    observer?.disconnect();
    resizeObserver?.disconnect();
    cleanupListeners();
    geometries.forEach(item => item.dispose());
    materials.forEach(item => item.dispose());
    textures.forEach(item => item.dispose());
    renderer.dispose();
    renderer.domElement.remove();
  }

  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);
    const camera = new THREE.OrthographicCamera(-3.25, 3.25, 3.1, -3.1, 0.1, 40);
    camera.position.set(4, 2.8, 8);
    camera.lookAt(0, -.05, 0);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x98a8ca, 2.8));
    const key = new THREE.DirectionalLight(0xfff4df, 4);
    key.position.set(-3, 6, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xc8ddff, 2);
    rim.position.set(4, 2, -4);
    scene.add(rim);

    function material(color: number, roughness = .65) {
      const result = new THREE.MeshStandardMaterial({ color, roughness });
      materials.add(result);
      return result;
    }
    const cardboard = material(0xe9ad6a);
    const tape = material(0xfff3d4);
    const blue = material(0x2467ed, .38);
    const coral = material(0xfa765f);
    const cream = material(0xfffdf8);
    const grid = material(0x8cbbff);
    function mesh(geometry: THREE.BufferGeometry, surface: THREE.Material, parent: THREE.Object3D = scene) {
      geometries.add(geometry);
      const result = new THREE.Mesh(geometry, surface);
      parent.add(result);
      return result;
    }
    function box(x: number, y: number, z: number, surface: THREE.Material, parent: THREE.Object3D) {
      return mesh(new RoundedBoxGeometry(x, y, z, 3, .055), surface, parent);
    }
    const world = new THREE.Group();
    world.position.set(0, -1.15, -.25);
    world.rotation.z = -.2;
    scene.add(world);
    mesh(new THREE.SphereGeometry(1.62, 48, 32), blue, world);
    // The stylised graticule is intentionally not a map of supported routes.
    for (const latitude of [-.8, -.4, 0, .4, .8]) {
      const ring = mesh(new THREE.TorusGeometry(1.626 * Math.cos(latitude), .009, 5, 80), grid, world);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 1.626 * Math.sin(latitude);
    }
    for (let longitude = 0; longitude < 6; longitude++) {
      const ring = mesh(new THREE.TorusGeometry(1.626, .009, 5, 80), grid, world);
      ring.rotation.y = longitude * Math.PI / 6;
    }
    const orbit = mesh(new THREE.TorusGeometry(2.13, .023, 7, 100), coral, world);
    orbit.rotation.set(1.18, -.12, .3);
    const moon = mesh(new THREE.SphereGeometry(.15, 16, 12), coral, world);
    moon.position.set(-1.85, .8, .75);

    const parcel = new THREE.Group();
    parcel.position.set(0, .95, .65);
    parcel.rotation.set(.02, -.16, -.12);
    scene.add(parcel);
    box(1.95, 1.58, 1.55, cardboard, parcel);
    const lid = new THREE.Group();
    lid.position.set(0, .79, -.775);
    parcel.add(lid);
    const lidBoard = box(2, .085, 1.59, cardboard, lid);
    lidBoard.position.z = .775;
    const topTape = box(.34, .012, 1.6, tape, lid);
    topTape.position.set(.22, .05, .775);
    const frontTape = box(.34, .35, .014, tape, parcel);
    frontTape.position.set(.22, .61, .783);

    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 768;
    labelCanvas.height = 416;
    const pen = labelCanvas.getContext('2d');
    if (!pen) throw new Error('Canvas unavailable');
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    labelTexture.colorSpace = THREE.SRGBColorSpace;
    textures.add(labelTexture);
    const labelMaterial = new THREE.MeshStandardMaterial({ map: labelTexture, roughness: .85 });
    materials.add(labelMaterial);
    const label = mesh(new THREE.PlaneGeometry(1.56, .845), labelMaterial, parcel);
    label.position.set(0, -.12, .79);
    function drawLabel(value: string) {
      if (!pen) return;
      pen.fillStyle = '#fffdf8';
      pen.fillRect(0, 0, 768, 416);
      pen.fillStyle = '#2467ed';
      pen.font = 'bold 58px Arial';
      pen.fillText('PayNShip', 42, 90);
      pen.strokeStyle = '#d5deeb';
      pen.lineWidth = 3;
      pen.beginPath(); pen.moveTo(42, 122); pen.lineTo(720, 122); pen.stroke();
      pen.fillStyle = '#526070';
      pen.font = '23px Arial';
      pen.fillText('FROM KOREA, WITH CARE', 42, 175);
      pen.fillStyle = '#192c43';
      pen.font = 'bold 34px Arial';
      pen.fillText(value, 42, 231, 676);
      for (let i = 0; i < 64; i++) {
        const width = i % 3 === 0 ? 5 : 2;
        pen.fillRect(42 + i * 7, 286, width, i % 4 === 0 ? 70 : 60);
      }
      pen.fillStyle = '#fa765f';
      pen.beginPath(); pen.arc(653, 321, 42, 0, Math.PI * 2); pen.fill();
      pen.strokeStyle = '#192c43'; pen.lineWidth = 4;
      pen.beginPath(); pen.moveTo(636, 332); pen.lineTo(667, 304); pen.moveTo(640, 304); pen.lineTo(667, 304); pen.lineTo(667, 330); pen.stroke();
      labelTexture.needsUpdate = true;
    }
    drawLabel(initial.label);

    // Small parcels make the scene read as a delivery service at a glance.
    const satellite = new THREE.Group();
    scene.add(satellite);
    satellite.position.set(2.05, .05, -.05);
    satellite.rotation.set(.2, -.3, .2);
    box(.48, .46, .45, coral, satellite);
    box(.1, .47, .46, cream, satellite);
    const small = new THREE.Group();
    small.position.set(-1.9, .05, 1.15);
    small.rotation.set(.1, .5, -.2);
    scene.add(small);
    box(.38, .38, .38, cream, small);
    box(.085, .39, .39, blue, small);

    preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    let state = initial;
    let targetRotation = -.16;
    const started = performance.now();
    let animateUntil = preference.matches ? 0 : started + 4000;
    let lastTime = started;
    let firstRender = true;
    function render(now: number) {
      frame = 0;
      if (disposed || lost || !visible || document.hidden) return;
      const reduced = preference?.matches;
      const amount = reduced ? 1 : 1 - Math.exp(-Math.min(now - lastTime, 80) / 90);
      lastTime = now;
      parcel.rotation.y += (targetRotation - parcel.rotation.y) * amount;
      const targetLid = state.focused && !state.packed ? -.5 : 0;
      lid.rotation.x += (targetLid - lid.rotation.x) * amount;
      const intro = !reduced && now < started + 4000 ? Math.sin(Math.PI * (now - started) / 4000) : 0;
      parcel.position.y = .95 + intro * .12;
      world.rotation.y = intro * .12;
      try {
        renderer.render(scene, camera);
      } catch {
        dispose();
        onUnavailable();
        return;
      }
      if (firstRender) { firstRender = false; onReady(); }
      if (!reduced && now < animateUntil) frame = requestAnimationFrame(render);
    }
    function requestRender(duration = 750) {
      if (disposed || lost) return;
      animateUntil = Math.max(animateUntil, performance.now() + duration);
      if (!frame) frame = requestAnimationFrame(render);
    }
    function resize() {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (!width || !height) return;
      renderer.setSize(width, height, false);
      const ratio = width / height;
      camera.left = -3.1 * ratio;
      camera.right = 3.1 * ratio;
      camera.updateProjectionMatrix();
      requestRender(0);
    }
    function visibilityChanged() {
      if (document.hidden) { cancelAnimationFrame(frame); frame = 0; }
      else requestRender();
    }
    function motionChanged() {
      cancelAnimationFrame(frame); frame = 0;
      animateUntil = 0;
      requestRender(0);
    }
    function contextLost(event: Event) {
      event.preventDefault();
      lost = true;
      dispose();
      onUnavailable();
    }
    renderer.domElement.addEventListener('webglcontextlost', contextLost);
    document.addEventListener('visibilitychange', visibilityChanged);
    preference.addEventListener('change', motionChanged);
    cleanupListeners = () => {
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      document.removeEventListener('visibilitychange', visibilityChanged);
      preference?.removeEventListener('change', motionChanged);
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) requestRender();
      else { cancelAnimationFrame(frame); frame = 0; }
    });
    observer.observe(host);
    resize();
    return {
      update(next) {
        if (disposed) return;
        if (next.label !== state.label) drawLabel(next.label);
        state = next;
        requestRender();
      },
      rotate(direction) { targetRotation += Math.sign(direction) * Math.PI / 4; requestRender(); },
      dispose,
    };
  } catch (error) { dispose(); throw error; }
}
