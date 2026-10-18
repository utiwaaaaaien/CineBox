# CineBox 器材库数据质量记录

## 图片来源与匹配规则

- 具体型号可核验时，使用品牌官网产品页图片并标记为“官方型号图”。
- 同一系列的不同焦段或配置共用官网系列图时，标记为“官方系列图”。
- 通用耗材、无品牌条目、停产且无法确认官网资料的型号使用“分类示意”，不冒充精确产品图。
- 当前已本地化的官网来源包括 ARRI ALEXA 35、ALEXA Mini LF、ALEXA Mini、AMIRA、ARRI Cine Lenses、Cooke S4/i、DJI Ronin 4D、RED V-RAPTOR、RED KOMODO-X 与 Aputure LS 600d Pro。
- 图片来源页与匹配逻辑集中维护于 `app/equipment-images.ts`，不依赖上线后的官网热链。

## 数据粒度

一条记录表示一个可被摄影指导加入器材单的标准型号、镜头焦段，或无法对应具体型号的通用器材行。公司报价、公司名称和原始表格行号不进入网站数据结构。

## 2026-07-20 全量整理结果

- 输入：2,212 条（三家公司清单与代表项目器材单）
- 输出：1,947 个标准器材条目
- 合并：265 条重复、同义或中英文并列记录
- 标准显示名称重复：0
- 重点官方命名规则：93 条
- 重点规则覆盖后的标准条目：88 个
- 原始名称作为隐藏别名保留，因此仍可用旧称和中文俗称搜索

## 分类结果

| 分类 | 标准条目 |
| --- | ---: |
| 摄影机 | 46 |
| 镜头 | 818 |
| 滤镜 | 238 |
| 摄影机附件 | 124 |
| 监看 | 74 |
| 移动器材 | 293 |
| 灯光器材 | 333 |
| 录音器材 | 11 |
| 其他 | 10 |

## 官方命名参考

优先核对了项目推荐和日常出单最常见的摄影机、镜头、监看与灯具，包括：

- ARRI：ALEXA 35、ALEXA Mini、ALEXA Mini LF、ALEXA LF、AMIRA
- SONY：VENICE、VENICE 2、BURANO、ILME-FX3、ILME-FX6、PXW-FX9
- RED：V-RAPTOR 8K VV、V-RAPTOR XL 8K VV、KOMODO、MONSTRO 8K VV、GEMINI
- DJI：Ronin 4D、Ronin 4D-8K、Action 2、Transmission、High-Bright Remote Monitor
- ZEISS：Supreme Prime
- Aputure：LS 600d Pro、LS 1200d Pro
- SmallHD：702、Cine 7

官方参考页：

- https://www.arri.com/en/learn-help/learn-help-camera-system/camera-sample-footage-reference-image
- https://pro.sony/en_IL/product-resources/brochures/cinema-line-comparison-chart
- https://docs.red.com/955-0199/955-0199_V1.3_Rev-A_RED_PS_V-RAPTOR_8K_VV_Operation_Guide/Content/1_Intro/Intro.htm
- https://www.dji.com/ronin-4d
- https://www.zeiss.com/photonics-and-optics/en/cinematography/lenses/supreme-prime-lenses.html
- https://aputure.com/en-US/products/ls-600d-pro
- https://aputure.com/en-US/products/ls-1200d-pro
- https://smallhd.com/products/cine-7

## 边界与处理原则

租赁公司表格中的大量灯光附件、机械件和通用耗材没有唯一商品型号，无法从品牌官网逐条反查。这类记录按可租赁行项目保留，纠正明显的品牌误判，并将“型号待确认”明确写入名称，避免把不确定信息包装成官方型号。

`scripts/build-canonical-catalog.mjs` 是可重复执行的数据生成入口；`data-quality-audit.json` 保存每次全量运行的计数与命中记录。
