import type { NextConfig } from "next";

// GitHub Pages serves project sites under "/<repo-name>". Detect this at build
// time so the exported site works both locally and on Pages.
const repo = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isUserOrOrgSite = repo.endsWith(".github.io");
const basePath = process.env.NEXT_PUBLIC_BASE_PATH
  ?? (isUserOrOrgSite || !repo ? "" : `/${repo}`);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath,
  assetPrefix: basePath || undefined,
  images: { unoptimized: true },
};

export default nextConfig;
