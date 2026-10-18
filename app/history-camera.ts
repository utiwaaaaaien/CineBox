type CameraRecord = {
  name: string;
  category: string;
  subcategory?: string;
  series?: string;
  model?: string;
};

// Imported lists have no primary-camera field; retain list order among regular bodies.
export function historyCameraModel(
  rows: readonly { id: string; custom?: CameraRecord }[],
  catalog: ReadonlyMap<string, CameraRecord>,
): string {
  const cameras = rows.map(row => catalog.get(row.id) ?? row.custom)
    .filter((item): item is CameraRecord => item?.category === "摄影机");
  const camera = cameras.find(item => !/运动相机|全景相机|航拍|无人机|\b(?:Mavic|Action|Pocket|Insta360)\b/i.test(
    `${item.name} ${item.subcategory ?? ""} ${item.series ?? ""}`,
  )) ?? cameras[0];
  if (!camera) return "";
  const model = camera.model?.trim().replace(/^(?:ILME|PXW)-/i, "");
  if (!model) return camera.name;
  const series = camera.series?.trim();
  return series && !model.toLowerCase().startsWith(series.toLowerCase()) ? `${series} ${model}` : model;
}
