import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/** Local geometry only. A miniature packing studio, never a live shipment map. */
export function createParcelStudio() {
  const stage = new THREE.Group();
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  function surface(color: number, roughness = .38, coat = .2) {
    const result = new THREE.MeshPhysicalMaterial({ color, roughness, clearcoat: coat, clearcoatRoughness: .18 });
    materials.add(result); return result;
  }
  const blue = surface(0x2868eb, .2, .8);
  const navy = surface(0x192c43, .3);
  const coral = surface(0xfb7961, .32, .5);
  const cream = surface(0xfff5df, .48);
  const peach = surface(0xf4ae6b, .5);
  const pale = surface(0xc9e6ef, .45);
  const gold = surface(0xffd569, .28, .65);
  const white = surface(0xfffdf8, .26, .4);
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D = stage) {
    geometries.add(geometry);
    const object = new THREE.Mesh(geometry, material);
    object.castShadow = object.receiveShadow = true;
    parent.add(object); return object;
  }
  function box(size: [number, number, number], position: [number, number, number], material: THREE.Material, parent: THREE.Object3D = stage, radius = .1) {
    const object = mesh(new RoundedBoxGeometry(...size, 4, Math.min(radius, ...size.map(n => n / 2))), material, parent);
    object.position.set(...position); return object;
  }
  function pebble(size: [number, number, number], position: [number, number, number], material: THREE.Material, parent: THREE.Object3D = stage) {
    const object = mesh(new THREE.SphereGeometry(1, 28, 20), material, parent);
    object.scale.set(...size); object.position.set(...position); return object;
  }
  function tube(points: number[][], radius: number, material: THREE.Material, parent: THREE.Object3D = stage) {
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 28, radius, 8, false), material, parent);
  }
  function group(position: [number, number, number], parent: THREE.Object3D = stage) {
    const result = new THREE.Group(); result.position.set(...position); parent.add(result); return result;
  }
  // The thick rim and a lit floor give every object a place to stand.
  box([5.1, .32, 3.65], [0, .02, 0], blue, stage, .22);
  box([4.99, .14, 3.54], [0, .21, 0], pale, stage, .2);
  const ground = mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: .07 }));
  materials.add(ground.material); ground.rotation.x = -Math.PI / 2; ground.position.y = -.16; ground.castShadow = false;
  // A chunky coral arch frames the parcel without hiding its dimensional sides.
  const arch = mesh(new THREE.TorusGeometry(1.48, .17, 14, 64, Math.PI), coral);
  arch.position.set(-.45, 1.95, -1.14);
  for (const x of [-1.93, 1.03]) { const column = mesh(new THREE.CylinderGeometry(.17, .17, 1.7, 24), coral); column.position.set(x, 1.1, -1.14); }
  // Small packing shelves and dispatch labels, inspired by a toy-room diorama.
  box([1.0, .12, .62], [-1.85, .88, -.46], cream);
  for (const x of [-2.18, -1.52]) box([.1, .6, .1], [x, .54, -.46], navy);
  const stacked = box([.64, .5, .56], [-1.83, 1.2, -.46], blue);
  stacked.rotation.y = -.12;
  box([.15, .51, .57], [-1.83, 1.2, -.46], white).rotation.y = -.12;
  box([.48, .3, .46], [-1.85, 1.6, -.46], gold).rotation.y = .15;
  box([.1, .31, .47], [-1.85, 1.6, -.46], cream).rotation.y = .15;

  const parcel = group([-.38, 1.3, .45]);
  parcel.rotation.y = -.12;
  box([1.68, 1.53, 1.38], [0, 0, 0], peach, parcel, .28);
  // Plush feet, asymmetric arms and an oversized lid soften the character.
  for (const x of [-.49, .49]) pebble([.32, .18, .42], [x, -.84, .13], blue, parcel);
  const arm = group([.8, .04, .05], parcel);
  tube([[0, 0, 0], [.26, .02, .08], [.45, .28, .12]], .11, peach, arm);
  pebble([.16, .2, .16], [.45, .32, .12], cream, arm);
  tube([[-.77, -.03, .04], [-.99, -.14, .12], [-1.02, -.34, .24]], .11, peach, parcel);
  pebble([.15, .17, .15], [-1.02, -.34, .24], cream, parcel);
  const lid = group([0, .72, -.66], parcel);
  box([1.78, .16, 1.48], [0, .04, .67], peach, lid, .07);
  box([.32, .018, 1.47], [.22, .129, .67], cream, lid, .008);
  box([.32, .25, .02], [.22, .61, .7], cream, parcel, .008);
  const eyes = [-.29, .29].map(x => {
    const eye = pebble([.07, .10, .035], [x, .14, .7], navy, parcel);
    pebble([.018, .025, .012], [x-.018, .17, .734], white, parcel);
    return eye;
  });
  for (const x of [-.49, .49]) pebble([.11, .057, .023], [x, -.025, .706], coral, parcel);
  tube([[-.12, -.035, .718], [0, -.105, .737], [.12, -.035, .718]], .022, navy, parcel);
  const labelCanvas = document.createElement('canvas'); labelCanvas.width = 512; labelCanvas.height = 192;
  const pen = labelCanvas.getContext('2d');
  if (!pen) throw new Error('Canvas label unavailable');
  const labelTexture = new THREE.CanvasTexture(labelCanvas); labelTexture.colorSpace = THREE.SRGBColorSpace; textures.add(labelTexture);
  const labelMaterial = new THREE.MeshStandardMaterial({ map: labelTexture, roughness: .7 }); materials.add(labelMaterial);
  box([.98, .34, .015], [0, -.43, .7], cream, parcel, .007);
  const label = mesh(new THREE.PlaneGeometry(.92, .30), labelMaterial, parcel); label.position.set(0, -.43, .711);
  function drawLabel(value: string) {
    pen!.fillStyle = '#fff5df'; pen!.fillRect(0, 0, 512, 192);
    pen!.fillStyle = '#192c43'; pen!.font = 'bold 32px Arial'; pen!.fillText('WITH LOVE, FROM KOREA', 22, 49);
    pen!.font = '23px Arial'; pen!.fillText(value.slice(0, 32), 22, 91);
    for (let i=0; i<40; i++) pen!.fillRect(22+i*7, 120, i%3===0?4:2, 42);
    pen!.fillStyle = '#2868eb'; pen!.beginPath(); pen!.arc(444, 140, 26, 0, Math.PI*2); pen!.fill();
    labelTexture.needsUpdate = true;
  }
  // The conveyor and receipt establish the service: receive, check, send.
  const conveyor = group([1.5, .65, .62]); conveyor.rotation.y = -.12;
  box([1.32, .18, 1.15], [0, 0, 0], navy, conveyor);
  for (const x of [-.42, .42]) for (const z of [-.37, .37]) box([.11, .38, .11], [x, -.24, z], blue, conveyor);
  for (let i=0; i<6; i++) {
    const roller = mesh(new THREE.CylinderGeometry(.085, .085, 1.03, 16), white, conveyor);
    roller.rotation.z = Math.PI / 2; roller.position.set(0, .12, -.43+i*.17);
  }
  const small = group([0, .44, -.05], conveyor); small.rotation.y = .12;
  box([.58, .5, .54], [0,0,0], coral, small);
  box([.12, .51, .55], [0,0,0], cream, small);
  // A glossy blue airplane: cream body, rounded wings and coral tail.
  const plane = group([1.48, 2.94, -.2]); plane.rotation.set(.15, -.4, -.12);
  pebble([.28, .23, .79], [0,0,0], white, plane);
  pebble([.2, .16, .29], [0,.14,.27], blue, plane);
  box([1.65,.08,.38], [0,-.02,-.03], blue, plane, .04).rotation.y = -.08;
  box([.8,.07,.28], [0,.06,-.6], coral, plane, .035);
  box([.1,.4,.31], [0,.22,-.6], coral, plane, .05).rotation.x = -.28;
  for (const x of [-.46,.46]) pebble([.1,.11,.23], [x,-.14,.04], white, plane);
  // The dotted arc is purely decorative; it does not suggest live tracking.
  for (let i=0; i<13; i++) {
    const t=i/12;
    pebble([.025,.025,.025], [-1.9+t*3.0, 2.7+Math.sin(t*Math.PI)*.95, -1.18], blue);
  }
  const starShape = new THREE.Shape(); starShape.moveTo(0,.24);
  [[.07,.07],[.24,0],[.07,-.07],[0,-.24],[-.07,-.07],[-.24,0],[-.07,.07]].forEach(([x,y])=>starShape.lineTo(x,y)); starShape.closePath();
  const star = mesh(new THREE.ExtrudeGeometry(starShape,{depth:.09,bevelEnabled:true,bevelThickness:.03,bevelSize:.025,bevelSegments:3,steps:1}), gold);
  star.position.set(-1.96,2.52,.1); star.rotation.set(.1,.3,-.15);
  // Tiny dispatch card on the front lip, a useful visual motif, not a claim.
  box([1.3,.16,.035], [.3,.02,1.84], cream, stage, .017);
  for (let i=0;i<3;i++) pebble([.037,.037,.02], [-.13+i*.15,.02,1.866], blue);
  box([.45,.035,.02],[.64,.02,1.866],coral,stage,.008);
  return { stage, drawLabel,
    animate(float: number, flight: number, blink: number, lidAngle: number) {
      parcel.rotation.z = -.025 + float*.025;
      arm.rotation.z = float*.22;
      lid.rotation.x = lidAngle;
      plane.position.set(1.48+(1-flight)*.85,2.94+(1-flight)*.35,-.2-(1-flight)*.6);
      plane.rotation.z = -.12 + float*.07;
      eyes.forEach(eye=>{ eye.scale.y=.1*blink; });
    },
    dispose() { geometries.forEach(g=>g.dispose()); materials.forEach(m=>m.dispose()); textures.forEach(t=>t.dispose()); },
  };
}
