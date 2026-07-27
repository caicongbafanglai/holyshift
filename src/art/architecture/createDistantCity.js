import * as THREE from 'three';
import { SACRED_MATERIALS } from '../materials/sacredMaterials.js';
import { addInstancedRows, createMesh } from '../modeling/primitives.js';

export function createDistantCity() {
  const group = new THREE.Group();
  group.name = '牧师特别市远景天际线';
  const buildings = [];
  const windows = [];
  for (let index = 0; index < 58; index += 1) {
    const angle = (index / 58) * Math.PI * 2;
    const radius = 175 + (index % 5) * 8;
    const width = 8 + (index % 4) * 2.2;
    const height = 22 + ((index * 17) % 55);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    buildings.push({
      position: [x, height / 2 - 1.8, z],
      rotation: [0, -angle, 0],
      scale: [width, height, width * 0.72]
    });
    for (let floor = 0; floor < Math.floor(height / 8); floor += 1) {
      windows.push({
        position: [
          x - Math.sin(angle) * (width * 0.37),
          4 + floor * 7,
          z - Math.cos(angle) * (width * 0.37)
        ],
        rotation: [0, -angle, 0],
        scale: [width * 0.52, 1.1, 0.15]
      });
    }
  }
  addInstancedRows({
    parent: group,
    name: '远景高级城区建筑',
    geometry: new THREE.BoxGeometry(1, 1, 1),
    material: SACRED_MATERIALS.pearl,
    transforms: buildings
  });
  addInstancedRows({
    parent: group,
    name: '远景城区深蓝玻璃窗带',
    geometry: new THREE.BoxGeometry(1, 1, 1),
    material: SACRED_MATERIALS.darkGlass,
    transforms: windows
  });
  const shoreRing = createMesh(
    new THREE.RingGeometry(145, 151, 128),
    SACRED_MATERIALS.polishedGold,
    '牧师特别市远岸金色轮廓',
    [0, -1.85, 0],
    [-Math.PI / 2, 0, 0]
  );
  group.add(shoreRing);
  return group;
}
