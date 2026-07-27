import * as THREE from 'three';
import { MAP } from '../../data/mapConfig.js';
import { SACRED_MATERIALS } from '../materials/sacredMaterials.js';
import {
  addInstancedRows,
  createArchRingGeometry,
  createMesh,
  createTextPanel
} from '../modeling/primitives.js';

function addFacadePortals(group) {
  for (const [index, x] of [-18, 0, 18].entries()) {
    const central = index === 1;
    const width = central ? 13 : 9;
    const height = central ? 24 : 18;
    const door = createMesh(
      new THREE.PlaneGeometry(width - 1.2, height - 2),
      SACRED_MATERIALS.darkGlass,
      central ? '私募教堂中央入口深蓝玻璃门' : `私募教堂侧入口-${index + 1}`,
      [x, height / 2 + 1, 0.52]
    );
    const arch = createMesh(
      createArchRingGeometry(width, height, 0.65, central ? 0.9 : 0.72, 0.08),
      SACRED_MATERIALS.polishedGold,
      central ? '中央入口多层金色拱券' : `侧入口金色拱券-${index + 1}`,
      [x, height / 2 + 0.3, 0.42]
    );
    group.add(door, arch);
  }

  const columns = [];
  for (const x of [-27, -10.5, 10.5, 27]) {
    columns.push(
      {
        position: [x, 13, 0.2],
        scale: [1.5, 25, 1.5]
      }
    );
  }
  addInstancedRows({
    parent: group,
    name: '入口科林斯式独立立柱',
    geometry: new THREE.CylinderGeometry(0.5, 0.62, 1, 18),
    material: SACRED_MATERIALS.ivoryWarm,
    transforms: columns
  });

  const capitals = columns.flatMap(({ position }) => [
    { position: [position[0], 25.8, 0.2], scale: [2.3, 0.5, 2.3] },
    { position: [position[0], 0.6, 0.2], scale: [2.1, 0.45, 2.1] }
  ]);
  addInstancedRows({
    parent: group,
    name: '入口立柱独立柱头柱础',
    geometry: new THREE.CylinderGeometry(0.7, 0.85, 1, 18),
    material: SACRED_MATERIALS.polishedGold,
    transforms: capitals
  });
}

function addTowerWindowGrid(group) {
  const frontTransforms = [];
  const sideTransforms = [];
  const floorHeight = 4.21;
  for (let floor = 1; floor <= MAP.privateChurch.floors; floor += 1) {
    const y = 61 + floor * floorHeight;
    if (y > MAP.privateChurch.height - 18) break;
    for (const x of [-10.5, 0, 10.5]) {
      frontTransforms.push({
        position: [x, y, -0.08],
        scale: [4.8, 1.85, 0.22]
      });
    }
    if (floor % 2 === 0) {
      for (const side of [-1, 1]) {
        sideTransforms.push({
          position: [side * 18.1, y, -12],
          rotation: [0, Math.PI / 2, 0],
          scale: [4.2, 1.7, 0.22]
        });
      }
    }
  }
  addInstancedRows({
    parent: group,
    name: '私募教堂191层深蓝玻璃窗',
    geometry: new THREE.BoxGeometry(1, 1, 1),
    material: SACRED_MATERIALS.darkGlass,
    transforms: frontTransforms
  });
  addInstancedRows({
    parent: group,
    name: '私募教堂侧面楼层窗',
    geometry: new THREE.BoxGeometry(1, 1, 1),
    material: SACRED_MATERIALS.blueGlass,
    transforms: sideTransforms
  });

  const floorBands = [];
  for (let level = 0; level < 20; level += 1) {
    floorBands.push({
      position: [0, 68 + level * 42.1, -12],
      scale: [1, 1, 1]
    });
  }
  addInstancedRows({
    parent: group,
    name: '每十层神圣秩序金色腰线',
    geometry: new THREE.CylinderGeometry(19.8, 19.8, 0.55, 8, 1, false),
    material: SACRED_MATERIALS.gold,
    transforms: floorBands
  });
}

function addBaseOrnament(group) {
  const roseWindow = createMesh(
    new THREE.CylinderGeometry(8.8, 8.8, 0.42, 40),
    SACRED_MATERIALS.blueGlass,
    '私募教堂巨型深蓝玫瑰窗',
    [0, 42, 0.36],
    [Math.PI / 2, 0, 0]
  );
  const roseOuter = createMesh(
    new THREE.TorusGeometry(9.4, 0.54, 12, 52),
    SACRED_MATERIALS.polishedGold,
    '玫瑰窗金色外圈',
    [0, 42, 0.6]
  );
  group.add(roseWindow, roseOuter);
  const spokes = [];
  for (let index = 0; index < 16; index += 1) {
    const angle = (index / 16) * Math.PI * 2;
    spokes.push({
      position: [Math.cos(angle) * 4.5, 42 + Math.sin(angle) * 4.5, 0.68],
      rotation: [0, 0, -angle],
      scale: [0.24, 8.8, 0.18]
    });
  }
  addInstancedRows({
    parent: group,
    name: '玫瑰窗金色放射窗棂',
    geometry: new THREE.BoxGeometry(1, 1, 1),
    material: SACRED_MATERIALS.gold,
    transforms: spokes
  });

  const buttressTransforms = [];
  for (const x of [-70, -57, -44, 44, 57, 70]) {
    buttressTransforms.push({
      position: [x, 18, -2],
      rotation: [0, 0, x < 0 ? -0.06 : 0.06],
      scale: [5, 38, 7]
    });
  }
  addInstancedRows({
    parent: group,
    name: '私募教堂雕花扶壁',
    geometry: new THREE.CylinderGeometry(0.72, 1, 1, 8),
    material: SACRED_MATERIALS.ivory,
    transforms: buttressTransforms
  });
  addInstancedRows({
    parent: group,
    name: '扶壁金色尖冠',
    geometry: new THREE.ConeGeometry(2.2, 8, 8),
    material: SACRED_MATERIALS.polishedGold,
    transforms: buttressTransforms.map((transform) => ({
      position: [transform.position[0], 41, -2]
    }))
  });
}

export function createPrivateChurch() {
  const group = new THREE.Group();
  group.name = '私募教堂191层独立建筑资产';
  group.position.set(0, 0, MAP.privateChurch.z);

  const baseNave = createMesh(
    new THREE.BoxGeometry(86, 62, 30, 4, 5, 2),
    SACRED_MATERIALS.ivory,
    '私募教堂中央礼拜基座',
    [0, 31, -15]
  );
  const leftWing = createMesh(
    new THREE.BoxGeometry(45, 43, 25, 3, 3, 2),
    SACRED_MATERIALS.whiteStone,
    '私募教堂师牧会左翼',
    [-62, 21.5, -13]
  );
  const rightWing = leftWing.clone();
  rightWing.name = '私募教堂祷倌与驱魔右翼';
  rightWing.position.x = 62;
  const wingRoofLeft = createMesh(
    new THREE.CylinderGeometry(26, 29, 10, 8),
    SACRED_MATERIALS.deepBlue,
    '私募教堂左翼八角穹顶',
    [-62, 48, -13]
  );
  const wingRoofRight = wingRoofLeft.clone();
  wingRoofRight.name = '私募教堂右翼八角穹顶';
  wingRoofRight.position.x = 62;
  group.add(baseNave, leftWing, rightWing, wingRoofLeft, wingRoofRight);

  const towerHeight = MAP.privateChurch.height - 58;
  const tower = createMesh(
    new THREE.CylinderGeometry(18, 21, towerHeight, 8, 8),
    SACRED_MATERIALS.pearl,
    '私募教堂191层至圣塔身',
    [0, 58 + towerHeight / 2, -12]
  );
  const towerGoldCore = createMesh(
    new THREE.BoxGeometry(3.4, towerHeight - 22, 1.2),
    SACRED_MATERIALS.gold,
    '至圣塔中央秩序脊',
    [0, 58 + towerHeight / 2, 0.35]
  );
  const crown = createMesh(
    new THREE.CylinderGeometry(9, 18, 20, 8),
    SACRED_MATERIALS.polishedGold,
    '至圣 Shift 层金色冠顶',
    [0, MAP.privateChurch.height - 10, -12]
  );
  const shiftBeacon = createMesh(
    new THREE.OctahedronGeometry(6.2, 2),
    SACRED_MATERIALS.holyShift,
    '910.78米 Shift 信标',
    [0, MAP.privateChurch.height + 5, -12]
  );
  group.add(tower, towerGoldCore, crown, shiftBeacon);

  addFacadePortals(group);
  addBaseOrnament(group);
  addTowerWindowGrid(group);

  const churchName = createTextPanel({
    text: '私 募 教 堂',
    width: 1024,
    height: 180,
    foreground: '#f8e8a1',
    background: 'rgba(10, 37, 62, 0.94)',
    border: '#d6b65d',
    font: '800 92px serif'
  }).mesh;
  churchName.name = '私募教堂正门题名';
  churchName.scale.set(28, 28, 1);
  churchName.position.set(0, 29, 0.78);
  group.add(churchName);

  const elevatorFrame = createMesh(
    createArchRingGeometry(8.5, 13, 0.45, 0.65, 0.05),
    SACRED_MATERIALS.gold,
    '神圣电梯入口拱框',
    [30.5, 7, 0.7]
  );
  const elevatorDoor = createMesh(
    new THREE.BoxGeometry(7.2, 11.2, 0.42),
    SACRED_MATERIALS.darkGlass,
    '神圣电梯深蓝门',
    [30.5, 6.35, 0.48]
  );
  const elevatorDisplay = createTextPanel({
    text: 'B18',
    width: 512,
    height: 160,
    foreground: '#8ff7f2',
    background: 'rgba(3, 22, 39, 0.96)',
    border: '#cfa64c',
    font: '800 86px ui-monospace, monospace'
  }).mesh;
  elevatorDisplay.name = '神圣电梯楼层显示';
  elevatorDisplay.scale.set(5.5, 5.5, 1);
  elevatorDisplay.position.set(30.5, 14.4, 0.82);
  group.add(elevatorFrame, elevatorDoor, elevatorDisplay);

  group.userData.parts = { shiftBeacon, elevatorDisplay };
  group.userData.setShiftSignal = (active) => {
    const replacement = createTextPanel({
      text: active ? '191F / SHIFT' : 'B18',
      width: 512,
      height: 160,
      foreground: active ? '#f8d96c' : '#8ff7f2',
      background: 'rgba(3, 22, 39, 0.96)',
      border: active ? '#f1cc68' : '#cfa64c',
      font: `800 ${active ? 58 : 86}px ui-monospace, monospace`
    }).mesh;
    if (elevatorDisplay.material.map) elevatorDisplay.material.map.dispose();
    elevatorDisplay.material.dispose();
    elevatorDisplay.material = replacement.material;
    replacement.geometry.dispose();
    elevatorDisplay.visible = true;
    shiftBeacon.material.emissiveIntensity = active ? 3.2 : 1.8;
  };
  group.userData.update = (time, signal) => {
    shiftBeacon.rotation.y = time * 0.16;
    shiftBeacon.scale.setScalar(1 + Math.sin(time * 1.2) * (signal ? 0.08 : 0.025));
    elevatorDisplay.visible = !signal || Math.sin(time * 7) > -0.65;
  };
  return group;
}
