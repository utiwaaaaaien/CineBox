# 仓库结构 / Repository layout

此目录是 CineBox V6 的公开源码快照，初始版本来自 V6 工作副本。公开仓库从新历史开始，未包含私人开发仓库的旧提交、原始项目文件、依赖目录、构建输出和旧验收截图。

This repository contains the public CineBox V6 source snapshot. Its initial history starts from V6; private development history, original project documents, dependencies, build outputs, and old verification screenshots are not included.

| 位置 / Path | 内容 / Purpose |
| --- | --- |
| `app/`, `public/` | 应用与静态资源 / Application and static assets |
| `data/catalog/` | 器材目录、维护依据与审计 / Catalog inputs and audits |
| `data/catalog-supplements/` | 整理后的供应商补充数据 / Curated supplier supplements |
| `scripts/`, `tests/` | 生成工具与自动检查 / Generation tools and checks |
| `docs/` | 版本、规范与历史开发记录 / Version, policy, and historical development records |
| `worker/`, `build/`, `.openai/` | 托管适配及通用绑定配置 / Hosting integration and generic bindings |
| `.github/` | CI 和社区模板 / CI and community templates |

历史开发记录中引用的旧截图和开发环境属于当时的验证上下文。公开仓库的最新验证结果以 CI 和发布说明为准。

References to older screenshots and environments in development records describe the original verification context. Use CI and release notes for the public snapshot's latest validation results.

`scripts/analyze-history.py` 是可选的本地资料分析工具，普通安装、构建和运行不需要它。使用前需自行提供原始档案，并在独立 Python 环境中安装 `pandas`、`pypdf`、`openpyxl` 和 `xlrd`；Numbers 提取仅为字符串启发式分析。运行 `python scripts/analyze-history.py /path/to/archive`。分析生成的是派生统计，需人工复核；公开提交前检查路径和资料范围。

`scripts/analyze-history.py` is an optional local archive analysis tool and is not required to install, build, or run the app. Supply your own archive and install `pandas`, `pypdf`, `openpyxl`, and `xlrd` in a separate Python environment. Numbers extraction is a string-based heuristic. Run `python scripts/analyze-history.py /path/to/archive`. Review derived statistics, file paths, and publication rights before committing the output.
