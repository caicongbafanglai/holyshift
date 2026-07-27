import * as THREE from 'three';
import { SACRED_MATERIALS } from '../materials/sacredMaterials.js';
import {
  createArchRingGeometry,
  createMesh,
  createTextPanel
} from '../modeling/primitives.js';

export function createNoticeBoard() {
  const group = new THREE.Group();
  group.name = '神圣广场公告牌独立资产';
  const frame = createMesh(
    createArchRingGeometry(5.7, 4.9, 0.38, 0.34, 0.04),
    SACRED_MATERIALS.polishedGold,
    '公告牌金色拱形外框',
    [0, 3.1, 0]
  );
  const glass = createMesh(
    new THREE.PlaneGeometry(5.05, 3.8),
    SACRED_MATERIALS.darkGlass,
    '公告牌深蓝玻璃',
    [0, 2.95, 0.23]
  );
  const title = createTextPanel({
    text: '神圣流程公告',
    width: 768,
    height: 152,
    foreground: '#f8e8a1',
    background: 'rgba(8, 34, 57, 0.96)',
    border: '#cfa64c',
    font: '800 70px serif'
  }).mesh;
  title.name = '公告牌标题';
  title.scale.set(4.5, 4.5, 1);
  title.position.set(0, 3.95, 0.28);
  const notice = createTextPanel({
    text: '圣水饮用须完成神圣签到',
    width: 1024,
    height: 160,
    foreground: '#d7f7f3',
    background: 'rgba(12, 48, 70, 0.95)',
    border: '#5aa0b8',
    font: '700 58px system-ui, sans-serif'
  }).mesh;
  notice.name = '圣水审批公告';
  notice.scale.set(4.45, 4.45, 1);
  notice.position.set(0, 2.9, 0.29);
  const abnormal = createTextPanel({
    text: '异常请先填表，再异常',
    width: 1024,
    height: 160,
    foreground: '#f1b9df',
    background: 'rgba(55, 27, 66, 0.95)',
    border: '#c84f9d',
    font: '700 58px system-ui, sans-serif'
  }).mesh;
  abnormal.name = '异常审批提示';
  abnormal.scale.set(4.45, 4.45, 1);
  abnormal.position.set(0, 2.08, 0.3);
  const postLeft = createMesh(
    new THREE.CylinderGeometry(0.16, 0.22, 2.7, 12),
    SACRED_MATERIALS.ivory,
    '公告牌左支柱',
    [-2.22, 1.35, -0.04]
  );
  const postRight = postLeft.clone();
  postRight.name = '公告牌右支柱';
  postRight.position.x = 2.22;
  const roof = createMesh(
    new THREE.CylinderGeometry(0.8, 3.2, 0.9, 8),
    SACRED_MATERIALS.deepBlue,
    '公告牌八角顶盖',
    [0, 5.65, -0.05],
    [0, 0, 0],
    [1, 0.65, 0.34]
  );
  const beacon = createMesh(
    new THREE.OctahedronGeometry(0.24, 1),
    SACRED_MATERIALS.holyShift,
    '公告牌签到信标',
    [0, 6.25, 0]
  );
  group.add(
    frame,
    glass,
    title,
    notice,
    abnormal,
    postLeft,
    postRight,
    roof,
    beacon
  );
  group.userData.update = (time) => {
    beacon.rotation.y = time;
    beacon.position.y = 6.25 + Math.sin(time * 2.2) * 0.08;
  };
  return group;
}
