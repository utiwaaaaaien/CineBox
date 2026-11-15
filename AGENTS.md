# CineBox 器材库维护

修改器材库前阅读 `docs/catalog-naming-policy.md`。V5 起，显示名称使用“中文品牌名 + 英文品牌名 + 官方系列名称 + 型号及完整规格”，中文官方资料优先，缺少依据的条目标为待核验。

库存表、供应商清单和历史项目仅作为库存与原始规格证据。保留不同焦段、卡口、代际、光圈、尺寸、密度及改装配置；只合并可以确认的同型号同规格器材。

维护 `scripts/catalog-naming.mjs`、`scripts/catalog-release-review.mjs` 与 `scripts/catalog-publication-policy.mjs` 中的命名、规格修正及发布依据，以及 `data/catalog/catalog-additions.json` 中的新增记录，再执行 `pnpm run catalog:build`。不要直接编辑生成的规范目录或从 Excel 名称覆盖规范名称。V4 库存快照保留用于追溯。

V5.1复核入口为 `data/catalog/review.v5.1.json` 与 `data/catalog/catalog-additions.v5.1.json`，由 `scripts/catalog-final-review.mjs` 应用。发布版本来自 `data/catalog/release-metadata.json`。未上市产品不进入数据库，新增官方型号不代表供应商已有库存；品牌首页不能升级为型号依据。字段修正保留旧名，混合配置拆分保留旧项目身份。

器材身份变更必须保留旧 ID 映射，并验证项目恢复、数量和备注迁移、规格差异及导出。提交前执行 `pnpm run catalog:check` 和 `pnpm test`。

新选材仅使用 `publishedEquipment`；完整 `canonicalEquipment` 用于旧项目恢复。型号和系列明确的小规格冲突按官方资料纠正后保留；具体库存配置及用途明确的通用用品可选，但不冒充厂商已核验。只有无法确定身份或用途的笼统名称移出新入口。`published` 与 `verified` 分别维护。

用户确认的保留例外与最新系列选择见 `scripts/catalog-editorial-review.mjs` 和 `data/catalog/editorial-decisions.json`：品牌无明确系列保留原名，特殊器材与辅助功能用品保留，笼统无型号灯具排除。最新系列型号使用新 ID，不重写旧项目的未指定型号记录；保留 `replacementIds` 与审核理由。

V6.3 专项数据维护入口是 `data/catalog/accessories-v6.3.json`、`data/catalog/ying-ding-v6.3.json`、`data/catalog/classification-v6.3.json`。通过 `scripts/catalog-v63.mjs` 生成目录、卡片及分类审计。供应商参数表按页记录出处；多个可选接口不能推断为当前装机接口。跨类重复只按已审核的完整身份映射合并。
