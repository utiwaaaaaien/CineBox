# V6.1 移动器材型号补充

核对日期：2026-11-04。两轮共新增 39 个具体型号，移动器材由 311 项增为 350 项（348 项可选）。第一轮新增 15 个型号，第二轮新增 24 个型号，明细如下。保留全部旧项目身份；所有新增型号 `inventoryAvailability: unconfirmed`，不代表供应商有库存。

| 品牌 | 新增型号 | 类型 | 型号依据 |
| --- | --- | --- | --- |
| 图瑞斯 TERIS | TS300CF、TS350CF | 云台脚架套装 | [TERIS 原厂 2021 V3 产品目录（Dedo Weigert Film 托管）](https://www.dedoweigertfilm.de/dwf-wAssets/img/Products/Teris/Teris_product_brochure_2021_V3.pdf) |
| Scorpio（天蝎） | 17′、23′ L、30′+7′、35′、38′、55′、78′ | 伸缩摇臂 | [厂商型号目录](https://scorpio.servicevision.es/en/sales/cranes-and-heads/)；逐条产品页/技术文件链接存于新增记录及指标证据 |
| Sachtler | Video 18 S2、Video 20 S1、aktiv8、aktiv10 | 液压云台（单独云台） | [Video 18 S2](https://www.sachtler.com/en/product/video-18-s2/)、[Video 20 S1](https://www.sachtler.com/en/product/video-20-s1/)、[aktiv8](https://www.sachtler.com/en/product/aktiv8/)、[aktiv10](https://www.sachtler.com/en/product/aktiv10/) |
| GFM | GF-8、GF-9 | 模块化摇臂 | [GF-8 产品页](https://www.gripfactory.com/products/cranes/gf-8)、[GF-9 产品页](https://www.gripfactory.com/products/cranes/gf-9) |

Scorpio 原有 10′、23′、45′ 继续保留。23′ 与 23′ L、30′+7′ 与 38′ 均不合并。GFM 的 GF-8、GF-8 Xten 与 GF-16 是不同配置；本轮新增标准 GF-8 和 GF-9，不将模块化拼装长度当作拍摄过程中可电动伸缩。

第一轮 15 个新增型号均添加三个有依据的技术指标；第二轮的 N6、V12、V12 PLUS 普通记录保留空指标，其余型号依据各自来源填写。承重随臂长或配置变化时，指标明确标明条件。未推测卡口、云台、球碗转接件和供应商附件包。

TERIS 官网本次访问超时，型号依据使用可检索的原厂目录；TS300CF / TS350CF 的指标按该版目录记录。TS350CF-CINE、TS300CF-Q 及国内 V 系列不据销售页名称猜测为相同器材。第二轮进一步检索原厂目录章节后补入N6 PLUS、TS100/120/150系列；国内普通N6/V12以使用单位证据保留待核验身份，见下文。国内普及程度没有可比较的权威销量数据，本轮不宣称这是市场排名。

维护入口为 `data/catalog/catalog-additions.v5.1.json`、`data/catalog/card-specs-v6-grip.json` 与 `data/catalog/motion-v6.1-review.json`；生成结果由 `pnpm run catalog:build` 更新。

Sachtler 单独云台未假定随附脚管；aktiv8 / aktiv10 的额定负荷按重心高 100 mm 条件记录。Video 20 S1 按当前型号页 2–28 kg 记录，不采用早版手册 2–25 kg 规格。

## 第二轮：国内常用身份与轻中型脚架

继续核对后再新增 24 项；两轮共 39 项。移动器材现在为 350 项，其中 348 项可选（原有两项归档身份仍保留）。

| 证据等级 | 新增型号 | 来源与边界 |
| --- | --- | --- |
| 原厂产品目录 | TERIS TS-N6 PLUS（云台）；TS-N6AL PLUS、TS-N6CF PLUS、TS-N6CF-Q PLUS（套装） | [TERIS 2021 V3 原厂目录](https://www.dedoweigertfilm.de/dwf-wAssets/img/Products/Teris/Teris_product_brochure_2021_V3.pdf)可检索到N6 PLUS章节；铝合金、碳纤及快速脚配置分别保存 |
| 原厂产品目录 | TERIS TS100、TS120、TS150（分别为单独云台）；各系列 AL、CF、CF-Q（九个套装） | 同一目录的三个系列章节明确型号、载荷、材质和高度；不与国内V12/V15等名称自动合并 |
| 实际使用单位记录，原厂参数待核验 | TERIS TS-N6、TX-V12（套装，材质不推测） | [国立台湾艺术大学广电系借用规则](https://rtv.ntua.edu.tw/manager_admin/new_file_download.php?Pact=FileDownLoad&Pval=358876)在借用申请表列出两个具体型号；这是器材使用证据，不是厂商型号或承重核验 |
| 中文经销商型号记录，原厂参数待核验 | TERIS TX-V12 PLUS（云台） | [北京风清扬具体产品页](https://www.bjfqy.com/product/8553.html)；保留型号但不采用经销商承重、阻尼等参数作为原厂指标 |
| 厂商具体产品页 | Sachtler flowtech 75 aktiv MS、flowtech 100 MS（脚架，不含云台）；FSB 8 Mk II（云台） | [75 aktiv MS](https://www.sachtler.com/en/product/tripod-flowtech-75-aktiv-ms/)、[100 MS](https://www.sachtler.com/en/product/tripod-flowtech-100-ms/)、[FSB 8 Mk II](https://www.sachtler.com/en/product/fsb-8-mk-ii/)；脚架负荷不能当整套系统负荷 |
| 厂商具体产品页 | GFM GF-Tripod GF-9200 | [GF-9200](https://www.gripfactory.com/products/accessories/gf-9200)，重型摇臂支撑脚架，79–132cm，最高400kg；不与Euro适配器版本混为一条 |
| 厂商具体产品页 | Scorpio Mini Stabilized V Head | [Mini V 稳定头](https://scorpio.servicevision.es/es/producto/gruas-y-cabezas/scorpio-heads/cabezas-estabilizadas/mini-scorpio-stabilized-v-head/)；不与现有普通Mini遥控头混为同代型号 |

N6、N6 PLUS、N6CF-Q PLUS、V12、V12 PLUS、TS100及其套装分别保留ID，数量独立计算。普通 TS-N6、TX-V12、TX-V12 PLUS 的 `published=true`、`verified=false`、`namingStatus=pending`；技术指标留空，证据明确标为使用单位或供应商，不冒充厂商资料。可搜索“N6”“V12”，也可搜索完整型号；不能从型号数字推测载荷。

本次又检查 teris-tech.com（历史厂商资料所列域名）和 trixtripod.com，均无法稳定访问；B站V12 PLUS视频返回访问限制，未据此提升核验等级。TS100/120/150与N6 PLUS通过针对原厂目录具体章节的检索获得依据，因此不再受第一轮仅核到TS300/350的限制。原厂目录是2021版，配置或规格如有后续变更，需对实物版本复核。

Sachtler FSB10 Mk II的当前系列概览与部分系统页出现球碗规格冲突，本轮未追加此型号，避免把75mm/100mm信息混用。伸缩炮的Scorpio主要长度上一轮已补齐，这次保留各长度身份，补充其配套稳定头。
