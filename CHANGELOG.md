# 版本记录 / Changelog

面向使用者的版本记录。界面版本由 `app/release.ts` 管理；器材底层目录保留自己的版本与身份兼容规则。

User-facing release notes. `app/release.ts` defines the application version; the underlying catalog keeps its own version and identity compatibility rules.

## V6.2 — 2026-11-13

- 乱序搜索器材品牌、型号和焦段，按焦段数字升序浏览镜头。
- 在品牌筛选上方查看已选类别进度，从底部浮栏预览器材单。
- 支持 PDF、DOCX、PNG、XLSX 导出。

- Search equipment by brand, model, and focal length in any order, and browse lenses in ascending focal length.
- Track selected categories above the brand filters and preview the kit from the selection bar.
- Export as PDF, DOCX, PNG, or XLSX.

## V6.1 审查修复 / Review fixes — 2026-11-05

- 修复 JSON 历史清单中名称与数量关联，保留重复项累加及零数量，拒绝明确非法数量。
- 修复超限备份恢复时的静默裁剪；恢复保留合法器材行和历史档案，新增或合并超容量时明确拒绝且不部分写入。
- 修复联想合并后的长备注恢复，保留备份、自动存档及撤销中的完整备注。
- 更新中英文说明的版本标题和当前目录统计；应用仍为6.1.0，原v6.1.0标签保留首次发布身份。

- Preserve equipment/quantity association in JSON history imports, including duplicate totals and zero quantities; reject explicitly invalid quantities.
- Restore valid kit rows and historical records without silent capacity truncation. Reject additions or backup merges beyond capacity before writing any partial result.
- Preserve long merged notes through restore, backup, autosave and undo.
- Correct version headings and current catalog statistics. Application version remains 6.1.0; the original v6.1.0 tag continues to identify the initial release.

Current fixes / 当前修正：[main 源码](https://github.com/utiwaaaaaien/CineBox/tree/main) · [在线使用 / Live site](https://utiwaaaaaien.github.io/CineBox/)。Release 的 v6.1.0 自动源码下载仍为首次发布版本，未包含后续小修；the automatic v6.1.0 source downloads do not include subsequent maintenance fixes.

## V6.1 小修 / Maintenance update — 2026-11-04

- 自定义器材行保留器材名、数量、单位和备注，移除独立品牌输入。
- 器材名联想每次最多显示5项，候选列表与输入框同宽。
- 应用版本保持6.1.0，本次修正通过main和GitHub Pages更新，保留原v6.1.0标签。

- Custom rows contain equipment name, quantity, unit and notes, with no separate brand input.
- Equipment name suggestions show up to five items and match the input width.
- Application version remains 6.1.0. The correction is published through main and GitHub Pages while preserving the original v6.1.0 tag.

## V6.1 — 2026-11-04

- 自定义器材可直接填写；器材单各分类可新增空白行，随项目保存，导出自动跳过未填写名称的行。
- 已加入器材再次点击可取消，当前项目器材单入口持续显示有效条目数量。
- 保留即时保存，新增每分钟本机快照及恢复入口；上传和导入显示处理状态。
- 改进上传清单的代际、配置与数量识别；身份不明确时保留待核对，避免猜测。
- 移动器材新增39项，录音器材新增27项，保留云台、脚架、发射器和套装区别。
- 修复项目容量、备份恢复、撤销标记与数量截断问题；更新文件解析和运行框架依赖。
- 保留GitHub Pages部署、子路径资源与可选Umami配置。项目仍保存在当前浏览器；异地访问需JSON备份迁移。

## English

- Edit custom equipment directly and add draft rows within each kit category. Drafts persist with projects; Excel skips rows without equipment names.
- Click selected equipment again to remove it, with a persistent link showing the current kit's valid item count.
- Add one-minute local snapshots and recovery alongside immediate saving, plus visible upload/import processing states.
- Improve model-generation and quantity matching while keeping ambiguous imports for review.
- Add 39 grip entries and 27 audio entries, preserving component, package and generation boundaries.
- Fix capacity, backup recovery, undo markers and quantity truncation; update parsing and framework dependencies.
- Retain GitHub Pages, project-path assets and optional Umami settings. Project data remains browser-local; use JSON backups to move between origins.

## V6 — 2026-10-18

### 中文

- 重排历史项目卡片：名称优先，器材数、机位和摄影机型号分列，统一预览、上传替换与复用入口，去除重复备注。
- 统一器材卡片名称中的品牌、系列、型号和已确认的行业俗称；名称下方显示最多三项代表性技术指标，移除右侧系列标签。
- 为可归属到明确系列的记录显示系列参考指标，通过悬停说明保留适用范围；未确定的指标留空。
- 总器材库每次从导航打开时默认显示全部；当前项目使用独立底色，统一侧栏宽度。
- 改善手机底栏避让、弹窗隔离与键盘焦点；统一 CineBox 网站名称，更新 Logo、图标尺寸及文字对齐。
- 保留原目录稳定 ID、旧项目恢复及数量、备注和导出行为，V6 无器材身份迁移。

选材入口共 2,084 条记录，完整目录保留 2,099 条身份记录。卡片指标共 4,383 项，1,283 条记录具备三项指标，801 条尚有缺口；其中 240 条记录使用标注范围的系列参考指标，该统计与完整性统计有交集。

本版继续使用浏览器本地保存，无跨设备自动同步。界面仍为中文，Excel 和文字 PDF 导入、Excel 导出及 JSON 备份继续可用；未包含扫描 PDF 的 OCR。

详细依据及原始验证记录见 [V6 开发记录](docs/V6-implementation.md) 和 [V6 界面审查](docs/V6-ui-review.md)。其中完整类型检查的既有问题及严格指标完整性检查的缺口均有记录，不能视为已通过。

### English

- Reorganized historical project cards around project names, equipment count, camera count, camera model, and consistent preview, replace, and reuse actions; removed repetitive notes.
- Standardized equipment names across brands, series, models, and confirmed industry names. Cards show up to three representative specifications below the name and no longer show a separate series badge on the right.
- Added scoped series reference specifications for identifiable series entries, with applicability in hover descriptions. Unconfirmed values remain blank.
- Reset the equipment library to all items when opened from navigation; gave the current project a distinct background and aligned sidebar widths.
- Improved mobile navigation clearance, dialog isolation, and keyboard focus; unified the CineBox name and refined the logo, icon sizes, and wordmark alignment.
- Preserved stable equipment IDs, old project recovery, quantities, notes, and export behavior. V6 does not migrate equipment identities.

The selection catalog contains 2,084 entries; the complete canonical catalog retains 2,099 identity records. There are 4,383 card specifications, with three specifications for 1,283 entries and documented gaps for 801. A total of 240 entries use scoped series references; this count overlaps with completeness counts.

The app continues to save data in the browser without automatic cross-device synchronization. The UI remains Chinese. Excel and text PDF imports, Excel export, and JSON backups remain available; OCR for scanned PDFs is not included.

See the [V6 implementation record](docs/V6-implementation.md) and [UI review](docs/V6-ui-review.md) for sources and the original validation record. Those records also document existing full type-check issues and gaps in the strict specification completeness check; neither should be treated as passing.

## V5.6 — 2026-10-11

### 中文

- 扩展拍摄规格选项，支持自定义分辨率、画幅比和帧率。
- 新建项目先填写信息再选器材；复用历史项目后直接打开新项目器材单。
- 支持从 Excel、文字 PDF 创建历史项目，并在预览核对后保存。
- 支持一键补齐配套项，简化 Excel 导出，直接显示项目卡片操作。

### English

- Expanded shooting specification choices, including custom resolutions, aspect ratios, and frame rates.
- Added a project information step before equipment selection; reusing a historical project opens the new project's kit directly.
- Added historical project creation from Excel and text PDFs, with review before saving.
- Added completion of supporting items, simplified Excel exports, and made project card actions directly visible.
