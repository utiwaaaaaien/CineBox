<p align="center"><img src="public/brand/cinebox-logo-v2-128.png" width="96" height="96" alt="CineBox" /></p>

# CineBox V6.5.1

**摄影器材 · 项目工作台**

CineBox 帮助摄影团队整理拍摄需求、复用历史项目、挑选器材并导出清单。把项目排期、拍摄规格和器材配置放在同一个工作台，方便筹备时逐项核对。

[在线使用](https://utiwaaaaaien.github.io/CineBox/) · [English](README.en.md) · [版本记录](CHANGELOG.md) · [参与贡献](CONTRIBUTING.md) · [MIT 许可证](LICENSE)

![Version V6.5.1](https://img.shields.io/badge/version-V6.5.1-176b5b) ![License MIT](https://img.shields.io/badge/license-MIT-blue)

V6.5.1 统一品牌和系列选择器，精简器材单，并调整展开与确认反馈。详见[本次发布说明](docs/releases/v6.5.1.md)。

## 开始使用

1. 从「项目管理」新建项目，填写排期和拍摄规格。也可从「历史项目」复用一套配置。
2. 用搜索、品牌或系列选择器挑选器材，按需补充库外器材。
3. 打开器材单核对数量、备注和配套，再确认并导出。迁移完整项目时请选择 JSON 备份。

## 主要功能

- **项目管理**：记录项目名称、排期、拍摄天数、机位、分辨率、画幅比和帧率，支持自定义拍摄规格。
- **历史项目复用**：预览内置真实项目的配置，复用为新项目；也可导入 Excel 或文字 PDF，经预览确认后生成历史项目。
- **器材选材**：按品类、品牌和系列浏览，支持中文名称、英文型号及别名搜索；已确认的技术指标显示在卡片中。
- **清单调整**：修改数量与备注，添加库外器材，检查配套项目并补齐，支持撤销与重做。
- **导出与备份**：将器材单导出为 PDF、DOCX、PNG 或 XLSX。器材单底部可导出单个项目的 JSON 备份，项目管理可备份全部项目和自定义历史资料。
- **桌面与手机**：适配不同屏幕，提供浅色与深色主题。

应用当前使用**中文界面**。英文 README 用于介绍项目，应用尚未提供完整英文界面。

## V6 更新

V6 重新整理了历史项目卡片的信息顺序与操作入口，器材卡片统一品牌、系列、型号和已确认的行业俗称，名称下方显示最多三项代表性技术指标。同时调整了当前项目区、侧栏、手机底栏、弹窗焦点及 CineBox 品牌图标。

可归属到明确系列的泛称可以显示系列参考指标，悬停说明中提供适用范围；无法确认的指标留空。完整说明见 [V6 开发记录](docs/V6-implementation.md) 和 [V6 界面审查](docs/V6-ui-review.md)。

## 数据存储与公开范围

**新建项目和用户导入、修改的历史项目保存在当前浏览器的 `localStorage` 中。** 当前没有启用云端数据库，也没有账号间或设备间自动同步。项目内容不会因使用本应用而自动提交到 GitHub 仓库。

浏览器存储按来源隔离：协议、域名或端口变化后，网站不能直接读取原地址下的数据。换浏览器、换设备、清除网站数据或在临时浏览环境中使用，都可能无法找回原有项目。迁移或清理前请先导出 **JSON 项目备份**，在新环境中导入；Excel 导出用于交付清单，不能代替完整项目备份。

公开仓库包含器材目录及经过整理的**真实历史项目资料**，访问者可以查看和下载这些内容。原始 Excel、PDF 及本地源资料目录不包含在本仓库中。请在提交 Issue、PR 或备份示例前检查其中的联系人、联系方式和未公开项目信息。

导入文件在浏览器内解析。PDF 导入要求文件包含可提取文字；扫描件和图片 PDF 需要先在其他工具中完成 OCR。导入后仍需核对名称匹配、数量和备注。

## 器材数据的边界

详见 [V6.3 专项数据与分类审查](docs/V6.3-catalog-review.md)。V6.3 选材入口包含 **2,306 条器材记录**；底层规范目录保留 **2,321 条完整身份记录**，用于恢复旧项目及兼容旧 ID。这两个数字反映不同用途。

本版记录 4,572 项卡片技术指标，1,346 条器材具备三项指标，**804 条尚未达到三项完整指标**。240 条使用标注适用范围的系列参考指标，该统计与完整条目数有交集。未确定的指标在界面留空，来源与缺口原因保存在 `data/catalog/card-specs-v6-*.json` 及审计文件中。

目录汇总厂商资料、原始库存配置及明确用途的通用品，发布状态与厂商核验状态分别维护。它不是实时库存、报价或租赁可得性服务；系列参数也不代表未指定型号或代际的实物具备相同能力。实际拍摄前请结合具体配置、录制模式及供应商确认。

维护依据见 [器材库命名规范](docs/catalog-naming-policy.md)、[V5.1 目录复核](docs/V5.1-catalog-review.md) 和 [V6 指标覆盖](docs/V6-implementation.md)。

## 本地运行

需要 Node.js **22.13 或更高版本**，建议使用 Node.js 24；包管理器为 **pnpm 11.9.0**。先确保本机可以运行对应版本的 `pnpm`。如果使用 Corepack，可根据自己的 Node.js 安装方式启用；本项目不要求修改全局环境。

```bash
git clone https://github.com/utiwaaaaaien/CineBox.git
cd CineBox
pnpm install --frozen-lockfile
pnpm dev
```

访问终端输出的本地地址。生产构建及本地预览：

```bash
pnpm build
pnpm start
```

## 验证与目录维护

| 命令 | 用途 |
| --- | --- |
| `pnpm test` | 先构建，再运行 `tests/` 中的自动测试 |
| `pnpm lint` | 运行 ESLint |
| `pnpm run catalog:check` | 检查规范目录与生成依据是否一致 |
| `pnpm run catalog:cards:check` | 检查 V6 指标生成结果和研究状态，允许有记录的真实缺口 |
| `pnpm run catalog:cards:complete` | 严格检查全部选材项是否具备三项指标；当前会报告 804 条缺口 |
| `pnpm run catalog:build` | 修改维护依据后重新生成规范目录及审计记录 |

不要直接修改生成的目录文件。涉及器材身份的变更须保留旧 ID 映射，并检查旧项目恢复、数量、备注和导出，具体要求见 [AGENTS.md](AGENTS.md)。

## 技术与部署

项目使用 TypeScript、React 19、Next.js 16 的应用接口、[vinext](https://github.com/cloudflare/vinext)、Vite 8 和 Tailwind CSS 4，包含 Cloudflare Workers 入口与构建配置。Excel 导入使用 SheetJS，Excel 导出使用 `write-excel-file`，文字 PDF 解析使用 PDF.js。

公开站点通过 GitHub Actions 自动构建并发布到 [GitHub Pages](https://utiwaaaaaien.github.io/CineBox/)。`pnpm run build:pages` 输出可静态托管的 `dist/client/`，并检查项目子路径、资源、PDF Worker 与统计配置。默认使用 `/CineBox/` 子路径；独立域名可使用空的 `NEXT_PUBLIC_BASE_PATH`。详见 [部署与访问统计](docs/github-pages.md)。

当前 `.openai/hosting.json` 的 D1、R2 绑定均未启用，`db/` 中的数据库脚手架不承担项目保存。GitHub Pages 只托管静态文件；网站项目数据保存在各访问者的浏览器中。

```text
app/             界面、项目逻辑、导入导出与生成目录
public/          图标等静态资源
data/catalog/    器材维护依据、来源与审计记录
scripts/         目录生成和检查工具
tests/           自动测试
docs/            版本、目录规范与审查记录
worker/          Cloudflare Workers 入口
```

## 贡献与许可

欢迎通过 [Issues](https://github.com/utiwaaaaaien/CineBox/issues) 报告问题、补充有来源的器材资料，或提交 Pull Request。请先阅读 [贡献指南](CONTRIBUTING.md)。

本项目的原创代码采用 [MIT 许可证](LICENSE)。第三方依赖、商标、图片及引用资料的权利以各自许可和权利声明为准，详见 [第三方声明](THIRD_PARTY_NOTICES.md)。真实历史项目随公开版本提供，不代表相关品牌或项目方为本项目背书。
