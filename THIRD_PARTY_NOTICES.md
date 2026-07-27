# Third-Party Notices

Holy Shift 的游戏场景、几何体、材质、界面、文本与程序化音效均在本仓库中原创生成；运行时不从第三方 CDN 拉取脚本或素材。

## Runtime dependency

| Package | Version | License | Use |
|---|---:|---|---|
| `three` | `0.185.1` | MIT | WebGL2 rendering, math, geometry and scene graph |

## Development dependencies

| Package | Version | License | Use |
|---|---:|---|---|
| `vite` | `8.1.5` | MIT | Development server and production bundling |
| `vitest` | `4.1.10` | MIT | Unit and domain tests |
| `@playwright/test` | `1.62.0` | Apache-2.0 | Browser end-to-end tests |
| `eslint` | `10.8.0` | MIT | Static analysis |
| `typescript` | `7.0.2` | Apache-2.0 | Strict type checking |
| `@types/three` | `0.185.0` | MIT | Three.js type declarations |

Exact transitive dependency versions are frozen by `package-lock.json`. Complete license texts remain available in each installed package and its upstream repository. This notice records direct dependencies and does not replace their license terms.
