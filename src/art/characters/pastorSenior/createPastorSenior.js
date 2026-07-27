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
  createPleatedSkirtGeometry,
  createTailoredGarmentGeometry,
  createTaperedRibbonGeometry
} from '../common/modeling/garmentGeometry.js';
import {
  createBraidSegmentGeometry,
  createHairCapGeometry,
  createHairClumpGeometry
} from '../common/modeling/hairGeometry.js';
import {
  createCurveSolidGeometry,
  createProfiledSurfaceGeometry
} from '../common/modeling/organicGeometry.js';

function addSeniorHair(headPivot) {
  const hairMaterial = createCharacterMaterial(0xdbe4ec, { roughness: 0.88 });
  const hairHighlight = createCharacterMaterial(0xf8fbff, { roughness: 0.84 });
  headPivot.add(
    createMesh(
      createHairCapGeometry({
        build: 0.94,
        length: 0.17,
        volume: 1.15,
        name: '牧司学姐后脑发壳拓扑'
      }),
      hairMaterial,
      '牧司学姐后脑发壳'
    )
  );

  const fringe = [
    [[-0.2, 0.12, 0.12], [-0.15, 0.205, 0.19], [-0.08, 0.115, 0.22]],
    [[-0.1, 0.17, 0.19], [-0.035, 0.245, 0.205], [0.015, 0.105, 0.225]],
    [[0.03, 0.17, 0.2], [0.1, 0.238, 0.18], [0.145, 0.1, 0.2]],
    [[0.16, 0.13, 0.13], [0.205, 0.18, 0.08], [0.205, 0.01, 0.09]]
  ];
  fringe.forEach((points, index) => {
    headPivot.add(
      createMesh(
        createHairClumpGeometry({
          points,
          rootWidth: 0.068,
          midWidth: 0.048,
          tipWidth: 0.009,
          depth: 0.021,
          segments: 8,
          name: `牧司学姐刘海拓扑-${index + 1}`
        }),
        index % 2 === 0 ? hairMaterial : hairHighlight,
        `牧司学姐定向刘海-${index + 1}`
      )
    );
  });

  const backLocks = [
    [[-0.18, 0.13, -0.14], [-0.23, -0.08, -0.17], [-0.19, -0.34, -0.12]],
    [[-0.07, 0.18, -0.2], [-0.1, -0.08, -0.235], [-0.065, -0.4, -0.15]],
    [[-0.025, 0.255, -0.205], [-0.035, 0.02, -0.275], [-0.02, -0.44, -0.19]],
    [[0.07, 0.18, -0.2], [0.1, -0.08, -0.235], [0.065, -0.4, -0.15]],
    [[0.18, 0.13, -0.14], [0.23, -0.08, -0.17], [0.19, -0.34, -0.12]],
    [[-0.225, 0.12, -0.035], [-0.255, -0.08, -0.07], [-0.225, -0.31, -0.035]],
    [[0.225, 0.12, -0.035], [0.255, -0.08, -0.07], [0.225, -0.31, -0.035]]
  ];
  backLocks.forEach((points, index) => {
    headPivot.add(
      createMesh(
        createHairClumpGeometry({
          points,
          rootWidth: 0.084,
          midWidth: 0.06,
          tipWidth: 0.012,
          depth: 0.032,
          segments: 9,
          name: `牧司学姐后发层拓扑-${index + 1}`
        }),
        index % 2 === 0 ? hairHighlight : hairMaterial,
        `牧司学姐后发层-${index + 1}`
      )
    );
  });

  for (const side of [-1, 1]) {
    const braidRoot = new THREE.Group();
    braidRoot.name = `${side < 0 ? '左' : '右'}祷告编发骨架`;
    braidRoot.position.set(side * 0.213, -0.08, -0.015);
    for (let index = 0; index < 4; index += 1) {
      const segment = createMesh(
        createBraidSegmentGeometry({
          length: 0.13,
          radius: 0.046 - index * 0.006,
          phase: index * Math.PI * 0.7,
          name: `${side < 0 ? '左' : '右'}编发交错段拓扑-${index + 1}`
        }),
        index % 2 === 0 ? hairMaterial : hairHighlight,
        `${side < 0 ? '左' : '右'}编发交错段-${index + 1}`,
        [side * Math.sin(index * 1.8) * 0.012, -index * 0.112, 0]
      );
      braidRoot.add(segment);
    }
    const clasp = createMesh(
      createProfiledSurfaceGeometry(
        [
          { y: -0.028, radiusX: 0.012, radiusZ: 0.012 },
          { y: 0, radiusX: 0.052, radiusZ: 0.035, frontBias: 0.01 },
          { y: 0.028, radiusX: 0.012, radiusZ: 0.012 }
        ],
        { radialSegments: 8, name: '编发金扣拓扑' }
      ),
      SACRED_MATERIALS.polishedGold,
      `${side < 0 ? '左' : '右'}编发金扣`,
      [0, -0.47, 0.006]
    );
    braidRoot.add(clasp);
    headPivot.add(braidRoot);
  }
}

function addPrayerHalo(headPivot) {
  const points = [];
  for (let index = 0; index <= 24; index += 1) {
    const theta = (index / 24) * Math.PI * 2;
    points.push([
      Math.cos(theta) * 0.305,
      0.43,
      Math.sin(theta) * 0.305 - 0.03
    ]);
  }
  const halo = createMesh(
    createCurveSolidGeometry({
      points,
      widths: 0.013,
      depths: 0.01,
      segments: 32,
      radialSegments: 6,
      name: '导告仪式冠环连续拓扑'
    }),
    SACRED_MATERIALS.polishedGold,
    '导告仪式冠环'
  );
  for (const side of [-1, 1]) {
    halo.add(
      createMesh(
        createProfiledSurfaceGeometry(
          [
            { y: -0.025, radiusX: 0.009, radiusZ: 0.009 },
            { y: 0, radiusX: 0.032, radiusZ: 0.022, frontBias: 0.007 },
            { y: 0.025, radiusX: 0.009, radiusZ: 0.009 }
          ],
          { radialSegments: 8, name: '导告冠环定位宝石拓扑' }
        ),
        SACRED_MATERIALS.holyShift,
        `${side < 0 ? '左' : '右'}导告定位宝石`,
        [side * 0.305, 0, -0.03]
      )
    );
  }
  headPivot.add(halo);
  return halo;
}

function addPrayerGarment(model) {
  const rig = model.userData.rig;
  const fittedBodice = createMesh(
    createTailoredGarmentGeometry({
      build: 0.93,
      feminine: true,
      name: '祷倌礼服贴身上装拓扑'
    }),
    rig.materials.primary,
    '祷倌礼服贴身上装',
    [0, 0.07, 0]
  );
  rig.hips.add(fittedBodice);

  const innerSkirt = createMesh(
    createPleatedSkirtGeometry({
      topY: 0.98,
      bottomY: 0.055,
      topRadiusX: 0.255,
      topRadiusZ: 0.19,
      bottomRadiusX: 0.43,
      bottomRadiusZ: 0.31,
      pleats: 14,
      segments: 30,
      name: '祷倌深蓝内裙逐褶拓扑'
    }),
    SACRED_MATERIALS.deepBlue,
    '祷倌深蓝内裙'
  );
  const outerSkirt = createMesh(
    createPleatedSkirtGeometry({
      topY: 1.02,
      bottomY: 0.11,
      topRadiusX: 0.27,
      topRadiusZ: 0.2,
      bottomRadiusX: 0.47,
      bottomRadiusZ: 0.34,
      pleats: 12,
      segments: 28,
      openFront: true,
      name: '祷倌象牙白开襟外裙拓扑'
    }),
    rig.materials.primary,
    '祷倌象牙白开襟外裙'
  );
  rig.visual.add(innerSkirt, outerSkirt);

  const capelet = createMesh(
    createPleatedSkirtGeometry({
      topY: 1.45,
      bottomY: 1.23,
      topRadiusX: 0.15,
      topRadiusZ: 0.13,
      bottomRadiusX: 0.36,
      bottomRadiusZ: 0.24,
      pleats: 10,
      segments: 26,
      openFront: true,
      name: '导告短肩披拓扑'
    }),
    createCharacterMaterial(0x7ea2b8, { roughness: 0.72 }),
    '导告十褶短肩披'
  );
  rig.visual.add(capelet);

  const sash = createMesh(
    createTaperedRibbonGeometry(
      [[0, 0.48], [0.015, 0.16], [-0.02, -0.22], [0.05, -0.55]],
      [0.19, 0.205, 0.22, 0.245],
      { depth: 0.024, bevel: 0.006, name: '导告蓝色礼带裁片拓扑' }
    ),
    SACRED_MATERIALS.deepBlue,
    '导告蓝色礼带',
    [0, 0.79, 0.262]
  );
  const sashPiping = createMesh(
    createGarmentPipingGeometry(
      [
        [-0.09, 1.29, 0.292],
        [-0.082, 1.04, 0.302],
        [-0.095, 0.67, 0.31],
        [-0.085, 0.28, 0.315]
      ],
      0.009
    ),
    SACRED_MATERIALS.polishedGold,
    '导告礼带左侧立体金线'
  );
  const sashPipingRight = sashPiping.clone();
  sashPipingRight.name = '导告礼带右侧立体金线';
  sashPipingRight.scale.x = -1;
  rig.visual.add(sash, sashPiping, sashPipingRight);

  const waistSeal = createMesh(
    createExtrudedPanelGeometry(
      [
        [-0.115, -0.05],
        [-0.07, 0.065],
        [0, 0.1],
        [0.07, 0.065],
        [0.115, -0.05],
        [0, -0.095]
      ],
      { depth: 0.028, bevel: 0.009, name: '导告腰封徽章拓扑' }
    ),
    SACRED_MATERIALS.polishedGold,
    '导告腰封徽章',
    [0, 0.82, 0.322]
  );
  rig.visual.add(waistSeal);
  const backPanel = createMesh(
    createExtrudedPanelGeometry(
      [[-0.12, 0.44], [-0.15, -0.25], [0, -0.54], [0.15, -0.25], [0.12, 0.44]],
      { depth: 0.02, bevel: 0.005, name: '祷倌礼裙背部导告裁片拓扑' }
    ),
    SACRED_MATERIALS.deepBlue,
    '祷倌礼裙背部导告裁片',
    [0, 0.76, -0.34],
    [0, Math.PI, 0]
  );
  const backPiping = createMesh(
    createGarmentPipingGeometry(
      [[0, 1.21, -0.36], [0, 0.93, -0.39], [0.01, 0.55, -0.4], [0, 0.25, -0.37]],
      0.009
    ),
    SACRED_MATERIALS.polishedGold,
    '祷倌背部导告金线'
  );
  rig.visual.add(backPanel, backPiping);
}

function addPrayerBook(model) {
  const { leftArm } = model.userData.rig;
  const book = new THREE.Group();
  book.name = '导告祷词册独立资产';
  book.position.set(0, -0.4, 0.035);
  const coverShape = [
    [-0.14, -0.19],
    [-0.14, 0.19],
    [0.11, 0.19],
    [0.145, 0.155],
    [0.145, -0.155],
    [0.11, -0.19]
  ];
  const backCover = createMesh(
    createExtrudedPanelGeometry(coverShape, {
      depth: 0.025,
      bevel: 0.009,
      name: '祷词册硬壳封面拓扑'
    }),
    SACRED_MATERIALS.deepBlue,
    '祷词册硬壳封面',
    [0, -0.07, 0]
  );
  const pages = createMesh(
    createExtrudedPanelGeometry(
      coverShape.map(([x, y]) => [x * 0.9, y * 0.9]),
      { depth: 0.055, bevel: 0.005, name: '祷词册书页块拓扑' }
    ),
    SACRED_MATERIALS.ivoryWarm,
    '祷词册分层书页',
    [0.01, -0.07, -0.02]
  );
  const spine = createMesh(
    createCurveSolidGeometry({
      points: [[-0.14, -0.25, 0.01], [-0.15, -0.07, 0.018], [-0.14, 0.12, 0.01]],
      widths: [0.025, 0.029, 0.025],
      depths: [0.018, 0.021, 0.018],
      segments: 7,
      radialSegments: 6,
      name: '祷词册圆脊拓扑'
    }),
    SACRED_MATERIALS.polishedGold,
    '祷词册金属圆脊'
  );
  const glyph = createMesh(
    createGarmentPipingGeometry(
      [[0, -0.18, 0.043], [0, -0.07, 0.047], [0, 0.05, 0.043]],
      0.012
    ),
    SACRED_MATERIALS.polishedGold,
    '祷词册导告竖笔'
  );
  const offsetGlyph = createMesh(
    createGarmentPipingGeometry(
      [[-0.06, -0.035, 0.047], [0.01, -0.035, 0.05], [0.075, -0.005, 0.047]],
      0.01
    ),
    SACRED_MATERIALS.holyShift,
    '祷词册导告偏移笔'
  );
  book.add(backCover, pages, spine, glyph, offsetGlyph);
  leftArm.lower.add(book);
  return book;
}

export function createPastorSenior() {
  const model = createHumanoidRig({
    name: '牧司学姐',
    height: 1.72,
    skin: 0xd3a082,
    primary: 0xf6f0df,
    secondary: 0x376b8f,
    boot: 0x283d56,
    build: 0.92,
    feminine: true,
    detailedHands: true
  });
  const rig = model.userData.rig;
  addExpressiveFace(rig.headPivot, {
    skin: 0xd3a082,
    eye: 0x255779,
    brow: 0x657482,
    smile: 0x8a4f4f,
    ageLines: false,
    feminine: true,
    build: 0.92
  });
  addSeniorHair(rig.headPivot);
  const halo = addPrayerHalo(rig.headPivot);
  addPrayerGarment(model);
  addPrayerBook(model);
  model.userData.animate = (state) => {
    animateHumanoid(model, state);
    halo.rotation.z = Math.sin((state.time ?? 0) * 0.8) * 0.05;
  };
  model.userData.characterQuality = Object.freeze({
    silhouette: '双侧编发、导告冠环、短肩披、开襟祷倌礼裙',
    faceLayers: 8,
    hairClumps: 23,
    handTopology: '独立手指',
    authoredGeometry: true
  });
  return model;
}
