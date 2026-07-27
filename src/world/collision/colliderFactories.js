export function boxCollider(
  name,
  x,
  z,
  width,
  depth,
  minY = -1,
  maxY = 8,
  rotation = 0
) {
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

export function cylinderCollider(
  name,
  x,
  z,
  radius,
  minY = -1,
  maxY = 8
) {
  return {
    name,
    shape: 'cylinder',
    center: { x, z },
    radius,
    minY,
    maxY
  };
}

export function segmentCollider(
  name,
  start,
  end,
  radius,
  minY = -1,
  maxY = 8
) {
  return {
    name,
    shape: 'segment',
    start,
    end,
    thickness: radius * 2,
    minY,
    maxY
  };
}

export function flatWalkableSurface(
  name,
  x,
  z,
  width,
  depth,
  y = 0,
  rotation = 0
) {
  return {
    name,
    shape: 'box',
    center: { x, z },
    width,
    depth,
    rotation,
    y,
    walkable: true
  };
}
