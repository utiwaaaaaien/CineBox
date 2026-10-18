# V5 器材库整理与发布报告

日期：2026-10-07。按用户补充的边界：型号明确的小规格冲突按官方资料纠正，具体库存配置继续保留；只有无法形成可用选材描述的笼统名称移出新入口。现有 Sites 项目使用随版本发布的静态目录，未启用 D1 业务数据库。

## 当前结果

| 项目 | 数量 |
| --- | ---: |
| 冻结的原始记录 | 2,043 |
| 从错误合并中恢复的记录 | 31 |
| 本轮新增最新系列及拆分恢复记录 | 27 |
| 处理前记录总数 | 2,101 |
| 同型号同规格合并记录 | 88 |
| 保留完整身份与旧项目解析的规范记录 | 2,013 |
| 新选材入口的可选记录 | 2,001 |
| 其中：有厂商型号依据 | 558 |
| 其中：有厂商系列依据、具体库存配置保留 | 108 |
| 其中：有具体库存型号或可用规格、官方证据仍需补充 | 822 |
| 其中：通用功能器材 | 455 |
| 其中：按用户确认保留品牌泛称或特殊名称 | 58 |
| 实际移出新入口的笼统灯具 | 4 |
| 由最新型号或拆分项提供新选项的旧记录 | 8 |

此前 707 条可选、1,297 条归档的边界过于保守，已被本次结果替代。1,297 是当时全部未开放记录的数量，包含待核验、缺少配置、通用用品和规格冲突，不能全部称为“规格冲突”。

`published` 与 `verified` 分开：具体库存型号、镜头组、滤镜、改装配置及用户确认保留的泛称可以用于选材，但不因此标成厂商核验通过。558 条型号有官方依据，其余条目的核验状态和未确认字段继续保存在审核档案中。本报告不声称所有 2,001 条及其所有参数均已获厂商确认。

## 小规格冲突的处理

确认品牌、系列、焦段或完整型号对应同一产品后，按厂商规格纠正光圈、压缩比、尺寸等错误。105 条规范记录保留了本轮修正历史，其中也包括滤镜系列与尺寸写法整理；这不等同于 105 条独立光圈错误。每条修正的原名、结果和官方依据见 `data-quality-audit.json` 的 `specificationCorrections`。

| 原记录 | 纠正后保留 | 官方依据 |
| --- | --- | --- |
| ARRI Master Anamorphic 2×180mm T1.9 | 2×180mm T2.8 | [ARRI 公告](https://www.arri.com/en/company/press/press-releases-2016/arri-zeiss-unveil-two-new-master-anamorphic-lenses) |
| SIGMA 14mm T1.5 | FF High Speed Prime 14mm T2 | [SIGMA 规格表](https://www.sigma-global.com/en/support/download/FF%20High%20Speed%20Prime%20Line.pdf) |
| ZEISS Supreme Prime 200mm T2.1 | 200mm T2.2 | [ZEISS 产品页](https://www.zeiss.com/photonics-and-optics/en/cinematography/lenses/supreme-prime-lenses.html) |
| Cooke Anamorphic/i FF 2×100mm T2.3 | 1.8×100mm T2.3 | [Cooke 中文产品页](https://cookeoptics.cn/lens/anamorphic-i-ff/) |
| Canon CN-E 50mm/85mm T1.5 FP X | 50mm/85mm T1.3 FP X | [Canon 产品手册](https://downloads.canon.com/cinemaeos/CinemaLenses_Brochure_190322.pdf) |

上述记录均恢复可选，错误旧称保留为搜索别名。不能把不同代际、卡口或改装版本套用成另一款产品；没有证据的配置沿用具体库存信息，并保留说明。

追查了“御2pro”“御3pro”“大疆摇轮”和 Dana Dolly 等库存简称。Mavic 2 Pro、Mavic 3 Pro 与 Master Wheels 按厂商型号恢复；Dana Dolly 恢复为滑轨，未补造原始记录没有的套餐配置。Tiffen 与 Schneider 滤镜按官方系列整理，库存强度、尺寸及套组组合继续保留，未把整组租赁配置称为厂商已验证套餐。

## 移出边界

先追查别名、昵称、旧型号和拼写。搜索线索保存在 `data/catalog/review-searches.json`；没有搜索结果不等于产品不存在。

按用户最新确认，品牌没有明确系列的条目保留原名，例如索尼大监视器、SmallHD 小监视器。Lensbaby、万花筒滤镜、炫光孔雀镜保留原名；通用采集卡、章鱼时码器及现场辅助用品恢复可选。原先移出的 90 条中，78 条恢复，8 条由明确型号或拆分记录提供新选项，4 条笼统灯具排除：RGB 棒灯、LED 布灯、双色温 LED 机头灯、锐鹰 RGB 大布灯。南光有长度规格的灯管及锐鹰 18TD 保留。通用器材的功能、库存尺寸、单位和成本档位不属于厂商实测数据。

| 原系列泛称 | 本次核对的选材型号 | 官方依据 |
| --- | --- | --- |
| DJI Mavic 御系列 | Mavic 4 Pro | [DJI 中文产品页](https://store.dji.com/cn/product/dji-mavic-4-pro?set_region=CN) |
| DJI Osmo Action | Osmo Action 6 | [DJI 中文产品页](https://store.dji.com/cn/product/osmo-action-6?from=events-2026-0923-sale-cn) |
| DJI Osmo Pocket | Osmo Pocket 4P | [DJI 中文产品页](https://store.dji.com/cn/product/osmo-pocket-4p?set_region=CN) |
| DJI RS 系列 | RS 5 | [DJI 中文产品页](https://store.dji.com/cn/product/dji-rs-5?from=store_homepage) |
| 老蛙探针 | 第四代 MACRO PROBE ZOOM，15–24mm T8 1.6× Macro、15–35mm T12 2.3× Macro | [老蛙官方探针目录](https://laowacine.com.cn/En/Index/listView/catid/15.html?ccid=7&cfid=&scid=) |

上述最新型号按 2026-10-07 官方资料快照新增，旧项目的系列泛称不自动变更型号。老蛙倍率表示微距放大倍率，不是变形压缩比；旧 24mm 探针代际继续分别保留。

ARRI MP、SP、UP 分别补齐为 Master Prime、Signature Prime、Ultra Prime。MP 百微恢复到已有 Master Macro 100mm T2，避免混入 MP 镜头组。APUTURE LED 下的 B7c 8 灯套装、MC 12 灯套装分别恢复；Tiffen 滤镜别名、MOVMAX 滑轨与吸盘分别保留，错误归到 HOWMOCO 下的其他品牌伸缩炮别名恢复为独立库存记录，未把这些库存昵称标为厂商已核验。

## 命名、去重与旧项目

第一行按“中文品牌名 + 英文品牌名 + 系列 + 型号及规格”排列。中文官方资料优先，没有可确认中文名时使用官方英文。第二行使用英文型号或功能描述；无法确认的品牌或昵称不编造官方译名。

仅合并分类、品牌、单位及完整规范名称一致的记录。不同焦段、卡口、代际、尺寸、密度、改装版本和套组分别保留；已定位同一产品的规格错写先纠正，再判定是否重复。

原始记录、恢复项及合并项的旧 ID 均可解析。旧项目保留数量、备注和人工决定，合并时合计数量并保留备注；状态冲突改为待确认。移出新入口的记录仍能恢复到旧项目和备份。

## 界面和验证

器材行左侧图标，中央两项名称字段，右侧匹配系列与加入按钮；名称下方不再附分类、单位或审核解释。品牌型号筛选依据品牌身份，不再误排除尚缺型号级证据的具体库存记录。

目录生成一致性、生产构建及 65 项回归测试通过，覆盖官方规格修正、去重后的数量与备注迁移、卡口区别、最新系列的旧项目身份保护、原名保留、灯具排除、混合别名恢复、推荐、撤销重做、旧项目、系统附件及 Excel 重新读取。

本地浏览器以旧称“200mm T2.1”找到修正后的 ZEISS Supreme Prime 200mm T2.2，加入成功且撤销后数量回到零；Nauticam 潜水壳在“品牌型号”筛选下仍可选。中央只显示两项名称字段。

旧版本截图未包含于公开源码快照。 / Historical verification screenshots are not included in this public source snapshot.

ESLint 为 0 错误，保留品牌 `<img>` 的性能提示。全仓 TypeScript 仍有此前已在隔离 V4.1 快照复核的库存数组推断、PDF `destroy` 属性与 Cloudflare worker/D1 类型声明问题。详细审核资料随目录打包使客户端包偏大，后续可按需加载。

## 维护入口

- `docs/catalog-naming-policy.md`：命名、证据、去重与发布规范。
- `scripts/catalog-naming.mjs`：基础命名与去重。
- `scripts/catalog-release-review.mjs`：官方型号、系列规格表与别名依据。
- `scripts/catalog-publication-policy.mjs`：小规格修正与可用名称准入。
- `scripts/catalog-editorial-review.mjs`、`data/catalog/editorial-decisions.json`：用户确认例外、最新系列对应和拆分理由。
- `data/catalog/catalog-additions.json`：后续新增入口，V4 库存保持冻结。
- `data/catalog/equipment.v5.json`：完整规范目录与旧 ID 映射。
- `data/catalog/published.v5.json`：当前可选目录。
- `data-quality-audit.json`：修正、合并、可选依据和移出记录。

> 本文提及的旧验收截图未包含于公开源码快照。 / Historical verification screenshots referenced here are not included in this public source snapshot.
