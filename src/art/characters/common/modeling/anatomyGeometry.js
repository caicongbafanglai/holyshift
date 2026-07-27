import * as THREE from 'three';
import {
  createCurveSolidGeometry,
  createProfiledSurfaceGeometry,
  mergeOrganicGeometries,
  transformGeometry
} from './organicGeometry.js';

function scaledRings(rings, build = 1) {
  return rings.map((ring) => ({
    ...ring,
    radiusX: ring.radiusX * build,
    radiusZ: ring.radiusZ * build,
    centerX: (ring.centerX ?? 0) * build,
    centerZ: (ring.centerZ ?? 0) * build,
    frontBias: (ring.frontBias ?? 0) * build,
    backBias: (ring.backBias ?? 0) * build
  }));
}

export function createStylizedHeadGeometry(build = 1) {
  return createProfiledSurfaceGeometry(
    scaledRings(
      [
        { y: -0.245, radiusX: 0.055, radiusZ: 0.105, centerZ: 0.018 },
        { y: -0.205, radiusX: 0.125, radiusZ: 0.145, centerZ: 0.018 },
        { y: -0.145, radiusX: 0.178, radiusZ: 0.184, centerZ: 0.01 },
        { y: -0.075, radiusX: 0.211, radiusZ: 0.211, frontBias: 0.012 },
        { y: 0.01, radiusX: 0.228, radiusZ: 0.222, frontBias: 0.012 },
        { y: 0.095, radiusX: 0.224, radiusZ: 0.212, frontBias: 0.006 },
        { y: 0.17, radiusX: 0.202, radiusZ: 0.194, centerZ: -0.004 },
        { y: 0.228, radiusX: 0.145, radiusZ: 0.145, centerZ: -0.012 },
        { y: 0.265, radiusX: 0.045, radiusZ: 0.06, centerZ: -0.018 }
      ],
      build
    ),
    {
      radialSegments: 24,
      name: '雕刻式动漫头部拓扑'
    }
  );
}

export function createTorsoGeometry(build = 1, feminine = false) {
  const shoulder = feminine ? 0.278 : 0.31;
  const waist = feminine ? 0.205 : 0.232;
  const hip = feminine ? 0.285 : 0.272;
  return createProfiledSurfaceGeometry(
    scaledRings(
      [
        { y: -0.09, radiusX: hip, radiusZ: 0.18, frontBias: 0.008 },
        { y: 0.0, radiusX: hip * 0.96, radiusZ: 0.178 },
        { y: 0.1, radiusX: waist, radiusZ: 0.158 },
        { y: 0.22, radiusX: waist * 1.02, radiusZ: 0.165 },
        {
          y: 0.34,
          radiusX: shoulder * 0.9,
          radiusZ: feminine ? 0.2 : 0.19,
          frontBias: feminine ? 0.022 : 0.014
        },
        { y: 0.45, radiusX: shoulder, radiusZ: 0.185, frontBias: 0.01 },
        { y: 0.53, radiusX: shoulder * 0.83, radiusZ: 0.165 },
        { y: 0.57, radiusX: 0.13, radiusZ: 0.125 }
      ],
      build
    ),
    {
      radialSegments: 18,
      name: feminine ? '女性剪裁躯干拓扑' : '男性剪裁躯干拓扑'
    }
  );
}

export function createNeckGeometry(build = 1) {
  return createProfiledSurfaceGeometry(
    scaledRings(
      [
        { y: -0.09, radiusX: 0.12, radiusZ: 0.105 },
        { y: 0, radiusX: 0.105, radiusZ: 0.098 },
        { y: 0.09, radiusX: 0.1, radiusZ: 0.095 }
      ],
      build
    ),
    { radialSegments: 14, name: '颈部肌肉拓扑' }
  );
}

export function createUpperArmGeometry(build = 1, sleeve = true) {
  const volume = sleeve ? 1.08 : 1;
  return createProfiledSurfaceGeometry(
    scaledRings(
      [
        {
          y: 0.035,
          radiusX: 0.116 * volume,
          radiusZ: 0.115 * volume,
          waveAmplitude: sleeve ? 0.018 : 0,
          waveFrequency: 3
        },
        {
          y: -0.055,
          radiusX: 0.123 * volume,
          radiusZ: 0.119 * volume,
          waveAmplitude: sleeve ? 0.026 : 0,
          waveFrequency: 3,
          wavePhase: 0.3
        },
        {
          y: -0.16,
          radiusX: 0.109 * volume,
          radiusZ: 0.104 * volume,
          waveAmplitude: sleeve ? 0.02 : 0,
          waveFrequency: 3
        },
        {
          y: -0.29,
          radiusX: 0.096 * volume,
          radiusZ: 0.091 * volume,
          waveAmplitude: sleeve ? 0.012 : 0,
          waveFrequency: 3
        },
        { y: -0.42, radiusX: 0.088 * volume, radiusZ: 0.084 * volume }
      ],
      build
    ),
    { radialSegments: 14, name: '肩峰至肘部连续拓扑' }
  );
}

export function createForearmGeometry(build = 1, sleeve = true) {
  const volume = sleeve ? 1.06 : 1;
  return createProfiledSurfaceGeometry(
    scaledRings(
      [
        { y: 0.045, radiusX: 0.098 * volume, radiusZ: 0.096 * volume },
        { y: -0.045, radiusX: 0.104 * volume, radiusZ: 0.098 * volume },
        { y: -0.17, radiusX: 0.09 * volume, radiusZ: 0.086 * volume },
        { y: -0.29, radiusX: 0.072 * volume, radiusZ: 0.068 * volume },
        { y: -0.38, radiusX: 0.069 * volume, radiusZ: 0.066 * volume }
      ],
      build
    ),
    { radialSegments: 14, name: '肘部至腕部连续拓扑' }
  );
}

export function createThighGeometry(build = 1) {
  return createProfiledSurfaceGeometry(
    scaledRings(
      [
        { y: 0.055, radiusX: 0.137, radiusZ: 0.142, frontBias: 0.006 },
        { y: -0.06, radiusX: 0.143, radiusZ: 0.15, frontBias: 0.008 },
        { y: -0.2, radiusX: 0.126, radiusZ: 0.132, frontBias: 0.006 },
        { y: -0.35, radiusX: 0.106, radiusZ: 0.112 },
        { y: -0.47, radiusX: 0.101, radiusZ: 0.106 }
      ],
      build
    ),
    { radialSegments: 16, name: '胯部至膝部连续拓扑' }
  );
}

export function createShinGeometry(build = 1) {
  return createProfiledSurfaceGeometry(
    scaledRings(
      [
        { y: 0.045, radiusX: 0.105, radiusZ: 0.112, frontBias: 0.008 },
        { y: -0.06, radiusX: 0.11, radiusZ: 0.118, frontBias: 0.01 },
        { y: -0.18, radiusX: 0.096, radiusZ: 0.11, frontBias: 0.008 },
        { y: -0.31, radiusX: 0.073, radiusZ: 0.085 },
        { y: -0.41, radiusX: 0.068, radiusZ: 0.078 }
      ],
      build
    ),
    { radialSegments: 14, name: '膝部至踝部连续拓扑' }
  );
}

export function createHandGeometry(side = 1, build = 1, detailed = true) {
  const palm = createProfiledSurfaceGeometry(
    scaledRings(
      [
        { y: 0.035, radiusX: 0.065, radiusZ: 0.048 },
        { y: -0.025, radiusX: 0.074, radiusZ: 0.052 },
        { y: -0.095, radiusX: 0.067, radiusZ: 0.047 },
        { y: -0.135, radiusX: 0.052, radiusZ: 0.041 }
      ],
      build
    ),
    { radialSegments: 12, name: '掌部拓扑' }
  );
  const pieces = [palm];
  const fingerCount = detailed ? 4 : 3;
  for (let index = 0; index < fingerCount; index += 1) {
    const ratio = fingerCount === 1 ? 0.5 : index / (fingerCount - 1);
    const x = THREE.MathUtils.lerp(-0.046, 0.046, ratio) * build;
    const length = (0.072 + Math.sin(ratio * Math.PI) * 0.018) * build;
    pieces.push(
      createCurveSolidGeometry({
        points: [
          [x, -0.12 * build, 0.004],
          [x + side * (ratio - 0.5) * 0.008, (-0.14 - length * 0.45) * build, 0.006],
          [x + side * (ratio - 0.5) * 0.012, (-0.14 - length) * build, 0]
        ],
        widths: [0.018 * build, 0.016 * build, 0.011 * build],
        depths: [0.02 * build, 0.017 * build, 0.011 * build],
        segments: 4,
        radialSegments: 5,
        tipPinch: 0.34,
        name: `手指拓扑-${index + 1}`
      })
    );
  }
  pieces.push(
    createCurveSolidGeometry({
      points: [
        [side * 0.062 * build, -0.03 * build, 0],
        [side * 0.092 * build, -0.072 * build, 0.012],
        [side * 0.095 * build, -0.116 * build, 0.006]
      ],
      widths: [0.022 * build, 0.02 * build, 0.013 * build],
      depths: [0.024 * build, 0.02 * build, 0.012 * build],
      segments: 4,
      radialSegments: 5,
      tipPinch: 0.3,
      name: '拇指拓扑'
    })
  );
  return mergeOrganicGeometries(pieces, '带独立手指的手部拓扑');
}

export function createBootGeometry(build = 1) {
  const shaft = createProfiledSurfaceGeometry(
    scaledRings(
      [
        { y: 0.1, radiusX: 0.086, radiusZ: 0.082 },
        { y: 0.0, radiusX: 0.088, radiusZ: 0.086 },
        { y: -0.1, radiusX: 0.095, radiusZ: 0.095 },
        { y: -0.16, radiusX: 0.101, radiusZ: 0.108, centerZ: 0.02 }
      ],
      build
    ),
    { radialSegments: 14, name: '靴筒拓扑' }
  );
  const foot = createCurveSolidGeometry({
    points: [
      [0, -0.13 * build, 0.01 * build],
      [0, -0.17 * build, 0.1 * build],
      [0, -0.18 * build, 0.19 * build],
      [0, -0.17 * build, 0.245 * build]
    ],
    widths: [0.1 * build, 0.108 * build, 0.112 * build, 0.086 * build],
    depths: [0.09 * build, 0.085 * build, 0.065 * build, 0.035 * build],
    segments: 7,
    radialSegments: 8,
    tipPinch: 0.1,
    name: '鞋楦与翘头拓扑'
  });
  const sole = createCurveSolidGeometry({
    points: [
      [0, -0.22 * build, -0.03 * build],
      [0, -0.225 * build, 0.12 * build],
      [0, -0.22 * build, 0.245 * build]
    ],
    widths: [0.104 * build, 0.118 * build, 0.09 * build],
    depths: [0.025 * build, 0.025 * build, 0.018 * build],
    segments: 5,
    radialSegments: 6,
    name: '靴底拓扑'
  });
  return mergeOrganicGeometries([shaft, foot, sole], '完整鞋楦靴子拓扑');
}

export function createEarGeometry(side = 1, build = 1) {
  return createCurveSolidGeometry({
    points: [
      [side * 0.004, 0.07 * build, 0],
      [side * 0.027 * build, 0.035 * build, 0.004],
      [side * 0.03 * build, -0.028 * build, 0.006],
      [side * 0.008 * build, -0.082 * build, 0]
    ],
    widths: [0.026 * build, 0.03 * build, 0.027 * build, 0.016 * build],
    depths: [0.018 * build, 0.022 * build, 0.02 * build, 0.012 * build],
    segments: 7,
    radialSegments: 6,
    tipPinch: 0.08,
    name: side < 0 ? '左耳廓拓扑' : '右耳廓拓扑'
  });
}

export function createPenguinFootGeometry(side = 1) {
  const palm = createCurveSolidGeometry({
    points: [
      [side * 0.17, 0.07, 0.02],
      [side * 0.18, 0.04, 0.13],
      [side * 0.19, 0.035, 0.25]
    ],
    widths: [0.12, 0.14, 0.105],
    depths: [0.05, 0.042, 0.025],
    segments: 6,
    radialSegments: 7,
    tipPinch: 0.2,
    name: '企鹅蹼掌'
  });
  const toes = [-0.065, 0, 0.065].map((offset, index) =>
    createCurveSolidGeometry({
      points: [
        [side * 0.18 + offset, 0.055, 0.15],
        [side * 0.18 + offset * 1.18, 0.045, 0.27],
        [side * 0.18 + offset * 1.3, 0.04, 0.34 - Math.abs(index - 1) * 0.025]
      ],
      widths: [0.044, 0.035, 0.018],
      depths: [0.03, 0.024, 0.012],
      segments: 5,
      radialSegments: 5,
      tipPinch: 0.42,
      name: `企鹅蹼趾-${index + 1}`
    })
  );
  return mergeOrganicGeometries([palm, ...toes], '企鹅三趾蹼足拓扑');
}

export function mirrorGeometryX(geometry) {
  return transformGeometry(geometry, { scale: [-1, 1, 1] });
}
