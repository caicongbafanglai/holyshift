import * as THREE from 'three';
import { createCharacterMaterial, SACRED_MATERIALS } from '../../materials/sacredMaterials.js';
import { createContactShadow, createMesh } from '../../modeling/primitives.js';

export function createPingu() {
  const root = new THREE.Group();
  root.name = 'Pingu · 红肠组组长';
  root.add(createContactShadow(0.43, SACRED_MATERIALS.contactShadow));
  const visual = new THREE.Group();
  visual.name = 'Pingu-视觉根';
  root.add(visual);

  const black = createCharacterMaterial(0x152332, { roughness: 0.56 });
  const white = createCharacterMaterial(0xf3efe2, { roughness: 0.72 });
  const orange = createCharacterMaterial(0xe7973d, { roughness: 0.54 });
  const eye = createCharacterMaterial(0x071118, { roughness: 0.22 });
  const red = SACRED_MATERIALS.redSausage;

  const body = createMesh(
    new THREE.SphereGeometry(0.48, 24, 18),
    black,
    'Pingu 身体',
    [0, 0.62, 0],
    [0, 0, 0],
    [0.82, 1.25, 0.76]
  );
  const belly = createMesh(
    new THREE.SphereGeometry(0.39, 22, 16),
    white,
    'Pingu 白肚皮',
    [0, 0.61, 0.25],
    [0, 0, 0],
    [0.7, 1.05, 0.35]
  );
  const head = createMesh(
    new THREE.SphereGeometry(0.37, 24, 18),
    black,
    'Pingu 头部',
    [0, 1.24, 0],
    [0, 0, 0],
    [1, 0.92, 0.95]
  );
  const facePatch = createMesh(
    new THREE.SphereGeometry(0.3, 20, 14),
    white,
    'Pingu 脸部白斑',
    [0, 1.22, 0.22],
    [0, 0, 0],
    [0.8, 0.69, 0.3]
  );
  const beak = createMesh(
    new THREE.ConeGeometry(0.14, 0.27, 12),
    orange,
    'Pingu 鸟喙',
    [0, 1.15, 0.43],
    [Math.PI / 2, 0, 0],
    [1.2, 1, 0.72]
  );

  for (const side of [-1, 1]) {
    const eyeMesh = createMesh(
      new THREE.SphereGeometry(0.052, 12, 8),
      eye,
      side < 0 ? 'Pingu 左眼' : 'Pingu 右眼',
      [side * 0.105, 1.3, 0.3],
      [0, 0, 0],
      [0.88, 1.1, 0.56]
    );
    const catchlight = createMesh(
      new THREE.SphereGeometry(0.013, 7, 5),
      white,
      side < 0 ? 'Pingu 左眼高光' : 'Pingu 右眼高光',
      [side * 0.115, 1.315, 0.335]
    );
    const wing = new THREE.Group();
    wing.name = side < 0 ? 'Pingu 左翅骨架' : 'Pingu 右翅骨架';
    wing.position.set(side * 0.38, 0.82, 0);
    wing.add(
      createMesh(
        new THREE.CapsuleGeometry(0.12, 0.42, 5, 10),
        black,
        side < 0 ? 'Pingu 左翅' : 'Pingu 右翅',
        [side * 0.03, -0.12, 0],
        [0, 0, side * 0.25]
      )
    );
    const foot = createMesh(
      new THREE.SphereGeometry(0.19, 14, 9),
      orange,
      side < 0 ? 'Pingu 左脚' : 'Pingu 右脚',
      [side * 0.2, 0.08, 0.1],
      [0, 0, 0],
      [1.2, 0.38, 1.45]
    );
    visual.add(eyeMesh, catchlight, wing, foot);
    if (side < 0) root.userData.leftWing = wing;
    else root.userData.rightWing = wing;
  }

  const cap = new THREE.Group();
  cap.name = '红肠组组长帽';
  cap.position.set(0, 1.52, 0);
  cap.add(
    createMesh(
      new THREE.CylinderGeometry(0.26, 0.31, 0.16, 18),
      red,
      '组长帽冠',
      [0, 0.02, 0]
    ),
    createMesh(
      new THREE.BoxGeometry(0.33, 0.045, 0.2),
      red,
      '组长帽檐',
      [0, -0.04, 0.2]
    ),
    createMesh(
      new THREE.CylinderGeometry(0.06, 0.06, 0.018, 16),
      SACRED_MATERIALS.polishedGold,
      '红肠组徽章',
      [0, 0.03, 0.292],
      [Math.PI / 2, 0, 0]
    )
  );

  const sausageBandolier = new THREE.Group();
  sausageBandolier.name = 'Pingu 红肠战斗补给带';
  for (let index = 0; index < 5; index += 1) {
    const sausage = createMesh(
      new THREE.CapsuleGeometry(0.045, 0.16, 4, 8),
      red,
      `备案红肠-${index + 1}`,
      [-0.2 + index * 0.1, 0.67 + index * 0.025, 0.38],
      [0, 0, -0.5]
    );
    sausageBandolier.add(sausage);
  }
  visual.add(body, belly, head, facePatch, beak, cap, sausageBandolier);

  root.userData.animate = ({ time = 0, alert = false } = {}) => {
    visual.position.y = Math.sin(time * 2.3) * 0.018;
    visual.rotation.z = Math.sin(time * 1.4) * 0.025;
    root.userData.leftWing.rotation.z = -0.18 + Math.sin(time * (alert ? 7 : 2)) * (alert ? 0.45 : 0.08);
    root.userData.rightWing.rotation.z = 0.18 - Math.sin(time * (alert ? 7 : 2)) * (alert ? 0.45 : 0.08);
  };
  return root;
}
