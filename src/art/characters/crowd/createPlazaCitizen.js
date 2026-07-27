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

const CITIZEN_PROFILES = Object.freeze({
  student: {
    height: 1.64,
    build: 0.88,
    feminine: false,
    hairStyle: 'layeredCrop',
    garment: 'student',
    silhouette: '制服领片、浓密分层短发、圆角学生背包'
  },
  believer: {
    height: 1.72,
    build: 0.96,
    feminine: true,
    hairStyle: 'longSidePart',
    garment: 'believer',
    silhouette: '长礼拜外衣、浓密偏分长发、立体围巾'
  },
  clerk: {
    height: 1.75,
    build: 0.94,
    feminine: false,
    hairStyle: 'sweptBack',
    garment: 'clerk',
    silhouette: '金融主街长外套、后梳厚发、审批文件挎包'
  },
  acolyte: {
    height: 1.69,
    build: 0.9,
    feminine: true,
    hairStyle: 'prayerBun',
    garment: 'acolyte',
    silhouette: '祷倌见习礼裙、浓密发髻、环形导告念珠'
  },
  vendor: {
    height: 1.67,
    build: 0.95,
    feminine: true,
    hairStyle: 'roundedBob',
    garment: 'vendor',
    silhouette: '红肠店围裙、圆润浓密短发、备案补给腰包'
  },
  usher: {
    height: 1.8,
    build: 1.03,
    feminine: false,
    hairStyle: 'layeredCrop',
    garment: 'usher',
    silhouette: '神圣广场引导长衣、厚短发、双肩礼仪披片'
  }
});

function addCitizenHair(rig, { name, color, style }) {
  const hairMaterial = createCharacterMaterial(color, { roughness: 0.9 });
  const isShort = ['layeredCrop', 'sweptBack'].includes(style);
  rig.headPivot.add(
    createMesh(
      createHairCapGeometry({
        build: isShort ? 0.93 : 0.98,
        length: isShort ? 0.11 : 0.18,
        volume: style === 'prayerBun' ? 1.16 : 1.12,
        name: `${name}后脑发壳拓扑`
      }),
      hairMaterial,
      `${name}后脑发壳`
    )
  );
  const locksByStyle = {
    layeredCrop: [
        [[-0.19, 0.11, 0.12], [-0.12, 0.22, 0.18], [-0.04, 0.11, 0.21]],
        [[-0.06, 0.17, 0.19], [0.04, 0.24, 0.19], [0.11, 0.1, 0.2]],
        [[0.14, 0.14, 0.14], [0.21, 0.16, 0.07], [0.21, -0.02, 0.08]],
        [[-0.15, 0.2, -0.16], [-0.2, 0.04, -0.22], [-0.17, -0.12, -0.17]],
        [[0.08, 0.24, -0.19], [0.15, 0.07, -0.23], [0.14, -0.12, -0.17]]
      ],
    longSidePart: [
        [[-0.19, 0.12, 0.12], [-0.13, 0.23, 0.18], [-0.07, 0.06, 0.2]],
        [[-0.04, 0.17, 0.2], [0.05, 0.245, 0.18], [0.12, 0.07, 0.2]],
        [[0.18, 0.13, 0.12], [0.22, 0.08, 0.05], [0.2, -0.13, 0.04]],
        [[-0.18, 0.12, -0.1], [-0.22, -0.04, -0.14], [-0.18, -0.3, -0.1]],
        [[-0.04, 0.22, -0.2], [-0.07, -0.03, -0.245], [-0.05, -0.34, -0.15]],
        [[0.12, 0.2, -0.18], [0.18, -0.04, -0.22], [0.16, -0.29, -0.12]]
      ],
    sweptBack: [
        [[-0.2, 0.08, 0.11], [-0.13, 0.22, 0.17], [0.02, 0.27, 0.08]],
        [[-0.08, 0.14, 0.19], [0.04, 0.27, 0.17], [0.17, 0.2, 0.07]],
        [[0.18, 0.12, 0.1], [0.23, 0.07, 0.02], [0.21, -0.09, 0.03]],
        [[-0.16, 0.22, -0.17], [-0.21, 0.05, -0.23], [-0.18, -0.15, -0.18]],
        [[0.1, 0.24, -0.2], [0.17, 0.06, -0.24], [0.16, -0.14, -0.17]]
      ],
    prayerBun: [
        [[-0.2, 0.1, 0.11], [-0.14, 0.22, 0.18], [-0.06, 0.07, 0.21]],
        [[-0.05, 0.18, 0.2], [0.05, 0.255, 0.18], [0.13, 0.08, 0.2]],
        [[0.18, 0.13, 0.1], [0.23, 0.05, 0.02], [0.21, -0.13, 0.02]],
        [[-0.18, 0.18, -0.13], [-0.22, 0.01, -0.19], [-0.19, -0.2, -0.13]],
        [[0.12, 0.21, -0.18], [0.17, 0.02, -0.23], [0.15, -0.2, -0.14]]
      ],
    roundedBob: [
        [[-0.2, 0.12, 0.11], [-0.15, 0.23, 0.18], [-0.08, 0.04, 0.21]],
        [[-0.05, 0.18, 0.2], [0.05, 0.25, 0.18], [0.13, 0.05, 0.2]],
        [[0.18, 0.13, 0.1], [0.23, 0.04, 0.03], [0.22, -0.19, 0.03]],
        [[-0.2, 0.13, -0.08], [-0.24, -0.04, -0.13], [-0.21, -0.25, -0.07]],
        [[-0.05, 0.23, -0.2], [-0.08, 0.0, -0.25], [-0.06, -0.28, -0.15]],
        [[0.13, 0.21, -0.17], [0.2, -0.01, -0.21], [0.18, -0.25, -0.1]]
      ]
  };
  const locks = locksByStyle[style] ?? locksByStyle.layeredCrop;
  locks.forEach((points, index) => {
    rig.headPivot.add(
      createMesh(
        createHairClumpGeometry({
          points,
          rootWidth: isShort ? 0.07 : 0.078,
          midWidth: isShort ? 0.05 : 0.056,
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

  if (style === 'prayerBun') {
    rig.headPivot.add(
      createMesh(
        createProfiledSurfaceGeometry(
          [
            { y: 0.12, radiusX: 0.09, radiusZ: 0.075, centerZ: -0.205 },
            { y: 0.2, radiusX: 0.15, radiusZ: 0.135, centerZ: -0.22 },
            { y: 0.31, radiusX: 0.13, radiusZ: 0.12, centerZ: -0.215 },
            { y: 0.37, radiusX: 0.045, radiusZ: 0.045, centerZ: -0.205 }
          ],
          { radialSegments: 14, name: `${name}浓密祷告发髻拓扑` }
        ),
        hairMaterial,
        `${name}浓密祷告发髻`
      )
    );
  }
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

function addRoleGarment(rig, name, profile) {
  if (profile.garment === 'student') {
    addStudentUniform(rig, name);
    return;
  }
  if (profile.garment === 'believer') {
    addBelieverGarment(rig, name);
    return;
  }

  const long = ['clerk', 'acolyte', 'usher'].includes(profile.garment);
  const coat = createMesh(
    createTailoredGarmentGeometry({
      build: profile.build,
      feminine: profile.feminine,
      long,
      openFront: profile.garment === 'clerk',
      name: `${name}${profile.garment}职业服装拓扑`
    }),
    rig.materials.primary,
    `${name}独立职业服装`,
    [0, 0.06, 0]
  );
  rig.hips.add(coat);

  if (profile.garment === 'clerk') {
    const folio = createMesh(
      createExtrudedPanelGeometry(
        [[-0.14, -0.19], [-0.14, 0.18], [0.1, 0.2], [0.15, 0.12], [0.15, -0.19]],
        { depth: 0.055, bevel: 0.01, name: `${name}审批文件包拓扑` }
      ),
      rig.materials.secondary,
      `${name}审批文件包`,
      [0.28, 0.75, 0.04],
      [0, -0.2, -0.08]
    );
    const strap = createMesh(
      createGarmentPipingGeometry(
        [[-0.21, 1.35, 0.08], [0.02, 1.02, 0.22], [0.27, 0.72, 0.08]],
        0.018
      ),
      SACRED_MATERIALS.gold,
      `${name}文件包金扣肩带`
    );
    rig.visual.add(folio, strap);
  } else if (profile.garment === 'acolyte') {
    const beads = [];
    for (let index = 0; index <= 16; index += 1) {
      const angle = (index / 16) * Math.PI * 2;
      beads.push([
        Math.sin(angle) * 0.2,
        1.16 + Math.cos(angle) * 0.23,
        0.23
      ]);
    }
    rig.visual.add(
      createMesh(
        createGarmentPipingGeometry(beads, 0.022),
        SACRED_MATERIALS.polishedGold,
        `${name}环形导告念珠`
      )
    );
  } else if (profile.garment === 'vendor') {
    const apron = createMesh(
      createExtrudedPanelGeometry(
        [[-0.2, 0.28], [-0.24, -0.25], [-0.17, -0.43], [0.17, -0.43], [0.24, -0.25], [0.2, 0.28]],
        { depth: 0.025, bevel: 0.008, name: `${name}红肠店围裙拓扑` }
      ),
      rig.materials.secondary,
      `${name}红肠店围裙`,
      [0, 0.91, 0.25]
    );
    const pouch = createMesh(
      createProfiledSurfaceGeometry(
        [
          { y: 0.63, radiusX: 0.09, radiusZ: 0.06 },
          { y: 0.72, radiusX: 0.15, radiusZ: 0.09, centerZ: 0.02 },
          { y: 0.88, radiusX: 0.13, radiusZ: 0.08 }
        ],
        { radialSegments: 10, name: `${name}补给腰包拓扑` }
      ),
      SACRED_MATERIALS.redSausage,
      `${name}备案补给腰包`,
      [0.24, 0, 0.12]
    );
    rig.visual.add(apron, pouch);
  } else {
    for (const side of [-1, 1]) {
      rig.visual.add(
        createMesh(
          createExtrudedPanelGeometry(
            [[0, 0.12], [side * 0.18, 0.06], [side * 0.22, -0.18], [0, -0.26]],
            { depth: 0.025, bevel: 0.006, name: `${name}礼仪披片拓扑` }
          ),
          rig.materials.secondary,
          `${name}${side < 0 ? '左' : '右'}肩礼仪披片`,
          [side * 0.18, 1.34, 0.12]
        )
      );
    }
  }
}

export function createPlazaCitizen({ name, kind = 'student', colors = {} }) {
  const profile = CITIZEN_PROFILES[kind] ?? CITIZEN_PROFILES.student;
  const student = profile.garment === 'student';
  const model = createHumanoidRig({
    name,
    height: profile.height,
    skin: colors.skin ?? 0xc89070,
    primary: colors.primary ?? (student ? 0xe9eff1 : 0xe8ddc9),
    secondary: colors.secondary ?? (student ? 0x31557a : 0x6d587b),
    boot: 0x28303b,
    build: profile.build,
    feminine: profile.feminine,
    detailedHands: false
  });
  const rig = model.userData.rig;
  addExpressiveFace(rig.headPivot, {
    skin: colors.skin ?? 0xc89070,
    eye: student ? 0x244b66 : 0x49375a,
    brow: colors.hair ?? 0x38302c,
    smile: 0x7a4540,
    ageLines: false,
    feminine: profile.feminine,
    build: profile.build
  });
  addCitizenHair(rig, {
    name,
    color: colors.hair ?? 0x38302c,
    style: profile.hairStyle
  });
  addRoleGarment(rig, name, profile);
  model.userData.animate = (state) => animateHumanoid(model, state);
  model.userData.characterQuality = Object.freeze({
    silhouette: profile.silhouette,
    faceLayers: 8,
    hairStyle: profile.hairStyle,
    role: kind,
    authoredGeometry: true,
    lodRole: '广场群众近中景预算'
  });
  return model;
}
