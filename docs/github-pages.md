# GitHub Pages 与 Umami / GitHub Pages and Umami

公开地址：[https://utiwaaaaaien.github.io/CineBox/](https://utiwaaaaaien.github.io/CineBox/)。

## 构建与部署 / Build and deploy

仓库的 Settings → Pages → Source 选择 GitHub Actions。推送到 `main` 后，`.github/workflows/pages.yml` 会安装锁定依赖，执行目录检查、生产构建、自动测试、类型检查和 lint，再执行 `pnpm run build:pages` 并部署 `dist/client/`。Pull Request 不会自动部署到正式站点。

Choose GitHub Actions under Settings → Pages → Source. A push to `main` runs `.github/workflows/pages.yml`: locked dependencies, catalog checks, production build, tests, type checking, lint, static Pages build, then deployment of `dist/client/`. Pull requests do not deploy to production.

Pages 仅接收静态文件，不需要运行 Cloudflare Worker、数据库或 Node.js 服务。静态构建保留完整的客户端交互、浏览器存储及文件导入导出。原有 `pnpm build` / `pnpm start` 仍用于服务端构建与预览。

Pages receives static files and needs no running Cloudflare Worker, database, or Node.js service. The static build retains browser interactions, local storage, and file import/export. `pnpm build` / `pnpm start` build and preview the server version.

本地生成静态版本：

```bash
pnpm run build:pages
```

| 环境变量 / Variable | 默认值 / Default | 用途 / Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_BASE_PATH` | `/CineBox` | 项目子路径，无末尾斜杠；独立域名可设为空 / Project base path without a trailing slash; empty for a custom domain |
| `NEXT_PUBLIC_SITE_URL` | `https://utiwaaaaaien.github.io/CineBox/` | 分享元数据与统计域名 / Metadata and analytics hostname |

正式工作流从 `actions/configure-pages` 的输出读取这两个值。静态构建会核对首页、样式和脚本资源、图标、PDF Worker 及 Umami 配置，缺少资源时阻止发布。

The workflow reads both values from `actions/configure-pages`. The static builder verifies the home page, CSS/JS assets, icons, PDF worker, and Umami settings, and stops deployment when required resources are missing.

当前锁定的 vinext 0.0.50 导出器对带 `basePath` 的应用仍请求 `/`，因此构建脚本在构建时通过相同应用处理器渲染实际子路径，再使用 vinext 自带的 RSC 提取函数保存完整 HTML 和 hydration 数据。这个处理只发生在构建阶段。升级 vinext 时应重新检查该行为和静态构建结果。

The pinned vinext 0.0.50 exporter requests `/` even with a configured `basePath`. At build time, the script renders the actual project URL through the same application handler and uses vinext's RSC extraction function to save complete HTML and hydration data. No server runs on Pages. Recheck this behavior and the static build when upgrading vinext.

## Umami

跟踪代码的公开配置存放在 `config/analytics.json`，由网站跟踪脚本 URL 和 Website ID 组成。Account ID 不是 Website ID。两项均为空时不加载统计脚本；启用后只在 Pages 构建中加载一次，且限制到部署域名。这里不保存 Umami 密码或 API 密钥。

Public tracker settings live in `config/analytics.json`: the script URL and Website ID. The Account ID is not a Website ID. With both values empty, no tracker is loaded. When configured, it loads once in the Pages build and is restricted to the deployment hostname. No Umami password or API key belongs in this file.

统计脚本排除 URL 查询参数和 hash。应用不将项目名称、联系人、器材清单、导入文件内容或浏览器项目存储作为事件参数发送。静态页面的访问可在 Umami 的 Pages 中按 `/CineBox/` 路径筛选；同一条 Umami 记录接入多个站点时，默认总览会合并它们的访问。

The tracker excludes URL queries and hashes. The app does not send project names, contacts, kits, imported file contents, or browser project storage as event parameters. Filter Pages by `/CineBox/` in Umami to inspect this site's visits. If multiple sites share one Website ID, the default overview combines their visits.

## 数据迁移 / Data migration

`localStorage` 按协议、域名和端口隔离。原站点与 GitHub Pages 地址不同，浏览器不会自动迁移项目。先在原站点导出 JSON 项目备份，再在 GitHub Pages 版本中导入。Excel 器材单不包含完整项目状态，不能替代 JSON 备份。

`localStorage` is isolated by protocol, hostname, and port. The previous site and GitHub Pages have different origins, so project data does not migrate automatically. Export a JSON project backup from the previous site and import it on Pages. An Excel kit does not preserve complete project state and cannot replace a JSON backup.

成功部署后，工作流仅在main且package.version为6.1.0时创建v6.1.0 Release；已存在的Release保持原状。
