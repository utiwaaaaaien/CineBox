export type SpecOption = { value: string | number; label: string; group?: string };

export const projectFpsOptions: SpecOption[] = [23.976, 24, 25, 29.97, 30, 47.952, 48, 50, 59.94, 60, 100, 119.88, 120].map(value => ({ value, label: `${value} fps` }));
export const highSpeedFpsOptions: SpecOption[] = [{ value: 0, label: "不升格" }, ...[48, 50, 59.94, 60, 96, 100, 119.88, 120, 150, 180, 200, 240, 300, 480, 500, 960, 1000].map(value => ({ value, label: `${value} fps` }))];
export const aspectRatioOptions: SpecOption[] = [
  ["16:9", "16:9 · 横屏"], ["9:16", "9:16 · 竖屏"], ["1:1", "1:1 · 方形"], ["4:5", "4:5 · 社交竖版"], ["4:3", "4:3"], ["3:2", "3:2 · Open Gate 构图"], ["1.85:1", "1.85:1 · 电影"], ["2:1", "2:1"], ["2.39:1", "2.39:1 · 宽银幕"], ["横竖双构图", "横竖双构图"],
].map(([value, label]) => ({ value, label }));
export const resolutionOptions: SpecOption[] = [
  { value: "HD 1280 × 720", label: "HD · 1280 × 720", group: "平台与母版" },
  { value: "FHD 1920 × 1080", label: "Full HD · 1920 × 1080", group: "平台与母版" },
  { value: "2K 2048 × 1080", label: "DCI 2K · 2048 × 1080", group: "平台与母版" },
  { value: "QHD 2560 × 1440", label: "QHD · 2560 × 1440", group: "平台与母版" },
  { value: "UHD 4K 3840 × 2160", label: "UHD 4K · 3840 × 2160", group: "平台与母版" },
  { value: "DCI 4K 4096 × 2160", label: "DCI 4K · 4096 × 2160", group: "平台与母版" },
  { value: "UHD 8K 7680 × 4320", label: "UHD 8K · 7680 × 4320", group: "平台与母版" },
  { value: "1080 × 1920", label: "竖版 Full HD · 1080 × 1920", group: "竖版与社交" },
  { value: "2160 × 3840", label: "竖版 UHD · 2160 × 3840", group: "竖版与社交" },
  { value: "1080 × 1080", label: "方形 · 1080 × 1080", group: "竖版与社交" },
  { value: "1080 × 1350", label: "4:5 · 1080 × 1350", group: "竖版与社交" },
  { value: "4.6K 4608 × 3164", label: "ARRI 4.6K Open Gate · 4608 × 3164", group: "摄影机采集参考" },
  { value: "6K 6048 × 4032", label: "SONY 6K 3:2 · 6048 × 4032", group: "摄影机采集参考" },
  { value: "8.6K 8640 × 5760", label: "SONY 8.6K 3:2 · 8640 × 5760", group: "摄影机采集参考" },
  ...["4K", "6K", "8K"].map(value => ({ value, label: `${value} · 旧项目尺寸待确认`, group: "兼容旧项目" })),
];
