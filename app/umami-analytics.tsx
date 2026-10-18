import analytics from "../config/analytics.json";
import { siteUrl } from "./site-config";

export function UmamiAnalytics() {
  if (process.env.CINEBOX_GITHUB_PAGES !== "true" || !analytics.scriptUrl || !analytics.websiteId) {
    return null;
  }

  return (
    <script
      defer
      src={analytics.scriptUrl}
      data-website-id={analytics.websiteId}
      data-domains={new URL(siteUrl).hostname}
      data-exclude-search="true"
      data-exclude-hash="true"
    />
  );
}
