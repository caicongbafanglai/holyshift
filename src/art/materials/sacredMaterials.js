import * as THREE from 'three';
import { COLORS } from '../../data/mapConfig.js';

function standard(color, options = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: options.roughness ?? 0.68,
    metalness: options.metalness ?? 0,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    transparent: options.transparent ?? false,
    opacity: options.opacity ?? 1,
    depthWrite: options.depthWrite ?? true,
    side: options.side ?? THREE.FrontSide,
    flatShading: options.flatShading ?? false
  });
}

export const SACRED_MATERIALS = {
  ivory: standard(COLORS.ivory, { roughness: 0.82 }),
  ivoryWarm: standard(0xfff8e8, { roughness: 0.72 }),
  pearl: standard(COLORS.pearl, { roughness: 0.55, metalness: 0.08 }),
  whiteStone: standard(0xe8e4d8, { roughness: 0.94 }),
  stoneJoint: standard(0xb9c1c2, { roughness: 0.92 }),
  gold: standard(COLORS.gold, {
    roughness: 0.34,
    metalness: 0.72,
    emissive: 0x3c2204,
    emissiveIntensity: 0.12
  }),
  polishedGold: standard(0xf1cc68, {
    roughness: 0.22,
    metalness: 0.86,
    emissive: 0x60400a,
    emissiveIntensity: 0.18
  }),
  deepBlue: standard(COLORS.deepBlue, {
    roughness: 0.32,
    metalness: 0.18
  }),
  blueGlass: standard(COLORS.glassBlue, {
    roughness: 0.16,
    metalness: 0.12,
    emissive: 0x0a3b5c,
    emissiveIntensity: 0.48,
    transparent: true,
    opacity: 0.86
  }),
  darkGlass: standard(0x0b2948, {
    roughness: 0.12,
    metalness: 0.18,
    emissive: 0x071d36,
    emissiveIntensity: 0.35
  }),
  water: standard(COLORS.water, {
    roughness: 0.12,
    metalness: 0.02,
    emissive: 0x0a788f,
    emissiveIntensity: 0.52,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    side: THREE.DoubleSide
  }),
  waterRaw: standard(0x7fd9b1, {
    roughness: 0.2,
    emissive: 0x235d43,
    emissiveIntensity: 0.72,
    transparent: true,
    opacity: 0.77,
    depthWrite: false,
    side: THREE.DoubleSide
  }),
  holyShift: standard(COLORS.shiftCyan, {
    roughness: 0.22,
    emissive: COLORS.shiftCyan,
    emissiveIntensity: 1.8
  }),
  anomaly: standard(COLORS.anomalyMagenta, {
    roughness: 0.44,
    emissive: 0x7d145a,
    emissiveIntensity: 1.05
  }),
  anomalyDark: standard(0x3c214f, {
    roughness: 0.62,
    emissive: 0x23082e,
    emissiveIntensity: 0.5
  }),
  black: standard(0x10151e, { roughness: 0.62 }),
  wood: standard(0x6f3f22, { roughness: 0.84 }),
  darkWood: standard(0x352216, { roughness: 0.9 }),
  foliage: standard(0x2d6b59, { roughness: 0.92 }),
  foliageLight: standard(0x64a57d, { roughness: 0.88 }),
  redSausage: standard(0xb73d38, { roughness: 0.5 }),
  pavement: standard(0xd9d7cf, { roughness: 0.98 }),
  pavementBlue: standard(0x9bb3bd, { roughness: 0.93 }),
  contactShadow: new THREE.MeshBasicMaterial({
    color: 0x163343,
    transparent: true,
    opacity: 0.18,
    depthWrite: false
  })
};

export function createCharacterMaterial(color, options = {}) {
  return standard(color, {
    roughness: options.roughness ?? 0.58,
    metalness: options.metalness ?? 0,
    emissive: options.emissive,
    emissiveIntensity: options.emissiveIntensity,
    transparent: options.transparent,
    opacity: options.opacity,
    side: options.side,
    flatShading: options.flatShading
  });
}

export function setAnomalyRestored(restored) {
  SACRED_MATERIALS.water.emissiveIntensity = restored ? 0.82 : 0.52;
  SACRED_MATERIALS.holyShift.emissiveIntensity = restored ? 2.4 : 1.8;
}
