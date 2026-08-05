import * as THREE from 'three';
import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { createPrivateChurch } from '../art/architecture/createPrivateChurch.js';
import { createSacredFountain } from '../art/architecture/createSacredFountain.js';
import { createSacredPlaza } from '../art/architecture/createSacredPlaza.js';
import { createDistantCity } from '../art/architecture/createDistantCity.js';
import { createLinZhenyin } from '../art/characters/linZhenyin/createLinZhenyin.js';
import { createPastorSenior } from '../art/characters/pastorSenior/createPastorSenior.js';
import { createPingu } from '../art/characters/pingu/createPingu.js';
import { createPlazaCitizen } from '../art/characters/crowd/createPlazaCitizen.js';
import { SACRED_MATERIALS } from '../art/materials/sacredMaterials.js';
import { createMesh } from '../art/modeling/primitives.js';
import {
  batchMeshesByMaterial,
  batchRigidCharacter,
  batchMeshesWithVertexColors
} from '../art/modeling/batchMeshes.js';
import { createNoticeBoard } from '../art/props/createNoticeBoard.js';
import { createSacredBench, createSacredLamp, createApprovalKiosk } from '../art/props/createPlazaFurniture.js';
import { createSausageCart } from '../art/props/createSausageCart.js';
import { ENEMIES, CHECKPOINTS, PLAYER_COMBAT } from '../data/content.ts';
import { MAP } from '../data/mapConfig.js';
import { Player } from '../entities/Player.js';
import { CombatEnemyAgent } from '../gameplay/combat/CombatEnemyAgent.js';
import {
  getInteractionIds,
  getWaveForProgress
} from '../gameplay/quests/ChapterOne.js';
import {
  boxCollider,
  cylinderCollider,
  segmentCollider
} from './collision/colliderFactories.js';

const ISLAND_POINTS = [
  [-68, -96],
  [68, -96],
  [68, 66],
  [-68, 66]
];
const FOUNTAIN_CENTER = { x: 0, z: -8 };
const FOUNTAIN_WATER_RADIUS = 8.85;
const FOUNTAIN_CORE_RADIUS = 2.95;
const FLIGHT_BOUNDS = Object.freeze({
  minX: -66.5,
  maxX: 66.5,
  minY: 0,
  maxY: 22,
  minZ: -94.5,
  maxZ: 64.5
});

function pointInPolygon(x, z, points) {
  let inside = false;
  for (
    let index = 0, last = points.length - 1;
    index < points.length;
    last = index, index += 1
  ) {
    const [xi, zi] = points[index];
    const [xj, zj] = points[last];
    const crosses =
      zi > z !== zj > z &&
      x < ((xj - xi) * (z - zi)) / (zj - zi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

function createInteractionMarker(color = 0x63f1ed) {
  const group = new THREE.Group();
  group.name = '主线交互悬浮标记';
  const material = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.88,
    depthWrite: false
  });
  const diamond = createMesh(
    new THREE.OctahedronGeometry(0.18, 1),
    material,
    '交互标记菱形',
    [0, 2.55, 0]
  );
  const ring = createMesh(
    new THREE.TorusGeometry(0.42, 0.035, 7, 24),
    material,
    '交互标记圆环',
    [0, 2.55, 0],
    [Math.PI / 2, 0, 0]
  );
  group.add(diamond, ring);
  group.userData.diamond = diamond;
  group.userData.ring = ring;
  return group;
}

function addInteractable(world, id, object, position, markerHeight = 0) {
  object.position.set(position.x, position.y ?? 0, position.z);
  world.scene.add(object);
  const anchor = new THREE.Object3D();
  anchor.name = `${id}-交互锚点`;
  anchor.position.copy(object.position);
  anchor.userData.visual = object;
  const marker = createInteractionMarker();
  marker.position.y = markerHeight;
  object.add(marker);
  world.markers.set(id, marker);
  world.interactableObjects.set(id, anchor);
  return object;
}

function addFurniture(world) {
  const furnitureRoot = new THREE.Group();
  furnitureRoot.name = '神圣广场家具运行时总批次源';
  const benches = [
    { x: -42, z: 16, rotation: Math.PI / 2 },
    { x: -42, z: -13, rotation: Math.PI / 2 },
    { x: 42, z: 16, rotation: -Math.PI / 2 },
    { x: 42, z: -13, rotation: -Math.PI / 2 },
    { x: -28, z: -62, rotation: 0 },
    { x: 28, z: -62, rotation: 0 }
  ];
  benches.forEach((placement, index) => {
    const bench = createSacredBench(`神圣广场独立长椅-${index + 1}`);
    bench.position.set(placement.x, 0, placement.z);
    bench.rotation.y = placement.rotation;
    furnitureRoot.add(bench);
    world.baseColliders.push(
      boxCollider(
        `广场长椅-${index + 1}-碰撞`,
        placement.x,
        placement.z,
        3.55,
        1.15,
        0,
        1.9,
        placement.rotation
      )
    );
  });

  const lampPlacements = [
    [-54, 49], [-30, 49], [30, 49], [54, 49],
    [-55, 25], [55, 25], [-55, -2], [55, -2],
    [-55, -31], [55, -31], [-48, -63], [48, -63],
    [-33, -78], [33, -78]
  ];
  lampPlacements.forEach(([x, z], index) => {
    const lamp = createSacredLamp(`神圣广场独立路灯-${index + 1}`);
    lamp.position.set(x, 0, z);
    furnitureRoot.add(lamp);
    world.baseColliders.push(
      cylinderCollider(`神圣路灯-${index + 1}-碰撞`, x, z, 0.28, 0, 6.3)
    );
  });

  const kiosks = [
    { x: -13, z: 5 },
    { x: 13, z: 5 },
    { x: -14, z: -79 },
    { x: 14, z: -79 }
  ];
  kiosks.forEach((placement, index) => {
    const kiosk = createApprovalKiosk();
    kiosk.name = `神圣签到审批机-${index + 1}`;
    kiosk.position.set(placement.x, 0, placement.z);
    kiosk.rotation.y = placement.x < 0 ? 0.35 : -0.35;
    furnitureRoot.add(kiosk);
    world.baseColliders.push(
      cylinderCollider(
        `神圣签到机-${index + 1}-碰撞`,
        placement.x,
        placement.z,
        0.86,
        0,
        2.8
      )
    );
  });
  const visualBatch = batchMeshesWithVertexColors(furnitureRoot, {
    name: '神圣广场家具多色顶点总批次'
  });
  batchMeshesByMaterial(furnitureRoot, {
    name: '神圣广场家具透明材质批次',
    preserve: new Set([visualBatch]),
    includeTransparent: true
  });
  world.scene.add(furnitureRoot);
}

function createFountainBasinColliders() {
  const colliders = [];
  const segmentCount = 32;
  const radius = 9.78;
  const entranceAngle = Math.PI / 2;
  const entranceHalfAngle = 0.25;
  for (let index = 0; index < segmentCount; index += 1) {
    const startAngle = (index / segmentCount) * Math.PI * 2;
    const endAngle = ((index + 1) / segmentCount) * Math.PI * 2;
    const middleAngle = (startAngle + endAngle) / 2;
    const entranceDistance = Math.abs(
      Math.atan2(
        Math.sin(middleAngle - entranceAngle),
        Math.cos(middleAngle - entranceAngle)
      )
    );
    if (entranceDistance < entranceHalfAngle) continue;
    colliders.push(
      segmentCollider(
        `圣水池环形盆壁碰撞-${index + 1}`,
        {
          x: FOUNTAIN_CENTER.x + Math.cos(startAngle) * radius,
          z: FOUNTAIN_CENTER.z + Math.sin(startAngle) * radius
        },
        {
          x: FOUNTAIN_CENTER.x + Math.cos(endAngle) * radius,
          z: FOUNTAIN_CENTER.z + Math.sin(endAngle) * radius
        },
        0.55,
        0,
        1.36
      )
    );
  }
  colliders.push(
    cylinderCollider(
      '圣水池中心流程基座碰撞',
      FOUNTAIN_CENTER.x,
      FOUNTAIN_CENTER.z,
      2.72,
      0.55,
      8.1
    )
  );
  return colliders;
}

function addEnvironmentLights(world) {
  const hemisphere = new THREE.HemisphereLight(0xf0fdff, 0x6f8180, 2.38);
  hemisphere.name = '明亮海湾环境光';
  const sun = new THREE.DirectionalLight(0xfff6dc, 3.35);
  sun.name = '师老牧镇午前日光';
  sun.position.set(-70, 115, 65);
  const sacredBounce = new THREE.DirectionalLight(0x8de9f2, 0.92);
  sacredBounce.name = '圣水池青色反射光';
  sacredBounce.position.set(45, 22, -40);
  world.scene.add(hemisphere, sun, sacredBounce);
}

function addAmbientCrowdGroup(world, name, placements) {
  const root = new THREE.Group();
  root.name = name;
  placements.forEach((placement, index) => {
    const citizen = createPlazaCitizen({
      name: placement.name,
      kind: placement.kind,
      colors: placement.colors
    });
    citizen.position.set(placement.x, 0, placement.z);
    citizen.rotation.y = placement.rotation;
    citizen.userData.animate?.({
      time: index * 0.71,
      moving: false,
      sprinting: false
    });
    const rig = citizen.userData.rig;
    if (rig) {
      rig.headPivot.rotation.y = (index - 1) * 0.13;
      rig.leftArm.upper.rotation.z = -0.08 - index * 0.025;
      rig.rightArm.upper.rotation.z = 0.08 + index * 0.02;
    }
    root.add(citizen);
    world.baseColliders.push(
      cylinderCollider(
        `${placement.name}群众碰撞`,
        placement.x,
        placement.z,
        0.42,
        0,
        1.95
      )
    );
  });

  const visualBatch = batchMeshesWithVertexColors(root, {
    name: `${name}-多色顶点角色批次`
  });
  batchMeshesByMaterial(root, {
    name: `${name}-接触阴影批次`,
    preserve: new Set([visualBatch]),
    includeTransparent: true
  });
  world.scene.add(root);
  return root;
}

function addClouds(world) {
  const cloudMaterial = new THREE.MeshBasicMaterial({
    color: 0xf7ffff,
    transparent: true,
    opacity: 0.42,
    depthWrite: false
  });
  const clouds = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 12, 7),
    cloudMaterial,
    12
  );
  clouds.name = '高空体积云实例批次';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  for (let index = 0; index < 12; index += 1) {
    matrix.compose(
      new THREE.Vector3(
        -170 + index * 31,
        80 + (index % 3) * 16,
        -160 + (index % 5) * 75
      ),
      quaternion,
      new THREE.Vector3(
        18 + (index % 4) * 5,
        3.5 + (index % 2) * 2,
        8 + (index % 3) * 3
      )
    );
    clouds.setMatrixAt(index, matrix);
  }
  clouds.instanceMatrix.needsUpdate = true;
  world.scene.add(clouds);
}

export class MushiTownWorld {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.name = '师老牧镇第一章世界';
    this.scene.background = new THREE.Color(0xc9e8ef);
    this.scene.fog = new THREE.Fog(0xc9e8ef, 250, 1080);
    this.elapsed = 0;
    this.currentProgress = 'intro';
    this.baseColliders = [];
    this.dynamicColliders = [];
    this.cameraCollisionMeshes = [];
    this.interactableObjects = new Map();
    this.markers = new Map();
    this.animatedCharacters = [];
    this.animatedProps = [];
    this.clouds = [];
    this.enemies = new Map();
    this.onEnemyDefeated = null;

    addEnvironmentLights(this);
    addClouds(this);

    this.plaza = createSacredPlaza();
    this.scene.add(this.plaza);
    this.fountain = createSacredFountain();
    const fountainAccessSteps = this.fountain.getObjectByName(
      '圣水池南侧可进入祝福台阶'
    );
    if (fountainAccessSteps) {
      batchMeshesByMaterial(fountainAccessSteps, {
        name: '圣水池入口台阶材质批次'
      });
    }
    this.scene.add(this.fountain);
    this.church = createPrivateChurch();
    const churchPreserve = new Set([
      this.church.children.find((child) => child.name === '私募教堂中央礼拜基座'),
      this.church.children.find((child) => child.name === '私募教堂师牧会左翼'),
      this.church.children.find((child) => child.name === '私募教堂祷倌与驱魔右翼'),
      this.church.userData.parts.shiftBeacon,
      this.church.userData.parts.elevatorDisplay
    ].filter(Boolean));
    batchMeshesByMaterial(this.church, {
      name: '私募教堂静态建筑材质批次',
      preserve: churchPreserve
    });
    this.scene.add(this.church);
    this.distantCity = createDistantCity();
    this.scene.add(this.distantCity);

    this.baseColliders.push(
      segmentCollider('西侧海湾安全边界', { x: -68, z: -96 }, { x: -68, z: 66 }, 0.6, -4, 26),
      segmentCollider('东侧海湾安全边界', { x: 68, z: 66 }, { x: 68, z: -96 }, 0.6, -4, 26),
      segmentCollider('南侧海湾安全边界', { x: -68, z: 66 }, { x: 68, z: 66 }, 0.6, -4, 26),
      segmentCollider('北侧教堂后方安全边界', { x: 68, z: -96 }, { x: -68, z: -96 }, 0.6, -4, 26),
      ...createFountainBasinColliders(),
      boxCollider('私募教堂中央立面碰撞', 0, -98, 88, 12, 0, 65),
      boxCollider('私募教堂左翼碰撞', -62, -97, 46, 11, 0, 58),
      boxCollider('私募教堂右翼碰撞', 62, -97, 46, 11, 0, 58)
    );
    this.cameraCollisionMeshes.push(
      ...this.church.children.filter((child) =>
        ['私募教堂中央礼拜基座', '私募教堂师牧会左翼', '私募教堂祷倌与驱魔右翼'].includes(child.name)
      ),
      ...this.fountain.children.filter((child) =>
        ['圣水池白石基座', '圣水池下层雕刻盆壁', '圣水流程中枢'].includes(child.name)
      )
    );

    const notice = createNoticeBoard();
    batchMeshesByMaterial(notice, {
      name: '神圣公告牌静态批次',
      preserve: new Set([
        notice.children.find((child) => child.name === '公告牌签到信标')
      ].filter(Boolean))
    });
    addInteractable(this, 'noticeBoard', notice, MAP.board);
    this.baseColliders.push(
      boxCollider('神圣公告牌碰撞', MAP.board.x, MAP.board.z, 5.9, 0.8, 0, 6.5)
    );
    this.animatedProps.push(notice);

    const cart = createSausageCart();
    batchMeshesByMaterial(cart, {
      name: '红肠补给车静态材质批次'
    });
    cart.position.set(MAP.pingu.x + 2.8, 0, MAP.pingu.z - 1.8);
    cart.rotation.y = -0.22;
    this.scene.add(cart);
    const stallPosition = cart.localToWorld(new THREE.Vector3(2.7, 0, 1));
    const stallAnchor = new THREE.Object3D();
    stallAnchor.name = 'Pingu食品摊位交互锚点';
    stallAnchor.position.copy(stallPosition);
    stallAnchor.userData.visual = cart;
    this.interactableObjects.set('pinguStall', stallAnchor);
    this.scene.add(stallAnchor);
    const stallMarker = createInteractionMarker(0xf1cc68);
    stallMarker.position.copy(stallPosition);
    stallMarker.position.y = 0.24;
    this.scene.add(stallMarker);
    this.markers.set('pinguStall', stallMarker);
    this.baseColliders.push(
      boxCollider(
        '红肠补给车碰撞',
        cart.position.x,
        cart.position.z,
        4.7,
        2.9,
        0,
        5.6,
        cart.rotation.y
      )
    );

    const pinguModel = createPingu();
    const pinguVisual = batchRigidCharacter(pinguModel, 'Pingu');
    pinguModel.userData.animate = ({ time = 0, alert = false } = {}) => {
      pinguVisual.position.y = Math.sin(time * 2.3) * 0.018;
      pinguVisual.rotation.z =
        Math.sin(time * (alert ? 4.2 : 1.4)) * (alert ? 0.045 : 0.025);
    };
    const pingu = addInteractable(this, 'pingu', pinguModel, MAP.pingu);
    const linModel = createLinZhenyin();
    const linVisual = batchRigidCharacter(linModel, '林镇阴');
    linModel.userData.animate = ({ time = 0 } = {}) => {
      linVisual.position.y = Math.sin(time * 1.5) * 0.009;
      linVisual.rotation.z = Math.sin(time * 0.8) * 0.008;
    };
    const lin = addInteractable(
      this,
      'linZhenyin',
      linModel,
      MAP.linZhenyin
    );
    const seniorModel = createPastorSenior();
    const seniorVisual = seniorModel.userData.rig.visual;
    const seniorHead = seniorModel.userData.rig.headPivot;
    batchMeshesWithVertexColors(seniorVisual, {
      name: '牧司学姐礼服身体刚性批次',
      preserve: new Set([seniorHead])
    });
    const seniorHeadBatch = batchMeshesWithVertexColors(seniorHead, {
      name: '牧司学姐白发面容高保真批次'
    });
    seniorHeadBatch.traverse((object) => {
      if (object.isMesh) object.userData.preserveSoftwareDetail = true;
    });
    seniorModel.userData.animate = ({ time = 0 } = {}) => {
      seniorVisual.position.y = Math.sin(time * 1.8) * 0.012;
      seniorVisual.rotation.z = Math.sin(time * 0.9) * 0.01;
    };
    const senior = addInteractable(
      this,
      'pastorSenior',
      seniorModel,
      MAP.pastorSenior
    );
    const studentModel = createPlazaCitizen({
      name: '喝过生水的学生',
      kind: 'student',
      colors: { primary: 0xeaf0f2, secondary: 0x345a87, hair: 0x2e2928 }
    });
    const studentVisual = batchRigidCharacter(studentModel, '喝过生水的学生');
    studentModel.userData.animate = ({ time = 0, alert = false } = {}) => {
      studentVisual.position.y =
        Math.sin(time * (alert ? 4.8 : 1.7)) * (alert ? 0.025 : 0.01);
      studentVisual.rotation.z = Math.sin(time * 2.1) * (alert ? 0.025 : 0.008);
    };
    const student = addInteractable(
      this,
      'student',
      studentModel,
      { x: -11, y: 0, z: 31 }
    );
    const believerModel = createPlazaCitizen({
      name: '喝过生水的信徒',
      kind: 'believer',
      colors: { primary: 0xe7dcc9, secondary: 0x6c557f, hair: 0x5d4734 }
    });
    const believerVisual = batchRigidCharacter(
      believerModel,
      '喝过生水的信徒'
    );
    believerModel.userData.animate = ({ time = 0, alert = false } = {}) => {
      believerVisual.position.y =
        Math.sin(time * (alert ? 4.4 : 1.5)) * (alert ? 0.022 : 0.009);
      believerVisual.rotation.z =
        -Math.sin(time * 1.9) * (alert ? 0.022 : 0.008);
    };
    const believer = addInteractable(
      this,
      'believer',
      believerModel,
      { x: 17, y: 0, z: 27 }
    );
    this.ambientCrowdNear = addAmbientCrowdGroup(
      this,
      '神圣广场近景多职业群众',
      [
        {
          name: '金融街审批员',
          kind: 'clerk',
          x: -31,
          z: 37,
          rotation: 2.48,
          colors: {
            skin: 0xb8795d,
            primary: 0xdce8ec,
            secondary: 0x274f72,
            hair: 0x25282d
          }
        },
        {
          name: '祷倌见习生',
          kind: 'acolyte',
          x: 29,
          z: 36,
          rotation: -2.56,
          colors: {
            skin: 0xd6a181,
            primary: 0xf1eadb,
            secondary: 0x527ca0,
            hair: 0xebeef1
          }
        },
        {
          name: '红肠分店店员',
          kind: 'vendor',
          x: 34,
          z: -22,
          rotation: -1.26,
          colors: {
            skin: 0xc88c6d,
            primary: 0xf1dfcf,
            secondary: 0x8e3f47,
            hair: 0x60402f
          }
        }
      ]
    );
    this.ambientCrowdFar = addAmbientCrowdGroup(
      this,
      '神圣广场远景多职业群众',
      [
        {
          name: '广场礼仪引导员',
          kind: 'usher',
          x: -34,
          z: -29,
          rotation: 1.08,
          colors: {
            skin: 0xa96f57,
            primary: 0x314f6c,
            secondary: 0xd2ad57,
            hair: 0x332a28
          }
        },
        {
          name: '海景区朝礼信徒',
          kind: 'believer',
          x: -25,
          z: 50,
          rotation: 2.82,
          colors: {
            skin: 0xe0ad8c,
            primary: 0xe7e0d2,
            secondary: 0x667e91,
            hair: 0x8b674f
          }
        },
        {
          name: '学生用品店实习生',
          kind: 'student',
          x: 27,
          z: 51,
          rotation: -2.86,
          colors: {
            skin: 0xbd8064,
            primary: 0xe8eef0,
            secondary: 0x416f75,
            hair: 0x27323b
          }
        }
      ]
    );
    this.ambientCitizenCount = 6;
    this.ambientCitizenRoles = Object.freeze([
      'clerk',
      'acolyte',
      'vendor',
      'usher',
      'believer',
      'student'
    ]);
    this.animatedCharacters.push(pingu, lin, senior, student, believer);
    this.baseColliders.push(
      cylinderCollider('Pingu碰撞', MAP.pingu.x, MAP.pingu.z, 0.48, 0, 1.8),
      cylinderCollider('林镇阴碰撞', MAP.linZhenyin.x, MAP.linZhenyin.z, 0.48, 0, 2),
      cylinderCollider('牧司学姐碰撞', MAP.pastorSenior.x, MAP.pastorSenior.z, 0.45, 0, 1.9),
      cylinderCollider('学生碰撞', -11, 31, 0.42, 0, 1.8),
      cylinderCollider('信徒碰撞', 17, 27, 0.44, 0, 1.9)
    );

    const fountainAnchor = new THREE.Object3D();
    fountainAnchor.name = '圣水池交互锚点';
    fountainAnchor.position.set(0, 0, 4.1);
    fountainAnchor.userData.visual = this.fountain;
    this.interactableObjects.set('fountain', fountainAnchor);
    this.scene.add(fountainAnchor);
    const fountainMarker = createInteractionMarker();
    fountainMarker.position.set(0, 0.2, 4.1);
    this.scene.add(fountainMarker);
    this.markers.set('fountain', fountainMarker);

    const elevatorAnchor = new THREE.Object3D();
    elevatorAnchor.name = '神圣电梯交互锚点';
    elevatorAnchor.position.set(30.5, 0, -88.2);
    elevatorAnchor.userData.visual = this.church;
    this.interactableObjects.set('elevator', elevatorAnchor);
    this.scene.add(elevatorAnchor);
    const elevatorMarker = createInteractionMarker(0xf1cc68);
    elevatorMarker.position.set(30.5, 0.4, -88.2);
    this.scene.add(elevatorMarker);
    this.markers.set('elevator', elevatorMarker);

    addFurniture(this);

    const spawns = {
      'wisp-a': { x: -22, y: 0, z: -3 },
      'wisp-b': { x: 21, y: 0, z: -1 },
      'wisp-c': { x: 0, y: 0, z: -31 },
      'approved-water-ghost': { x: 0, y: 0, z: 11 }
    };
    for (const [id, definition] of Object.entries(ENEMIES)) {
      const enemy = new CombatEnemyAgent(definition, spawns[id]);
      enemy.onDefeated = (agent) => this.onEnemyDefeated?.(agent);
      this.enemies.set(id, enemy);
      this.scene.add(enemy);
    }

    this.player = new Player();
    this.player.position.set(MAP.playerStart.x, MAP.playerStart.y, MAP.playerStart.z);
    this.scene.add(this.player);

    this.scene.userData.walkableSurfaces = [
      {
        name: '神圣广场完整可行走地面',
        shape: 'polygon',
        points: ISLAND_POINTS,
        y: 0,
        walkable: true
      },
      {
        name: '圣水池内盆可行走池底',
        shape: 'circle',
        center: FOUNTAIN_CENTER,
        radius: FOUNTAIN_WATER_RADIUS,
        y: 0.62,
        walkable: true
      },
      {
        name: '圣水池入口外侧一级台阶',
        shape: 'box',
        center: { x: 0, z: 3.05 },
        width: 3.5,
        depth: 1.25,
        y: 0.28,
        walkable: true
      },
      {
        name: '圣水池入口中段二级台阶',
        shape: 'box',
        center: { x: 0, z: 2.15 },
        width: 3.45,
        depth: 1.1,
        y: 0.5,
        walkable: true
      },
      {
        name: '圣水池入口内侧落脚台',
        shape: 'box',
        center: { x: 0, z: 1.28 },
        width: 3.35,
        depth: 1.15,
        y: 0.68,
        walkable: true
      }
    ];
    this.scene.userData.flightBounds = FLIGHT_BOUNDS;
    this.scene.userData.staticColliders = this.baseColliders;
    this.scene.userData.solidColliders = [...this.baseColliders];
    this.scene.userData.colliders = this.scene.userData.solidColliders;
    this.scene.userData.cameraCollisionMeshes = this.cameraCollisionMeshes;
    this.applyProgress('intro', Object.fromEntries(
      Object.keys(ENEMIES).map((id) => [id, false])
    ), {
      fountainRestored: false,
      elevatorSeen: false
    });
  }

  applyProgress(progress, defeated, flags = {}) {
    this.currentProgress = progress;
    const restored = flags.fountainRestored || ['inspectElevator', 'complete'].includes(progress);
    const signal = flags.elevatorSeen || ['inspectElevator', 'complete'].includes(progress);
    this.fountain.userData.setRestored?.(restored);
    this.church.userData.setShiftSignal?.(signal);
    this.syncEnemyWave(progress, defeated);
    this.updateMarkerVisibility(progress);
  }

  syncEnemyWave(progress, defeated) {
    const activeIds = new Set(getWaveForProgress(progress));
    for (const [id, enemy] of this.enemies) {
      if (activeIds.has(id)) enemy.activate(defeated[id] === true);
      else enemy.deactivate();
    }
    this.refreshEnemyColliders();
  }

  resetActiveEnemies(defeated = {}) {
    for (const [id, enemy] of this.enemies) {
      if (enemy.state !== 'inactive') enemy.activate(defeated[id] === true);
    }
    this.refreshEnemyColliders();
  }

  refreshEnemyColliders() {
    this.dynamicColliders = [...this.enemies.values()]
      .filter((enemy) => enemy.isAlive)
      .map((enemy) => enemy.collider);
    this.scene.userData.solidColliders = [
      ...this.baseColliders,
      ...this.dynamicColliders
    ];
    this.scene.userData.colliders = this.scene.userData.solidColliders;
  }

  updateMarkerVisibility(progress) {
    const allowed = new Set(getInteractionIds(progress));
    for (const [id, marker] of this.markers) {
      marker.visible = allowed.has(id) && !['student', 'believer', 'noticeBoard'].includes(id);
    }
  }

  setCheckpoint(point, teleport = false) {
    return this.player.setRespawn(point, teleport);
  }

  update(
    delta,
    input,
    movementFrame,
    allowMovement,
    flightSecondsAvailable = 0
  ) {
    this.elapsed += delta;
    if (allowMovement) {
      this.player.update(
        delta,
        input,
        movementFrame,
        this.scene.userData,
        flightSecondsAvailable
      );
    } else {
      this.player.character.userData.animate?.({ time: this.elapsed });
    }

    this.fountain.userData.update?.(
      this.elapsed,
      ['inspectElevator', 'complete'].includes(this.currentProgress)
    );
    this.church.userData.update?.(
      this.elapsed,
      ['inspectElevator', 'complete'].includes(this.currentProgress)
    );

    this.animatedCharacters.forEach((character, index) => {
      character.userData.animate?.({
        time: this.elapsed + index * 0.43,
        moving: false,
        alert: this.currentProgress === 'clearWisps'
      });
    });
    this.animatedProps.forEach((prop, index) => {
      prop.userData.update?.(this.elapsed + index * 0.2);
      if (prop.userData.halo) prop.userData.halo.rotation.z = this.elapsed * 0.35;
      if (prop.userData.light) {
        prop.userData.light.scale.setScalar(1 + Math.sin(this.elapsed * 2 + index) * 0.05);
      }
    });
    for (const [index, marker] of [...this.markers.values()].entries()) {
      if (!marker.visible) continue;
      marker.rotation.y = this.elapsed * 1.1 + index;
      marker.userData.diamond.position.y =
        2.55 + Math.sin(this.elapsed * 2.2 + index) * 0.12;
    }
  }

  getNearestInteractable(progress, _defeated, maxDistance = 3.8) {
    const candidates = getInteractionIds(progress);
    let nearest = null;
    let nearestDistance = maxDistance;
    for (const id of candidates) {
      const anchor = this.interactableObjects.get(id);
      if (!anchor) continue;
      const distance = Math.hypot(
        this.player.position.x - anchor.position.x,
        this.player.position.z - anchor.position.z
      );
      const verticalDistance = Math.abs(
        this.player.position.y - anchor.position.y
      );
      if (
        verticalDistance <= PLAYER_COMBAT.interactionVerticalRange &&
        distance < nearestDistance
      ) {
        nearest = { id, distance, object: anchor };
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  getObjectivePosition(progress) {
    const id = {
      intro: 'pastorSenior',
      inspectFountain: 'fountain',
      traceSacredGlyph: 'pingu',
      consultLin: 'linZhenyin',
      restoreFountain: 'fountain',
      inspectElevator: 'elevator'
    }[progress];
    if (id) return this.interactableObjects.get(id)?.position ?? null;
    if (progress === 'clearWisps' || progress === 'defeatWaterGhost') {
      return [...this.enemies.values()].find((enemy) => enemy.isAlive)?.position ?? null;
    }
    return null;
  }

  restoreFountain() {
    this.fountain.userData.setRestored?.(true);
    this.church.userData.setShiftSignal?.(true);
  }

  isPlayerInFountainWater() {
    const distance = Math.hypot(
      this.player.position.x - FOUNTAIN_CENTER.x,
      this.player.position.z - FOUNTAIN_CENTER.z
    );
    return (
      distance <= FOUNTAIN_WATER_RADIUS &&
      distance >= FOUNTAIN_CORE_RADIUS &&
      this.player.position.y >= 0.5 &&
      this.player.position.y <= 1.08
    );
  }

  setSoftwareRenderingMode(enabled) {
    if (!enabled || this.softwareRenderingMode) return;
    this.softwareRenderingMode = true;
    this.plaza.userData.highPaving.visible = false;
    this.plaza.userData.lowPaving.visible = true;
    this.distantCity.visible = false;
    this.ambientCrowdFar.visible = false;
    const cloudBatch = this.scene.getObjectByName('高空体积云实例批次');
    if (cloudBatch) cloudBatch.visible = false;
    const sideWindows = this.scene.getObjectByName('私募教堂侧面楼层窗');
    if (sideWindows) sideWindows.visible = false;
    const distantWaistlines = this.scene.getObjectByName(
      '每十层神圣秩序金色腰线'
    );
    if (distantWaistlines) distantWaistlines.visible = false;
    const secondaryShiftRing = this.scene.getObjectByName(
      'Holy Shift 概念环 B'
    );
    if (secondaryShiftRing) secondaryShiftRing.visible = false;
    this.scene.traverse((object) => {
      if (object.name === '接触阴影') object.visible = false;
    });

    const churchPreserve = new Set([
      ...this.cameraCollisionMeshes,
      this.church.userData.parts.shiftBeacon,
      this.church.userData.parts.elevatorDisplay
    ].filter(Boolean));
    batchMeshesWithVertexColors(this.church, {
      name: '私募教堂软件渲染顶点色总批次',
      preserve: churchPreserve
    });
    const fountainPreserve = new Set([
      ...this.cameraCollisionMeshes,
      ...Object.values(this.fountain.userData.parts)
    ].filter((part) => part?.isObject3D));
    batchMeshesWithVertexColors(this.fountain, {
      name: '圣水池软件渲染静态顶点色总批次',
      preserve: fountainPreserve
    });

    const animatedMaterialMeshes = new Set([
      '异常生水喷流',
      '异常生水水面',
      '恢复圣水水面',
      '错位概念核心',
      '910.78米 Shift 信标'
    ]);
    const softwareMaterials = new Map();
    const toSoftwareMaterial = (material) => {
      if (!material?.isMeshStandardMaterial) return material;
      if (softwareMaterials.has(material)) return softwareMaterials.get(material);
      const replacement = new THREE.MeshLambertMaterial({
        name: `${material.name || '神圣材质'}-软件渲染LOD`,
        color: material.color,
        emissive: material.emissive,
        emissiveIntensity: material.emissiveIntensity,
        map: material.map,
        alphaMap: material.alphaMap,
        transparent: material.transparent,
        opacity: material.opacity,
        depthWrite: material.depthWrite,
        depthTest: material.depthTest,
        side: material.side,
        vertexColors: material.vertexColors,
        flatShading: material.flatShading,
        fog: material.fog,
        toneMapped: material.toneMapped
      });
      softwareMaterials.set(material, replacement);
      return replacement;
    };
    this.scene.traverse((object) => {
      if (
        !object.isMesh ||
        animatedMaterialMeshes.has(object.name)
      ) {
        return;
      }
      object.material = Array.isArray(object.material)
        ? object.material.map(toSoftwareMaterial)
        : toSoftwareMaterial(object.material);
    });

    const modifier = new SimplifyModifier();
    const simplifyRoot = (root, ratio) => {
      root.traverse((object) => {
        if (
          !object.isMesh ||
          object.isInstancedMesh ||
          object.userData.preserveSoftwareDetail ||
          !object.geometry?.attributes?.position ||
          object.geometry.attributes.position.count < 540
        ) {
          return;
        }
        try {
          const merged = mergeVertices(object.geometry);
          const uniqueCount = merged.attributes.position.count;
          merged.dispose();
          const removeCount = Math.floor(uniqueCount * ratio);
          if (removeCount < 24 || removeCount >= uniqueCount - 3) return;
          const simplified = modifier.modify(object.geometry, removeCount);
          if (
            simplified.attributes.position.count > 3 &&
            (simplified.index?.count ?? simplified.attributes.position.count) >= 3
          ) {
            object.geometry = simplified;
          } else {
            simplified.dispose();
          }
        } catch {
          // The original detailed geometry remains authoritative if a mesh
          // cannot be reduced safely on a particular browser.
        }
      });
    };
    [
      ...this.animatedCharacters,
      this.ambientCrowdNear,
      this.player,
      this.scene.getObjectByName('神圣广场家具运行时总批次源'),
      this.scene.getObjectByName('红肠食品集团神圣补给车独立资产')
    ]
      .filter(Boolean)
      .forEach((root) => {
        const ratio = root === this.player
          ? 0.55
          : root.name === '牧司学姐'
            ? 0.65
            : root === this.ambientCrowdNear
              ? 0.78
              : 0.62;
        simplifyRoot(root, ratio);
      });

  }

  isPositionValid(point) {
    return Boolean(
      point &&
      Number.isFinite(point.x) &&
      Number.isFinite(point.y) &&
      Number.isFinite(point.z) &&
      pointInPolygon(point.x, point.z, ISLAND_POINTS) &&
      point.y > -0.3 &&
      point.y < FLIGHT_BOUNDS.maxY + 0.25
    );
  }

  get checkpoint() {
    return CHECKPOINTS[this.currentProgress] ?? CHECKPOINTS.intro;
  }
}
