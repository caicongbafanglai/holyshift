# Holy Shift

《Holy Shift》是一款发生在环水小岛“师老牧镇”的原创 3D 动作 RPG。玩家扮演私募教堂师牧会会长“老牧师”，在高级、神圣、干净但制度离谱的神圣广场处理“圣水变生水”的 Holy Shift 概念错位。

生产入口：<https://qt.fengche.ai/holyshift/>

当前 `v0.3` 是第一章完整纵向切片，开放神圣广场、圣水池与私募教堂入口；它不是全岛开放世界。

## 第一章

玩家可以持续自由移动并在原场景内完成：

1. 与牧司学姐确认异常。
2. 调查圣水池。
3. 实时击败三只“生水泡影”。
4. 向 Pingu 核对红肠供应链备案。
5. 向林镇阴确认 Holy Shift 旧案。
6. 实时击败“已审批水鬼”。
7. 把错位的“圣”移回圣水。
8. 在私募教堂入口发现 `191F / SHIFT`。

战斗不会切进按钮回合屏；攻击、闪避、受击、敌人追击和 Holy Shift 均发生在可移动的 3D 世界中。

## 操作

| 输入 | 功能 |
|---|---|
| `W A S D` | 移动 |
| 鼠标 / 点击画面 | 观察 / 锁定鼠标 |
| `Shift` | 疾跑 |
| `Space` | 跳跃 |
| `Ctrl + Shift + W A S D` | 沿视角飞行（持续消耗耐力） |
| 鼠标左键 / `J` | 手杖连击 |
| 鼠标右键 / `Q` | Holy Shift |
| 单按 `Ctrl` | 闪避 |
| `E` | 调查 / 交谈 |
| `V` | 第一 / 第三人称切换 |
| `R` | 返回最近安全点 |
| `Esc` | 暂停 / 设置 |

游戏内右下角有简洁常驻战斗键位，左下角有可收起的完整键位卡。`640×360` 及以上视口不会遮挡目标、准星或关键操作。

## 本地运行

要求 Node.js `22+`。

```bash
npm ci
npx playwright install chromium webkit firefox
npm run dev
```

生产构建与预览：

```bash
npm run build
npm run preview -- --port 4174
```

## 质量命令

```bash
npm run typecheck
npm run lint
npm run test
npm run build
npm run e2e
npm run e2e:cross-browser
```

Linux 无界面环境的 Firefox 通常没有可用 WebGL 驱动，需在虚拟显示器中以有头模式验证：

```bash
xvfb-run -a env PW_FIREFOX_HEADED=1 npm run e2e:firefox
```

本地 E2E 流程桥只有在回环主机且 URL 显式包含 `?e2e=1` 时才会创建；生产域名不会暴露该接口。

## 模块结构

- `src/art/materials`：共享色板与材质。
- `src/art/modeling`：建模原语、拱券、饰条与批处理工具。
- `src/art/characters/<character>`：老牧师、Pingu、林镇阴、牧司学姐与群众的独立模型。
- `src/art/enemies`：生水泡影与已审批水鬼。
- `src/art/architecture`：神圣广场、圣水池、私募教堂与远景城市。
- `src/art/props`：公告牌、长椅、路灯、签到机与红肠补给车。
- `src/gameplay/combat`：场景内实时战斗、判定、受击与敌人 AI。
- `src/gameplay/quests`：第一章状态机。
- `src/world/collision`：碰撞体工厂；`src/world/MushiTownWorld.js` 负责世界拼装。
- `src/domain`：实时战斗纯函数与版本化存档。
- `src/ui`：HUD、目标、对话、设置与操作说明。

## 流畅度与防卡死

- 重复铺装、窗格、栏杆与灯具使用实例化；静态建筑和刚性角色按材质/顶点色批处理。
- 关闭动态阴影和后处理；自动画质依据持续 P95 帧耗时调整像素比。
- 无法识别 GPU 名称但检测到持续慢帧时，会自动切换轻量铺地、简化网格与 Lambert 光照材质。
- 六名新增广场群众按近景/远景分组合批；软件渲染时自动隐藏远景组并保留近景职业差异。
- 玩家使用固定圆柱近似体、水平子步进与墙角滑动；低帧率疾跑、闪避不会一步穿墙。
- 视角飞行使用三维子步进、建筑碰撞、22 米高度上限与耐力消耗；松开飞行组合键后耐力恢复。
- 玩家可经南侧祝福台阶跳入圣水池，池内落脚面会持续恢复生命。
- 第三人称相机遇到实体会回缩；第一人称隐藏主角身体。
- 越界、坠落、非有限坐标或实体重叠会回到当前章节安全点。
- 自动测试覆盖所有剧情检查点、交互安全环、敌人出生点、低帧率薄墙、硬墙角和 `600+` 条确定性障碍扫掠路线。

## 存档

进度只保存在当前浏览器，不上传服务器：

- IndexedDB `current` / `backup` 原子更新；
- 同步紧急日志保护“保存后立刻刷新”的最新进度；
- schema、内容版本与完整性校验；
- 坏主档自动恢复，双档损坏时阻止覆盖并提供确认重置；
- Web Locks 保证同一来源只有一个写入标签页，并处理刚关闭标签页的接管竞态。

清除站点数据会永久删除本地进度。

## 文档

- [世界观 v0.3](docs/HOLY_SHIFT_WORLD_BIBLE_V0.3.md)
- [第一章实现基线 v0.3](docs/HOLY_SHIFT_IMPLEMENTATION_V0.3.md)
- [候选发布验证](docs/RELEASE_VALIDATION_2026-07-27.md)
- [第三方许可](THIRD_PARTY_NOTICES.md)

旧版世界观、回合制产品定位与旧 Gate 草案仅保留为历史记录，不再构成当前实现要求。
