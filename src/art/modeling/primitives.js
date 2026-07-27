import * as THREE from 'three';

export function createMesh(
  geometry,
  material,
  name,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = [1, 1, 1]
) {
  const item = new THREE.Mesh(geometry, material);
  item.name = name;
  item.position.set(...position);
  item.rotation.set(...rotation);
  item.scale.set(...scale);
  item.castShadow = false;
  item.receiveShadow = false;
  return item;
}

export function createContactShadow(radius, material, opacityScale = 1) {
  const shadowMaterial = material.clone();
  shadowMaterial.opacity *= opacityScale;
  const shadow = createMesh(
    new THREE.CircleGeometry(radius, 24),
    shadowMaterial,
    '接触阴影',
    [0, 0.012, 0],
    [-Math.PI / 2, 0, 0]
  );
  shadow.renderOrder = 1;
  return shadow;
}

export function createArchRingGeometry(
  width,
  height,
  depth,
  rimWidth = width * 0.12,
  bevelSize = 0.04
) {
  const radius = width / 2;
  const springY = height - radius;
  const innerWidth = Math.max(0.2, width - rimWidth * 2);
  const innerRadius = innerWidth / 2;
  const innerSpringY = springY;
  const shape = new THREE.Shape();
  shape.moveTo(-radius, 0);
  shape.lineTo(radius, 0);
  shape.lineTo(radius, springY);
  shape.absarc(0, springY, radius, 0, Math.PI, false);
  shape.lineTo(-radius, 0);

  const hole = new THREE.Path();
  hole.moveTo(-innerRadius, rimWidth);
  hole.lineTo(-innerRadius, innerSpringY);
  hole.absarc(0, innerSpringY, innerRadius, Math.PI, 0, true);
  hole.lineTo(innerRadius, rimWidth);
  hole.lineTo(-innerRadius, rimWidth);
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevelSize > 0,
    bevelSegments: 2,
    bevelSize,
    bevelThickness: bevelSize
  });
  geometry.center();
  return geometry;
}

export function createShieldGeometry(width = 0.52, height = 0.72, depth = 0.08) {
  const shape = new THREE.Shape();
  shape.moveTo(0, -height / 2);
  shape.bezierCurveTo(-width * 0.52, -height * 0.2, -width * 0.5, height * 0.22, -width * 0.44, height * 0.42);
  shape.quadraticCurveTo(0, height * 0.58, width * 0.44, height * 0.42);
  shape.bezierCurveTo(width * 0.5, height * 0.22, width * 0.52, -height * 0.2, 0, -height / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 2
  });
  geometry.center();
  return geometry;
}

export function createRibbonGeometry(points, width = 0.08, depth = 0.025) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x - width / 2, y);
    else shape.lineTo(x - width / 2, y);
  });
  [...points].reverse().forEach(([x, y]) => shape.lineTo(x + width / 2, y));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false
  });
  geometry.center();
  return geometry;
}

export function createTextPanel({
  text,
  width = 512,
  height = 192,
  foreground = '#f7e7a7',
  background = 'rgba(8, 31, 55, 0.92)',
  border = '#cfa64c',
  font = '700 54px system-ui, sans-serif'
}) {
  if (typeof document === 'undefined') {
    const material = new THREE.MeshBasicMaterial({ color: 0x153a59 });
    return {
      mesh: createMesh(
        new THREE.PlaneGeometry(1, height / width),
        material,
        `文字牌-${text}`
      ),
      texture: null,
      material
    };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = border;
  context.lineWidth = 10;
  context.strokeRect(8, 8, width - 16, height - 16);
  context.fillStyle = foreground;
  context.font = font;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: true
  });
  return {
    mesh: createMesh(new THREE.PlaneGeometry(1, height / width), material, `文字牌-${text}`),
    texture,
    material
  };
}

export function addInstancedRows({
  parent,
  name,
  geometry,
  material,
  transforms
}) {
  const instances = new THREE.InstancedMesh(geometry, material, transforms.length);
  instances.name = name;
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  transforms.forEach((transform, index) => {
    position.set(...(transform.position ?? [0, 0, 0]));
    euler.set(...(transform.rotation ?? [0, 0, 0]));
    quaternion.setFromEuler(euler);
    scale.set(...(transform.scale ?? [1, 1, 1]));
    matrix.compose(position, quaternion, scale);
    instances.setMatrixAt(index, matrix);
  });
  instances.instanceMatrix.needsUpdate = true;
  parent.add(instances);
  return instances;
}

export function setObjectLayers(root, layer) {
  root.traverse((object) => object.layers.set(layer));
}
