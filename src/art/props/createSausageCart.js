import * as THREE from 'three';
import {
  createCharacterMaterial,
  SACRED_MATERIALS
} from '../materials/sacredMaterials.js';
import { createMesh, createTextPanel } from '../modeling/primitives.js';

const FOOD_MATERIALS = {
  ceramic: createCharacterMaterial(0xf8f1df, { roughness: 0.7 }),
  broth: createCharacterMaterial(0x8f3f1f, { roughness: 0.58 }),
  noodle: createCharacterMaterial(0xf2c96f, { roughness: 0.66 }),
  beef: createCharacterMaterial(0x6e2d1e, { roughness: 0.7 }),
  scallion: createCharacterMaterial(0x3d884d, { roughness: 0.76 }),
  pot: createCharacterMaterial(0xb77b28, {
    roughness: 0.36,
    metalness: 0.55
  }),
  butterSauce: createCharacterMaterial(0xf1b52d, {
    roughness: 0.46,
    emissive: 0x4d2500,
    emissiveIntensity: 0.14
  }),
  chicken: createCharacterMaterial(0xf0c348, { roughness: 0.56 })
};

function createBeefNoodleBowl() {
  const bowl = new THREE.Group();
  bowl.name = '忘情牛肉面独立食品模型';
  bowl.add(
    createMesh(
      new THREE.CylinderGeometry(0.34, 0.235, 0.23, 24, 2, true),
      FOOD_MATERIALS.ceramic,
      '忘情牛肉面象牙瓷碗',
      [0, 0.12, 0]
    ),
    createMesh(
      new THREE.TorusGeometry(0.335, 0.025, 8, 24),
      SACRED_MATERIALS.polishedGold,
      '忘情牛肉面金色碗沿',
      [0, 0.235, 0],
      [Math.PI / 2, 0, 0]
    ),
    createMesh(
      new THREE.CylinderGeometry(0.292, 0.292, 0.028, 24),
      FOOD_MATERIALS.broth,
      '忘情牛肉面浓汤',
      [0, 0.218, 0]
    )
  );
  for (let index = 0; index < 3; index += 1) {
    bowl.add(
      createMesh(
        new THREE.TorusGeometry(0.105 + index * 0.035, 0.012, 6, 20),
        FOOD_MATERIALS.noodle,
        `忘情牛肉面可见面条-${index + 1}`,
        [0.025 - index * 0.022, 0.24 + index * 0.004, 0],
        [Math.PI / 2, 0, index * 0.24]
      )
    );
  }
  const beefPositions = [
    [-0.15, 0.255, -0.06],
    [0.12, 0.257, -0.08],
    [0.08, 0.254, 0.11],
    [-0.1, 0.252, 0.12]
  ];
  beefPositions.forEach((position, index) => {
    bowl.add(
      createMesh(
        new THREE.BoxGeometry(0.105, 0.055, 0.09, 2, 1, 2),
        FOOD_MATERIALS.beef,
        `忘情牛肉面牛肉块-${index + 1}`,
        position,
        [0, index * 0.4, 0]
      )
    );
  });
  for (let index = 0; index < 5; index += 1) {
    bowl.add(
      createMesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.01, 8),
        FOOD_MATERIALS.scallion,
        `忘情牛肉面葱花-${index + 1}`,
        [-0.14 + index * 0.07, 0.267, 0.02 + (index % 2) * 0.07]
      )
    );
  }
  return bowl;
}

function createGenghisChickenPot() {
  const pot = new THREE.Group();
  pot.name = '成吉思鸡独立食品模型';
  pot.add(
    createMesh(
      new THREE.CylinderGeometry(0.38, 0.32, 0.24, 24, 2),
      FOOD_MATERIALS.pot,
      '成吉思鸡金色锅体',
      [0, 0.13, 0]
    ),
    createMesh(
      new THREE.TorusGeometry(0.375, 0.027, 8, 24),
      SACRED_MATERIALS.polishedGold,
      '成吉思鸡锅沿',
      [0, 0.25, 0],
      [Math.PI / 2, 0, 0]
    ),
    createMesh(
      new THREE.CylinderGeometry(0.328, 0.328, 0.035, 24),
      FOOD_MATERIALS.butterSauce,
      '成吉思鸡金黄黄油酱汁',
      [0, 0.244, 0]
    )
  );
  for (const side of [-1, 1]) {
    pot.add(
      createMesh(
        new THREE.CapsuleGeometry(0.034, 0.16, 5, 10),
        FOOD_MATERIALS.pot,
        `成吉思鸡${side < 0 ? '左' : '右'}锅柄`,
        [side * 0.45, 0.17, 0],
        [0, 0, Math.PI / 2]
      )
    );
  }
  const chunks = [
    [-0.19, 0.286, -0.1],
    [0.02, 0.292, -0.15],
    [0.2, 0.284, -0.04],
    [-0.12, 0.29, 0.11],
    [0.1, 0.294, 0.12],
    [0.22, 0.286, 0.12]
  ];
  chunks.forEach((position, index) => {
    pot.add(
      createMesh(
        new THREE.BoxGeometry(0.135, 0.08, 0.125, 2, 2, 2),
        FOOD_MATERIALS.chicken,
        `成吉思鸡金黄块-${index + 1}`,
        position,
        [0.08 * (index % 2), index * 0.35, 0.05]
      )
    );
  });
  return pot;
}

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
    new THREE.BoxGeometry(2.35, 0.12, 1.15),
    SACRED_MATERIALS.gold,
    '红肠陈列金盘',
    [-0.86, 2.1, 0.25]
  );
  group.add(tray);
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      const sausage = createMesh(
        new THREE.CapsuleGeometry(0.09, 0.42, 5, 10),
        SACRED_MATERIALS.redSausage,
        `神圣战斗红肠-${row * 6 + column + 1}`,
        [-1.82 + column * 0.35, 2.25, row ? 0.46 : 0.05],
        [Math.PI / 2, 0, 0]
      );
      group.add(sausage);
    }
  }
  const noodles = createBeefNoodleBowl();
  noodles.position.set(0.62, 2.08, 0.25);
  const chicken = createGenghisChickenPot();
  chicken.position.set(1.52, 2.07, 0.25);
  group.add(noodles, chicken);
  group.userData.foodDisplay = Object.freeze({
    redSausageCount: 12,
    forgetfulBeefNoodlesCount: 1,
    genghisChickenCount: 1
  });
  return group;
}
