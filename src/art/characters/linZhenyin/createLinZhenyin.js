import * as THREE from 'three';
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
  createTailoredGarmentGeometry,
  createTaperedRibbonGeometry
} from '../common/modeling/garmentGeometry.js';
import {
  createHairCapGeometry,
  createHairClumpGeometry
} from '../common/modeling/hairGeometry.js';
import {
  createCurveSolidGeometry,
  createProfiledSurfaceGeometry
} from '../common/modeling/organicGeometry.js';

function addHairAndFacialHair(headPivot) {
  const grey = createCharacterMaterial(0x767d82, { roughness: 0.92 });
  const silver = createCharacterMaterial(0xa3a7a8, { roughness: 0.9 });
  headPivot.add(
    createMesh(
      createHairCapGeometry({
        volume: 1.045,
        length: 0.065,
        name: '林镇阴短发分区发壳拓扑'
      }),
      grey,
      '林镇阴短发底层'
    )
  );

  const locks = [
    [[-0.19, 0.1, 0.13], [-0.13, 0.22, 0.19], [-0.02, 0.265, 0.14]],
    [[-0.08, 0.14, 0.19], [-0.01, 0.255, 0.2], [0.09, 0.235, 0.15]],
    [[0.06, 0.14, 0.19], [0.14, 0.23, 0.16], [0.205, 0.16, 0.08]],
    [[-0.225, 0.1, 0.02], [-0.246, 0.005, 0.03], [-0.22, -0.085, 0.07]],
    [[0.225, 0.1, 0.02], [0.246, 0.005, 0.03], [0.22, -0.085, 0.07]],
    [[-0.16, 0.21, -0.205], [-0.21, 0.075, -0.245], [-0.18, -0.11, -0.22]],
    [[0.16, 0.21, -0.205], [0.21, 0.075, -0.245], [0.18, -0.11, -0.22]],
    [[0, 0.245, -0.215], [-0.012, 0.06, -0.255], [0, -0.14, -0.225]]
  ];
  locks.forEach((points, index) => {
    headPivot.add(
      createMesh(
        createHairClumpGeometry({
          points,
          rootWidth: index < 3 ? 0.068 : 0.06,
          midWidth: index < 3 ? 0.05 : 0.043,
          tipWidth: 0.011,
          depth: 0.024,
          segments: 7,
          name: `林镇阴定向灰发束拓扑-${index + 1}`
        }),
        index % 3 === 0 ? silver : grey,
        `林镇阴定向灰发束-${index + 1}`
      )
    );
  });

  for (const side of [-1, 1]) {
    headPivot.add(
      createMesh(
        createCurveSolidGeometry({
          points: [
            [side * 0.008, -0.096, 0.239],
            [side * 0.055, -0.102, 0.242],
            [side * 0.112, -0.112, 0.223]
          ],
          widths: [0.016, 0.021, 0.007],
          depths: [0.01, 0.012, 0.004],
          segments: 7,
          radialSegments: 5,
          tipPinch: 0.25,
          name: `${side < 0 ? '左' : '右'}短须拓扑`
        }),
        grey,
        `${side < 0 ? '左' : '右'}冷峻短须`
      )
    );
  }
  headPivot.add(
    createMesh(
      createHairClumpGeometry({
        points: [[0, -0.145, 0.205], [0.006, -0.215, 0.195], [0, -0.29, 0.165]],
        rootWidth: 0.058,
        midWidth: 0.042,
        tipWidth: 0.009,
        depth: 0.022,
        segments: 7,
        name: '林镇阴下颌短须拓扑'
      }),
      grey,
      '林镇阴下颌短须'
    )
  );
}

function addExorcistCoat(model) {
  const rig = model.userData.rig;
  const coatMaterial = createCharacterMaterial(0x202d39, { roughness: 0.78 });
  const charcoal = createCharacterMaterial(0x111922, { roughness: 0.84 });
  const fittedCoat = createMesh(
    createTailoredGarmentGeometry({
      build: 1.08,
      feminine: false,
      long: true,
      openFront: true,
      name: '驱魔组长不对称风衣主体拓扑'
    }),
    coatMaterial,
    '驱魔组长不对称风衣主体',
    [0, 0.07, 0]
  );
  rig.hips.add(fittedCoat);

  const lapelShape = [
    [-0.01, 0.28],
    [-0.15, 0.08],
    [-0.11, -0.37],
    [0.045, -0.13],
    [0.09, 0.16]
  ];
  for (const side of [-1, 1]) {
    const lapel = createMesh(
      createExtrudedPanelGeometry(
        lapelShape.map(([x, y]) => [x * side, y]),
        { depth: 0.026, bevel: 0.006, name: '风衣翻领裁片拓扑' }
      ),
      side < 0 ? SACRED_MATERIALS.deepBlue : charcoal,
      `风衣${side < 0 ? '左' : '右'}不对称翻领`,
      [side * 0.075, 0.94, 0.25],
      [0, 0, side * 0.055]
    );
    rig.visual.add(lapel);
  }

  const backPanels = [
    {
      name: '风衣左后摆',
      x: -0.16,
      points: [[-0.16, 0.5], [-0.24, 0.05], [-0.2, -0.5], [0.04, -0.42], [0.09, 0.45]]
    },
    {
      name: '风衣右后摆',
      x: 0.16,
      points: [[0.16, 0.5], [0.24, 0.05], [0.2, -0.5], [-0.04, -0.42], [-0.09, 0.45]]
    }
  ];
  backPanels.forEach((panel) => {
    rig.visual.add(
      createMesh(
        createExtrudedPanelGeometry(panel.points, {
          depth: 0.034,
          bevel: 0.007,
          name: `${panel.name}拓扑`
        }),
        coatMaterial,
        panel.name,
        [0, 0.58, -0.23]
      )
    );
  });

  const shoulderGuard = createMesh(
    createProfiledSurfaceGeometry(
      [
        { y: -0.09, radiusX: 0.19, radiusZ: 0.13 },
        { y: 0.0, radiusX: 0.21, radiusZ: 0.15, sideBias: 0.08 },
        { y: 0.1, radiusX: 0.15, radiusZ: 0.12 }
      ],
      {
        radialSegments: 14,
        thetaStart: 0.1,
        thetaLength: Math.PI * 1.55,
        capTop: false,
        capBottom: false,
        name: '左肩驱魔护肩拓扑'
      }
    ),
    SACRED_MATERIALS.deepBlue,
    '左肩驱魔护肩',
    [-0.34, 1.37, 0],
    [0, 0, -0.18]
  );
  rig.visual.add(shoulderGuard);

  const chestHarness = createMesh(
    createGarmentPipingGeometry(
      [
        [-0.29, 1.37, 0.19],
        [-0.1, 1.2, 0.28],
        [0.08, 1.0, 0.3],
        [0.27, 0.86, 0.22]
      ],
      0.027
    ),
    SACRED_MATERIALS.gold,
    '驱魔装备斜向胸带'
  );
  rig.visual.add(chestHarness);
  const backHarness = createMesh(
    createGarmentPipingGeometry(
      [
        [0.23, 1.31, -0.2],
        [0.08, 1.09, -0.3],
        [-0.05, 0.82, -0.33],
        [-0.18, 0.61, -0.28]
      ],
      0.016
    ),
    SACRED_MATERIALS.deepBlue,
    '驱魔风衣背部结界导线'
  );
  rig.visual.add(backHarness);

  const talismanMaterial = createCharacterMaterial(0xcbbf9d, { roughness: 0.92 });
  for (let index = 0; index < 3; index += 1) {
    const x = -0.12 + index * 0.12;
    const seal = createMesh(
      createTaperedRibbonGeometry(
        [[0, 0.14], [0.008, 0], [index % 2 === 0 ? -0.018 : 0.018, -0.17]],
        [0.062, 0.058, 0.045],
        { depth: 0.011, bevel: 0.002, name: `审批封条拓扑-${index + 1}` }
      ),
      talismanMaterial,
      `已审批驱魔封条-${index + 1}`,
      [x, 0.72 + index * 0.02, 0.315],
      [0, 0, (index - 1) * 0.045]
    );
    const ink = createMesh(
      createGarmentPipingGeometry(
        [
          [x, 0.82 + index * 0.02, 0.329],
          [x + (index - 1) * 0.006, 0.72 + index * 0.02, 0.33],
          [x, 0.62 + index * 0.02, 0.326]
        ],
        0.005
      ),
      SACRED_MATERIALS.anomalyDark,
      `封条墨迹-${index + 1}`
    );
    rig.visual.add(seal, ink);
  }
}

function addApprovalLantern(model) {
  const rig = model.userData.rig;
  const lantern = new THREE.Group();
  lantern.name = '审批封印提灯独立资产';
  lantern.position.set(0, -0.41, 0.02);
  const glass = createMesh(
    createProfiledSurfaceGeometry(
      [
        { y: -0.19, radiusX: 0.105, radiusZ: 0.095 },
        { y: -0.13, radiusX: 0.145, radiusZ: 0.125 },
        { y: 0.08, radiusX: 0.145, radiusZ: 0.125 },
        { y: 0.15, radiusX: 0.105, radiusZ: 0.095 }
      ],
      { radialSegments: 10, name: '提灯斜切玻璃仓拓扑' }
    ),
    SACRED_MATERIALS.darkGlass,
    '提灯斜切玻璃仓',
    [0, -0.18, 0]
  );
  lantern.add(glass);
  for (const side of [-1, 1]) {
    for (const front of [-1, 1]) {
      lantern.add(
        createMesh(
          createCurveSolidGeometry({
            points: [
              [side * 0.115, -0.37, front * 0.104],
              [side * 0.135, -0.18, front * 0.118],
              [side * 0.105, 0.0, front * 0.092]
            ],
            widths: 0.012,
            depths: 0.009,
            segments: 6,
            radialSegments: 5,
            name: '提灯金属护棱拓扑'
          }),
          SACRED_MATERIALS.gold,
          `提灯${side < 0 ? '左' : '右'}${front < 0 ? '后' : '前'}护棱`
        )
      );
    }
  }
  const handlePoints = [];
  for (let index = 0; index <= 10; index += 1) {
    const theta = Math.PI - (index / 10) * Math.PI;
    handlePoints.push([Math.cos(theta) * 0.145, 0.02 + Math.sin(theta) * 0.18, 0]);
  }
  lantern.add(
    createMesh(
      createCurveSolidGeometry({
        points: handlePoints,
        widths: 0.012,
        depths: 0.009,
        segments: 14,
        radialSegments: 5,
        name: '提灯提梁拓扑'
      }),
      SACRED_MATERIALS.gold,
      '提灯提梁'
    ),
    createMesh(
      createProfiledSurfaceGeometry(
        [
          { y: -0.06, radiusX: 0.018, radiusZ: 0.018 },
          { y: 0, radiusX: 0.065, radiusZ: 0.05, frontBias: 0.015 },
          { y: 0.06, radiusX: 0.018, radiusZ: 0.018 }
        ],
        { radialSegments: 8, name: '提灯封印核心拓扑' }
      ),
      SACRED_MATERIALS.holyShift,
      '提灯封印核心',
      [0, -0.18, 0]
    )
  );
  rig.leftArm.lower.add(lantern);
  return lantern;
}

export function createLinZhenyin() {
  const model = createHumanoidRig({
    name: '林镇阴',
    height: 1.86,
    skin: 0xaf795d,
    primary: 0x26323e,
    secondary: 0x111b27,
    boot: 0x0c1118,
    build: 1.08,
    detailedHands: true
  });
  const rig = model.userData.rig;
  addExpressiveFace(rig.headPivot, {
    skin: 0xaf795d,
    eye: 0x183845,
    brow: 0x7b7f82,
    smile: 0x55392f,
    ageLines: true,
    stern: true,
    build: 1.08
  });
  addHairAndFacialHair(rig.headPivot);
  addExorcistCoat(model);
  const lantern = addApprovalLantern(model);
  model.userData.animate = (state) => {
    animateHumanoid(model, state);
    lantern.rotation.y = Math.sin((state.time ?? 0) * 1.7) * 0.12;
  };
  model.userData.characterQuality = Object.freeze({
    silhouette: '高肩长风衣、灰发锐角轮廓、斜胸带、审批提灯',
    faceLayers: 8,
    hairClumps: 15,
    handTopology: '独立手指',
    authoredGeometry: true
  });
  return model;
}
