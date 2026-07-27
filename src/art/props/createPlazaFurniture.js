import * as THREE from 'three';
import { SACRED_MATERIALS } from '../materials/sacredMaterials.js';
import { createMesh } from '../modeling/primitives.js';

export function createSacredBench(name = '神圣广场长椅') {
  const group = new THREE.Group();
  group.name = name;
  const seat = createMesh(
    new THREE.BoxGeometry(3.3, 0.17, 0.82, 3, 1, 2),
    SACRED_MATERIALS.darkWood,
    `${name}-弧面座板`,
    [0, 0.72, 0]
  );
  const back = createMesh(
    new THREE.BoxGeometry(3.3, 1.05, 0.14, 4, 2, 1),
    SACRED_MATERIALS.deepBlue,
    `${name}-深蓝靠背`,
    [0, 1.32, -0.36],
    [-0.11, 0, 0]
  );
  const inlay = createMesh(
    new THREE.BoxGeometry(2.7, 0.08, 0.03),
    SACRED_MATERIALS.gold,
    `${name}-金色靠背圣纹`,
    [0, 1.43, -0.435]
  );
  group.add(seat, back, inlay);
  for (const side of [-1, 1]) {
    group.add(
      createMesh(
        new THREE.CylinderGeometry(0.085, 0.11, 0.72, 10),
        SACRED_MATERIALS.polishedGold,
        `${name}-${side < 0 ? '左' : '右'}椅腿`,
        [side * 1.25, 0.36, 0]
      ),
      createMesh(
        new THREE.TorusGeometry(0.31, 0.055, 8, 18, Math.PI),
        SACRED_MATERIALS.polishedGold,
        `${name}-${side < 0 ? '左' : '右'}扶手`,
        [side * 1.48, 1.02, 0],
        [0, 0, side < 0 ? -Math.PI / 2 : Math.PI / 2]
      )
    );
  }
  return group;
}

export function createSacredLamp(name = '神圣广场路灯') {
  const group = new THREE.Group();
  group.name = name;
  const post = createMesh(
    new THREE.CylinderGeometry(0.09, 0.16, 5.4, 12),
    SACRED_MATERIALS.deepBlue,
    `${name}-深蓝灯柱`,
    [0, 2.7, 0]
  );
  const base = createMesh(
    new THREE.CylinderGeometry(0.28, 0.42, 0.55, 12),
    SACRED_MATERIALS.polishedGold,
    `${name}-金色柱础`,
    [0, 0.28, 0]
  );
  const crown = createMesh(
    new THREE.CylinderGeometry(0.24, 0.4, 0.32, 8),
    SACRED_MATERIALS.polishedGold,
    `${name}-八角灯冠`,
    [0, 5.58, 0]
  );
  const light = createMesh(
    new THREE.OctahedronGeometry(0.34, 1),
    SACRED_MATERIALS.holyShift,
    `${name}-神圣灯芯`,
    [0, 5.92, 0]
  );
  const halo = createMesh(
    new THREE.TorusGeometry(0.56, 0.035, 7, 26),
    SACRED_MATERIALS.gold,
    `${name}-悬浮光环`,
    [0, 5.92, 0],
    [Math.PI / 2, 0, 0]
  );
  group.add(post, base, crown, light, halo);
  group.userData.light = light;
  group.userData.halo = halo;
  return group;
}

export function createApprovalKiosk() {
  const group = new THREE.Group();
  group.name = '神圣签到审批机独立资产';
  group.add(
    createMesh(
      new THREE.CylinderGeometry(0.64, 0.82, 1.5, 10),
      SACRED_MATERIALS.ivory,
      '签到机象牙底座',
      [0, 0.75, 0]
    ),
    createMesh(
      new THREE.BoxGeometry(1.05, 1.3, 0.22),
      SACRED_MATERIALS.darkGlass,
      '签到机深蓝触摸屏',
      [0, 1.82, 0.43],
      [-0.18, 0, 0]
    ),
    createMesh(
      new THREE.OctahedronGeometry(0.16, 1),
      SACRED_MATERIALS.anomaly,
      '签到机异常审批灯',
      [0, 2.55, 0]
    )
  );
  return group;
}
