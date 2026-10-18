# 贡献指南 / Contributing

感谢你帮助改进 CineBox。问题报告、可复现的修复和附有可靠来源的器材资料都很有价值。项目当前使用中文界面，Issue 和 Pull Request 可以使用中文或英文。

## 中文

### 报告问题

提交 Issue 时，请说明操作步骤、预期行为、实际结果、应用版本、浏览器和屏幕尺寸。涉及导入时，提供能够复现问题的最小示例；先移除联系人、联系方式、未公开项目名称和其他敏感内容。请不要公开上传完整个人项目备份或访问凭据。

器材资料问题请提供器材稳定 ID、当前名称、建议修正和来源链接。优先使用厂商技术页及原厂手册，标明适用型号、代际、配置和核对日期。供应商清单可以证明库存描述，不能替代厂商能力说明。

### 开发与提交

1. Fork 仓库并创建描述清楚的分支。
2. 使用 Node.js 22.13 或更高版本（建议 24）及 pnpm 11.9.0，运行 `pnpm install --frozen-lockfile`、`pnpm dev`。
3. 将一个 PR 聚焦在一个清晰的问题上。说明修改后的行为及验证方式；界面变更请附桌面和手机截图。
4. 提交前运行相关检查，报告实际结果以及尚未解决的失败。

```bash
pnpm test
pnpm lint
pnpm run catalog:check
pnpm run catalog:cards:check
```

`pnpm test` 已包含生产构建。单独检查构建时可运行 `pnpm build`。`pnpm run catalog:cards:complete` 是全库三项指标的严格完整性检查；V6 当前有 801 条已记录缺口，不能将它描述为已通过。

### 器材目录变更

先阅读 [AGENTS.md](AGENTS.md) 和 [器材库命名规范](docs/catalog-naming-policy.md)。修改维护脚本与 `data/catalog/` 中对应依据，再运行 `pnpm run catalog:build`；不要手工覆盖生成目录。

保留不同焦段、卡口、代际、光圈、尺寸和改装配置。修改显示名称时保留旧名与搜索别名；涉及身份合并或拆分时保留旧 ID 映射，并验证旧项目恢复、数量、备注和导出。新选材使用 `publishedEquipment`，完整 `canonicalEquipment` 用于旧项目恢复。

未确认的指标保留空白，不从型号数字猜测功率、尺寸或承重。系列参考须记录 `scope: "series"`、`seriesLabel` 及适用范围，不把特定型号能力推广到所有系列或库存实物。提交前保留来源与缺口说明。

### 许可与资料

提交内容应当是你有权贡献的代码或资料，并与项目的 [MIT 许可证](LICENSE) 相容。第三方商标、图片及引用内容遵循 [第三方声明](THIRD_PARTY_NOTICES.md) 和各自权利要求；请在 PR 中说明新增第三方内容的来源与许可。

## English

### Report an issue

Include reproduction steps, expected and actual behavior, application version, browser, and screen size. For import issues, share a minimal example after removing contact details, unpublished project names, and other sensitive content. Avoid publishing full personal backups or credentials.

For catalog corrections, include the stable equipment ID, current name, proposed correction, and source links. Prefer manufacturer technical pages and original manuals, and record the applicable model, generation, configuration, and review date. Supplier lists can support inventory descriptions but do not establish manufacturer specifications.

### Develop and submit

1. Fork the repository and create a descriptive branch.
2. Use Node.js 22.13 or later (24 recommended) and pnpm 11.9.0; run `pnpm install --frozen-lockfile` and `pnpm dev`.
3. Keep each pull request focused on a clear problem. Explain the resulting behavior and validation. Include desktop and mobile screenshots for UI changes.
4. Run the relevant checks and report their actual results, including unresolved failures.

```bash
pnpm test
pnpm lint
pnpm run catalog:check
pnpm run catalog:cards:check
```

`pnpm test` includes the production build; use `pnpm build` to check the build separately. `pnpm run catalog:cards:complete` requires three specifications for every selectable entry. V6 has 801 documented gaps, so this stricter check must not be reported as passing.

### Change the catalog

Read [AGENTS.md](AGENTS.md) and the [catalog naming policy](docs/catalog-naming-policy.md) first. Edit maintained scripts and the relevant inputs under `data/catalog/`, then run `pnpm run catalog:build`. Do not overwrite generated catalog files by hand.

Preserve focal lengths, mounts, generations, apertures, sizes, and modified configurations as distinct equipment identities where appropriate. Retain old names and search aliases when changing display names. Identity merges or splits must preserve old ID mappings and verify project recovery, quantities, notes, and export. Use `publishedEquipment` for new selection and `canonicalEquipment` for old project recovery.

Leave unconfirmed values blank. Do not infer power, dimensions, or load capacity from model numbers. Series references require `scope: "series"`, `seriesLabel`, and an explicit applicability range. Do not apply one model's capabilities to the entire series or unspecified inventory. Retain sources and explanations for gaps.

### License and materials

Only contribute code or materials you have the right to share, under terms compatible with the project's [MIT License](LICENSE). Third-party trademarks, images, and referenced materials follow the [third-party notices](THIRD_PARTY_NOTICES.md) and their respective rights. Describe the source and license of added third-party material in the pull request.
