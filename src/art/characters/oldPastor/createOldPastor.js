import * as THREE from 'three';
import { COLORS } from '../../../data/mapConfig.js';
import {
  createCharacterMaterial,
  SACRED_MATERIALS
} from '../../materials/sacredMaterials.js';
import { batchMeshesWithVertexColors } from '../../modeling/batchMeshes.js';
import { createMesh } from '../../modeling/primitives.js';
import { addExpressiveFace } from '../common/createFace.js';
import {
  animateHumanoid,
  createHumanoidRig
} from '../common/createHumanoidRig.js';
import {
  createExtrudedPanelGeometry,
  createGarmentPipingGeometry,
  createPleatedSkirtGeometry,
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

function addPastorHairAndBeard(headPivot) {
  const hairMaterial = createCharacterMaterial(COLORS.hair, { roughness: 0.9 });
  const shadowMaterial = createCharacterMaterial(0xc8c5bc, { roughness: 0.94 });
  headPivot.add(
    createMesh(
      createHairCapGeometry({
        length: 0.1,
        volume: 1.035,
        name: '老牧师后脑分区银发壳'
      }),
      shadowMaterial,
      '老牧师后脑银发底层'
    )
  );

  const sweptLocks = [
    {
      name: '前额左后梳发束',
      points: [[-0.19, 0.09, 0.13], [-0.16, 0.2, 0.17], [-0.045, 0.265, 0.11]],
      width: 0.072
    },
    {
      name: '前额中央后梳发束',
      points: [[-0.06, 0.13, 0.19], [0.0, 0.245, 0.18], [0.055, 0.275, 0.08]],
      width: 0.067
    },
    {
      name: '前额右后梳发束',
      points: [[0.18, 0.09, 0.13], [0.15, 0.205, 0.17], [0.045, 0.27, 0.11]],
      width: 0.072
    },
    {
      name: '左鬓角银发束',
      points: [[-0.224, 0.12, 0.035], [-0.245, 0.01, 0.035], [-0.22, -0.105, 0.065]],
      width: 0.055
    },
    {
      name: '右鬓角银发束',
      points: [[0.224, 0.12, 0.035], [0.245, 0.01, 0.035], [0.22, -0.105, 0.065]],
      width: 0.055
    },
    {
      name: '后脑左层叠发束',
      points: [[-0.16, 0.2, -0.205], [-0.205, 0.07, -0.245], [-0.18, -0.12, -0.225]],
      width: 0.076
    },
    {
      name: '后脑右层叠发束',
      points: [[0.16, 0.2, -0.205], [0.205, 0.07, -0.245], [0.18, -0.12, -0.225]],
      width: 0.076
    },
    {
      name: '后脑中央层叠发束',
      points: [[0, 0.235, -0.215], [0.015, 0.055, -0.255], [0, -0.155, -0.225]],
      width: 0.082
    }
  ];
  sweptLocks.forEach((lock) => {
    headPivot.add(
      createMesh(
        createHairClumpGeometry({
          points: lock.points,
          rootWidth: lock.width,
          midWidth: lock.width * 0.72,
          tipWidth: 0.012,
          depth: lock.width * 0.36,
          segments: 8,
          name: `${lock.name}拓扑`
        }),
        hairMaterial,
        lock.name
      )
    );
  });

  const beardLocks = [
    [-0.13, -0.12, 0.165, -0.15, -0.29, 0.15, -0.095, -0.42, 0.12],
    [-0.07, -0.145, 0.2, -0.08, -0.33, 0.175, -0.045, -0.47, 0.13],
    [0, -0.15, 0.21, 0.0, -0.35, 0.19, 0, -0.51, 0.13],
    [0.07, -0.145, 0.2, 0.08, -0.33, 0.175, 0.045, -0.47, 0.13],
    [0.13, -0.12, 0.165, 0.15, -0.29, 0.15, 0.095, -0.42, 0.12]
  ];
  beardLocks.forEach((values, index) => {
    headPivot.add(
      createMesh(
        createHairClumpGeometry({
          points: [
            values.slice(0, 3),
            values.slice(3, 6),
            values.slice(6, 9)
          ],
          rootWidth: index === 2 ? 0.095 : 0.082,
          midWidth: index === 2 ? 0.072 : 0.06,
          tipWidth: 0.012,
          depth: 0.036,
          segments: 9,
          name: `老牧师分束胡须拓扑-${index + 1}`
        }),
        index % 2 === 0 ? hairMaterial : shadowMaterial,
        `老牧师分束胡须-${index + 1}`
      )
    );
  });

  for (const side of [-1, 1]) {
    headPivot.add(
      createMesh(
        createCurveSolidGeometry({
          points: [
            [side * 0.012, -0.094, 0.239],
            [side * 0.058, -0.103, 0.246],
            [side * 0.116, -0.127, 0.226]
          ],
          widths: [0.021, 0.026, 0.009],
          depths: [0.013, 0.014, 0.006],
          segments: 7,
          radialSegments: 5,
          tipPinch: 0.18,
          name: `${side < 0 ? '左' : '右'}八字胡发流拓扑`
        }),
        hairMaterial,
        `${side < 0 ? '左' : '右'}八字胡发流`
      )
    );
  }
}

function addCeremonialHat(headPivot) {
  const hat = new THREE.Group();
  hat.name = '会长礼冠独立资产';
  hat.position.y = 0.25;
  const crown = createMesh(
    createProfiledSurfaceGeometry(
      [
        { y: 0, radiusX: 0.263, radiusZ: 0.206 },
        { y: 0.09, radiusX: 0.25, radiusZ: 0.196 },
        { y: 0.25, radiusX: 0.178, radiusZ: 0.152, centerZ: -0.006 },
        { y: 0.4, radiusX: 0.105, radiusZ: 0.117, centerZ: -0.012 },
        { y: 0.48, radiusX: 0.045, radiusZ: 0.09, centerZ: -0.014 }
      ],
      { radialSegments: 20, name: '会长礼冠收尖主体拓扑' }
    ),
    SACRED_MATERIALS.ivoryWarm,
    '会长礼冠收尖主体'
  );
  const frontPanel = createMesh(
    createExtrudedPanelGeometry(
      [
        [-0.165, -0.04],
        [-0.182, 0.1],
        [-0.12, 0.32],
        [0, 0.49],
        [0.12, 0.32],
        [0.182, 0.1],
        [0.165, -0.04]
      ],
      { depth: 0.024, bevel: 0.008, name: '礼冠深蓝额片拓扑' }
    ),
    SACRED_MATERIALS.deepBlue,
    '礼冠深蓝额片',
    [0, 0.02, 0.202]
  );
  const goldPiping = createMesh(
    createGarmentPipingGeometry(
      [
        [0, -0.015, 0.224],
        [0, 0.18, 0.224],
        [0, 0.41, 0.172],
        [0, 0.51, 0.098]
      ],
      0.013
    ),
    SACRED_MATERIALS.polishedGold,
    '礼冠中央立体金脊'
  );
  for (const side of [-1, 1]) {
    const border = createMesh(
      createGarmentPipingGeometry(
        [
          [side * 0.17, 0, 0.22],
          [side * 0.175, 0.11, 0.218],
          [side * 0.11, 0.33, 0.17],
          [0, 0.51, 0.098]
        ],
        0.011
      ),
      SACRED_MATERIALS.polishedGold,
      `${side < 0 ? '左' : '右'}礼冠金边`
    );
    hat.add(border);
  }
  const shiftGem = createMesh(
    createProfiledSurfaceGeometry(
      [
        { y: -0.045, radiusX: 0.018, radiusZ: 0.018 },
        { y: 0, radiusX: 0.055, radiusZ: 0.038, frontBias: 0.012 },
        { y: 0.045, radiusX: 0.018, radiusZ: 0.018 }
      ],
      { radialSegments: 8, name: 'Shift切面宝石拓扑' }
    ),
    SACRED_MATERIALS.holyShift,
    '礼冠 Shift 切面宝石',
    [0, 0.17, 0.235]
  );
  const backSpine = createMesh(
    createTaperedRibbonGeometry(
      [[0, 0.12], [0, -0.02], [0, -0.2]],
      [0.025, 0.052, 0.04],
      { depth: 0.018, bevel: 0.005, name: '礼冠背面深蓝脊片拓扑' }
    ),
    SACRED_MATERIALS.deepBlue,
    '礼冠背面深蓝脊片',
    [0, 0.19, -0.205],
    [0, Math.PI, 0]
  );
  const backGold = createMesh(
    createGarmentPipingGeometry(
      [[0, 0.48, -0.1], [0, 0.27, -0.175], [0, 0.04, -0.215]],
      0.011
    ),
    SACRED_MATERIALS.polishedGold,
    '礼冠背面立体金脊'
  );
  hat.add(crown, frontPanel, goldPiping, shiftGem, backSpine, backGold);
  headPivot.add(hat);
}

function addCeremonialRobe(model) {
  const rig = model.userData.rig;
  const fittedCoat = createMesh(
    createTailoredGarmentGeometry({
      build: 1.04,
      feminine: false,
      name: '老牧师贴身礼服拓扑'
    }),
    SACRED_MATERIALS.ivoryWarm,
    '老牧师贴身礼服',
    [0, 0.075, 0]
  );
  rig.hips.add(fittedCoat);

  const underskirt = createMesh(
    createPleatedSkirtGeometry({
      topY: 1.0,
      bottomY: 0.035,
      topRadiusX: 0.275,
      topRadiusZ: 0.2,
      bottomRadiusX: 0.43,
      bottomRadiusZ: 0.32,
      pleats: 10,
      segments: 26,
      name: '深蓝内袍逐褶拓扑'
    }),
    SACRED_MATERIALS.deepBlue,
    '老牧师深蓝内袍'
  );
  const outerSkirt = createMesh(
    createPleatedSkirtGeometry({
      topY: 1.04,
      bottomY: 0.08,
      topRadiusX: 0.292,
      topRadiusZ: 0.21,
      bottomRadiusX: 0.49,
      bottomRadiusZ: 0.36,
      pleats: 12,
      segments: 30,
      openFront: true,
      name: '象牙白开襟外袍逐褶拓扑'
    }),
    SACRED_MATERIALS.ivoryWarm,
    '象牙白开襟外袍'
  );
  rig.visual.add(underskirt, outerSkirt);

  const stolePoints = [
    [0, 0.54],
    [-0.005, 0.26],
    [0.018, -0.16],
    [0.04, -0.58]
  ];
  for (const side of [-1, 1]) {
    const stole = createMesh(
      createTaperedRibbonGeometry(
        stolePoints.map(([x, y]) => [x * side, y]),
        [0.115, 0.118, 0.125, 0.14],
        { depth: 0.026, bevel: 0.006, name: '师牧会圣带裁片拓扑' }
      ),
      SACRED_MATERIALS.deepBlue,
      `师牧会${side < 0 ? '左' : '右'}圣带`,
      [side * 0.112, 0.8, 0.25],
      [0, 0, side * -0.025]
    );
    const trim = createMesh(
      createGarmentPipingGeometry(
        [
          [side * 0.165, 1.34, 0.281],
          [side * 0.17, 1.08, 0.285],
          [side * 0.154, 0.7, 0.295],
          [side * 0.13, 0.24, 0.31]
        ],
        0.009
      ),
      SACRED_MATERIALS.polishedGold,
      `师牧会${side < 0 ? '左' : '右'}圣带立体金线`
    );
    rig.visual.add(stole, trim);
  }

  const shoulderCape = createMesh(
    createPleatedSkirtGeometry({
      topY: 1.45,
      bottomY: 1.19,
      topRadiusX: 0.18,
      topRadiusZ: 0.15,
      bottomRadiusX: 0.41,
      bottomRadiusZ: 0.26,
      pleats: 8,
      segments: 24,
      openFront: true,
      name: '会长肩披裁片拓扑'
    }),
    SACRED_MATERIALS.ivoryWarm,
    '会长八褶肩披'
  );
  rig.visual.add(shoulderCape);

  const medallion = createMesh(
    createExtrudedPanelGeometry(
      [
        [0, -0.095],
        [-0.078, -0.035],
        [-0.065, 0.065],
        [0, 0.105],
        [0.065, 0.065],
        [0.078, -0.035]
      ],
      { depth: 0.035, bevel: 0.012, name: '师牧会会长徽章拓扑' }
    ),
    SACRED_MATERIALS.polishedGold,
    '师牧会会长六面徽章',
    [0, 1.12, 0.342]
  );
  const medallionCore = createMesh(
    createProfiledSurfaceGeometry(
      [
        { y: -0.035, radiusX: 0.012, radiusZ: 0.012 },
        { y: 0, radiusX: 0.037, radiusZ: 0.026, frontBias: 0.01 },
        { y: 0.035, radiusX: 0.012, radiusZ: 0.012 }
      ],
      { radialSegments: 8, name: '会长徽章核心拓扑' }
    ),
    SACRED_MATERIALS.holyShift,
    '会长徽章概念核心',
    [0, 1.12, 0.383]
  );
  rig.visual.add(medallion, medallionCore);
  const backSeam = createMesh(
    createGarmentPipingGeometry(
      [[0, 1.34, -0.27], [0, 1.02, -0.32], [0.015, 0.58, -0.37], [0, 0.16, -0.37]],
      0.01
    ),
    SACRED_MATERIALS.polishedGold,
    '会长礼袍背部连续金脊'
  );
  rig.visual.add(backSeam);
}

function addShiftStaff(model) {
  const { rightArm } = model.userData.rig;
  const staff = new THREE.Group();
  staff.name = 'Holy Shift 会长手杖独立资产';
  staff.position.set(0.1, -0.37, 0.045);
  staff.rotation.z = -0.08;
  const shaft = createMesh(
    createCurveSolidGeometry({
      points: [[0, 0.25, 0], [0.012, -0.05, 0], [-0.008, -0.32, 0], [0, -0.55, 0]],
      widths: [0.036, 0.032, 0.03, 0.024],
      depths: [0.033, 0.029, 0.027, 0.021],
      segments: 14,
      radialSegments: 8,
      name: '手杖雕刻木芯拓扑'
    }),
    SACRED_MATERIALS.darkWood,
    '手杖雕刻木芯'
  );
  const inlay = createMesh(
    createCurveSolidGeometry({
      points: [[0, 0.18, 0.035], [0.01, -0.06, 0.033], [-0.006, -0.3, 0.031], [0, -0.5, 0.026]],
      widths: [0.008, 0.007, 0.006, 0.004],
      depths: [0.005, 0.005, 0.004, 0.003],
      segments: 12,
      radialSegments: 5,
      tipPinch: 0.15,
      name: '手杖金线镶嵌拓扑'
    }),
    SACRED_MATERIALS.polishedGold,
    '手杖连续金线镶嵌'
  );
  staff.add(shaft, inlay);

  const ringPoints = [];
  for (let index = 0; index <= 16; index += 1) {
    const theta = (index / 16) * Math.PI * 2;
    ringPoints.push([
      Math.cos(theta) * 0.14,
      0.28 + Math.sin(theta) * 0.14,
      0
    ]);
  }
  staff.add(
    createMesh(
      createCurveSolidGeometry({
        points: ringPoints,
        widths: 0.018,
        depths: 0.014,
        segments: 24,
        radialSegments: 6,
        name: '手杖概念移位环拓扑'
      }),
      SACRED_MATERIALS.polishedGold,
      '手杖概念移位环'
    )
  );
  const glyphStrokes = [
    {
      name: '手杖圣字竖笔',
      points: [[0, 0.43, 0], [0, 0.28, 0], [0, 0.1, 0]]
    },
    {
      name: '手杖圣字横笔',
      points: [[-0.12, 0.33, 0], [0.02, 0.33, 0], [0.15, 0.33, 0]]
    },
    {
      name: '手杖 Shift 偏移笔',
      points: [[-0.13, 0.18, 0.008], [-0.065, 0.2, 0.008], [0.02, 0.24, 0.008]]
    }
  ];
  glyphStrokes.forEach((stroke, index) => {
    staff.add(
      createMesh(
        createCurveSolidGeometry({
          points: stroke.points,
          widths: index === 2 ? 0.015 : 0.017,
          depths: 0.013,
          segments: 6,
          radialSegments: 5,
          tipPinch: 0.06,
          name: `${stroke.name}拓扑`
        }),
        index === 2 ? SACRED_MATERIALS.anomaly : SACRED_MATERIALS.holyShift,
        stroke.name
      )
    );
  });
  staff.add(
    createMesh(
      createProfiledSurfaceGeometry(
        [
          { y: -0.09, radiusX: 0.008, radiusZ: 0.008 },
          { y: -0.02, radiusX: 0.04, radiusZ: 0.04 },
          { y: 0.06, radiusX: 0.024, radiusZ: 0.024 }
        ],
        { radialSegments: 8, name: '手杖杖脚金属拓扑' }
      ),
      SACRED_MATERIALS.gold,
      '手杖杖脚金属包头',
      [0, -0.57, 0]
    )
  );
  rightArm.lower.add(staff);
  model.userData.staff = staff;
}

function addGlasses(headPivot) {
  const glassesMaterial = createCharacterMaterial(0xd8c16d, {
    roughness: 0.24,
    metalness: 0.78
  });
  for (const side of [-1, 1]) {
    const points = [];
    for (let index = 0; index <= 14; index += 1) {
      const theta = (index / 14) * Math.PI * 2;
      points.push([
        side * 0.089 + Math.cos(theta) * 0.072,
        0.039 + Math.sin(theta) * 0.06,
        0.244
      ]);
    }
    headPivot.add(
      createMesh(
        createCurveSolidGeometry({
          points,
          widths: 0.006,
          depths: 0.004,
          segments: 20,
          radialSegments: 5,
          name: `${side < 0 ? '左' : '右'}金丝镜框拓扑`
        }),
        glassesMaterial,
        `${side < 0 ? '左' : '右'}金丝镜框`
      )
    );
  }
  headPivot.add(
    createMesh(
      createCurveSolidGeometry({
        points: [[-0.018, 0.045, 0.247], [0, 0.052, 0.252], [0.018, 0.045, 0.247]],
        widths: 0.005,
        depths: 0.004,
        segments: 5,
        radialSegments: 5,
        name: '金丝眼镜鼻梁拓扑'
      }),
      glassesMaterial,
      '金丝眼镜鼻梁'
    )
  );
}

function batchOldPastor(model) {
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
}

export function createOldPastor() {
  const model = createHumanoidRig({
    name: '老牧师',
    height: 1.78,
    skin: COLORS.skin,
    primary: COLORS.robe,
    secondary: COLORS.deepBlue,
    boot: 0x202a3b,
    build: 1.04,
    detailedHands: true
  });
  const { headPivot } = model.userData.rig;
  addExpressiveFace(headPivot, {
    skin: COLORS.skin,
    eye: 0x173650,
    brow: 0xe7e2d7,
    smile: 0x815041,
    ageLines: true,
    build: 1.04
  });
  addPastorHairAndBeard(headPivot);
  addCeremonialHat(headPivot);
  addGlasses(headPivot);
  addCeremonialRobe(model);
  addShiftStaff(model);
  batchOldPastor(model);
  model.userData.animate = (state) => animateHumanoid(model, state);
  model.userData.characterQuality = Object.freeze({
    silhouette: '会长礼冠、分束白须、开襟十二褶礼袍、概念移位手杖',
    faceLayers: 8,
    hairClumps: 19,
    handTopology: '独立手指',
    authoredGeometry: true
  });
  return model;
}
