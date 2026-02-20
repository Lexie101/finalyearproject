import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimization flags for faster builds
  experimental: {
    optimizePackageImports: [
      "@radix-ui/react-*",
      "lucide-react",
      "framer-motion",
    ],
  },
  
  // Turbopack configuration (Next.js 16 default)
  turbopack: {}, // Use Turbopack with default settings
};

export default nextConfig;

