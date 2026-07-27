import * as THREE from 'three';
import { COLORS } from '../../../data/mapConfig.js';
import { createCharacterMaterial, SACRED_MATERIALS } from '../../materials/sacredMaterials.js';
import {
  createMesh,
  createRibbonGeometry,
  createShieldGeometry
} from '../../modeling/primitives.js';
import { batchMeshesWithVertexColors } from '../../modeling/batchMeshes.js';
import { addExpressiveFace } from '../common/createFace.js';
import {
  animateHumanoid,
  createHumanoidRig
} from '../common/createHumanoidRig.js';

function addPastorHairAndBeard(headPivot) {
  const hairMaterial = createCharacterMaterial(COLORS.hair, { roughness: 0.88 });
  const hairCap = createMesh(
    new THREE.SphereGeometry(0.252, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
    hairMaterial,
    '老牧师银发',
    [0, 0.04, -0.018],
    [0, 0, 0],
    [0.96, 1.02, 1]
  );
  const sideCurlGeometry = new THREE.TorusGeometry(0.055, 0.022, 6, 12, Math.PI * 1.45);
  for (const side of [-1, 1]) {
    const curl = createMesh(
      sideCurlGeometry,
      hairMaterial,
      side < 0 ? '左鬓卷发' : '右鬓卷发',
      [side * 0.225, -0.025, 0.01],
      [Math.PI / 2, side * 0.2, side < 0 ? -0.35 : Math.PI + 0.35]
    );
    headPivot.add(curl);
  }

  const beardCenter = createMesh(
    new THREE.SphereGeometry(0.145, 16, 12),
    hairMaterial,
    '老牧师主胡须',
    [0, -0.205, 0.145],
    [0, 0, 0],
    [0.82, 1.45, 0.7]
  );
  const beardTip = createMesh(
    new THREE.ConeGeometry(0.095, 0.25, 14),
    hairMaterial,
    '老牧师胡须尖',
    [0, -0.39, 0.13]
  );
  const moustacheGeometry = new THREE.CapsuleGeometry(0.018, 0.12, 4, 8);
  const moustacheLeft = createMesh(
    moustacheGeometry,
    hairMaterial,
    '左八字胡',
    [-0.052, -0.105, 0.235],
    [0, 0, Math.PI / 2 + 0.18]
  );
  const moustacheRight = moustacheLeft.clone();
  moustacheRight.name = '右八字胡';
  moustacheRight.position.x = 0.052;
  moustacheRight.rotation.z = Math.PI / 2 - 0.18;
  headPivot.add(hairCap, beardCenter, beardTip, moustacheLeft, moustacheRight);
}

function addCeremonialHat(headPivot) {
  const ivory = SACRED_MATERIALS.ivoryWarm;
  const gold = SACRED_MATERIALS.polishedGold;
  const blue = SACRED_MATERIALS.deepBlue;
  const hat = new THREE.Group();
  hat.name = '会长礼冠';
  hat.position.y = 0.26;
  const base = createMesh(
    new THREE.CylinderGeometry(0.25, 0.27, 0.12, 20),
    ivory,
    '礼冠底圈',
    [0, 0.04, 0]
  );
  const crown = createMesh(
    new THREE.CylinderGeometry(0.105, 0.245, 0.42, 20),
    ivory,
    '礼冠主体',
    [0, 0.29, 0],
    [0, 0, 0],
    [1, 1, 0.74]
  );
  const frontPanel = createMesh(
    createShieldGeometry(0.26, 0.42, 0.025),
    blue,
    '礼冠深蓝额片',
    [0, 0.31, 0.181]
  );
  const vertical = createMesh(
    new THREE.BoxGeometry(0.032, 0.28, 0.025),
    gold,
    '礼冠圣纹竖线',
    [0, 0.32, 0.202]
  );
  const horizontal = createMesh(
    new THREE.BoxGeometry(0.15, 0.03, 0.025),
    gold,
    '礼冠圣纹横线',
    [0, 0.37, 0.204]
  );
  const topGem = createMesh(
    new THREE.OctahedronGeometry(0.055, 1),
    SACRED_MATERIALS.holyShift,
    '礼冠 Shift 宝石',
    [0, 0.55, 0]
  );
  hat.add(base, crown, frontPanel, vertical, horizontal, topGem);
  headPivot.add(hat);
}

function addCeremonialRobe(model) {
  const rig = model.userData.rig;
  const skirt = createMesh(
    new THREE.CylinderGeometry(0.32, 0.49, 1.1, 24, 1, false),
    SACRED_MATERIALS.ivoryWarm,
    '老牧师多层礼袍',
    [0, 0.57, 0],
    [0, 0, 0],
    [1, 1, 0.82]
  );
  const underskirt = createMesh(
    new THREE.CylinderGeometry(0.28, 0.43, 0.96, 24),
    SACRED_MATERIALS.deepBlue,
    '老牧师深蓝内袍',
    [0, 0.5, -0.018]
  );
  const hem = createMesh(
    new THREE.TorusGeometry(0.45, 0.035, 8, 28),
    SACRED_MATERIALS.gold,
    '礼袍金边',
    [0, 0.045, 0],
    [Math.PI / 2, 0, 0],
    [1, 1, 0.82]
  );
  const stoleGeometry = createRibbonGeometry(
    [
      [0, 0.62],
      [0.01, 0.24],
      [-0.03, -0.4],
      [0, -0.58]
    ],
    0.12,
    0.028
  );
  const stoleLeft = createMesh(
    stoleGeometry,
    SACRED_MATERIALS.deepBlue,
    '师牧会左圣带',
    [-0.11, 1.04, 0.29]
  );
  const stoleRight = stoleLeft.clone();
  stoleRight.name = '师牧会右圣带';
  stoleRight.position.x = 0.11;
  const stoleTrimLeft = createMesh(
    new THREE.BoxGeometry(0.025, 0.88, 0.025),
    SACRED_MATERIALS.polishedGold,
    '师牧会左圣带金线',
    [-0.16, 1.0, 0.318],
    [0, 0, -0.03]
  );
  const stoleTrimRight = stoleTrimLeft.clone();
  stoleTrimRight.name = '师牧会右圣带金线';
  stoleTrimRight.position.x = 0.16;
  stoleTrimRight.rotation.z = 0.03;
  const medallion = createMesh(
    new THREE.CylinderGeometry(0.09, 0.09, 0.035, 20),
    SACRED_MATERIALS.polishedGold,
    '师牧会会长徽章',
    [0, 1.12, 0.35],
    [Math.PI / 2, 0, 0]
  );
  const medallionCore = createMesh(
    new THREE.OctahedronGeometry(0.042, 1),
    SACRED_MATERIALS.holyShift,
    '会长徽章核心',
    [0, 1.12, 0.377]
  );
  rig.visual.add(
    underskirt,
    skirt,
    hem,
    stoleLeft,
    stoleRight,
    stoleTrimLeft,
    stoleTrimRight,
    medallion,
    medallionCore
  );
}

function addShiftStaff(model) {
  const { rightArm } = model.userData.rig;
  const staff = new THREE.Group();
  staff.name = 'Holy Shift 会长手杖';
  staff.position.set(0.02, -0.38, 0.02);
  const shaft = createMesh(
    new THREE.CylinderGeometry(0.026, 0.035, 1.52, 12),
    SACRED_MATERIALS.darkWood,
    '手杖杖身',
    [0, -0.58, 0]
  );
  const shaftInlay = createMesh(
    new THREE.CylinderGeometry(0.008, 0.008, 1.38, 8),
    SACRED_MATERIALS.polishedGold,
    '手杖金线',
    [0, -0.53, 0.029]
  );
  const headRing = createMesh(
    new THREE.TorusGeometry(0.14, 0.025, 8, 24),
    SACRED_MATERIALS.polishedGold,
    '手杖概念移位环',
    [0, 0.23, 0],
    [Math.PI / 2, 0, 0]
  );
  const upperMark = createMesh(
    new THREE.BoxGeometry(0.034, 0.3, 0.034),
    SACRED_MATERIALS.holyShift,
    '手杖圣字竖笔',
    [0, 0.24, 0]
  );
  const crossMark = createMesh(
    new THREE.BoxGeometry(0.25, 0.034, 0.034),
    SACRED_MATERIALS.holyShift,
    '手杖圣字横笔',
    [0.04, 0.28, 0]
  );
  const offsetMark = createMesh(
    new THREE.BoxGeometry(0.11, 0.034, 0.034),
    SACRED_MATERIALS.anomaly,
    '手杖 Shift 偏移笔',
    [-0.1, 0.16, 0.01],
    [0, 0, -0.35]
  );
  const ferrule = createMesh(
    new THREE.ConeGeometry(0.055, 0.15, 12),
    SACRED_MATERIALS.gold,
    '手杖杖脚',
    [0, -1.38, 0],
    [0, 0, Math.PI]
  );
  staff.add(shaft, shaftInlay, headRing, upperMark, crossMark, offsetMark, ferrule);
  rightArm.lower.add(staff);
  model.userData.staff = staff;
}

export function createOldPastor() {
  const model = createHumanoidRig({
    name: '老牧师',
    height: 1.78,
    skin: COLORS.skin,
    primary: COLORS.robe,
    secondary: COLORS.deepBlue,
    boot: 0x202a3b,
    build: 1.04
  });
  const { headPivot } = model.userData.rig;
  addExpressiveFace(headPivot, {
    skin: COLORS.skin,
    eye: 0x173650,
    brow: 0xe7e2d7,
    smile: 0x815041,
    ageLines: true
  });
  addPastorHairAndBeard(headPivot);
  addCeremonialHat(headPivot);
  addCeremonialRobe(model);
  addShiftStaff(model);

  const glassesMaterial = createCharacterMaterial(0xd8c16d, {
    roughness: 0.25,
    metalness: 0.75
  });
  for (const side of [-1, 1]) {
    const lens = createMesh(
      new THREE.TorusGeometry(0.075, 0.009, 6, 18),
      glassesMaterial,
      side < 0 ? '左金丝镜框' : '右金丝镜框',
      [side * 0.09, 0.042, 0.245]
    );
    headPivot.add(lens);
  }
  headPivot.add(
    createMesh(
      new THREE.BoxGeometry(0.05, 0.01, 0.012),
      glassesMaterial,
      '金丝眼镜鼻梁',
      [0, 0.042, 0.252]
    )
  );

  const rig = model.userData.rig;
  batchMeshesWithVertexColors(rig.headPivot, {
    name: '老牧师头部面容礼冠刚性批次'
  });
  batchMeshesWithVertexColors(rig.rightArm.lower, {
    name: '老牧师右手与Holy Shift手杖刚性批次'
  });
  batchMeshesWithVertexColors(rig.leftArm.lower, {
    name: '老牧师左前臂刚性批次'
  });
  batchMeshesWithVertexColors(rig.leftArm.upper, {
    name: '老牧师左上臂刚性批次',
    preserve: new Set([rig.leftArm.lower])
  });
  batchMeshesWithVertexColors(rig.rightArm.upper, {
    name: '老牧师右上臂刚性批次',
    preserve: new Set([rig.rightArm.lower])
  });
  batchMeshesWithVertexColors(rig.leftLeg.lower, {
    name: '老牧师左小腿刚性批次'
  });
  batchMeshesWithVertexColors(rig.rightLeg.lower, {
    name: '老牧师右小腿刚性批次'
  });
  batchMeshesWithVertexColors(rig.leftLeg.upper, {
    name: '老牧师左大腿刚性批次',
    preserve: new Set([rig.leftLeg.lower])
  });
  batchMeshesWithVertexColors(rig.rightLeg.upper, {
    name: '老牧师右大腿刚性批次',
    preserve: new Set([rig.rightLeg.lower])
  });
  batchMeshesWithVertexColors(rig.hips, {
    name: '老牧师躯干刚性批次'
  });
  batchMeshesWithVertexColors(rig.visual, {
    name: '老牧师礼袍静态层批次',
    preserve: new Set([
      rig.hips,
      rig.leftLeg.upper,
      rig.rightLeg.upper,
      rig.leftArm.upper,
      rig.rightArm.upper,
      rig.headPivot
    ])
  });
  model.userData.animate = (state) => animateHumanoid(model, state);
  return model;
}
