import * as THREE from 'three';
import {
  createCharacterMaterial,
  SACRED_MATERIALS
} from '../materials/sacredMaterials.js';
import {
  createContactShadow,
  createMesh,
  createShieldGeometry
} from '../modeling/primitives.js';

export function createApprovedWaterGhost() {
  const root = new THREE.Group();
  root.name = '已审批水鬼';
  root.add(createContactShadow(1.15, SACRED_MATERIALS.contactShadow, 1.45));
  const visual = new THREE.Group();
  visual.name = '已审批水鬼-视觉根';
  root.add(visual);

  const water = SACRED_MATERIALS.waterRaw.clone();
  water.opacity = 0.82;
  const paper = createCharacterMaterial(0xe9e6d8, { roughness: 0.82 });
  const ink = createCharacterMaterial(0x273749, { roughness: 0.62 });
  const red = createCharacterMaterial(0xbb3657, {
    emissive: 0x5d0c2b,
    emissiveIntensity: 0.68
  });
  const body = createMesh(
    new THREE.IcosahedronGeometry(1.18, 3),
    water,
    '水鬼高细节水体',
    [0, 1.65, 0],
    [0, 0, 0],
    [0.9, 1.35, 0.82]
  );
  const core = createMesh(
    new THREE.OctahedronGeometry(0.55, 2),
    SACRED_MATERIALS.anomaly,
    '已审批异常核心',
    [0, 1.75, 0]
  );
  const collar = createMesh(
    new THREE.TorusGeometry(0.86, 0.14, 10, 32),
    SACRED_MATERIALS.polishedGold,
    '审批水鬼金色流程环',
    [0, 2.38, 0],
    [Math.PI / 2, 0, 0]
  );
  visual.add(body, core, collar);

  const facePlate = createMesh(
    createShieldGeometry(1.05, 1.18, 0.08),
    paper,
    '已审批水鬼表单脸',
    [0, 2.05, 0.92]
  );
  const stamp = createMesh(
    new THREE.CylinderGeometry(0.26, 0.26, 0.07, 20),
    red,
    '已通过红色审批章',
    [0, 2.04, 0.99],
    [Math.PI / 2, 0, 0]
  );
  visual.add(facePlate, stamp);
  for (const side of [-1, 1]) {
    visual.add(
      createMesh(
        new THREE.SphereGeometry(0.09, 12, 8),
        ink,
        side < 0 ? '审批水鬼左眼' : '审批水鬼右眼',
        [side * 0.22, 2.19, 1.01],
        [0, 0, 0],
        [1, 0.65, 0.4]
      )
    );
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.name = side < 0 ? '审批水鬼左臂骨架' : '审批水鬼右臂骨架';
    arm.position.set(side * 0.88, 1.86, 0);
    arm.add(
      createMesh(
        new THREE.CapsuleGeometry(0.18, 0.92, 6, 12),
        water,
        side < 0 ? '审批水鬼左臂' : '审批水鬼右臂',
        [side * 0.38, -0.15, 0],
        [0, 0, side * 0.85]
      ),
      createMesh(
        new THREE.CylinderGeometry(0.24, 0.34, 0.3, 12),
        red,
        side < 0 ? '左审批印章拳' : '右审批印章拳',
        [side * 0.78, -0.48, 0],
        [0, 0, side * Math.PI / 2]
      )
    );
    visual.add(arm);
    arms.push(arm);
  }

  const formSkirt = [];
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const form = createMesh(
      new THREE.BoxGeometry(0.48, 1.12, 0.035),
      index % 3 === 0 ? red : paper,
      `审批流程长表-${index + 1}`,
      [Math.cos(angle) * 0.82, 0.65, Math.sin(angle) * 0.82],
      [0, -angle + Math.PI / 2, Math.sin(index) * 0.08]
    );
    visual.add(form);
    formSkirt.push(form);
  }

  const orbitSeals = [];
  for (let index = 0; index < 5; index += 1) {
    const seal = createMesh(
      new THREE.TorusGeometry(0.22, 0.055, 8, 20),
      index % 2 ? SACRED_MATERIALS.holyShift : red,
      `漂浮审批章-${index + 1}`
    );
    visual.add(seal);
    orbitSeals.push(seal);
  }

  root.userData.combatVisual = {
    body,
    core,
    arms,
    formSkirt,
    orbitSeals,
    hitTimer: 0,
    deathTimer: 0,
    attackPhase: 0
  };
  root.userData.animate = ({
    time = 0,
    delta = 0,
    hit = false,
    dying = false,
    attackPhase = 0,
    enraged = false
  } = {}) => {
    const state = root.userData.combatVisual;
    if (hit) state.hitTimer = 0.14;
    if (dying) state.deathTimer += delta;
    state.hitTimer = Math.max(0, state.hitTimer - delta);
    visual.position.y = 0.12 + Math.sin(time * 1.9) * 0.09;
    visual.scale.setScalar(
      dying
        ? Math.max(0.01, 1 - state.deathTimer * 1.35)
        : 1 + Math.sin(time * 2.2) * 0.018
    );
    core.rotation.y = time * (enraged ? 2.2 : 1.1);
    core.material.emissiveIntensity = state.hitTimer > 0 ? 3 : enraged ? 1.8 : 1.05;
    arms[0].rotation.z = -0.18 - Math.sin(attackPhase * Math.PI) * 1.25;
    arms[1].rotation.z = 0.18 + Math.sin(attackPhase * Math.PI) * 1.25;
    formSkirt.forEach((form, index) => {
      form.rotation.z = Math.sin(time * 2.2 + index) * 0.08;
    });
    orbitSeals.forEach((seal, index) => {
      const angle = time * (enraged ? 1.4 : 0.72) + index * (Math.PI * 2 / orbitSeals.length);
      seal.position.set(
        Math.cos(angle) * 1.8,
        1.5 + Math.sin(angle * 1.7) * 0.55,
        Math.sin(angle) * 1.8
      );
      seal.rotation.y = -angle;
    });
  };
  return root;
}
