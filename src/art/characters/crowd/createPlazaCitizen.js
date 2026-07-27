import {
  createCharacterMaterial,
  SACRED_MATERIALS
} from '../../materials/sacredMaterials.js';
import { createMesh } from '../../modeling/primitives.js';
import { addExpressiveFace } from '../common/createFace.js';
import {
  animateHumanoid,
  createHumanoidRig
} from '../common/createHumanoidRig.js';
import {
  createExtrudedPanelGeometry,
  createGarmentPipingGeometry,
  createTailoredGarmentGeometry
} from '../common/modeling/garmentGeometry.js';
import {
  createHairCapGeometry,
  createHairClumpGeometry
} from '../common/modeling/hairGeometry.js';
import { createProfiledSurfaceGeometry } from '../common/modeling/organicGeometry.js';

function addCitizenHair(rig, { name, color, student }) {
  const hairMaterial = createCharacterMaterial(color, { roughness: 0.9 });
  rig.headPivot.add(
    createMesh(
      createHairCapGeometry({
        build: student ? 0.9 : 0.96,
        length: student ? 0.06 : 0.1,
        volume: 1.02,
        name: `${name}后脑发壳拓扑`
      }),
      hairMaterial,
      `${name}后脑发壳`
    )
  );
  const locks = student
    ? [
        [[-0.19, 0.11, 0.12], [-0.12, 0.22, 0.18], [-0.04, 0.11, 0.21]],
        [[-0.06, 0.17, 0.19], [0.04, 0.24, 0.19], [0.11, 0.1, 0.2]],
        [[0.14, 0.14, 0.14], [0.21, 0.16, 0.07], [0.21, -0.02, 0.08]]
      ]
    : [
        [[-0.19, 0.12, 0.12], [-0.13, 0.23, 0.18], [-0.07, 0.06, 0.2]],
        [[-0.04, 0.17, 0.2], [0.05, 0.245, 0.18], [0.12, 0.07, 0.2]],
        [[0.18, 0.13, 0.12], [0.22, 0.08, 0.05], [0.2, -0.13, 0.04]],
        [[-0.18, 0.12, -0.1], [-0.22, -0.04, -0.14], [-0.18, -0.23, -0.1]]
      ];
  locks.forEach((points, index) => {
    rig.headPivot.add(
      createMesh(
        createHairClumpGeometry({
          points,
          rootWidth: student ? 0.067 : 0.074,
          midWidth: student ? 0.047 : 0.052,
          tipWidth: 0.01,
          depth: 0.022,
          segments: 7,
          name: `${name}发束拓扑-${index + 1}`
        }),
        hairMaterial,
        `${name}定向发束-${index + 1}`
      )
    );
  });
}

function addStudentUniform(rig, name) {
  const jacket = createMesh(
    createTailoredGarmentGeometry({
      build: 0.89,
      feminine: false,
      name: `${name}学生制服拓扑`
    }),
    rig.materials.primary,
    `${name}剪裁学生制服`,
    [0, 0.07, 0]
  );
  rig.hips.add(jacket);
  const collarMaterial = createCharacterMaterial(0x416b91, { roughness: 0.74 });
  for (const side of [-1, 1]) {
    rig.visual.add(
      createMesh(
        createExtrudedPanelGeometry(
          [
            [0, 0.17],
            [side * -0.11, 0.03],
            [side * -0.05, -0.2],
            [side * 0.06, 0.02]
          ],
          { depth: 0.018, bevel: 0.004, name: `${name}制服领片拓扑` }
        ),
        collarMaterial,
        `${name}${side < 0 ? '左' : '右'}制服领片`,
        [side * 0.055, 1.3, 0.235]
      )
    );
  }
  const backpack = createMesh(
    createProfiledSurfaceGeometry(
      [
        { y: 0.76, radiusX: 0.14, radiusZ: 0.075 },
        { y: 0.84, radiusX: 0.2, radiusZ: 0.11 },
        { y: 1.1, radiusX: 0.2, radiusZ: 0.12 },
        { y: 1.2, radiusX: 0.14, radiusZ: 0.085 }
      ],
      { radialSegments: 12, name: `${name}学生背包圆角拓扑` }
    ),
    SACRED_MATERIALS.deepBlue,
    `${name}圆角学生背包`,
    [0, 0, -0.22]
  );
  rig.visual.add(backpack);
  for (const side of [-1, 1]) {
    rig.visual.add(
      createMesh(
        createGarmentPipingGeometry(
          [
            [side * 0.16, 1.18, -0.16],
            [side * 0.23, 1.0, -0.1],
            [side * 0.18, 0.78, -0.16]
          ],
          0.018
        ),
        collarMaterial,
        `${name}${side < 0 ? '左' : '右'}背包肩带`
      )
    );
  }
}

function addBelieverGarment(rig, name) {
  const coat = createMesh(
    createTailoredGarmentGeometry({
      build: 0.97,
      feminine: true,
      long: true,
      name: `${name}礼拜外衣拓扑`
    }),
    rig.materials.primary,
    `${name}剪裁礼拜外衣`,
    [0, 0.06, 0]
  );
  rig.hips.add(coat);
  const scarfPoints = [];
  for (let index = 0; index <= 12; index += 1) {
    const theta = 0.35 + (index / 12) * (Math.PI * 2 - 0.7);
    scarfPoints.push([
      Math.sin(theta) * 0.235,
      1.36,
      Math.cos(theta) * 0.18
    ]);
  }
  rig.visual.add(
    createMesh(
      createGarmentPipingGeometry(scarfPoints, 0.035),
      SACRED_MATERIALS.gold,
      `${name}立体礼拜围巾`
    ),
    createMesh(
      createExtrudedPanelGeometry(
        [[-0.13, 0.24], [-0.15, -0.22], [0, -0.32], [0.15, -0.22], [0.13, 0.24]],
        { depth: 0.018, bevel: 0.004, name: `${name}礼拜前襟拓扑` }
      ),
      rig.materials.secondary,
      `${name}礼拜前襟`,
      [0, 1.02, 0.24]
    )
  );
}

export function createPlazaCitizen({ name, kind = 'student', colors = {} }) {
  const student = kind === 'student';
  const model = createHumanoidRig({
    name,
    height: student ? 1.64 : 1.72,
    skin: colors.skin ?? 0xc89070,
    primary: colors.primary ?? (student ? 0xe9eff1 : 0xe8ddc9),
    secondary: colors.secondary ?? (student ? 0x31557a : 0x6d587b),
    boot: 0x28303b,
    build: student ? 0.88 : 0.96,
    feminine: !student,
    detailedHands: false
  });
  const rig = model.userData.rig;
  addExpressiveFace(rig.headPivot, {
    skin: colors.skin ?? 0xc89070,
    eye: student ? 0x244b66 : 0x49375a,
    brow: colors.hair ?? 0x38302c,
    smile: 0x7a4540,
    ageLines: false,
    feminine: !student,
    build: student ? 0.88 : 0.96
  });
  addCitizenHair(rig, {
    name,
    color: colors.hair ?? 0x38302c,
    student
  });
  if (student) addStudentUniform(rig, name);
  else addBelieverGarment(rig, name);
  model.userData.animate = (state) => animateHumanoid(model, state);
  model.userData.characterQuality = Object.freeze({
    silhouette: student ? '制服领片、短分束发、圆角学生背包' : '长礼拜外衣、偏分长发、立体围巾',
    faceLayers: 8,
    authoredGeometry: true,
    lodRole: '广场群众近中景预算'
  });
  return model;
}
