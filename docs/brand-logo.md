# CineBox Logo

日期：2026-10-18。当前版本 V2 使用内置图像生成工具编辑 V1，移除摄影光束、简化 C 与器材箱轮廓。原始图为 1254×1254 的不透明方形 PNG，深色背景铺满四边及四角。

## 设计与使用

以 CineBox 的 C 与器材箱提手构成主体，使用石墨灰与白色。图标内部保持清晰留白，移除原来的蓝色光束。品牌名及中文备注继续用网页文字显示，图标内不加入细小文字。

当前母版：`public/brand/cinebox-logo-v2.png`。保留 V1 以便追溯。通过 macOS sips 等比导出 32/48px favicon、128px 网页 Logo、180px Apple touch icon、192/512px 通用图标和 1024px maskable 图标。所有导出只做尺寸转换，构图与图案均来自内置图像工具。

左上角按 44×44 显示：标题行 24px、行间距 2px、备注行 18px，文字块总高 44px，与图标上下对齐；图文间距 12px。128px 网页图约 14KB。网页中仅通过 CSS 裁出圆角，浏览器图标本身不含透明圆角或外部留白。

Safari 对透明自定义图标可能增加系统底板与留白，见 [Safari 17.2 官方说明](https://developer.apple.com/documentation/safari-release-notes/safari-17_2-release-notes)。新增 `public/site-v2.webmanifest` 并声明 1024px 不透明满版 maskable 图标；Apple touch icon 同样使用不透明满版图像。版本化路径便于刷新缓存。第三方和 Safari 已保存的旧图标可能仍需等待各自缓存更新；本轮未修改用户收藏夹。

## V2 验证

生产构建与 97 项测试通过，目录一致性检查通过；静态检查 0 错误，保留 1 处既有 Excel 导出警告。PNG 文件头检查确认 manifest 声明尺寸与真实像素尺寸一致，192/512/1024px 文件不含 alpha 通道；manifest 返回 `application/manifest+json`。

桌面 Logo 与文字块实测均高 44px、顶部同为 y=24px、底部同为 y=68px，标题与备注左边缘一致，深浅色主题显示正常。平板 768px 宽度下两者也均高 44px。390px 手机保持原有底部导航，无横向溢出。页面控制台没有新的警告或错误。未改动用户 Safari 收藏夹，也没有以用户原有书签缓存作为可控测试环境；已部署资源和声明的变化可直接检查，Safari 已保存图标的缓存刷新由浏览器控制。

## V2 编辑提示词

Edit the provided CineBox logo. Preserve its recognizable white capital C combined with the small equipment-case handle, and its graphite charcoal macOS app-icon aesthetic. Remove the blue photography beam in the center completely; the C counter must contain only the same charcoal background, without any blue element or substitute symbol. Refine the C's two terminals to clean aligned horizontal ends, simplify the silhouette and make its broad white shape optically balanced and unmistakable when shown at 16, 32, and 44 pixels. Preserve the integrated case handle. Reduce shiny bevels and textured reflections; make it a restrained premium near-flat mark with a subtle charcoal tonal depth, clean white C, sharp smooth edges. CRITICAL OUTPUT BACKGROUND: deliver one fully OPAQUE full-bleed SQUARE image. The graphite charcoal background must extend all the way to all four canvas edges and all four corners with ZERO transparent pixels, ZERO external padding, ZERO white or pale border, ZERO separately inset rounded-square tile. Platform browsers will apply their own corner mask; do not bake an outside frame or outside rounded transparent corners. The C-plus-case symbol should be centered and occupy roughly 68 percent of canvas width and height with balanced even margins on every side. Background is a very dark charcoal, not white, not transparent. No text, no wordmark, no extra graphics, no beam, no triangle, no blue accent, no mockup, no surrounding presentation surface. Return a single square icon only.

## V1 原始生成提示词

Use case: logo-brand. Create ONE finished professional square app icon / website logo for CineBox, a real cinematographer's production equipment catalog and film project workspace. This is a new brand image meant to be actually used in a small 36px macOS-inspired sidebar icon, browser favicon, and square link-preview thumbnail. Subject: a distinctive, optically balanced geometric monogram combining a clearly readable capital C with the functional contour of a cinema viewfinder and a compact equipment case. Choose one unified simple symbol, not separate little pictograms. Strong silhouette, generous interior negative space, robust broad strokes, precise corners. A compact graphite charcoal rounded-square tile with a subtly beveled perimeter, quiet macOS app-icon material refinement, a near-white C structure with one restrained icy blue inner optical accent. Almost flat, very restrained depth; premium, utilitarian, calm, editorial film-industry aesthetic. The tile occupies 94% of the square canvas with only genuinely transparent space around the rounded corners; centered, symmetrical visual weight, no big surrounding margins. Crisp vector-like geometry rendered as a high-quality raster icon. It must remain unmistakable and legible at 16px and 32px. Square composition, preferably 1024 by 1024. No typography other than the C monogram, no wordmark, no small lettering, no tagline, no numbers, no camera lens illustration, no film reel, no clapperboard, no film perforations, no tiny details, no photorealistic scene, no mockup, no extra icons, no gradients of rainbow colors, no watermark, no presentation board. Return a single icon only.
