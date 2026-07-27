import {
  createCurveSolidGeometry,
  createProfiledSurfaceGeometry
} from './organicGeometry.js';

export function createHairCapGeometry({
  build = 1,
  length = 0.05,
  volume = 1,
  name = '分区发壳拓扑'
} = {}) {
  return createProfiledSurfaceGeometry(
    [
      {
        y: -0.08 - length,
        radiusX: 0.224 * build * volume,
        radiusZ: 0.207 * build * volume,
        centerZ: -0.012
      },
      {
        y: 0.015,
        radiusX: 0.244 * build * volume,
        radiusZ: 0.232 * build * volume,
        centerZ: -0.012
      },
      {
        y: 0.11,
        radiusX: 0.238 * build * volume,
        radiusZ: 0.224 * build * volume,
        centerZ: -0.016
      },
      {
        y: 0.19,
        radiusX: 0.207 * build * volume,
        radiusZ: 0.202 * build * volume,
        centerZ: -0.02
      },
      {
        y: 0.247,
        radiusX: 0.14 * build * volume,
        radiusZ: 0.145 * build * volume,
        centerZ: -0.026
      },
      {
        y: 0.278,
        radiusX: 0.04 * build * volume,
        radiusZ: 0.05 * build * volume,
        centerZ: -0.03
      }
    ],
    {
      radialSegments: 20,
      thetaStart: 0.72,
      thetaLength: Math.PI * 2 - 1.44,
      capBottom: false,
      capTop: false,
      name
    }
  );
}

export function createHairClumpGeometry({
  points,
  rootWidth = 0.07,
  midWidth = rootWidth * 0.72,
  tipWidth = rootWidth * 0.12,
  depth = rootWidth * 0.38,
  segments = 8,
  name = '方向性发束拓扑'
}) {
  return createCurveSolidGeometry({
    points,
    widths: [rootWidth, midWidth, tipWidth],
    depths: [depth, depth * 0.7, depth * 0.18],
    segments,
    radialSegments: 6,
    tipPinch: 0.35,
    name
  });
}

export function createBraidSegmentGeometry({
  length = 0.16,
  radius = 0.045,
  phase = 0,
  name = '编发交错束'
} = {}) {
  const points = [];
  const samples = 5;
  for (let index = 0; index < samples; index += 1) {
    const ratio = index / (samples - 1);
    points.push([
      Math.sin(ratio * Math.PI * 2 + phase) * radius * 0.32,
      -ratio * length,
      Math.cos(ratio * Math.PI * 2 + phase) * radius * 0.24
    ]);
  }
  return createCurveSolidGeometry({
    points,
    widths: [radius, radius * 0.86, radius * 0.68],
    depths: [radius * 0.82, radius * 0.72, radius * 0.55],
    segments: 8,
    radialSegments: 6,
    tipPinch: 0.08,
    name
  });
}
