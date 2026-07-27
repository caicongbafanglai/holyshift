import * as THREE from 'three';
import { createMesh } from '../../modeling/primitives.js';
import { createCharacterMaterial } from '../../materials/sacredMaterials.js';

export function addExpressiveFace(headPivot, {
  skin = 0xc99172,
  eye = 0x14283d,
  brow = 0x4b4038,
  pupil = 0xf2f7f4,
  smile = 0x704132,
  ageLines = true
} = {}) {
  const skinMaterial = createCharacterMaterial(skin);
  const eyeMaterial = createCharacterMaterial(eye, { roughness: 0.28 });
  const pupilMaterial = createCharacterMaterial(pupil, { roughness: 0.2 });
  const browMaterial = createCharacterMaterial(brow);
  const smileMaterial = createCharacterMaterial(smile);

  const leftEye = createMesh(
    new THREE.SphereGeometry(0.048, 12, 8),
    eyeMaterial,
    '左眼',
    [-0.09, 0.04, 0.218],
    [0, 0, 0],
    [1, 0.72, 0.42]
  );
  const rightEye = leftEye.clone();
  rightEye.name = '右眼';
  rightEye.position.x = 0.09;
  const leftCatchlight = createMesh(
    new THREE.SphereGeometry(0.013, 8, 6),
    pupilMaterial,
    '左眼高光',
    [-0.103, 0.054, 0.238]
  );
  const rightCatchlight = leftCatchlight.clone();
  rightCatchlight.name = '右眼高光';
  rightCatchlight.position.x = 0.077;

  const browGeometry = new THREE.CapsuleGeometry(0.012, 0.12, 3, 6);
  const leftBrow = createMesh(
    browGeometry,
    browMaterial,
    '左眉',
    [-0.09, 0.122, 0.224],
    [0, 0, Math.PI / 2 - 0.1]
  );
  const rightBrow = leftBrow.clone();
  rightBrow.name = '右眉';
  rightBrow.position.x = 0.09;
  rightBrow.rotation.z = Math.PI / 2 + 0.1;

  const nose = createMesh(
    new THREE.ConeGeometry(0.038, 0.09, 8),
    skinMaterial,
    '鼻子',
    [0, -0.02, 0.254],
    [Math.PI / 2, 0, 0]
  );
  const smileCurve = new THREE.TorusGeometry(0.074, 0.009, 6, 18, Math.PI * 0.72);
  const smileMesh = createMesh(
    smileCurve,
    smileMaterial,
    '微笑',
    [0, -0.105, 0.226],
    [0.08, 0, Math.PI * 0.14]
  );

  headPivot.add(
    leftEye,
    rightEye,
    leftCatchlight,
    rightCatchlight,
    leftBrow,
    rightBrow,
    nose,
    smileMesh
  );

  if (ageLines) {
    const lineMaterial = createCharacterMaterial(0x9d6d5a, { roughness: 0.9 });
    for (const side of [-1, 1]) {
      const line = createMesh(
        new THREE.CapsuleGeometry(0.006, 0.05, 2, 5),
        lineMaterial,
        side < 0 ? '左眼笑纹' : '右眼笑纹',
        [side * 0.17, -0.002, 0.197],
        [0, 0, side * 0.78]
      );
      headPivot.add(line);
    }
  }

  return {
    leftEye,
    rightEye,
    smile: smileMesh
  };
}
