# GMAE：项目运行与AI接手

星际雷电手机纵版射击游戏，使用Canvas和Next静态导出，经现有Actions发布到GitHub Pages。

## 仓库身份

- 分类：学习与游戏；类型：node。
- 默认分支：`main`；当前可见性：公开。
- 本说明针对本仓库当前文件；历史本机绝对路径与相似项目不能作为当前运行位置。

## 先读这些文件

- [app/page.tsx](<../app/page.tsx>)
- [app/layout.tsx](<../app/layout.tsx>)
- [next.config.ts](<../next.config.ts>)
- [scripts/serve-static.mjs](<../scripts/serve-static.mjs>)
- [.github/workflows/pages.yml](<../.github/workflows/pages.yml>)

## 安装和启动

应用目录：`.`。Node要求：`>=22.13.0`。

```powershell
npm ci
npm run dev
```


| 清单 | 可用脚本（以清单为准） |
| --- | --- |
| `package.json` | `dev`、`build`、`start`、`test`、`lint`、`db:generate` |

## 配置名称

从源码及示例提取到的环境变量名称：

`CODEX_SANDBOX`、`GITHUB_ACTIONS`、`GITHUB_REPOSITORY`、`MINIFLARE_REGISTRY_PATH`、`PORT`、`WRANGLER_LOG_PATH`、`WRANGLER_WRITE_LOGS`。

这些只是名称，不是已配置的值；有些是工具或部署变量，并非全部必填。优先读.env.example及引用处，不把真实密钥写进源码或提交。

## 数据与搬迁

游戏在浏览器运行，音效和本地记录由页面管理。仓库保留原有GMAE名称和Pages路径。

## 怎么验证

先执行 [验证记录](VERIFICATION.md) 所列命令，再按改动检查实际页面或输出。没有测试脚本时不能把占位npm test当作通过。仅文档更改检查链接和路径；涉及数据、几何、金额或接口的修改运行相应回归测试。

- 默认dev/build/start已与Next静态导出统一；旧Vinext静态构建在本次Windows Node24环境退出时崩溃，不再作为默认构建。
- Pages使用GITHUB_ACTIONS/GITHUB_REPOSITORY生成basePath；本机默认根路径，发布后需检查JS资源实际加载。

## 继续维护

先读根目录AGENTS.md；若它是CLAUDE.md的链接则直接读后者。保留已有项目约定。修改前确认分支、当前差异、数据目录与实际服务。完成后更新本说明/验证记录，提交明确的源码和文档路径，并核对GitHub远端提交。公开状态、旧版、URL与业务数据需按用户既有约定保持。
