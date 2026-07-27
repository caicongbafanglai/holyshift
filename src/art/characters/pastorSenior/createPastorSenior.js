import * as THREE from 'three';
import { createCharacterMaterial, SACRED_MATERIALS } from '../../materials/sacredMaterials.js';
import { createMesh, createRibbonGeometry } from '../../modeling/primitives.js';
import { addExpressiveFace } from '../common/createFace.js';
import { animateHumanoid, createHumanoidRig } from '../common/createHumanoidRig.js';

export function createPastorSenior() {
  const model = createHumanoidRig({
    name: '牧司学姐',
    height: 1.72,
    skin: 0xd3a082,
    primary: 0xf6f0df,
    secondary: 0x376b8f,
    boot: 0x283d56,
    build: 0.92
  });
  const rig = model.userData.rig;
  addExpressiveFace(rig.headPivot, {
    skin: 0xd3a082,
    eye: 0x255779,
    brow: 0x42382f,
    smile: 0x8a4f4f,
    ageLines: false
  });
  const hairMaterial = createCharacterMaterial(0x47362d, { roughness: 0.86 });
  const hairCap = createMesh(
    new THREE.SphereGeometry(0.26, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.68),
    hairMaterial,
    '牧司学姐发冠',
    [0, 0.015, -0.02],
    [0, 0, 0],
    [1.03, 1.04, 1]
  );
  rig.headPivot.add(hairCap);
  for (const side of [-1, 1]) {
    const braid = createMesh(
      new THREE.CapsuleGeometry(0.048, 0.48, 5, 9),
      hairMaterial,
      side < 0 ? '左祷告编发' : '右祷告编发',
      [side * 0.22, -0.25, -0.01],
      [0, 0, side * 0.06]
    );
    const ribbon = createMesh(
      new THREE.OctahedronGeometry(0.07, 0),
      SACRED_MATERIALS.polishedGold,
      side < 0 ? '左编发金扣' : '右编发金扣',
      [side * 0.22, -0.48, -0.01]
    );
    rig.headPivot.add(braid, ribbon);
  }
  const halo = createMesh(
    new THREE.TorusGeometry(0.31, 0.018, 7, 30),
    SACRED_MATERIALS.polishedGold,
    '导告仪式冠环',
    [0, 0.42, -0.03],
    [Math.PI / 2, 0, 0]
  );
  rig.headPivot.add(halo);

  const skirt = createMesh(
    new THREE.CylinderGeometry(0.28, 0.48, 1.05, 24),
    rig.materials.primary,
    '祷倌仪式裙袍',
    [0, 0.54, 0]
  );
  const bluePanel = createMesh(
    createRibbonGeometry(
      [
        [0, 0.52],
        [0.03, 0.18],
        [0.09, -0.46]
      ],
      0.22,
      0.025
    ),
    SACRED_MATERIALS.deepBlue,
    '导告蓝色礼带',
    [0, 0.92, 0.31]
  );
  rig.visual.add(skirt, bluePanel);

  const book = new THREE.Group();
  book.name = '导告祷词册';
  book.position.set(0, -0.38, 0.03);
  book.add(
    createMesh(
      new THREE.BoxGeometry(0.26, 0.36, 0.07),
      SACRED_MATERIALS.deepBlue,
      '祷词册封面',
      [0, -0.08, 0]
    ),
    createMesh(
      new THREE.BoxGeometry(0.21, 0.31, 0.075),
      SACRED_MATERIALS.ivoryWarm,
      '祷词册书页',
      [0, -0.08, -0.006]
    ),
    createMesh(
      new THREE.BoxGeometry(0.035, 0.18, 0.012),
      SACRED_MATERIALS.polishedGold,
      '祷词册圣纹',
      [0, -0.08, 0.044]
    )
  );
  rig.leftArm.lower.add(book);
  model.userData.animate = (state) => {
    animateHumanoid(model, state);
    halo.rotation.z = Math.sin((state.time ?? 0) * 0.8) * 0.05;
  };
  return model;
}
