import * as THREE from 'three';
import { SACRED_MATERIALS } from '../materials/sacredMaterials.js';
import {
  addInstancedRows,
  createMesh,
  createTextPanel
} from '../modeling/primitives.js';

function radialTransforms(count, radius, y, scale = [1, 1, 1], rotationOffset = 0) {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + rotationOffset;
    return {
      position: [Math.cos(angle) * radius, y, Math.sin(angle) * radius],
      rotation: [0, -angle, 0],
      scale
    };
  });
}

export function createSacredFountain() {
  const group = new THREE.Group();
  group.name = '圣水池独立建筑资产';
  group.position.set(0, 0, -8);

  const base = createMesh(
    new THREE.CylinderGeometry(10.5, 10.9, 0.6, 64),
    SACRED_MATERIALS.whiteStone,
    '圣水池白石基座',
    [0, 0.3, 0]
  );
  const lowerBasin = createMesh(
    new THREE.CylinderGeometry(9.4, 10.15, 0.65, 64, 1, true),
    SACRED_MATERIALS.ivory,
    '圣水池下层雕刻盆壁',
    [0, 0.73, 0]
  );
  const lowerRim = createMesh(
    new THREE.TorusGeometry(9.75, 0.31, 12, 72),
    SACRED_MATERIALS.polishedGold,
    '圣水池下层金边',
    [0, 1.04, 0],
    [Math.PI / 2, 0, 0]
  );
  const rawWater = createMesh(
    new THREE.CircleGeometry(9.35, 72),
    SACRED_MATERIALS.waterRaw,
    '异常生水水面',
    [0, 0.94, 0],
    [-Math.PI / 2, 0, 0]
  );
  const holyWater = createMesh(
    new THREE.CircleGeometry(9.35, 72),
    SACRED_MATERIALS.water,
    '恢复圣水水面',
    [0, 0.955, 0],
    [-Math.PI / 2, 0, 0]
  );
  holyWater.visible = false;

  const centralPlinth = createMesh(
    new THREE.CylinderGeometry(2.15, 2.7, 2.6, 20),
    SACRED_MATERIALS.ivoryWarm,
    '圣水池中心流程基座',
    [0, 2.1, 0]
  );
  const upperBasin = createMesh(
    new THREE.CylinderGeometry(3.1, 2.35, 0.55, 36),
    SACRED_MATERIALS.ivory,
    '圣水池上层祝福盆',
    [0, 3.35, 0]
  );
  const upperRim = createMesh(
    new THREE.TorusGeometry(3.05, 0.2, 10, 42),
    SACRED_MATERIALS.polishedGold,
    '上层祝福盆金边',
    [0, 3.63, 0],
    [Math.PI / 2, 0, 0]
  );
  const crown = createMesh(
    new THREE.CylinderGeometry(0.75, 1.2, 2.9, 12),
    SACRED_MATERIALS.deepBlue,
    '圣水流程中枢',
    [0, 5.0, 0]
  );
  const crownGem = createMesh(
    new THREE.OctahedronGeometry(0.72, 2),
    SACRED_MATERIALS.anomaly,
    '错位概念核心',
    [0, 6.75, 0]
  );
  const shiftRingA = createMesh(
    new THREE.TorusGeometry(1.55, 0.085, 9, 46),
    SACRED_MATERIALS.holyShift,
    'Holy Shift 概念环 A',
    [0, 5.65, 0],
    [Math.PI / 2.7, 0.2, 0]
  );
  const shiftRingB = createMesh(
    new THREE.TorusGeometry(1.12, 0.07, 8, 42),
    SACRED_MATERIALS.anomaly,
    'Holy Shift 概念环 B',
    [0, 5.65, 0],
    [0.3, Math.PI / 2, 0]
  );

  addInstancedRows({
    parent: group,
    name: '圣水池独立金色圣纹浮雕',
    geometry: new THREE.BoxGeometry(0.16, 0.38, 0.75),
    material: SACRED_MATERIALS.gold,
    transforms: radialTransforms(32, 9.92, 0.7, [1, 1, 1])
  });

  const jetMaterial = SACRED_MATERIALS.waterRaw.clone();
  jetMaterial.opacity = 0.48;
  addInstancedRows({
    parent: group,
    name: '异常生水喷流',
    geometry: new THREE.CylinderGeometry(0.035, 0.06, 2.8, 7),
    material: jetMaterial,
    transforms: radialTransforms(12, 2.6, 2.2, [1, 1, 1])
  });

  const rawLabel = createTextPanel({
    text: '生',
    width: 256,
    height: 256,
    foreground: '#d9fff1',
    background: 'rgba(40, 93, 67, 0.85)',
    border: '#63f1ed',
    font: '900 156px serif'
  }).mesh;
  rawLabel.name = '错位的生字';
  rawLabel.scale.setScalar(1.35);
  rawLabel.position.set(0, 7.95, 0.2);
  const holyLabel = createTextPanel({
    text: '圣',
    width: 256,
    height: 256,
    foreground: '#fff4bc',
    background: 'rgba(16, 53, 85, 0.9)',
    border: '#f1cc68',
    font: '900 156px serif'
  }).mesh;
  holyLabel.name = '归位的圣字';
  holyLabel.scale.setScalar(1.35);
  holyLabel.position.copy(rawLabel.position);
  holyLabel.visible = false;

  group.add(
    base,
    lowerBasin,
    lowerRim,
    rawWater,
    holyWater,
    centralPlinth,
    upperBasin,
    upperRim,
    crown,
    crownGem,
    shiftRingA,
    shiftRingB,
    rawLabel,
    holyLabel
  );
  group.userData.parts = {
    rawWater,
    holyWater,
    crownGem,
    shiftRingA,
    shiftRingB,
    rawLabel,
    holyLabel,
    jetMaterial
  };
  group.userData.setRestored = (restored) => {
    rawWater.visible = !restored;
    holyWater.visible = restored;
    rawLabel.visible = !restored;
    holyLabel.visible = restored;
    crownGem.material = restored
      ? SACRED_MATERIALS.holyShift
      : SACRED_MATERIALS.anomaly;
    jetMaterial.color.setHex(restored ? 0x55c8df : 0x7fd9b1);
  };
  group.userData.update = (time, restored) => {
    shiftRingA.rotation.z = time * (restored ? 0.32 : 0.75);
    shiftRingB.rotation.y = -time * (restored ? 0.28 : 0.92);
    crownGem.rotation.y = time * 0.72;
    crownGem.position.y = 6.75 + Math.sin(time * 2.1) * 0.12;
    const waterMaterial = restored ? SACRED_MATERIALS.water : SACRED_MATERIALS.waterRaw;
    waterMaterial.opacity = (restored ? 0.72 : 0.77) + Math.sin(time * 1.7) * 0.025;
  };
  return group;
}
