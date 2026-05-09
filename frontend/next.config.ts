import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  // Hay dos package-lock.json (raíz Hardhat + frontend); fijar la raíz evita
  // que Turbopack/Next escoja la del monorepo por error.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
