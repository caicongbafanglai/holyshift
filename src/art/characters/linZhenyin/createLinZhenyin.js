import * as THREE from 'three';
import { createCharacterMaterial, SACRED_MATERIALS } from '../../materials/sacredMaterials.js';
import { createMesh, createShieldGeometry } from '../../modeling/primitives.js';
import { addExpressiveFace } from '../common/createFace.js';
import { animateHumanoid, createHumanoidRig } from '../common/createHumanoidRig.js';

export function createLinZhenyin() {
  const model = createHumanoidRig({
    name: '林镇阴',
    height: 1.86,
    skin: 0xaf795d,
    primary: 0x26323e,
    secondary: 0x111b27,
    boot: 0x0c1118,
    build: 1.08
  });
  const rig = model.userData.rig;
  addExpressiveFace(rig.headPivot, {
    skin: 0xaf795d,
    eye: 0x132631,
    brow: 0x7b7f82,
    smile: 0x55392f,
    ageLines: true
  });

  const grey = createCharacterMaterial(0x7f8587, { roughness: 0.9 });
  const hair = createMesh(
    new THREE.SphereGeometry(0.255, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.58),
    grey,
    '林镇阴短灰发',
    [0, 0.03, -0.02]
  );
  const moustache = createMesh(
    new THREE.CapsuleGeometry(0.016, 0.15, 3, 8),
    grey,
    '林镇阴胡须',
    [0, -0.105, 0.235],
    [0, 0, Math.PI / 2]
  );
  rig.headPivot.add(hair, moustache);

  const coat = createMesh(
    new THREE.CylinderGeometry(0.31, 0.48, 1.18, 22, 1, true),
    rig.materials.primary,
    '驱魔组长长风衣',
    [0, 0.61, 0]
  );
  const lapelLeft = createMesh(
    createShieldGeometry(0.18, 0.55, 0.025),
    SACRED_MATERIALS.deepBlue,
    '风衣左翻领',
    [-0.11, 1.12, 0.292],
    [0, 0, -0.12]
  );
  const lapelRight = lapelLeft.clone();
  lapelRight.name = '风衣右翻领';
  lapelRight.position.x = 0.11;
  lapelRight.rotation.z = 0.12;
  const harness = createMesh(
    new THREE.TorusGeometry(0.34, 0.035, 7, 22),
    SACRED_MATERIALS.gold,
    '驱魔装备胸带',
    [0, 1.06, 0],
    [Math.PI / 2.65, 0.18, 0]
  );
  rig.visual.add(coat, lapelLeft, lapelRight, harness);

  const lantern = new THREE.Group();
  lantern.name = '审批封印提灯';
  lantern.position.set(0, -0.42, 0.02);
  lantern.add(
    createMesh(
      new THREE.CylinderGeometry(0.13, 0.16, 0.32, 10),
      SACRED_MATERIALS.darkGlass,
      '提灯玻璃',
      [0, -0.18, 0]
    ),
    createMesh(
      new THREE.TorusGeometry(0.14, 0.018, 6, 18, Math.PI),
      SACRED_MATERIALS.gold,
      '提灯把手',
      [0, 0.02, 0],
      [0, 0, Math.PI]
    ),
    createMesh(
      new THREE.OctahedronGeometry(0.07, 1),
      SACRED_MATERIALS.holyShift,
      '提灯封印核心',
      [0, -0.18, 0]
    )
  );
  rig.leftArm.lower.add(lantern);
  model.userData.animate = (state) => {
    animateHumanoid(model, state);
    lantern.rotation.y = Math.sin((state.time ?? 0) * 1.7) * 0.12;
  };
  return model;
}
