import type { Metadata } from "next";
import "./globals.css";
import "./macos.css";


export const metadata: Metadata = {
  metadataBase: new URL("https://cinebox.utiwaaien.chatgpt.site"),
  title: "CineBox",
  description: "摄影器材 · 项目工作台。管理拍摄项目，复用历史配置、直接选材、核对配套并导出专业器材单。",
  manifest: "/site-v2.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon-v2-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/favicon-v2-48.png", type: "image/png", sizes: "48x48" },
      { url: "/brand/icon-v2-192.png", type: "image/png", sizes: "192x192" },
    ],
    shortcut: "/brand/favicon-v2-32.png",
    apple: [{ url: "/brand/apple-touch-icon-v2.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "CineBox",
    description: "管理项目、复用历史器材单，按品类与品牌快速选材。",
    images: [{ url: "/brand/icon-v2-1024.png", width: 1024, height: 1024, alt: "CineBox Logo · 摄影器材与项目工作台" }],
  },
  twitter: {
    card: "summary",
    title: "CineBox",
    description: "项目管理、历史配置复用、按品类与品牌选材及 Excel 导出。",
    images: ["/brand/icon-v2-1024.png"],
  },
};

const themeInitializationScript = `
(() => {
  try {
    const stored = localStorage.getItem("cinbox-theme-preference");
    const preference = stored === "light" || stored === "dark" ? stored : "system";
    const theme = preference === "system"
      ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = preference;
  } catch {
    document.documentElement.dataset.theme =
      matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.themePreference = "system";
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitializationScript }} />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
