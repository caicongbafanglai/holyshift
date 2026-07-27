# Holy Shift 1.0 候选发布验证记录

> 验证日期：`2026-07-27`（Asia/Shanghai）
>
> 分支：`dev`
>
> 候选标识：本文件所在的 `dev` 发布提交；精确 SHA 由 Git 历史、远端分支和 CI 产物名外部记录
>
> 技术状态：`VALIDATED-FOR-DEV-RELEASE`
>
> 治理状态：`NOT-A-FORMAL-GATE-PASS`

## 1. 需求闭环

| 范围 | 候选实现与证据 |
|---|---|
| 3D RPG 探索 | Three.js/WebGL2 程序化低多边形圣岛、紧凑主路径与可选侧路 |
| 双视角 | `V` 即时切换第一/第三人称；第三人称相机射线缩距，第一人称隐藏角色身体 |
| 移动与防卡死 | 圆柱近似体、水平子步进、轴向滑动、地面/坡度/台阶约束、跳跃缓冲、坠落与非法重叠自动复位 |
| RPG 主线 | 任务、两场普通战、两次装备选择、一次成长选择、Boss、可选精英与结局世界变化 |
| 战斗 | 可见敌人意图、攻击/防御/圣术、信仰资源、确定性结算；8 种合法配装均有策略通路 |
| 存档 | IndexedDB 主档/备份原子事务、校验和、版本迁移、坏档隔离恢复、战斗/奖励/结局检查点、Web Locks 单写者 |
| 操作说明 | 常驻可收起键位卡；`1280×720` 和 `640×360` 自动布局，不覆盖准星、任务与关键操作 |
| 音频与设置 | 原创程序化 WebAudio、静音、降低动态效果、自动/高/低画质 |

需求基线为 `docs/HOLY_SHIFT_WEB_RPG_POSITIONING.md` v2.1，3D 范围授权为 `docs/HOLY_SHIFT_3D_SCOPE_OVERRIDE.md`。

## 2. 自动化结果

验证环境：Linux `6.8.0-101-generic` x86_64、Node.js `22.22.2`、npm `10.9.7`、Playwright `1.62.0`。

| 层级 | 结果 |
|---|---:|
| TypeScript `tsc --noEmit` | 通过 |
| ESLint | 通过 |
| Vitest | `38/38` 通过 |
| Chromium `151.0.7922.34` E2E | `8/8` 通过 |
| WebKit `26.5` E2E | `8/8` 通过 |
| Firefox `153.0` E2E | `8/8` 通过 |
| Chromium 软件渲染性能重复测试 | 连续 `3/3` 通过 |
| WebKit 性能重复测试 | 连续 `3/3` 通过 |
| `npm audit --audit-level=moderate` | `0` 个已知漏洞 |

三引擎 E2E 均覆盖完整主线/支线与结局、窄屏布局、性能预算、多标签页互斥、战斗刷新、坏档恢复、启动、移动、双视角、暂停和安全复位。Firefox 在 Linux CI 类环境使用 Xvfb 有头模式验证 WebGL2；WebKit 以桌面 Safari 引擎和 `deviceScaleFactor: 1` 执行绝对性能门，另以高 DPI WebKit 做功能启动检查。真实 macOS Safari 硬件仍属于正式治理阶段必须补齐的外部证据。

## 3. 碰撞、角落与相机专项

- `tests/collision.test.js` 对所有剧情检查点执行有限值、落地和无实体重叠验证。
- 低帧率薄墙测试验证单帧大位移不会穿墙。
- 墙角斜向持续挤压验证受阻轴停止、可行轴继续滑动。
- 对真实场景障碍执行 `300+` 确定性网格扫掠。
- 对 NPC、三场主战、可选精英和两个奖励点验证存在无碰撞交互环带。
- `tests/camera.test.js` 验证第三人称墙体缩距，以及切换第一/第三人称不改变角色位置。
- 运行时每 `0.5s` 检查越界、悬空和实体重叠；异常时返回当前进度的固定安全检查点。
- 生产包不包含历史调试飞行、方向键升降或 F5 穿模入口。

## 4. 性能与资源预算

- 场景使用静态几何批处理和树木、墓碑、道路接缝、石柱实例化。
- 默认无实时阴影、无后处理、无外部贴图/模型/字体/音频。
- 自动画质从 `0.7` 像素比安全起步；检测到硬件有持续余量后逐级提升，慢帧时逐级下降。
- 首屏场景约 `2,679` 个三角形、`19` 次绘制调用，低于 `10,000 / 100` 的自动化预算。
- 生产构建无 source map；JS gzip 约 `166 kB`，远低于 `2.5 MB` 初始传输预算。
- Chromium 额外验证 JS heap 小于 `128 MB`。

## 5. 安全与数据边界

- 无账号、支付、广告、分析埋点、远端运行时脚本或第三方 CDN。
- 本地 E2E 流程桥同时受回环主机名和 `?e2e=1` 限制，生产域名不可访问。
- 动态文本进入 HTML 前转义；CSP 禁止外部脚本、对象、表单、框架嵌入和 worker。
- GitHub Actions 只授予 `contents: read`，第三方 Action 固定到完整提交 SHA。
- 依赖版本由 `package-lock.json` 锁定，直接依赖许可见 `THIRD_PARTY_NOTICES.md`。

## 6. 公网切换

- 公网入口：`https://qt.fengche.ai/holyshift/`。
- `/holyshift` 返回 `301` 到规范尾斜杠地址，`/holyshift/` 返回 `200`。
- 公网 HTML 与本地 `dist/index.html` 的 SHA-256 均为 `c186c4b22ca153a1b30a9a3f115141f926f3105ecf5139609d6c228793c13d33`。
- 公网引用的哈希资源为 `index-C5FvAL7m.js` 与 `index-uq6j3r7I.css`；JS 响应启用 gzip 和一年 immutable 缓存。
- HTML 启用 CSP、`nosniff`、`DENY` frame、`no-referrer`、Permissions Policy 和同源资源策略。
- HTML 的 `Cache-Control: no-transform` 阻止 Cloudflare 自动注入 Web Analytics；浏览器 DOM 只包含同源游戏脚本。
- 新的缺失资产请求返回 `404` 且不带 immutable；存在的哈希资产返回 `200` 和 immutable。
- Nginx 配置通过 `nginx -t`，重载后服务状态为 `active`；实际可复用片段保存在 `deploy/nginx-holyshift.locations.conf`。
- Chromium、WebKit、Firefox 从公网分别完成打开、新旅程、切换第一人称、暂停、刷新和继续旅程；三者均为 `0` 页面错误、`0` 请求失败。
- 生产域名未暴露 `window.__holyShiftTest`。

## 7. 证据边界

本记录是开发候选的可重复技术验证，不代替治理制度要求的真实负责人、14 席独立评审、预算与设备批准、真实玩家样本、真实 Safari 硬件或正式签字。缺失项继续保持缺失，不倒填为 `PASS`。
