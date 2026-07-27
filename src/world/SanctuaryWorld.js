import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Player } from '../entities/Player.js';
import { MAP } from '../data/mapConfig.js';

const UP = new THREE.Vector3(0, 1, 0);

const MATERIALS = {
  earth: new THREE.MeshBasicMaterial({ color: 0x17211d }),
  path: new THREE.MeshBasicMaterial({ color: 0x4a4b52 }),
  pathLight: new THREE.MeshBasicMaterial({ color: 0x656268 }),
  stone: new THREE.MeshLambertMaterial({ color: 0x343747 }),
  stoneLight: new THREE.MeshLambertMaterial({ color: 0x56596a }),
  stoneDark: new THREE.MeshLambertMaterial({ color: 0x1f2230 }),
  gold: new THREE.MeshLambertMaterial({
    color: 0xb8904c,
    emissive: 0x251806,
    emissiveIntensity: 0.35
  }),
  glass: new THREE.MeshLambertMaterial({
    color: 0x5277a9,
    emissive: 0x162a52,
    emissiveIntensity: 0.8
  }),
  holy: new THREE.MeshLambertMaterial({
    color: 0xf2d790,
    emissive: 0xb57928,
    emissiveIntensity: 1.6
  }),
  corruption: new THREE.MeshLambertMaterial({
    color: 0x69435e,
    emissive: 0x33102b,
    emissiveIntensity: 1.1
  }),
  trunk: new THREE.MeshLambertMaterial({ color: 0x251e22 }),
  leaves: new THREE.MeshLambertMaterial({ color: 0x182b27 }),
  npc: new THREE.MeshLambertMaterial({ color: 0x7b6a58 }),
  npcTrim: new THREE.MeshLambertMaterial({
    color: 0xd4b66d,
    emissive: 0x553610,
    emissiveIntensity: 0.5
  })
};

function mesh(geometry, material, name, position, rotation = null) {
  const item = new THREE.Mesh(geometry, material);
  item.name = name;
  item.position.set(position.x, position.y, position.z);
  if (rotation) item.rotation.set(rotation.x ?? 0, rotation.y ?? 0, rotation.z ?? 0);
  item.castShadow = false;
  item.receiveShadow = false;
  return item;
}

function boxCollider(name, x, z, width, depth, minY = -1, maxY = 8, rotation = 0) {
  return {
    name,
    shape: 'box',
    center: { x, z },
    width,
    depth,
    rotation,
    minY,
    maxY
  };
}

function cylinderCollider(name, x, z, radius, minY = -1, maxY = 8) {
  return {
    name,
    shape: 'cylinder',
    center: { x, z },
    radius,
    minY,
    maxY
  };
}

function createHumanoid(name, bodyMaterial, accentMaterial, scale = 1) {
  const group = new THREE.Group();
  group.name = name;
  const bodyGeometry = new THREE.CylinderGeometry(
    0.34 * scale,
    0.48 * scale,
    1.25 * scale,
    8
  );
  bodyGeometry.translate(0, 0.72 * scale, 0);
  const headGeometry = new THREE.SphereGeometry(0.28 * scale, 8, 6);
  headGeometry.translate(0, 1.58 * scale, 0);
  const body = mesh(
    mergeGeometries([bodyGeometry, headGeometry]),
    bodyMaterial,
    `${name}-身体批次`,
    { x: 0, y: 0, z: 0 }
  );
  const shoulderGeometry = new THREE.CylinderGeometry(
    0.56 * scale,
    0.38 * scale,
    0.18 * scale,
    8
  );
  shoulderGeometry.translate(0, 1.25 * scale, 0);
  const crownGeometry = new THREE.ConeGeometry(
    0.3 * scale,
    0.45 * scale,
    7,
    1,
    true
  );
  crownGeometry.translate(0, 1.93 * scale, 0);
  const accent = mesh(
    mergeGeometries([shoulderGeometry, crownGeometry]),
    accentMaterial,
    `${name}-饰件批次`,
    { x: 0, y: 0, z: 0 }
  );
  group.add(body, accent);
  return group;
}

function createMarker(color = 0xe8c36a) {
  const group = new THREE.Group();
  group.name = '交互标记';
  const ringMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.82,
    depthWrite: false
  });
  const ringGeometry = new THREE.TorusGeometry(0.62, 0.045, 6, 24);
  ringGeometry.rotateX(Math.PI / 2);
  ringGeometry.translate(0, 0.05, 0);
  const diamondGeometry = new THREE.OctahedronGeometry(0.18, 0);
  diamondGeometry.translate(0, 2.55, 0);
  const symbol = mesh(
    mergeGeometries([
      ringGeometry.index ? ringGeometry.toNonIndexed() : ringGeometry,
      diamondGeometry.index ? diamondGeometry.toNonIndexed() : diamondGeometry
    ]),
    ringMaterial,
    '交互标记批次',
    { x: 0, y: 0, z: 0 }
  );
  group.add(symbol);
  group.userData.symbol = symbol;
  return group;
}

function addArchitecturalBox(world, {
  name,
  x,
  y,
  z,
  width,
  height,
  depth,
  material = MATERIALS.stone,
  collidable = true,
  cameraBlocking = true
}) {
  const item = mesh(
    new THREE.BoxGeometry(width, height, depth),
    material,
    name,
    { x, y, z }
  );
  world.scene.add(item);
  if (collidable) {
    world.baseColliders.push(
      boxCollider(`${name}-碰撞`, x, z, width, depth, y - height / 2, y + height / 2)
    );
  }
  if (cameraBlocking) world.cameraCollisionMeshes.push(item);
  return item;
}

function buildCathedral(world) {
  const group = new THREE.Group();
  group.name = '暮光圣堂';

  const left = mesh(
    new THREE.BoxGeometry(18, 17, 4),
    MATERIALS.stone,
    '圣堂左立面',
    { x: -13, y: 8.5, z: -66 }
  );
  const right = left.clone();
  right.name = '圣堂右立面';
  right.position.x = 13;
  const lintel = mesh(
    new THREE.BoxGeometry(8, 7, 4),
    MATERIALS.stone,
    '圣堂门楣',
    { x: 0, y: 13.5, z: -66 }
  );
  const towerLeft = mesh(
    new THREE.CylinderGeometry(4.8, 5.5, 25, 8),
    MATERIALS.stoneDark,
    '圣堂左塔',
    { x: -19, y: 12.5, z: -68 }
  );
  const towerRight = towerLeft.clone();
  towerRight.name = '圣堂右塔';
  towerRight.position.x = 19;
  const spireLeft = mesh(
    new THREE.ConeGeometry(5, 15, 8),
    MATERIALS.stone,
    '圣堂左尖顶',
    { x: -19, y: 32.5, z: -68 }
  );
  const spireRight = spireLeft.clone();
  spireRight.name = '圣堂右尖顶';
  spireRight.position.x = 19;
  const rose = mesh(
    new THREE.CylinderGeometry(3.4, 3.4, 0.35, 16),
    MATERIALS.glass,
    '圣堂玫瑰窗',
    { x: 0, y: 17, z: -63.82 },
    { x: Math.PI / 2, y: 0, z: 0 }
  );
  const door = mesh(
    new THREE.BoxGeometry(7.4, 10, 0.5),
    MATERIALS.stoneDark,
    '裁决厅大门',
    { x: 0, y: 5, z: -63.7 }
  );
  const doorMarkVertical = new THREE.BoxGeometry(0.36, 5.6, 0.16);
  doorMarkVertical.translate(0, 6, -63.35);
  const doorMarkHorizontal = new THREE.BoxGeometry(3.6, 0.36, 0.16);
  doorMarkHorizontal.translate(0, 7.2, -63.34);
  const doorMark = mesh(
    mergeGeometries([doorMarkVertical, doorMarkHorizontal]),
    MATERIALS.holy,
    '门上圣印批次',
    { x: 0, y: 0, z: 0 }
  );

  group.add(
    left,
    right,
    lintel,
    towerLeft,
    towerRight,
    spireLeft,
    spireRight,
    rose,
    door,
    doorMark
  );
  world.scene.add(group);
  world.cameraCollisionMeshes.push(left, right, lintel, towerLeft, towerRight, door);
  world.baseColliders.push(
    boxCollider('圣堂左立面-碰撞', -13, -66, 18, 4, 0, 17),
    boxCollider('圣堂右立面-碰撞', 13, -66, 18, 4, 0, 17),
    boxCollider('裁决厅大门-碰撞', 0, -64, 8, 3.5, 0, 12),
    cylinderCollider('圣堂左塔-碰撞', -19, -68, 5.5, 0, 28),
    cylinderCollider('圣堂右塔-碰撞', 19, -68, 5.5, 0, 28)
  );
  world.endingLights.push(rose, doorMark);
}

function buildSanctuary(world) {
  const plaza = mesh(
    new THREE.CylinderGeometry(12, 12.8, 0.24, 24),
    MATERIALS.pathLight,
    '守钟人圆庭',
    { x: 0, y: 0.08, z: 43 }
  );
  world.scene.add(plaza);

  const bellFrame = new THREE.Group();
  bellFrame.name = '逆行钟架';
  const posts = [-2.4, 2.4].map((x, index) =>
    mesh(
      new THREE.BoxGeometry(0.7, 6, 0.7),
      MATERIALS.stone,
      `钟架立柱-${index + 1}`,
      { x, y: 3, z: 48 }
    )
  );
  const beam = mesh(
    new THREE.BoxGeometry(6, 0.8, 0.8),
    MATERIALS.stone,
    '钟架横梁',
    { x: 0, y: 5.8, z: 48 }
  );
  const bell = mesh(
    new THREE.ConeGeometry(1.1, 1.8, 12, 1, true),
    MATERIALS.gold,
    '逆行圣钟',
    { x: 0, y: 4.4, z: 48 }
  );
  bellFrame.add(...posts, beam, bell);
  world.scene.add(bellFrame);
  world.baseColliders.push(
    boxCollider('钟架左柱-碰撞', -2.4, 48, 0.9, 0.9, 0, 6),
    boxCollider('钟架右柱-碰撞', 2.4, 48, 0.9, 0.9, 0, 6)
  );
  world.cameraCollisionMeshes.push(...posts, beam);
  world.endingLights.push(bell);
}

function buildRuins(world) {
  const columnPositions = [
    [-8, 24],
    [8, 24],
    [-8, 7],
    [8, 7],
    [-8, -11],
    [8, -11],
    [-8, -34],
    [8, -34]
  ];
  const columnGeometry = new THREE.CylinderGeometry(0.72, 0.86, 1, 8);
  const columnInstances = new THREE.InstancedMesh(
    columnGeometry,
    MATERIALS.stoneLight,
    columnPositions.length
  );
  columnInstances.name = '朝圣径石柱实例';
  const capGeometry = new THREE.BoxGeometry(1.7, 0.35, 1.7);
  const capInstances = new THREE.InstancedMesh(
    capGeometry,
    MATERIALS.stone,
    columnPositions.length
  );
  capInstances.name = '朝圣径柱冠实例';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  for (const [index, [x, z]] of columnPositions.entries()) {
    const height = z === -34 ? 6.8 : 4.8 + (Math.abs(z) % 3) * 0.4;
    matrix.compose(
      new THREE.Vector3(x, height / 2, z),
      quaternion,
      new THREE.Vector3(1, height, 1)
    );
    columnInstances.setMatrixAt(index, matrix);
    matrix.makeTranslation(x, height + 0.16, z);
    capInstances.setMatrixAt(index, matrix);
    world.baseColliders.push(
      cylinderCollider(`朝圣径石柱-${x}-${z}-碰撞`, x, z, 0.86, 0, height)
    );
  }
  columnInstances.instanceMatrix.needsUpdate = true;
  capInstances.instanceMatrix.needsUpdate = true;
  world.scene.add(columnInstances, capInstances);
  world.cameraCollisionMeshes.push(columnInstances, capInstances);

  addArchitecturalBox(world, {
    name: '碎碑庭院左墙',
    x: -15,
    y: 1.7,
    z: -8,
    width: 14,
    height: 3.4,
    depth: 1.4
  });
  addArchitecturalBox(world, {
    name: '碎碑庭院右墙',
    x: 15,
    y: 1.7,
    z: -8,
    width: 14,
    height: 3.4,
    depth: 1.4
  });
}

function buildForest(world) {
  const treePositions = [
    [-35, 48],
    [-27, 38],
    [-38, 26],
    [-28, 14],
    [-37, 1],
    [-29, -14],
    [-38, -29],
    [-30, -46],
    [35, 48],
    [27, 36],
    [37, 21],
    [29, 8],
    [38, -5],
    [30, -20],
    [38, -36],
    [31, -50]
  ];
  const trunkGeometry = new THREE.CylinderGeometry(0.45, 0.7, 4.2, 7);
  const leavesGeometry = new THREE.ConeGeometry(2.5, 6.5, 7);
  const trunks = new THREE.InstancedMesh(
    trunkGeometry,
    MATERIALS.trunk,
    treePositions.length
  );
  trunks.name = '暮林树干实例';
  const leaves = new THREE.InstancedMesh(
    leavesGeometry,
    MATERIALS.leaves,
    treePositions.length
  );
  leaves.name = '暮林树冠实例';
  const matrix = new THREE.Matrix4();
  treePositions.forEach(([x, z], index) => {
    matrix.makeTranslation(x, 2.1, z);
    trunks.setMatrixAt(index, matrix);
    matrix.makeTranslation(x, 6.3, z);
    leaves.setMatrixAt(index, matrix);
    world.baseColliders.push(cylinderCollider(`暮林树-${index + 1}-碰撞`, x, z, 0.72, 0, 4.4));
  });
  trunks.instanceMatrix.needsUpdate = true;
  leaves.instanceMatrix.needsUpdate = true;
  world.scene.add(trunks, leaves);
  world.cameraCollisionMeshes.push(trunks);
}

function buildGraves(world) {
  const gravePositions = [
    [-19, 32],
    [-23, 28],
    [-18, 19],
    [-23, 13],
    [20, 30],
    [23, 24],
    [18, 17],
    [23, 11],
    [-20, -20],
    [-24, -27],
    [21, -25],
    [24, -33]
  ];
  const geometry = new THREE.BoxGeometry(0.85, 1.7, 0.32);
  const graves = new THREE.InstancedMesh(geometry, MATERIALS.stoneLight, gravePositions.length);
  graves.name = '无名墓碑实例';
  const matrix = new THREE.Matrix4();
  gravePositions.forEach(([x, z], index) => {
    matrix.compose(
      new THREE.Vector3(x, 0.85, z),
      new THREE.Quaternion().setFromAxisAngle(UP, index % 2 ? 0.08 : -0.06),
      new THREE.Vector3(1, 1, 1)
    );
    graves.setMatrixAt(index, matrix);
    world.baseColliders.push(
      boxCollider(`墓碑-${index + 1}-碰撞`, x, z, 1.05, 0.55, 0, 1.8, index % 2 ? 0.08 : -0.06)
    );
  });
  graves.instanceMatrix.needsUpdate = true;
  world.scene.add(graves);
  world.cameraCollisionMeshes.push(graves);
}

function buildShrine(world, id, x, z) {
  const group = new THREE.Group();
  group.name = `${id}-祭台`;
  group.position.set(x, 0, z);
  const base = mesh(
    new THREE.CylinderGeometry(1.15, 1.4, 0.7, 8),
    MATERIALS.stone,
    `${id}-祭台基座`,
    { x: 0, y: 0.35, z: 0 }
  );
  const crystal = mesh(
    new THREE.OctahedronGeometry(0.48, 0),
    MATERIALS.holy,
    `${id}-祭台圣晶`,
    { x: 0, y: 1.45, z: 0 }
  );
  const marker = createMarker();
  marker.position.y = 0.2;
  group.add(base, crystal, marker);
  world.scene.add(group);
  world.cameraCollisionMeshes.push(base);
  world.interactableObjects.set(id, group);
  world.markers.push(marker);
  return group;
}

function buildSideRoad(world) {
  const road = mesh(
    new THREE.BoxGeometry(26, 0.06, 4.2),
    MATERIALS.path,
    '守墓侧路',
    { x: 18, y: 0.025, z: -2 }
  );
  world.scene.add(road);
  const monument = mesh(
    new THREE.CylinderGeometry(2.2, 2.8, 1.2, 10),
    MATERIALS.stone,
    '守墓人纪念台',
    { x: 30, y: 0.6, z: -2 }
  );
  world.scene.add(monument);
  world.baseColliders.push(cylinderCollider('守墓人纪念台-碰撞', 30, -2, 2.5, 0, 1.3));
  world.cameraCollisionMeshes.push(monument);
}

function createEnemy(world, id, x, z, material, scale = 1) {
  const group = createHumanoid(id, material, MATERIALS.stoneDark, scale);
  group.position.set(x, 0, z);
  const marker = createMarker(id === 'boss' ? 0xf1aa4d : 0xc58aa8);
  marker.position.y = 0.15;
  group.add(marker);
  world.scene.add(group);
  world.interactableObjects.set(id, group);
  world.enemyObjects.set(id, group);
  world.markers.push(marker);
  return group;
}

function mergeStaticMeshes(world) {
  world.scene.updateMatrixWorld(true);
  const protectedMeshes = new Set(world.endingLights);
  const materialGroups = new Map();

  world.scene.traverse((object) => {
    if (
      !object.isMesh ||
      object.isInstancedMesh ||
      protectedMeshes.has(object) ||
      !(
        object.material?.isMeshLambertMaterial ||
        object.material?.isMeshBasicMaterial
      ) ||
      object.material.transparent
    ) {
      return;
    }
    const group = materialGroups.get(object.material.uuid) ?? {
      material: object.material,
      meshes: []
    };
    group.meshes.push(object);
    materialGroups.set(object.material.uuid, group);
  });

  for (const { material, meshes } of materialGroups.values()) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((object) =>
      object.geometry.clone().applyMatrix4(object.matrixWorld)
    );
    const geometry = mergeGeometries(geometries, false);
    if (!geometry) continue;
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const combined = new THREE.Mesh(geometry, material);
    combined.name = `静态批次-${material.name || material.uuid.slice(0, 8)}`;
    combined.castShadow = false;
    combined.receiveShadow = false;
    meshes.forEach((object) => object.removeFromParent());
    world.scene.add(combined);
  }
}

export class SanctuaryWorld {
  constructor() {
    this.scene = new THREE.Scene();
    this.scene.name = 'Holy Shift 暮光圣岛';
    this.scene.background = new THREE.Color(0x090b18);
    this.scene.fog = new THREE.Fog(0x151a2a, 58, 142);
    this.player = new Player();
    this.baseColliders = [];
    this.dynamicColliders = [];
    this.cameraCollisionMeshes = [];
    this.interactableObjects = new Map();
    this.enemyObjects = new Map();
    this.markers = [];
    this.endingLights = [];
    this.elapsed = 0;
    this.currentProgress = 'prologue';

    this.scene.userData.walkableSurfaces = [
      {
        name: '圣岛主可走面',
        shape: 'box',
        center: { x: 0, z: -7 },
        width: 92,
        depth: 130,
        y: 0,
        walkable: true
      }
    ];

    this.build();
  }

  build() {
    const hemisphere = new THREE.HemisphereLight(0x9bb5dc, 0x151811, 1.55);
    hemisphere.name = '暮光环境光';
    this.scene.add(hemisphere);
    const moon = new THREE.DirectionalLight(0xbfd7ff, 2.2);
    moon.name = '月光';
    moon.position.set(-35, 55, 25);
    this.scene.add(moon);
    this.moonLight = moon;
    const ground = mesh(
      new THREE.BoxGeometry(94, 2, 132),
      MATERIALS.earth,
      '圣岛地基',
      { x: 0, y: -1, z: -7 }
    );
    this.scene.add(ground);
    const path = mesh(
      new THREE.BoxGeometry(8.5, 0.08, 110),
      MATERIALS.path,
      '朝圣主径',
      { x: 0, y: 0.03, z: -4 }
    );
    this.scene.add(path);

    const seamCount = 24;
    const seamGeometry = new THREE.BoxGeometry(1, 0.035, 0.16);
    const seams = new THREE.InstancedMesh(
      seamGeometry,
      MATERIALS.pathLight,
      seamCount
    );
    seams.name = '朝圣径接缝实例';
    const seamMatrix = new THREE.Matrix4();
    const seamQuaternion = new THREE.Quaternion();
    for (let index = 0; index < seamCount; index += 1) {
      const z = 48 - index * 4.55;
      seamMatrix.compose(
        new THREE.Vector3(index % 2 ? 0.12 : -0.08, 0.075, z),
        seamQuaternion,
        new THREE.Vector3(index % 3 === 0 ? 7.6 : 7.9, 1, 1)
      );
      seams.setMatrixAt(index, seamMatrix);
    }
    seams.instanceMatrix.needsUpdate = true;
    this.scene.add(seams);

    this.baseColliders.push(
      boxCollider('西侧世界边界', -47, -7, 2, 132, -4, 12),
      boxCollider('东侧世界边界', 47, -7, 2, 132, -4, 12),
      boxCollider('北侧世界边界', 0, 59, 96, 2, -4, 12),
      boxCollider('南侧世界边界', 0, -73, 96, 2, -4, 12)
    );

    buildSanctuary(this);
    buildCathedral(this);
    buildRuins(this);
    buildForest(this);
    buildGraves(this);
    buildSideRoad(this);
    mergeStaticMeshes(this);

    const npc = createHumanoid('守钟人弥迦', MATERIALS.npc, MATERIALS.npcTrim, 0.96);
    npc.position.set(-4.5, 0, 41);
    const npcMarker = createMarker();
    npc.add(npcMarker);
    this.scene.add(npc);
    this.interactableObjects.set('npc', npc);
    this.markers.push(npcMarker);
    this.baseColliders.push(cylinderCollider('守钟人弥迦-碰撞', -4.5, 41, 0.55, 0, 2.2));

    createEnemy(this, 'sentry', 0, 14, MATERIALS.corruption, 1.05);
    createEnemy(this, 'warden', 0, -17, MATERIALS.corruption, 1.15);
    createEnemy(this, 'boss', 0, -51, MATERIALS.holy, 1.55);
    createEnemy(this, 'elite', 30, -2, MATERIALS.stoneLight, 1.15);
    buildShrine(this, 'weaponShrine', 3.2, 4);
    buildShrine(this, 'relicShrine', -3.2, -28);

    this.player.position.set(MAP.playerStart.x, MAP.playerStart.y, MAP.playerStart.z);
    this.scene.add(this.player);
    this.scene.userData.solidColliders = this.baseColliders;
    this.scene.userData.colliders = this.scene.userData.solidColliders;
    this.scene.userData.cameraCollisionMeshes = this.cameraCollisionMeshes;
    this.applyProgress('prologue', {
      sentry: false,
      warden: false,
      boss: false,
      elite: false
    });
  }

  applyProgress(progress, defeated) {
    this.currentProgress = progress;
    const activeEnemies = [];
    for (const [id, object] of this.enemyObjects) {
      const isDefeated = defeated[id] === true;
      const unlocked =
        id === 'sentry'
          ? progress !== 'prologue'
          : id === 'warden'
            ? ['weaponChosen', 'wardenDefeated', 'relicChosen', 'growthChosen', 'bossDefeated', 'complete'].includes(progress)
            : id === 'boss'
              ? ['growthChosen', 'bossDefeated'].includes(progress)
              : !['prologue', 'questAccepted', 'sentryDefeated'].includes(progress);
      object.visible = !isDefeated && unlocked;
      if (object.visible) {
        activeEnemies.push(
          cylinderCollider(`${id}-动态碰撞`, object.position.x, object.position.z, id === 'boss' ? 0.9 : 0.65, 0, 3)
        );
      }
    }
    const weaponShrine = this.interactableObjects.get('weaponShrine');
    if (weaponShrine) weaponShrine.visible = progress === 'sentryDefeated';
    const relicShrine = this.interactableObjects.get('relicShrine');
    if (relicShrine) {
      relicShrine.visible = progress === 'wardenDefeated' || progress === 'relicChosen';
    }

    if (weaponShrine?.visible) {
      activeEnemies.push(cylinderCollider('weaponShrine-动态碰撞', 3.2, 4, 1.2, 0, 1.7));
    }
    if (relicShrine?.visible) {
      activeEnemies.push(cylinderCollider('relicShrine-动态碰撞', -3.2, -28, 1.2, 0, 1.7));
    }

    this.dynamicColliders = activeEnemies;
    this.scene.userData.solidColliders = [...this.baseColliders, ...this.dynamicColliders];
    this.scene.userData.colliders = this.scene.userData.solidColliders;

    const complete = progress === 'complete' || progress === 'bossDefeated';
    this.moonLight.color.setHex(complete ? 0xffe1a1 : 0xbfd7ff);
    this.moonLight.intensity = complete ? 2.7 : 2.2;
    this.scene.background.setHex(complete ? 0x11182a : 0x090b18);
    this.scene.fog.color.setHex(complete ? 0x27344b : 0x151a2a);
    MATERIALS.glass.emissiveIntensity = complete ? 2.3 : 0.8;
    MATERIALS.holy.emissiveIntensity = complete ? 2.4 : 1.6;
  }

  setCheckpoint(point, teleport = false) {
    return this.player.setRespawn(point, teleport);
  }

  update(delta, input, movementYaw, allowMovement) {
    this.elapsed += delta;
    if (allowMovement) {
      this.player.update(delta, input, movementYaw, this.scene.userData);
    }

    for (let index = 0; index < this.markers.length; index += 1) {
      const marker = this.markers[index];
      marker.rotation.y = this.elapsed * 0.8 + index * 0.35;
      const symbol = marker.userData.symbol;
      if (symbol) {
        symbol.position.y = Math.sin(this.elapsed * 2 + index) * 0.08;
      }
    }

    for (const [id, enemy] of this.enemyObjects) {
      if (!enemy.visible) continue;
      const scale = id === 'boss' ? 0.035 : 0.025;
      enemy.rotation.y = Math.sin(this.elapsed * 0.7 + enemy.position.z) * scale;
    }
  }

  getInteractionCandidates(progress, defeated) {
    const main = {
      prologue: ['npc'],
      questAccepted: ['sentry'],
      sentryDefeated: ['weaponShrine'],
      weaponChosen: ['warden'],
      wardenDefeated: ['relicShrine'],
      relicChosen: ['relicShrine'],
      growthChosen: ['boss'],
      bossDefeated: ['npc'],
      complete: []
    }[progress] ?? [];
    const candidates = [...main];
    if (
      !defeated.elite &&
      !['prologue', 'questAccepted', 'sentryDefeated'].includes(progress)
    ) {
      candidates.push('elite');
    }
    return candidates;
  }

  getNearestInteractable(progress, defeated, maxDistance = 3.4) {
    let nearest = null;
    let nearestDistance = maxDistance;
    for (const id of this.getInteractionCandidates(progress, defeated)) {
      const object = this.interactableObjects.get(id);
      if (!object?.visible) continue;
      const dx = this.player.position.x - object.position.x;
      const dz = this.player.position.z - object.position.z;
      const distance = Math.hypot(dx, dz);
      if (distance < nearestDistance) {
        nearest = { id, distance, object };
        nearestDistance = distance;
      }
    }
    return nearest;
  }

  getObjectivePosition(progress) {
    const id = {
      prologue: 'npc',
      questAccepted: 'sentry',
      sentryDefeated: 'weaponShrine',
      weaponChosen: 'warden',
      wardenDefeated: 'relicShrine',
      relicChosen: 'relicShrine',
      growthChosen: 'boss',
      bossDefeated: 'npc'
    }[progress];
    return id ? this.interactableObjects.get(id)?.position ?? null : null;
  }

  isPositionValid(point) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || !Number.isFinite(point.z)) {
      return false;
    }
    return (
      point.x > -45 &&
      point.x < 45 &&
      point.z > -71 &&
      point.z < 57 &&
      point.y > -0.3 &&
      point.y < 4
    );
  }
}
