import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function hasPreservedAncestor(object, root, preserve) {
  let current = object;
  while (current && current !== root) {
    if (preserve.has(current)) return true;
    current = current.parent;
  }
  return preserve.has(root);
}

function normalizedGeometry(source, matrix) {
  let geometry = source.index ? source.toNonIndexed() : source.clone();
  if (geometry === source) geometry = source.clone();
  for (const attribute of Object.keys(geometry.attributes)) {
    if (!['position', 'normal'].includes(attribute)) {
      geometry.deleteAttribute(attribute);
    }
  }
  if (!geometry.attributes.normal) geometry.computeVertexNormals();
  geometry.applyMatrix4(matrix);
  return geometry;
}

function bakeMaterialColor(geometry, material) {
  const color = material.color?.clone?.() ?? new THREE.Color(0xffffff);
  if (material.emissive && (material.emissiveIntensity ?? 0) > 0) {
    color.add(
      material.emissive
        .clone()
        .multiplyScalar(Math.min(0.42, material.emissiveIntensity * 0.14))
    );
  }
  color.r = Math.min(1, color.r);
  color.g = Math.min(1, color.g);
  color.b = Math.min(1, color.b);
  const values = new Float32Array(geometry.attributes.position.count * 3);
  for (let index = 0; index < values.length; index += 3) {
    values[index] = color.r;
    values[index + 1] = color.g;
    values[index + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(values, 3));
}

function materialBatchKey(material) {
  const color = material.color?.getHexString?.() ?? 'none';
  const emissive = material.emissive?.getHexString?.() ?? 'none';
  return [
    material.type,
    color,
    emissive,
    material.emissiveIntensity ?? 0,
    material.roughness ?? 0,
    material.metalness ?? 0,
    material.opacity ?? 1,
    material.transparent ? 1 : 0,
    material.side ?? 0,
    material.flatShading ? 1 : 0
  ].join(':');
}

export function batchMeshesByMaterial(
  root,
  {
    name = `${root.name || '模型'}-运行时材质批次`,
    preserve = new Set(),
    includeTransparent = false
  } = {}
) {
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const sources = [];
  root.traverse((object) => {
    if (
      object === root ||
      !object.isMesh ||
      object.isInstancedMesh ||
      Array.isArray(object.material) ||
      object.material?.map ||
      (!includeTransparent && object.material?.transparent) ||
      hasPreservedAncestor(object, root, preserve)
    ) {
      return;
    }
    sources.push(object);
  });

  const byMaterial = new Map();
  for (const source of sources) {
    const matrix = inverseRoot.clone().multiply(source.matrixWorld);
    const geometry = normalizedGeometry(source.geometry, matrix);
    const key = materialBatchKey(source.material);
    const entry = byMaterial.get(key) ?? {
      material: source.material,
      geometries: []
    };
    entry.geometries.push(geometry);
    byMaterial.set(key, entry);
  }

  const batchRoot = new THREE.Group();
  batchRoot.name = name;
  for (const source of sources) source.parent?.remove(source);
  for (const [index, entry] of [...byMaterial.values()].entries()) {
    const geometry = mergeGeometries(entry.geometries, false);
    entry.geometries.forEach((item) => item.dispose());
    if (!geometry) continue;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const mesh = new THREE.Mesh(geometry, entry.material);
    mesh.name = `${name}-${index + 1}`;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    batchRoot.add(mesh);
  }
  root.add(batchRoot);
  return batchRoot;
}

export function batchRigidCharacter(model, name = model.name) {
  const preserve = new Set();
  model.traverse((object) => {
    if (object.name === '接触阴影') preserve.add(object);
  });
  return batchMeshesWithVertexColors(model, {
    name: `${name}-刚性角色批次`,
    preserve
  });
}

export function batchMeshesWithVertexColors(
  root,
  {
    name = `${root.name || '模型'}-顶点色运行时批次`,
    preserve = new Set()
  } = {}
) {
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const sources = [];
  root.traverse((object) => {
    if (
      object === root ||
      !object.isMesh ||
      object.isInstancedMesh ||
      Array.isArray(object.material) ||
      object.material?.transparent ||
      object.material?.map ||
      hasPreservedAncestor(object, root, preserve)
    ) {
      return;
    }
    sources.push(object);
  });
  const geometries = sources.map((source) => {
    const matrix = inverseRoot.clone().multiply(source.matrixWorld);
    const geometry = normalizedGeometry(source.geometry, matrix);
    bakeMaterialColor(geometry, source.material);
    return geometry;
  });
  const batchRoot = new THREE.Group();
  batchRoot.name = name;
  for (const source of sources) source.parent?.remove(source);
  if (geometries.length > 0) {
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((item) => item.dispose());
    if (geometry) {
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        roughness: 0.58,
        metalness: 0.06
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.name = `${name}-单次提交`;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      batchRoot.add(mesh);
    }
  }
  root.add(batchRoot);
  return batchRoot;
}
