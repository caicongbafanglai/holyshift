import * as THREE from 'three';
import { createContactShadow, createMesh } from '../../modeling/primitives.js';
import {
  SACRED_MATERIALS,
  createCharacterMaterial
} from '../../materials/sacredMaterials.js';

export function createHumanoidRig({
  name,
  height = 1.78,
  skin = 0xc99172,
  primary = 0xf1ead8,
  secondary = 0x203d63,
  boot = 0x202635,
  build = 1
}) {
  const root = new THREE.Group();
  root.name = name;
  const visual = new THREE.Group();
  visual.name = `${name}-视觉根`;
  root.add(createContactShadow(0.42 * build, SACRED_MATERIALS.contactShadow), visual);

  const skinMaterial = createCharacterMaterial(skin);
  const primaryMaterial = createCharacterMaterial(primary);
  const secondaryMaterial = createCharacterMaterial(secondary);
  const bootMaterial = createCharacterMaterial(boot);

  const scale = height / 1.78;
  visual.scale.setScalar(scale);

  const hips = new THREE.Group();
  hips.name = '骨架-胯';
  hips.position.y = 0.76;
  const torso = createMesh(
    new THREE.CapsuleGeometry(0.26 * build, 0.54, 5, 12),
    primaryMaterial,
    '身体',
    [0, 0.36, 0],
    [0, 0, 0],
    [1, 1, 0.72]
  );
  const waist = createMesh(
    new THREE.CylinderGeometry(0.25 * build, 0.29 * build, 0.16, 16),
    secondaryMaterial,
    '腰带',
    [0, 0.03, 0]
  );
  hips.add(torso, waist);
  visual.add(hips);

  function createLeg(side) {
    const upper = new THREE.Group();
    upper.name = `骨架-${side < 0 ? '左' : '右'}腿`;
    upper.position.set(side * 0.16 * build, 0.75, 0);
    const thigh = createMesh(
      new THREE.CapsuleGeometry(0.105 * build, 0.38, 4, 10),
      secondaryMaterial,
      side < 0 ? '左大腿' : '右大腿',
      [0, -0.23, 0]
    );
    const lower = new THREE.Group();
    lower.name = `骨架-${side < 0 ? '左' : '右'}小腿`;
    lower.position.y = -0.46;
    const shin = createMesh(
      new THREE.CapsuleGeometry(0.09 * build, 0.31, 4, 10),
      primaryMaterial,
      side < 0 ? '左小腿' : '右小腿',
      [0, -0.19, 0]
    );
    const shoe = createMesh(
      new THREE.CapsuleGeometry(0.105 * build, 0.17, 4, 10),
      bootMaterial,
      side < 0 ? '左靴' : '右靴',
      [0, -0.42, 0.06],
      [Math.PI / 2, 0, 0],
      [1, 1, 1.35]
    );
    lower.add(shin, shoe);
    upper.add(thigh, lower);
    visual.add(upper);
    return { upper, lower };
  }

  function createArm(side) {
    const upper = new THREE.Group();
    upper.name = `骨架-${side < 0 ? '左' : '右'}臂`;
    upper.position.set(side * 0.34 * build, 1.33, 0);
    const shoulder = createMesh(
      new THREE.SphereGeometry(0.14 * build, 12, 9),
      secondaryMaterial,
      side < 0 ? '左肩' : '右肩',
      [0, 0, 0]
    );
    const upperMesh = createMesh(
      new THREE.CapsuleGeometry(0.09 * build, 0.27, 4, 9),
      primaryMaterial,
      side < 0 ? '左上臂' : '右上臂',
      [0, -0.21, 0]
    );
    const lower = new THREE.Group();
    lower.name = `骨架-${side < 0 ? '左' : '右'}前臂`;
    lower.position.y = -0.42;
    const lowerMesh = createMesh(
      new THREE.CapsuleGeometry(0.077 * build, 0.25, 4, 9),
      primaryMaterial,
      side < 0 ? '左前臂' : '右前臂',
      [0, -0.18, 0]
    );
    const hand = createMesh(
      new THREE.SphereGeometry(0.095 * build, 12, 9),
      skinMaterial,
      side < 0 ? '左手' : '右手',
      [0, -0.4, 0],
      [0, 0, 0],
      [0.82, 1.05, 0.78]
    );
    lower.add(lowerMesh, hand);
    upper.add(shoulder, upperMesh, lower);
    visual.add(upper);
    return { upper, lower, hand };
  }

  const leftLeg = createLeg(-1);
  const rightLeg = createLeg(1);
  const leftArm = createArm(-1);
  const rightArm = createArm(1);

  const neck = createMesh(
    new THREE.CylinderGeometry(0.105, 0.12, 0.18, 12),
    skinMaterial,
    '脖颈',
    [0, 1.49, 0]
  );
  const headPivot = new THREE.Group();
  headPivot.name = '骨架-头';
  headPivot.position.y = 1.62;
  const head = createMesh(
    new THREE.SphereGeometry(0.245 * build, 20, 16),
    skinMaterial,
    '头部',
    [0, 0, 0],
    [0, 0, 0],
    [0.92, 1.08, 0.9]
  );
  headPivot.add(head);
  visual.add(neck, headPivot);

  root.userData.rig = {
    visual,
    hips,
    torso,
    headPivot,
    leftLeg,
    rightLeg,
    leftArm,
    rightArm,
    materials: {
      skin: skinMaterial,
      primary: primaryMaterial,
      secondary: secondaryMaterial,
      boot: bootMaterial
    }
  };
  return root;
}

export function animateHumanoid(model, {
  time = 0,
  moving = false,
  sprinting = false,
  attackPhase = 0,
  castPhase = 0,
  hurtPhase = 0,
  idleScale = 1
} = {}) {
  const rig = model.userData.rig;
  if (!rig) return;
  const pace = sprinting ? 11 : 7.2;
  const stride = moving ? Math.sin(time * pace) * (sprinting ? 0.72 : 0.46) : 0;
  const settle = 1 - Math.exp(-0.16);
  rig.leftLeg.upper.rotation.x += (stride - rig.leftLeg.upper.rotation.x) * settle;
  rig.rightLeg.upper.rotation.x += (-stride - rig.rightLeg.upper.rotation.x) * settle;
  rig.leftLeg.lower.rotation.x = Math.max(0, -stride) * 0.34;
  rig.rightLeg.lower.rotation.x = Math.max(0, stride) * 0.34;
  const armStride = stride * 0.72;
  rig.leftArm.upper.rotation.x += (-armStride - rig.leftArm.upper.rotation.x) * settle;
  rig.rightArm.upper.rotation.x += (armStride - rig.rightArm.upper.rotation.x) * settle;

  if (attackPhase > 0) {
    const swing = Math.sin(attackPhase * Math.PI);
    rig.rightArm.upper.rotation.x = -1.2 + swing * 1.7;
    rig.rightArm.upper.rotation.z = -0.32 - swing * 0.4;
    rig.hips.rotation.y = -0.22 + swing * 0.6;
  } else {
    rig.hips.rotation.y *= 0.78;
    rig.rightArm.upper.rotation.z *= 0.78;
  }

  if (castPhase > 0) {
    const lift = Math.sin(Math.min(1, castPhase) * Math.PI);
    rig.leftArm.upper.rotation.x = -1.45 * lift;
    rig.rightArm.upper.rotation.x = -1.1 * lift;
    rig.leftArm.upper.rotation.z = -0.52;
    rig.rightArm.upper.rotation.z = 0.52;
  }

  rig.visual.position.y =
    Math.sin(time * (moving ? pace * 2 : 2.2)) * (moving ? 0.025 : 0.012) * idleScale;
  rig.headPivot.rotation.z = Math.sin(time * 1.25) * 0.018;
  rig.visual.rotation.z = hurtPhase > 0 ? Math.sin(hurtPhase * Math.PI) * 0.12 : 0;
}
