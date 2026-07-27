import * as THREE from 'three';
import { SACRED_MATERIALS } from '../materials/sacredMaterials.js';
import { addInstancedRows, createMesh } from '../modeling/primitives.js';

function createIslandGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-72, -96);
  shape.quadraticCurveTo(-82, -78, -78, -45);
  shape.quadraticCurveTo(-86, 0, -72, 66);
  shape.quadraticCurveTo(-52, 78, 0, 76);
  shape.quadraticCurveTo(54, 78, 72, 66);
  shape.quadraticCurveTo(86, 10, 78, -46);
  shape.quadraticCurveTo(82, -78, 72, -96);
  shape.lineTo(-72, -96);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 2.5,
    bevelEnabled: true,
    bevelSize: 1.3,
    bevelThickness: 0.8,
    bevelSegments: 3
  });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(0, -1.25, 0);
  return geometry;
}

function createPavingInstances() {
  const transforms = [];
  for (let row = 0; row < 39; row += 1) {
    const z = -89 + row * 4;
    for (let column = 0; column < 33; column += 1) {
      const x = -64 + column * 4;
      const offset = row % 2 === 0 ? 0 : 0.5;
      transforms.push({
        position: [x + offset, 0.035 + ((row + column) % 4) * 0.0015, z],
        scale: [3.82, 0.045, 3.82]
      });
    }
  }
  return transforms;
}

function createInlayTransforms() {
  const transforms = [];
  for (let index = 0; index < 37; index += 1) {
    transforms.push({
      position: [-4.5, 0.092, 58 - index * 4],
      scale: [0.18, 0.035, 3.4]
    });
    transforms.push({
      position: [4.5, 0.092, 58 - index * 4],
      scale: [0.18, 0.035, 3.4]
    });
  }
  for (let spoke = 0; spoke < 12; spoke += 1) {
    const angle = (spoke / 12) * Math.PI * 2;
    for (let step = 0; step < 7; step += 1) {
      const radius = 13 + step * 3.6;
      transforms.push({
        position: [Math.cos(angle) * radius, 0.094, -8 + Math.sin(angle) * radius],
        rotation: [0, -angle, 0],
        scale: [0.15, 0.04, 3.15]
      });
    }
  }
  return transforms;
}

export function createSacredPlaza() {
  const group = new THREE.Group();
  group.name = '师老牧镇神圣广场地面资产';
  const island = createMesh(
    createIslandGeometry(),
    SACRED_MATERIALS.whiteStone,
    '环水神圣岛基座'
  );
  group.add(island);

  const highPaving = addInstancedRows({
    parent: group,
    name: '独立白金铺地石实例',
    geometry: new THREE.BoxGeometry(1, 1, 1),
    material: SACRED_MATERIALS.pavement,
    transforms: createPavingInstances()
  });
  let lowPavingMaterial;
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    context.fillStyle = '#d9d7cf';
    context.fillRect(0, 0, 128, 128);
    context.strokeStyle = '#aebcc0';
    context.lineWidth = 3;
    context.strokeRect(1.5, 1.5, 125, 125);
    context.strokeStyle = 'rgba(255,255,255,.58)';
    context.lineWidth = 1;
    context.strokeRect(5, 5, 118, 118);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(34, 40);
    texture.anisotropy = 2;
    lowPavingMaterial = new THREE.MeshBasicMaterial({ map: texture });
  } else {
    lowPavingMaterial = new THREE.MeshBasicMaterial({ color: 0xd9d7cf });
  }
  const lowPaving = createMesh(
    new THREE.PlaneGeometry(136, 160),
    lowPavingMaterial,
    '软件渲染铺地纹理LOD',
    [0, 0.055, -15],
    [-Math.PI / 2, 0, 0]
  );
  lowPaving.visible = false;
  group.add(lowPaving);
  addInstancedRows({
    parent: group,
    name: '神圣流程深蓝地面镶线',
    geometry: new THREE.BoxGeometry(1, 1, 1),
    material: SACRED_MATERIALS.pavementBlue,
    transforms: createInlayTransforms()
  });

  const ceremonialRing = createMesh(
    new THREE.RingGeometry(12.1, 12.65, 64),
    SACRED_MATERIALS.polishedGold,
    '圣水池外神圣仪式环',
    [0, 0.108, -8],
    [-Math.PI / 2, 0, 0]
  );
  const compassRing = createMesh(
    new THREE.RingGeometry(31.5, 31.85, 96),
    SACRED_MATERIALS.deepBlue,
    '广场礼拜集合大环',
    [0, 0.102, -8],
    [-Math.PI / 2, 0, 0]
  );
  group.add(ceremonialRing, compassRing);

  const sea = createMesh(
    new THREE.CircleGeometry(520, 128),
    SACRED_MATERIALS.water,
    '师老牧镇环岛海湾',
    [0, -3.2, 0],
    [-Math.PI / 2, 0, 0]
  );
  group.add(sea);
  group.userData.sea = sea;
  group.userData.highPaving = highPaving;
  group.userData.lowPaving = lowPaving;
  return group;
}
