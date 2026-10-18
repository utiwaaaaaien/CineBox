// Set at build time for project sites such as github.io/CineBox/.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function publicAsset(path: string): string {
  return path.startsWith("/") && !path.startsWith("//")
    ? `${basePath}${path}`
    : path;
}

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL
  ?? "https://cinebox.utiwaaien.chatgpt.site";
