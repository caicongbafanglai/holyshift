import * as THREE from 'three';
import { createContactShadow, createMesh } from '../../modeling/primitives.js';
import {
  SACRED_MATERIALS,
  createCharacterMaterial
} from '../../materials/sacredMaterials.js';
import {
  createBootGeometry,
  createForearmGeometry,
  createHandGeometry,
  createNeckGeometry,
  createShinGeometry,
  createStylizedHeadGeometry,
  createThighGeometry,
  createTorsoGeometry,
  createUpperArmGeometry
} from './modeling/anatomyGeometry.js';
import { createCuffGeometry } from './modeling/garmentGeometry.js';
import { createCurveSolidGeometry } from './modeling/organicGeometry.js';

export function createHumanoidRig({
  name,
  height = 1.78,
  skin = 0xc99172,
  primary = 0xf1ead8,
  secondary = 0x203d63,
  boot = 0x202635,
  build = 1,
  feminine = false,
  detailedHands = true,
  headScale = 0.74
}) {
  const root = new THREE.Group();
  root.name = name;
  const visual = new THREE.Group();
  visual.name = `${name}-视觉根`;
  root.add(createContactShadow(0.42 * build, SACRED_MATERIALS.contactShadow), visual);

  const skinMaterial = createCharacterMaterial(skin, { roughness: 0.7 });
  const primaryMaterial = createCharacterMaterial(primary, { roughness: 0.76 });
  const secondaryMaterial = createCharacterMaterial(secondary, { roughness: 0.64 });
  const bootMaterial = createCharacterMaterial(boot, {
    roughness: 0.38,
    metalness: 0.05
  });

  const scale = height / 1.78;
  visual.scale.setScalar(scale);

  const hips = new THREE.Group();
  hips.name = '骨架-胯';
  hips.position.y = 0.76;
  const torso = createMesh(
    createTorsoGeometry(build, feminine),
    primaryMaterial,
    '连续剪裁身体',
    [0, 0.08, 0]
  );
  const waist = createMesh(
    createCuffGeometry({
      radiusX: 0.255 * build,
      radiusZ: 0.18 * build,
      height: 0.15,
      flare: 0.012,
      name: '贴合腰封拓扑'
    }),
    secondaryMaterial,
    '立体贴合腰封',
    [0, 0.03, 0]
  );
  hips.add(torso, waist);
  visual.add(hips);

  function createLeg(side) {
    const label = side < 0 ? '左' : '右';
    const upper = new THREE.Group();
    upper.name = `骨架-${label}腿`;
    upper.position.set(side * 0.16 * build, 0.75, 0);
    const thigh = createMesh(
      createThighGeometry(build),
      secondaryMaterial,
      `${label}大腿剪裁拓扑`
    );
    const lower = new THREE.Group();
    lower.name = `骨架-${label}小腿`;
    lower.position.y = -0.46;
    const shin = createMesh(
      createShinGeometry(build),
      primaryMaterial,
      `${label}小腿连续拓扑`
    );
    const shoe = createMesh(
      createBootGeometry(build),
      bootMaterial,
      `${label}完整鞋楦靴`,
      [0, -0.12, 0]
    );
    lower.add(shin, shoe);
    upper.add(thigh, lower);
    visual.add(upper);
    return { upper, lower, thigh, shin, shoe };
  }

  function createArm(side) {
    const label = side < 0 ? '左' : '右';
    const upper = new THREE.Group();
    upper.name = `骨架-${label}臂`;
    upper.position.set(side * (feminine ? 0.29 : 0.315) * build, 1.33, 0);
    const upperMesh = createMesh(
      createUpperArmGeometry(build, true),
      primaryMaterial,
      `${label}肩峰上臂连续拓扑`
    );
    const upperSeam = createMesh(
      createCurveSolidGeometry({
        points: [
          [side * 0.035, 0.01, 0.116 * build],
          [side * 0.028, -0.19, 0.102 * build],
          [side * 0.02, -0.4, 0.078 * build]
        ],
        widths: 0.0055 * build,
        depths: 0.0035 * build,
        segments: 7,
        radialSegments: 4,
        name: `${label}上袖立体缝线拓扑`
      }),
      secondaryMaterial,
      `${label}上袖立体缝线`
    );
    const shoulderGuard = createMesh(
      createCuffGeometry({
        radiusX: 0.119 * build,
        radiusZ: 0.115 * build,
        height: 0.065,
        flare: 0.007,
        name: `${label}肩袖结构拓扑`
      }),
      secondaryMaterial,
      `${label}结构化肩袖`,
      [0, 0.005, 0]
    );
    const lower = new THREE.Group();
    lower.name = `骨架-${label}前臂`;
    lower.position.y = -0.42;
    const lowerMesh = createMesh(
      createForearmGeometry(build, true),
      primaryMaterial,
      `${label}肘腕连续拓扑`
    );
    const lowerSeam = createMesh(
      createCurveSolidGeometry({
        points: [
          [side * 0.018, 0.02, 0.087 * build],
          [side * 0.014, -0.17, 0.076 * build],
          [side * 0.008, -0.34, 0.06 * build]
        ],
        widths: 0.0048 * build,
        depths: 0.0032 * build,
        segments: 6,
        radialSegments: 4,
        name: `${label}前臂立体缝线拓扑`
      }),
      secondaryMaterial,
      `${label}前臂立体缝线`
    );
    const cuff = createMesh(
      createCuffGeometry({
        radiusX: 0.084 * build,
        radiusZ: 0.078 * build,
        height: 0.105,
        flare: 0.018,
        name: `${label}袖口拓扑`
      }),
      secondaryMaterial,
      `${label}双层袖口`,
      [0, -0.335, 0]
    );
    const hand = createMesh(
      createHandGeometry(side, build, detailedHands),
      skinMaterial,
      `${label}带手指手部`,
      [0, -0.37, 0]
    );
    lower.add(lowerMesh, lowerSeam, cuff, hand);
    upper.add(upperMesh, upperSeam, shoulderGuard, lower);
    visual.add(upper);
    return {
      upper,
      lower,
      hand,
      upperMesh,
      lowerMesh,
      upperSeam,
      lowerSeam,
      cuff,
      shoulderGuard
    };
  }

  const leftLeg = createLeg(-1);
  const rightLeg = createLeg(1);
  const leftArm = createArm(-1);
  const rightArm = createArm(1);

  const neck = createMesh(
    createNeckGeometry(build),
    skinMaterial,
    '颈部肌肉过渡',
    [0, 1.5, 0]
  );
  const headPivot = new THREE.Group();
  headPivot.name = '骨架-头';
  headPivot.position.y = 1.62;
  headPivot.scale.setScalar(headScale);
  const head = createMesh(
    createStylizedHeadGeometry(build),
    skinMaterial,
    '雕刻式动漫头部'
  );
  headPivot.add(head);
  visual.add(neck, headPivot);

  root.userData.rig = {
    visual,
    hips,
    torso,
    waist,
    head,
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
