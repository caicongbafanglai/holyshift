import * as THREE from 'three';
import { createMesh } from '../../modeling/primitives.js';
import { createCharacterMaterial } from '../../materials/sacredMaterials.js';
import {
  createEarGeometry
} from './modeling/anatomyGeometry.js';
import {
  createAgeLineGeometry,
  createBrowGeometry,
  createEyeLensGeometry,
  createEyelidGeometry,
  createMouthLineGeometry,
  createNoseGeometry
} from './modeling/facialGeometry.js';

export function addExpressiveFace(headPivot, {
  skin = 0xc99172,
  eye = 0x14283d,
  brow = 0x4b4038,
  pupil = 0xf2f7f4,
  smile = 0x704132,
  ageLines = true,
  feminine = false,
  stern = false,
  build = 1
} = {}) {
  const scleraMaterial = createCharacterMaterial(0xf7f2e7, {
    roughness: 0.3
  });
  const irisMaterial = createCharacterMaterial(eye, {
    roughness: 0.2,
    metalness: 0.05
  });
  const pupilMaterial = createCharacterMaterial(0x09131c, { roughness: 0.18 });
  const catchlightMaterial = createCharacterMaterial(pupil, {
    roughness: 0.12,
    emissive: pupil,
    emissiveIntensity: 0.12
  });
  const browMaterial = createCharacterMaterial(brow, { roughness: 0.86 });
  const lipMaterial = createCharacterMaterial(smile, { roughness: 0.68 });
  const noseShadeMaterial = createCharacterMaterial(
    new THREE.Color(skin).offsetHSL(0, 0.015, -0.035),
    { roughness: 0.76 }
  );
  const lineMaterial = createCharacterMaterial(
    new THREE.Color(skin).offsetHSL(0.01, 0.02, -0.12),
    { roughness: 0.9 }
  );

  const facialRoot = new THREE.Group();
  facialRoot.name = '面部五官分层';
  const eyeY = feminine ? 0.045 : 0.035;
  const eyeX = feminine ? 0.09 : 0.088;
  const eyeWidth = feminine ? 0.081 : 0.076;
  const eyeHeight = feminine ? 0.041 : 0.035;
  const eyeZ = 0.217 * build;

  for (const side of [-1, 1]) {
    const label = side < 0 ? '左' : '右';
    const sclera = createMesh(
      createEyeLensGeometry(eyeWidth, eyeHeight, {
        upperLift: feminine ? 0.2 : 0.1,
        name: `${label}杏形眼白拓扑`
      }),
      scleraMaterial,
      `${label}杏形眼白`,
      [side * eyeX * build, eyeY * build, eyeZ]
    );
    const iris = createMesh(
      createEyeLensGeometry(
        (feminine ? 0.031 : 0.028) * build,
        (feminine ? 0.035 : 0.031) * build,
        { segments: 16, bulge: 0.004, upperLift: 0, name: `${label}虹膜拓扑` }
      ),
      irisMaterial,
      `${label}分层虹膜`,
      [side * eyeX * build, (eyeY - 0.002) * build, eyeZ + 0.009]
    );
    const pupilMesh = createMesh(
      createEyeLensGeometry(0.012 * build, 0.019 * build, {
        segments: 14,
        bulge: 0.003,
        upperLift: 0,
        name: `${label}瞳孔拓扑`
      }),
      pupilMaterial,
      `${label}瞳孔`,
      [side * eyeX * build, (eyeY - 0.002) * build, eyeZ + 0.014]
    );
    const catchlight = createMesh(
      createEyeLensGeometry(0.0065 * build, 0.0085 * build, {
        segments: 10,
        bulge: 0.002,
        upperLift: 0,
        name: `${label}眼神高光拓扑`
      }),
      catchlightMaterial,
      `${label}双层眼神高光`,
      [
        side * (eyeX - 0.008) * build,
        (eyeY + 0.012) * build,
        eyeZ + 0.019
      ]
    );
    const upperLid = createMesh(
      createEyelidGeometry(side, false),
      browMaterial,
      `${label}上眼睑与睫毛`,
      [0, eyeY * build, eyeZ + 0.017],
      [0, 0, stern ? -side * 0.06 : 0],
      [build, build, build]
    );
    const lowerLid = createMesh(
      createEyelidGeometry(side, true),
      lineMaterial,
      `${label}下眼睑`,
      [0, (eyeY - 0.002) * build, eyeZ + 0.013],
      [0, 0, 0],
      [build, build, build]
    );
    const browMesh = createMesh(
      createBrowGeometry(side, stern ? -0.7 : 0.15),
      browMaterial,
      `${label}独立眉毛`,
      [0, (eyeY + 0.076) * build, eyeZ + 0.007],
      [0, 0, stern ? -side * 0.06 : 0],
      [build, build, build]
    );
    const ear = createMesh(
      createEarGeometry(side, build),
      noseShadeMaterial,
      `${label}外耳廓`,
      [side * 0.222 * build, -0.006, -0.004]
    );
    facialRoot.add(
      sclera,
      iris,
      pupilMesh,
      catchlight,
      upperLid,
      lowerLid,
      browMesh,
      ear
    );
  }

  const nose = createMesh(
    createNoseGeometry({
      width: (feminine ? 0.044 : 0.052) * build,
      height: (feminine ? 0.1 : 0.112) * build,
      depth: (feminine ? 0.034 : 0.041) * build
    }),
    noseShadeMaterial,
    '鼻梁鼻尖鼻翼',
    [0, -0.018 * build, eyeZ + 0.002]
  );
  const mouth = createMesh(
    createMouthLineGeometry(stern ? -0.18 : 0.45),
    lipMaterial,
    stern ? '克制严肃嘴型' : '可靠微笑嘴型',
    [0, -0.113 * build, eyeZ + 0.003],
    [0, 0, 0],
    [build, build, build]
  );
  facialRoot.add(nose, mouth);

  if (ageLines) {
    for (const side of [-1, 1]) {
      for (let index = 0; index < 2; index += 1) {
        facialRoot.add(
          createMesh(
            createAgeLineGeometry(side, index),
            lineMaterial,
            `${side < 0 ? '左' : '右'}眼尾笑纹-${index + 1}`,
            [0, (eyeY - 0.002) * build, eyeZ + 0.004],
            [0, 0, 0],
            [build, build, build]
          )
        );
      }
    }
  }

  headPivot.add(facialRoot);
  return {
    root: facialRoot,
    leftEye: facialRoot.getObjectByName('左杏形眼白'),
    rightEye: facialRoot.getObjectByName('右杏形眼白'),
    smile: mouth
  };
}
