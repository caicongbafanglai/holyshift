import * as THREE from 'three';
import { createCurveSolidGeometry } from './organicGeometry.js';

export function createEyeLensGeometry(
  width = 0.095,
  height = 0.045,
  {
    segments = 18,
    bulge = 0.008,
    upperLift = 0.12,
    name = '杏形眼球可见面'
  } = {}
) {
  const positions = [0, 0, bulge];
  const normals = [0, 0, 1];
  const uvs = [0.5, 0.5];
  const indices = [];
  for (let index = 0; index < segments; index += 1) {
    const theta = (index / segments) * Math.PI * 2;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);
    const cornerTaper = Math.sqrt(Math.max(0, 1 - cos ** 4));
    const y =
      sin * height * (0.72 + cornerTaper * 0.28) +
      Math.max(0, sin) * height * upperLift;
    positions.push(cos * width, y, 0);
    normals.push(0, 0, 1);
    uvs.push(cos * 0.5 + 0.5, sin * 0.5 + 0.5);
  }
  for (let index = 0; index < segments; index += 1) {
    indices.push(0, index + 1, ((index + 1) % segments) + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.name = name;
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createNoseGeometry({
  width = 0.052,
  height = 0.115,
  depth = 0.042,
  name = '鼻梁鼻翼一体拓扑'
} = {}) {
  const positions = [
    0, height * 0.5, -depth * 0.45,
    -width * 0.22, height * 0.15, 0,
    width * 0.22, height * 0.15, 0,
    0, -height * 0.24, depth,
    -width * 0.5, -height * 0.46, depth * 0.18,
    width * 0.5, -height * 0.46, depth * 0.18,
    0, -height * 0.5, depth * 0.12
  ];
  const indices = [
    0, 1, 2,
    1, 3, 2,
    1, 4, 3,
    2, 3, 5,
    4, 6, 3,
    3, 6, 5,
    0, 4, 1,
    0, 5, 4,
    0, 2, 5
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.name = name;
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createBrowGeometry(side = 1, expressive = 0) {
  return createCurveSolidGeometry({
    points: [
      [side * 0.154, -0.005 + expressive * 0.006, 0],
      [side * 0.105, 0.014 + expressive * 0.012, 0.004],
      [side * 0.052, 0.008 - expressive * 0.004, 0]
    ],
    widths: [0.012, 0.015, 0.008],
    depths: [0.007, 0.008, 0.005],
    segments: 7,
    radialSegments: 5,
    tipPinch: 0.18,
    name: side < 0 ? '左眉毛发流拓扑' : '右眉毛发流拓扑'
  });
}

export function createEyelidGeometry(side = 1, lower = false) {
  const y = lower ? -0.004 : 0.006;
  return createCurveSolidGeometry({
    points: [
      [side * 0.162, y, 0],
      [side * 0.108, y + (lower ? -0.022 : 0.035), 0.005],
      [side * 0.042, y + (lower ? -0.004 : 0.008), 0]
    ],
    widths: lower ? [0.005, 0.006, 0.004] : [0.007, 0.009, 0.005],
    depths: lower ? 0.0035 : 0.005,
    segments: 7,
    radialSegments: 5,
    tipPinch: 0.16,
    name: `${side < 0 ? '左' : '右'}${lower ? '下' : '上'}眼睑拓扑`
  });
}

export function createMouthLineGeometry(smile = 0.2) {
  return createCurveSolidGeometry({
    points: [
      [-0.077, smile * 0.012, 0],
      [-0.039, -0.008 + smile * -0.002, 0.005],
      [0, -0.012, 0.007],
      [0.039, -0.008 + smile * -0.002, 0.005],
      [0.077, smile * 0.012, 0]
    ],
    widths: [0.005, 0.007, 0.008, 0.007, 0.005],
    depths: 0.004,
    segments: 10,
    radialSegments: 5,
    tipPinch: 0.08,
    name: '上下唇交界线拓扑'
  });
}

export function createAgeLineGeometry(side = 1, index = 0) {
  const offset = index * 0.014;
  return createCurveSolidGeometry({
    points: [
      [side * (0.145 + offset), 0.018 - offset * 0.5, 0],
      [side * (0.174 + offset), -0.002 - offset, 0.001],
      [side * (0.182 + offset), -0.032 - offset, 0]
    ],
    widths: [0.0035, 0.0042, 0.0022],
    depths: 0.0025,
    segments: 5,
    radialSegments: 4,
    tipPinch: 0.2,
    name: `${side < 0 ? '左' : '右'}眼尾表情纹-${index + 1}`
  });
}
