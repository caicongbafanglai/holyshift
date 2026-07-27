# Holy Shift

`Holy Shift（圣痕迁跃）` 是一款面向现代桌面浏览器的简体中文 3D RPG。玩家可在第一人称与第三人称间切换，探索暮光圣岛，并通过可见敌人意图的确定性回合制战斗完成一段完整主线。

生产入口：<https://qt.fengche.ai/holyshift/>

## 操作

| 按键 | 功能 |
|---|---|
| `W A S D` | 移动 |
| 鼠标 / 点击画面 | 观察 / 锁定鼠标 |
| `Shift` | 疾跑 |
| `Space` | 跳跃 |
| `E` | 交互 |
| `V` | 第一 / 第三人称切换 |
| `R` | 返回最近的安全检查点 |
| `M` | 静音 |
| `Esc` | 释放鼠标并打开暂停设置 |
| `1 / 2 / 3` | 战斗中选择攻击 / 防御 / 圣术 |

游戏内右下角也有常驻、可收起的键位说明。视口小于 `640×360` 时会给出明确阻断提示。

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
npm run check
```

- Vitest 覆盖战斗公式、8 种 Boss 配装、剧情字数、存档校验/迁移，以及真实世界碰撞扫掠。
- Playwright 覆盖 3D 启动、移动、双视角、暂停、安全复位、完整主线与支线、IndexedDB 恢复和 Web Locks 多标签页互斥。
- Linux 无界面环境中的 Firefox WebGL2 验证使用虚拟显示器：

```bash
PW_FIREFOX_HEADED=1 xvfb-run -a npx playwright test --project=firefox
```

浏览器测试中的本地流程桥仅在主机名为 `localhost`、`127.0.0.1` 或 `::1` 且 URL 显式带 `?e2e=1` 时创建；生产域名不会暴露该接口。

## 架构与性能

- Three.js WebGL2：程序化低多边形世界，不加载外部贴图、模型、字体或音频资产。
- DOM UI：HUD、任务、对话、奖励、战斗、设置和可访问性播报。
- 确定性领域层：战斗、装备与成长数据和渲染解耦。
- 玩家碰撞：固定圆柱近似体、水平子步进、轴向滑动、地面/坡度/台阶检查和非法位置自动回退。
- 相机碰撞：第三人称射线缩距；第一人称隐藏角色模型。
- 渲染策略：关闭实时阴影与后处理，静态场景批处理、重复装饰实例化；自动画质从流畅优先的安全像素比起步，按持续 p95 帧时间升降清晰度。
- 当前生产构建关键资源 gzip 合计远低于 `2.5 MB` 预算；准确数字以每次 `npm run build` 输出为准。

## 存档模型

存档不上传服务器，只保存在当前浏览器的 IndexedDB：

- schema 与内容版本校验、FNV-1a 完整性校验；
- `current` 与 `backup` 在单个 `readwrite` 事务中更新；
- 坏主档自动从有效备份恢复，双档损坏或未来版本会阻止覆盖并提供诊断/确认重置；
- 战斗前写入 `inBattle` 检查点，刷新后以同一敌人和序列起点重开；
- 奖励与结局使用唯一事件 ID，避免重复结算；
- Web Locks 保证同一来源只有一个主写标签页，关闭后才允许另一标签接管。

清除站点数据会永久删除本地进度。

## 部署与回滚

`.github/workflows/verify-dev.yml` 只在 `dev` 校验并保存经过验证的 `dist/` 构建产物。实际生产入口由 Nginx 的 `/holyshift/` 路径提供静态文件，受审配置片段见 `deploy/nginx-holyshift.locations.conf`。

部署必须：

1. 确认当前分支为 `dev` 且 `npm run check`、目标 E2E 通过。
2. 从同一提交执行 `npm ci && npm run build`。
3. 原子切换 `/holyshift/` 指向该提交构建或同步到版本化发布目录。
4. 执行 `nginx -t`、重载，并从公网 URL 校验 HTML、JS、CSS、缓存头与完整流程。

回滚时把 `/holyshift/` 恢复到上一个版本化构建，执行 `nginx -t && nginx -s reload`，再验证公网入口。不要用开发服务器替代生产静态部署。

需求基线见 [docs/HOLY_SHIFT_WEB_RPG_POSITIONING.md](docs/HOLY_SHIFT_WEB_RPG_POSITIONING.md)，3D 覆盖决定见 [docs/HOLY_SHIFT_3D_SCOPE_OVERRIDE.md](docs/HOLY_SHIFT_3D_SCOPE_OVERRIDE.md)，候选验证见 [docs/RELEASE_VALIDATION_2026-07-27.md](docs/RELEASE_VALIDATION_2026-07-27.md)，第三方许可见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
