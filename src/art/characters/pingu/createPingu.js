import * as THREE from 'three';
import {
  createCharacterMaterial,
  SACRED_MATERIALS
} from '../../materials/sacredMaterials.js';
import { createContactShadow, createMesh } from '../../modeling/primitives.js';
import { createPenguinFootGeometry } from '../common/modeling/anatomyGeometry.js';
import { createEyeLensGeometry } from '../common/modeling/facialGeometry.js';
import {
  createExtrudedPanelGeometry,
  createGarmentPipingGeometry
} from '../common/modeling/garmentGeometry.js';
import {
  createCurveSolidGeometry,
  createProfiledSurfaceGeometry
} from '../common/modeling/organicGeometry.js';

function createBeakGeometry() {
  const width = 0.27;
  const height = 0.15;
  const depth = 0.255;
  const positions = [
    -width / 2, height * 0.32, 0,
    width / 2, height * 0.32, 0,
    -width * 0.43, -height * 0.48, 0,
    width * 0.43, -height * 0.48, 0,
    -width * 0.39, height * 0.23, depth,
    width * 0.39, height * 0.23, depth,
    -width * 0.34, -height * 0.39, depth * 0.97,
    width * 0.34, -height * 0.39, depth * 0.97,
    0, height * 0.58, depth * 0.48
  ];
  const indices = [
    0, 1, 8,
    0, 8, 4,
    1, 5, 8,
    4, 8, 5,
    0, 4, 2,
    2, 4, 6,
    1, 3, 5,
    3, 7, 5,
    2, 6, 3,
    3, 6, 7,
    4, 6, 5,
    5, 6, 7,
    0, 2, 1,
    1, 2, 3
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.name = 'Pingu上下喙一体雕刻拓扑';
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createPinguBody(visual, materials) {
  const body = createMesh(
    createProfiledSurfaceGeometry(
      [
        { y: 0.13, radiusX: 0.16, radiusZ: 0.14 },
        { y: 0.24, radiusX: 0.31, radiusZ: 0.27 },
        { y: 0.49, radiusX: 0.4, radiusZ: 0.34, frontBias: 0.018 },
        { y: 0.76, radiusX: 0.41, radiusZ: 0.35, frontBias: 0.025 },
        { y: 0.98, radiusX: 0.32, radiusZ: 0.29 },
        { y: 1.09, radiusX: 0.2, radiusZ: 0.2 }
      ],
      { radialSegments: 24, name: 'Pingu梨形躯干拓扑' }
    ),
    materials.black,
    'Pingu梨形羽体'
  );
  const belly = createMesh(
    createProfiledSurfaceGeometry(
      [
        { y: 0.25, radiusX: 0.17, radiusZ: 0.275, centerZ: 0.035 },
        { y: 0.38, radiusX: 0.3, radiusZ: 0.34, centerZ: 0.025 },
        { y: 0.65, radiusX: 0.34, radiusZ: 0.385, centerZ: 0.02 },
        { y: 0.88, radiusX: 0.28, radiusZ: 0.35, centerZ: 0.012 },
        { y: 1.01, radiusX: 0.15, radiusZ: 0.27 }
      ],
      {
        radialSegments: 12,
        thetaStart: -0.72,
        thetaLength: 1.44,
        capTop: false,
        capBottom: false,
        name: 'Pingu腹部羽色分区拓扑'
      }
    ),
    materials.white,
    'Pingu奶白腹部羽区'
  );
  const head = createMesh(
    createProfiledSurfaceGeometry(
      [
        { y: 0.95, radiusX: 0.16, radiusZ: 0.15 },
        { y: 1.03, radiusX: 0.3, radiusZ: 0.27 },
        { y: 1.19, radiusX: 0.36, radiusZ: 0.32, frontBias: 0.015 },
        { y: 1.36, radiusX: 0.34, radiusZ: 0.31 },
        { y: 1.48, radiusX: 0.24, radiusZ: 0.23 },
        { y: 1.54, radiusX: 0.08, radiusZ: 0.08 }
      ],
      { radialSegments: 24, name: 'Pingu额颊后脑一体拓扑' }
    ),
    materials.black,
    'Pingu额颊后脑羽体'
  );
  const facePatch = createMesh(
    createProfiledSurfaceGeometry(
      [
        { y: 1.08, radiusX: 0.15, radiusZ: 0.285, centerZ: 0.04 },
        { y: 1.18, radiusX: 0.27, radiusZ: 0.36, centerZ: 0.025 },
        { y: 1.34, radiusX: 0.27, radiusZ: 0.355, centerZ: 0.018 },
        { y: 1.44, radiusX: 0.15, radiusZ: 0.28, centerZ: 0.012 }
      ],
      {
        radialSegments: 10,
        thetaStart: -0.68,
        thetaLength: 1.36,
        capTop: false,
        capBottom: false,
        name: 'Pingu脸部双叶白斑拓扑'
      }
    ),
    materials.white,
    'Pingu脸部双叶白斑'
  );
  visual.add(body, belly, head, facePatch);
}

function addPinguFace(visual, materials) {
  for (const side of [-1, 1]) {
    const eye = createMesh(
      createEyeLensGeometry(0.053, 0.063, {
        segments: 18,
        bulge: 0.01,
        upperLift: 0.08,
        name: `${side < 0 ? '左' : '右'}Pingu眼白拓扑`
      }),
      materials.white,
      `Pingu${side < 0 ? '左' : '右'}眼白`,
      [side * 0.105, 1.3, 0.339]
    );
    const iris = createMesh(
      createEyeLensGeometry(0.028, 0.039, {
        segments: 16,
        bulge: 0.006,
        upperLift: 0,
        name: `${side < 0 ? '左' : '右'}Pingu瞳孔拓扑`
      }),
      materials.eye,
      `Pingu${side < 0 ? '左' : '右'}瞳孔`,
      [side * 0.105, 1.294, 0.352]
    );
    const catchlight = createMesh(
      createEyeLensGeometry(0.007, 0.01, {
        segments: 10,
        bulge: 0.003,
        upperLift: 0,
        name: `${side < 0 ? '左' : '右'}Pingu眼神光拓扑`
      }),
      materials.catchlight,
      `Pingu${side < 0 ? '左' : '右'}眼神光`,
      [side * 0.114, 1.314, 0.361]
    );
    visual.add(eye, iris, catchlight);
  }
  const beak = createMesh(
    createBeakGeometry(),
    materials.orange,
    'Pingu正面立体上下喙',
    [0, 1.19, 0.34]
  );
  const mouthSeam = createMesh(
    createExtrudedPanelGeometry(
      [
        [-0.1, 0.006],
        [-0.055, -0.006],
        [0, -0.01],
        [0.055, -0.006],
        [0.1, 0.006],
        [0.055, 0.016],
        [0, 0.013],
        [-0.055, 0.016]
      ],
      { depth: 0.012, bevel: 0.003, name: 'Pingu正面嘴缝拓扑' }
    ),
    materials.mouth,
    'Pingu正面嘴缝',
    [0, 1.18, 0.596]
  );
  visual.add(beak, mouthSeam);
}

function addPinguLimbs(root, visual, materials) {
  for (const side of [-1, 1]) {
    const label = side < 0 ? '左' : '右';
    const wing = new THREE.Group();
    wing.name = `Pingu${label}翅骨架`;
    wing.position.set(side * 0.34, 0.92, 0);
    wing.add(
      createMesh(
        createCurveSolidGeometry({
          points: [
            [0, 0.08, 0],
            [side * 0.055, -0.12, 0.005],
            [side * 0.095, -0.36, 0.025],
            [side * 0.07, -0.48, 0.04]
          ],
          widths: [0.135, 0.14, 0.105, 0.03],
          depths: [0.065, 0.06, 0.045, 0.012],
          segments: 10,
          radialSegments: 7,
          tipPinch: 0.2,
          name: `Pingu${label}分节鳍翅拓扑`
        }),
        materials.black,
        `Pingu${label}分节鳍翅`
      )
    );
    visual.add(
      wing,
      createMesh(
        createPenguinFootGeometry(side),
        materials.orange,
        `Pingu${label}三趾蹼足`
      )
    );
    if (side < 0) root.userData.leftWing = wing;
    else root.userData.rightWing = wing;
  }
  visual.add(
    createMesh(
      createCurveSolidGeometry({
        points: [[0, 0.53, -0.28], [0, 0.39, -0.4], [0, 0.22, -0.48]],
        widths: [0.15, 0.13, 0.025],
        depths: [0.06, 0.045, 0.012],
        segments: 7,
        radialSegments: 6,
        tipPinch: 0.25,
        name: 'Pingu尾羽拓扑'
      }),
      materials.black,
      'Pingu层叠尾羽'
    )
  );
}

function addLogisticsUniform(visual, materials) {
  const cap = new THREE.Group();
  cap.name = '红肠组组长帽独立资产';
  cap.add(
    createMesh(
      createProfiledSurfaceGeometry(
        [
          { y: 1.47, radiusX: 0.23, radiusZ: 0.2 },
          { y: 1.54, radiusX: 0.31, radiusZ: 0.25 },
          { y: 1.65, radiusX: 0.25, radiusZ: 0.21 },
          { y: 1.7, radiusX: 0.12, radiusZ: 0.11 }
        ],
        { radialSegments: 20, name: '红肠组软帽冠拓扑' }
      ),
      materials.red,
      '红肠组软帽冠'
    ),
    createMesh(
      createExtrudedPanelGeometry(
        [
          [-0.2, -0.045],
          [-0.13, 0.025],
          [0.13, 0.025],
          [0.27, -0.03],
          [0.14, -0.075],
          [-0.1, -0.075]
        ],
        { depth: 0.075, bevel: 0.012, name: '组长帽弧形帽檐拓扑' }
      ),
      materials.red,
      '组长帽弧形帽檐',
      [0, 1.5, 0.22],
      [-0.08, 0, 0]
    )
  );
  const badge = createMesh(
    createExtrudedPanelGeometry(
      [[0, -0.06], [-0.055, -0.015], [-0.04, 0.055], [0, 0.075], [0.04, 0.055], [0.055, -0.015]],
      { depth: 0.024, bevel: 0.008, name: '红肠组长徽章拓扑' }
    ),
    SACRED_MATERIALS.polishedGold,
    '红肠组长徽章',
    [0, 1.585, 0.262]
  );
  cap.add(badge);
  visual.add(cap);

  const sash = createMesh(
    createGarmentPipingGeometry(
      [
        [-0.29, 0.96, 0.26],
        [-0.12, 0.77, 0.37],
        [0.08, 0.58, 0.39],
        [0.27, 0.42, 0.28]
      ],
      0.045
    ),
    createCharacterMaterial(0x6d2430, { roughness: 0.66 }),
    'Pingu红肠补给斜背带'
  );
  visual.add(sash);

  for (let index = 0; index < 5; index += 1) {
    const x = -0.18 + index * 0.09;
    const y = 0.63 + index * 0.012;
    const sausage = createMesh(
      createCurveSolidGeometry({
        points: [[x, y + 0.09, 0.39], [x + 0.012, y, 0.415], [x, y - 0.09, 0.39]],
        widths: [0.036, 0.043, 0.036],
        depths: [0.027, 0.032, 0.027],
        segments: 6,
        radialSegments: 7,
        tipPinch: 0.05,
        name: `备案红肠弯曲拓扑-${index + 1}`
      }),
      materials.red,
      `备案红肠-${index + 1}`,
      [0, 0, 0],
      [0, 0, -0.48]
    );
    const clasp = createMesh(
      createProfiledSurfaceGeometry(
        [
          { y: -0.012, radiusX: 0.008, radiusZ: 0.008 },
          { y: 0, radiusX: 0.027, radiusZ: 0.018 },
          { y: 0.012, radiusX: 0.008, radiusZ: 0.008 }
        ],
        { radialSegments: 7, name: `红肠备案扣拓扑-${index + 1}` }
      ),
      SACRED_MATERIALS.polishedGold,
      `红肠备案扣-${index + 1}`,
      [x, y + 0.11, 0.41]
    );
    visual.add(sausage, clasp);
  }

  const pocket = createMesh(
    createExtrudedPanelGeometry(
      [[-0.12, -0.1], [-0.13, 0.08], [0, 0.14], [0.13, 0.08], [0.12, -0.1]],
      { depth: 0.04, bevel: 0.01, name: '补给清单胸袋拓扑' }
    ),
    materials.red,
    '补给清单胸袋',
    [0, 0.78, 0.38]
  );
  visual.add(pocket);
}

export function createPingu() {
  const root = new THREE.Group();
  root.name = 'Pingu · 红肠组组长';
  root.add(createContactShadow(0.43, SACRED_MATERIALS.contactShadow));
  const visual = new THREE.Group();
  visual.name = 'Pingu-视觉根';
  root.add(visual);

  const materials = {
    black: createCharacterMaterial(0x152332, { roughness: 0.68 }),
    white: createCharacterMaterial(0xf3efe2, { roughness: 0.75 }),
    orange: createCharacterMaterial(0xe7973d, { roughness: 0.58 }),
    mouth: createCharacterMaterial(0x6f2e28, { roughness: 0.78 }),
    eye: createCharacterMaterial(0x071118, { roughness: 0.18 }),
    catchlight: createCharacterMaterial(0xffffff, {
      roughness: 0.1,
      emissive: 0xffffff,
      emissiveIntensity: 0.12
    }),
    red: SACRED_MATERIALS.redSausage
  };

  createPinguBody(visual, materials);
  addPinguFace(visual, materials);
  addPinguLimbs(root, visual, materials);
  addLogisticsUniform(visual, materials);

  root.userData.animate = ({ time = 0, alert = false } = {}) => {
    visual.position.y = Math.sin(time * 2.3) * 0.018;
    visual.rotation.z = Math.sin(time * 1.4) * 0.025;
    root.userData.leftWing.rotation.z =
      -0.18 + Math.sin(time * (alert ? 7 : 2)) * (alert ? 0.45 : 0.08);
    root.userData.rightWing.rotation.z =
      0.18 - Math.sin(time * (alert ? 7 : 2)) * (alert ? 0.45 : 0.08);
  };
  root.userData.characterQuality = Object.freeze({
    silhouette: '梨形企鹅羽体、软帽、补给斜背带、三趾蹼足',
    faceLayers: 6,
    featherSections: 9,
    authoredGeometry: true,
    originality: '原创红肠物流企鹅，不复刻既有影视角色造型'
  });
  return root;
}
