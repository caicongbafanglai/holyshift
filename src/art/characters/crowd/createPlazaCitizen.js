import * as THREE from 'three';
import { createCharacterMaterial, SACRED_MATERIALS } from '../../materials/sacredMaterials.js';
import { createMesh } from '../../modeling/primitives.js';
import { addExpressiveFace } from '../common/createFace.js';
import { animateHumanoid, createHumanoidRig } from '../common/createHumanoidRig.js';

export function createPlazaCitizen({ name, kind = 'student', colors = {} }) {
  const student = kind === 'student';
  const model = createHumanoidRig({
    name,
    height: student ? 1.64 : 1.72,
    skin: colors.skin ?? 0xc89070,
    primary: colors.primary ?? (student ? 0xe9eff1 : 0xe8ddc9),
    secondary: colors.secondary ?? (student ? 0x31557a : 0x6d587b),
    boot: 0x28303b,
    build: student ? 0.88 : 0.96
  });
  const rig = model.userData.rig;
  addExpressiveFace(rig.headPivot, {
    skin: colors.skin ?? 0xc89070,
    eye: 0x1b3041,
    brow: colors.hair ?? 0x38302c,
    smile: 0x7a4540,
    ageLines: false
  });
  const hairMaterial = createCharacterMaterial(colors.hair ?? 0x38302c);
  rig.headPivot.add(
    createMesh(
      new THREE.SphereGeometry(0.25, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
      hairMaterial,
      `${name}-发型`,
      [0, 0.03, -0.02]
    )
  );
  if (student) {
    const backpack = createMesh(
      new THREE.BoxGeometry(0.38, 0.48, 0.18, 2, 2, 1),
      SACRED_MATERIALS.deepBlue,
      `${name}-学生背包`,
      [0, 1.02, -0.27]
    );
    rig.visual.add(backpack);
  } else {
    const scarf = createMesh(
      new THREE.TorusGeometry(0.24, 0.045, 8, 20),
      SACRED_MATERIALS.gold,
      `${name}-礼拜围巾`,
      [0, 1.34, 0],
      [Math.PI / 2, 0, 0]
    );
    rig.visual.add(scarf);
  }
  model.userData.animate = (state) => animateHumanoid(model, state);
  return model;
}
