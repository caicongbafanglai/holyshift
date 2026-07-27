import * as THREE from 'three';
import {
  createCurveSolidGeometry,
  createProfiledSurfaceGeometry
} from './organicGeometry.js';

export function createTailoredGarmentGeometry({
  build = 1,
  feminine = false,
  long = false,
  openFront = false,
  name = '剪裁服装主体'
} = {}) {
  const shoulder = (feminine ? 0.303 : 0.337) * build;
  const waist = (feminine ? 0.222 : 0.255) * build;
  const hip = (feminine ? 0.305 : 0.296) * build;
  const rings = [
    { y: -0.11, radiusX: hip, radiusZ: 0.198 * build, frontBias: 0.01 * build },
    { y: 0.0, radiusX: hip * 0.96, radiusZ: 0.192 * build },
    { y: 0.12, radiusX: waist, radiusZ: 0.177 * build },
    { y: 0.25, radiusX: waist * 1.04, radiusZ: 0.181 * build },
    {
      y: 0.38,
      radiusX: shoulder * 0.9,
      radiusZ: (feminine ? 0.218 : 0.204) * build,
      frontBias: (feminine ? 0.018 : 0.01) * build
    },
    { y: 0.49, radiusX: shoulder, radiusZ: 0.202 * build },
    { y: 0.56, radiusX: shoulder * 0.8, radiusZ: 0.178 * build },
    { y: 0.595, radiusX: 0.14 * build, radiusZ: 0.14 * build }
  ];
  if (long) {
    rings.unshift(
      { y: -0.38, radiusX: hip * 1.12, radiusZ: 0.21 * build },
      { y: -0.25, radiusX: hip * 1.04, radiusZ: 0.205 * build }
    );
  }
  return createProfiledSurfaceGeometry(rings, {
    radialSegments: 20,
    thetaStart: openFront ? 0.36 : 0,
    thetaLength: openFront ? Math.PI * 2 - 0.72 : Math.PI * 2,
    capBottom: !openFront,
    capTop: !openFront,
    name
  });
}

export function createPleatedSkirtGeometry({
  topY = 0.52,
  bottomY = -0.52,
  topRadiusX = 0.27,
  topRadiusZ = 0.2,
  bottomRadiusX = 0.47,
  bottomRadiusZ = 0.34,
  pleats = 12,
  segments = 28,
  openFront = false,
  name = '逐褶裙袍拓扑'
} = {}) {
  const middleY = THREE.MathUtils.lerp(bottomY, topY, 0.48);
  const rings = [
    {
      y: bottomY,
      radiusX: bottomRadiusX,
      radiusZ: bottomRadiusZ,
      waveAmplitude: 0.052,
      waveFrequency: pleats
    },
    {
      y: THREE.MathUtils.lerp(bottomY, middleY, 0.36),
      radiusX: THREE.MathUtils.lerp(bottomRadiusX, topRadiusX, 0.22),
      radiusZ: THREE.MathUtils.lerp(bottomRadiusZ, topRadiusZ, 0.22),
      waveAmplitude: 0.044,
      waveFrequency: pleats
    },
    {
      y: middleY,
      radiusX: THREE.MathUtils.lerp(bottomRadiusX, topRadiusX, 0.5),
      radiusZ: THREE.MathUtils.lerp(bottomRadiusZ, topRadiusZ, 0.5),
      waveAmplitude: 0.032,
      waveFrequency: pleats
    },
    {
      y: THREE.MathUtils.lerp(middleY, topY, 0.52),
      radiusX: THREE.MathUtils.lerp(bottomRadiusX, topRadiusX, 0.78),
      radiusZ: THREE.MathUtils.lerp(bottomRadiusZ, topRadiusZ, 0.78),
      waveAmplitude: 0.018,
      waveFrequency: pleats
    },
    {
      y: topY,
      radiusX: topRadiusX,
      radiusZ: topRadiusZ,
      waveAmplitude: 0.008,
      waveFrequency: pleats
    }
  ];
  return createProfiledSurfaceGeometry(rings, {
    radialSegments: segments,
    thetaStart: openFront ? 0.3 : 0,
    thetaLength: openFront ? Math.PI * 2 - 0.6 : Math.PI * 2,
    capBottom: !openFront,
    capTop: !openFront,
    name
  });
}

export function createExtrudedPanelGeometry(
  points,
  {
    depth = 0.022,
    bevel = 0.008,
    name = '服装独立裁片'
  } = {}
) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: bevel > 0 ? 2 : 0,
    curveSegments: 2
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.name = name;
  geometry.computeVertexNormals();
  return geometry;
}

export function createTaperedRibbonGeometry(
  points,
  widths,
  {
    depth = 0.018,
    bevel = 0.005,
    name = '服装渐细饰带'
  } = {}
) {
  const left = [];
  const right = [];
  points.forEach(([x, y], index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangentX = next[0] - previous[0];
    const tangentY = next[1] - previous[1];
    const length = Math.hypot(tangentX, tangentY) || 1;
    const normalX = -tangentY / length;
    const normalY = tangentX / length;
    const width = Array.isArray(widths)
      ? widths[Math.min(index, widths.length - 1)]
      : widths;
    left.push([x + normalX * width * 0.5, y + normalY * width * 0.5]);
    right.push([x - normalX * width * 0.5, y - normalY * width * 0.5]);
  });
  return createExtrudedPanelGeometry([...left, ...right.reverse()], {
    depth,
    bevel,
    name
  });
}

export function createGarmentPipingGeometry(points, width = 0.012) {
  return createCurveSolidGeometry({
    points,
    widths: width,
    depths: width * 0.72,
    segments: Math.max(5, points.length * 3),
    radialSegments: 5,
    tipPinch: 0.08,
    name: '服装立体滚边'
  });
}

export function createCuffGeometry({
  radiusX = 0.105,
  radiusZ = 0.095,
  height = 0.11,
  flare = 0.025,
  name = '袖口裁片'
} = {}) {
  return createProfiledSurfaceGeometry(
    [
      {
        y: -height / 2,
        radiusX: radiusX + flare,
        radiusZ: radiusZ + flare * 0.7
      },
      { y: 0, radiusX, radiusZ },
      {
        y: height / 2,
        radiusX: radiusX + flare * 0.35,
        radiusZ: radiusZ + flare * 0.2
      }
    ],
    { radialSegments: 14, name }
  );
}
