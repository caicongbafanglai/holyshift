import * as THREE from 'three';
import { SACRED_MATERIALS } from '../materials/sacredMaterials.js';
import { createMesh, createTextPanel } from '../modeling/primitives.js';

export function createSausageCart() {
  const group = new THREE.Group();
  group.name = '红肠食品集团神圣补给车独立资产';
  const counter = createMesh(
    new THREE.BoxGeometry(4.2, 1.45, 2.35, 3, 2, 2),
    SACRED_MATERIALS.ivoryWarm,
    '红肠补给车象牙车体',
    [0, 1.15, 0]
  );
  const blueBand = createMesh(
    new THREE.BoxGeometry(4.28, 0.34, 2.41),
    SACRED_MATERIALS.deepBlue,
    '红肠补给车深蓝饰带',
    [0, 1.42, 0]
  );
  const counterTop = createMesh(
    new THREE.BoxGeometry(4.6, 0.16, 2.65),
    SACRED_MATERIALS.polishedGold,
    '红肠补给车金色台面',
    [0, 1.94, 0]
  );
  group.add(counter, blueBand, counterTop);

  for (const side of [-1, 1]) {
    for (const z of [-0.72, 0.72]) {
      const wheel = createMesh(
        new THREE.TorusGeometry(0.47, 0.105, 10, 22),
        SACRED_MATERIALS.black,
        `补给车${side < 0 ? '左' : '右'}${z < 0 ? '后' : '前'}轮`,
        [side * 1.65, 0.55, z],
        [0, Math.PI / 2, 0]
      );
      const hub = createMesh(
        new THREE.CylinderGeometry(0.12, 0.12, 0.15, 12),
        SACRED_MATERIALS.gold,
        '补给车轮毂',
        [side * 1.65, 0.55, z],
        [0, 0, Math.PI / 2]
      );
      group.add(wheel, hub);
    }
  }

  for (const x of [-1.75, 1.75]) {
    group.add(
      createMesh(
        new THREE.CylinderGeometry(0.065, 0.08, 3.25, 10),
        SACRED_MATERIALS.polishedGold,
        x < 0 ? '红肠车左顶棚柱' : '红肠车右顶棚柱',
        [x, 3.4, -0.75]
      )
    );
  }
  const canopy = createMesh(
    new THREE.CylinderGeometry(2.4, 2.65, 0.8, 8),
    SACRED_MATERIALS.redSausage,
    '红肠补给车八角圣洁顶棚',
    [0, 5, -0.72],
    [0, 0, Math.PI / 8],
    [1, 0.64, 0.62]
  );
  const sign = createTextPanel({
    text: '红肠组 · 已备案',
    width: 768,
    height: 170,
    foreground: '#fff0bd',
    background: 'rgba(116, 25, 29, 0.95)',
    border: '#f1cc68',
    font: '800 66px system-ui, sans-serif'
  }).mesh;
  sign.name = '红肠组已备案招牌';
  sign.scale.set(4.1, 4.1, 1);
  sign.position.set(0, 4.3, 0.67);
  group.add(canopy, sign);

  const tray = createMesh(
    new THREE.BoxGeometry(2.7, 0.12, 1.15),
    SACRED_MATERIALS.gold,
    '红肠陈列金盘',
    [0, 2.1, 0.25]
  );
  group.add(tray);
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const sausage = createMesh(
        new THREE.CapsuleGeometry(0.09, 0.42, 5, 10),
        SACRED_MATERIALS.redSausage,
        `神圣战斗红肠-${row * 6 + column + 1}`,
        [-1.15 + column * 0.46, 2.25, row ? 0.46 : 0.05],
        [Math.PI / 2, 0, 0]
      );
      group.add(sausage);
    }
  }
  return group;
}
