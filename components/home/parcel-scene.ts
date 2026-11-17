import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createParcelRenderer } from './parcel-renderer';
import { createParcelStudio } from './parcel-studio';
import { PARCEL_INTRO_MS, parcelMotion } from './parcel-motion';

export type ParcelSceneState = { focused: boolean; packed: boolean; label: string };
export type ParcelScene = { update: (state: ParcelSceneState) => void; dispose: () => void };

export function createParcelScene(host: HTMLElement, initial: ParcelSceneState, onUnavailable: () => void, onReady: () => void): ParcelScene | null {
  const renderer = createParcelRenderer();
  if (!renderer) { onUnavailable(); return null; }
  let frame = 0, disposed = false, visible = true;
  let intersection: IntersectionObserver | undefined, resizeObserver: ResizeObserver | undefined;
  let studio: ReturnType<typeof createParcelStudio> | undefined;
  let environment: THREE.WebGLRenderTarget | undefined;
  let cleanupListeners = () => {};
  const scene = new THREE.Scene();
  function dispose() {
    if (disposed) return; disposed = true;
    cancelAnimationFrame(frame); intersection?.disconnect(); resizeObserver?.disconnect(); cleanupListeners();
    studio?.dispose(); environment?.dispose();
    scene.traverse(object => { if (object instanceof THREE.Light && 'shadow' in object) (object as THREE.DirectionalLight).shadow?.dispose(); });
    renderer!.dispose(); renderer!.forceContextLoss(); renderer!.domElement.remove();
  }
  try {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .95;
    renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
    host.appendChild(renderer.domElement);
    const camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
    camera.position.set(6.2, 4.8, 8.9); camera.lookAt(0, 1.45, 0);
    // Generated local studio reflections: no HDR download or remote asset dependency.
    const room = new RoomEnvironment(); const pmrem = new THREE.PMREMGenerator(renderer);
    try { environment = pmrem.fromScene(room, .04); scene.environment = environment.texture; }
    finally { room.dispose(); pmrem.dispose(); }
    scene.environmentIntensity = .45;
    scene.add(new THREE.HemisphereLight(0xfffbf2, 0x8aa9d9, .9));
    const key = new THREE.DirectionalLight(0xfff0d6, 2.5); key.position.set(-3,7,5); key.castShadow = true;
    key.shadow.mapSize.set(1024,1024); key.shadow.normalBias = .035; key.shadow.bias = -.0001;
    Object.assign(key.shadow.camera,{left:-5,right:5,top:5,bottom:-5,near:.1,far:20});
    key.shadow.intensity=.65; scene.add(key);
    const rim = new THREE.DirectionalLight(0xb4d7ff, 1.5); rim.position.set(4,4,-3); scene.add(rim);
    studio = createParcelStudio(); scene.add(studio.stage); studio.drawLabel(initial.label);
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const started = performance.now(); let until = preference.matches ? 0 : started + PARCEL_INTRO_MS;
    let state = initial, lastTime = started, lid = 0, first = true;
    const pointer = { x:0, y:0 };
    function render(now: number) {
      frame=0;
      if (disposed || !visible || document.hidden) return;
      const reduced=preference.matches, amount=reduced ? 1 : 1-Math.exp(-Math.min(now-lastTime,80)/90);
      lastTime=now;
      lid+=((state.focused && !state.packed ? -.3 : 0)-lid)*amount;
      studio!.stage.rotation.y+=((reduced?0:pointer.x*.11)-studio!.stage.rotation.y)*amount;
      studio!.stage.rotation.x+=((reduced?0:pointer.y*.035)-studio!.stage.rotation.x)*amount;
      const pose=parcelMotion(now-started,reduced);
      studio!.animate(pose.float,pose.flight,pose.eyes,lid);
      try { renderer!.render(scene,camera); }
      catch { dispose(); onUnavailable(); return; }
      if (first) { first=false; onReady(); }
      if (!reduced && now<until) frame=requestAnimationFrame(render);
    }
    function requestRender(duration=750) {
      if(disposed) return;
      until=Math.max(until,performance.now()+duration);
      if(!frame) frame=requestAnimationFrame(render);
    }
    function resize() {
      const {clientWidth:width,clientHeight:height}=host;
      if(!width || !height) return;
      renderer!.setSize(width,height,false); camera.aspect=width/height;
      camera.fov=camera.aspect<.9?37:32; camera.updateProjectionMatrix(); requestRender(0);
    }
    function visibilityChanged() {
      if(document.hidden) {cancelAnimationFrame(frame);frame=0;} else requestRender();
    }
    function motionChanged() {cancelAnimationFrame(frame);frame=0;until=0;requestRender(0);}
    function contextLost(event: Event) {event.preventDefault();dispose();onUnavailable();}
    function pointerMoved(event: PointerEvent) {
      if(preference.matches || event.pointerType!=='mouse') return;
      const rect=host.getBoundingClientRect(); if(!rect.width || !rect.height) return;
      pointer.x=THREE.MathUtils.clamp((event.clientX-rect.left)/rect.width*2-1,-1,1);
      pointer.y=THREE.MathUtils.clamp((event.clientY-rect.top)/rect.height*2-1,-1,1); requestRender();
    }
    function pointerLeft() {pointer.x=pointer.y=0;requestRender();}
    host.addEventListener('pointermove',pointerMoved);host.addEventListener('pointerleave',pointerLeft);
    renderer.domElement.addEventListener('webglcontextlost',contextLost);
    document.addEventListener('visibilitychange',visibilityChanged);preference.addEventListener('change',motionChanged);
    cleanupListeners=()=>{
      host.removeEventListener('pointermove',pointerMoved);host.removeEventListener('pointerleave',pointerLeft);
      renderer.domElement.removeEventListener('webglcontextlost',contextLost);
      document.removeEventListener('visibilitychange',visibilityChanged);preference.removeEventListener('change',motionChanged);
    };
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
    intersection=new IntersectionObserver(([entry])=>{
      visible=entry.isIntersecting;
      if(visible) requestRender();else {cancelAnimationFrame(frame);frame=0;}
    });intersection.observe(host);resize();
    return { update(next) {if(disposed)return;if(next.label!==state.label)studio!.drawLabel(next.label);state=next;requestRender();},dispose };
  } catch {dispose();onUnavailable();return null;}
}
