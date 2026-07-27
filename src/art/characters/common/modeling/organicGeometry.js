import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
const TEMP_TANGENT = new THREE.Vector3();
const TEMP_NORMAL = new THREE.Vector3();
const TEMP_BINORMAL = new THREE.Vector3();

function addCap({
  positions,
  normals,
  uvs,
  indices,
  ringOffset,
  count,
  y,
  upward
}) {
  const centerIndex = positions.length / 3;
  positions.push(0, y, 0);
  normals.push(0, upward ? 1 : -1, 0);
  uvs.push(0.5, 0.5);

  for (let segment = 0; segment < count; segment += 1) {
    const next = ringOffset + ((segment + 1) % count);
    const current = ringOffset + segment;
    if (upward) indices.push(centerIndex, current, next);
    else indices.push(centerIndex, next, current);
  }
}

/**
 * Builds a sculptable ring-loop surface instead of scaling a stock sphere or
 * cylinder. Every longitudinal loop can move, taper, flatten and bias its
 * front/back volume independently, which gives us authored anatomy and cloth
 * silhouettes while retaining predictable browser-side cost.
 */
export function createProfiledSurfaceGeometry(
  rings,
  {
    radialSegments = 18,
    thetaStart = 0,
    thetaLength = TAU,
    capTop = true,
    capBottom = true,
    name = '角色轮廓曲面'
  } = {}
) {
  const closed = Math.abs(thetaLength - TAU) < 0.0001;
  const columns = closed ? radialSegments : radialSegments + 1;
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  rings.forEach((ring, ringIndex) => {
    for (let segment = 0; segment < columns; segment += 1) {
      const ratio = segment / radialSegments;
      const theta = thetaStart + thetaLength * ratio;
      const sin = Math.sin(theta);
      const cos = Math.cos(theta);
      const wave =
        1 +
        (ring.waveAmplitude ?? 0) *
          Math.cos((ring.waveFrequency ?? 1) * theta + (ring.wavePhase ?? 0));
      const side = Math.abs(sin);
      const front = Math.max(0, cos);
      const back = Math.max(0, -cos);
      const x =
        (ring.centerX ?? 0) +
        sin *
          ring.radiusX *
          wave *
          (1 + (ring.sideBias ?? 0) * side * side);
      const z =
        (ring.centerZ ?? 0) +
        cos * ring.radiusZ * wave +
        (ring.frontBias ?? 0) * front * front -
        (ring.backBias ?? 0) * back * back;
      positions.push(x, ring.y, z);
      normals.push(sin, 0, cos);
      uvs.push(ratio, ringIndex / Math.max(1, rings.length - 1));
    }
  });

  for (let row = 0; row < rings.length - 1; row += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const nextSegment = closed ? (segment + 1) % columns : segment + 1;
      const a = row * columns + segment;
      const b = row * columns + nextSegment;
      const c = (row + 1) * columns + nextSegment;
      const d = (row + 1) * columns + segment;
      indices.push(a, b, d, b, c, d);
    }
  }

  if (closed && capBottom) {
    addCap({
      positions,
      normals,
      uvs,
      indices,
      ringOffset: 0,
      count: columns,
      y: rings[0].y,
      upward: false
    });
  }
  if (closed && capTop) {
    addCap({
      positions,
      normals,
      uvs,
      indices,
      ringOffset: (rings.length - 1) * columns,
      count: columns,
      y: rings.at(-1).y,
      upward: true
    });
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
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function perpendicularFor(tangent, previous) {
  const normal = previous?.clone() ?? new THREE.Vector3(1, 0, 0);
  normal.addScaledVector(tangent, -normal.dot(tangent));
  if (normal.lengthSq() < 0.001) {
    normal.set(0, 0, 1);
    normal.addScaledVector(tangent, -normal.dot(tangent));
  }
  return normal.normalize();
}

/**
 * Produces a tapered, curved solid with parallel-transported cross sections.
 * It is used for fingers, hair locks, brows, piping and carved props so those
 * details have an intentional root/mid/tip rhythm instead of capsule ends.
 */
export function createCurveSolidGeometry({
  points,
  widths,
  depths,
  segments = 8,
  radialSegments = 6,
  name = '角色渐细曲面',
  tipPinch = 0
}) {
  const curve = new THREE.CatmullRomCurve3(
    points.map((point) => new THREE.Vector3(...point)),
    false,
    'centripetal'
  );
  const positions = [];
  const normals = [];
  const uvs = [];
  const indices = [];
  let previousNormal = null;

  const sampleValue = (values, ratio) => {
    if (!Array.isArray(values)) return values;
    const scaled = ratio * (values.length - 1);
    const lower = Math.floor(scaled);
    const upper = Math.min(values.length - 1, lower + 1);
    return THREE.MathUtils.lerp(values[lower], values[upper], scaled - lower);
  };

  for (let row = 0; row <= segments; row += 1) {
    const ratio = row / segments;
    const center = curve.getPointAt(ratio);
    const tangent = curve.getTangentAt(ratio).normalize();
    const normal = perpendicularFor(tangent, previousNormal);
    const binormal = TEMP_BINORMAL.crossVectors(tangent, normal).normalize().clone();
    previousNormal = normal.clone();
    const pinch = tipPinch > 0 ? Math.max(0.05, 1 - tipPinch * ratio ** 2.5) : 1;
    const width = sampleValue(widths, ratio) * pinch;
    const depth = sampleValue(depths, ratio) * pinch;

    for (let segment = 0; segment < radialSegments; segment += 1) {
      const theta = (segment / radialSegments) * TAU;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);
      const teardrop = 1 - Math.max(0, -sin) * 0.13;
      TEMP_NORMAL
        .copy(normal)
        .multiplyScalar(cos * width * teardrop)
        .addScaledVector(binormal, sin * depth);
      positions.push(
        center.x + TEMP_NORMAL.x,
        center.y + TEMP_NORMAL.y,
        center.z + TEMP_NORMAL.z
      );
      normals.push(TEMP_NORMAL.x, TEMP_NORMAL.y, TEMP_NORMAL.z);
      uvs.push(segment / radialSegments, ratio);
    }
  }

  for (let row = 0; row < segments; row += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = row * radialSegments + segment;
      const b = row * radialSegments + next;
      const c = (row + 1) * radialSegments + next;
      const d = (row + 1) * radialSegments + segment;
      indices.push(a, d, b, b, d, c);
    }
  }

  const startCenter = positions.length / 3;
  const start = curve.getPointAt(0);
  positions.push(start.x, start.y, start.z);
  normals.push(0, -1, 0);
  uvs.push(0.5, 0.5);
  const endCenter = positions.length / 3;
  const end = curve.getPointAt(1);
  positions.push(end.x, end.y, end.z);
  normals.push(0, 1, 0);
  uvs.push(0.5, 0.5);
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments;
    indices.push(startCenter, next, segment);
    const offset = segments * radialSegments;
    indices.push(endCenter, offset + segment, offset + next);
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
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function mergeOrganicGeometries(geometries, name = '角色合并曲面') {
  const usable = geometries.filter(Boolean).map((geometry) => geometry.clone());
  const merged = mergeGeometries(usable, false);
  usable.forEach((geometry) => geometry.dispose());
  if (!merged) {
    throw new Error(`无法合并角色几何：${name}`);
  }
  merged.name = name;
  merged.computeVertexNormals();
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
}

export function transformGeometry(
  geometry,
  {
    position = [0, 0, 0],
    rotation = [0, 0, 0],
    scale = [1, 1, 1]
  } = {}
) {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(...rotation)
  );
  matrix.compose(
    new THREE.Vector3(...position),
    quaternion,
    new THREE.Vector3(...scale)
  );
  geometry.applyMatrix4(matrix);
  return geometry;
}
