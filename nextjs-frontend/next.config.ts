import type { NextConfig } from "next";

// Express and FastAPI are now called DIRECTLY from the browser using absolute URLs.
// We no longer proxy Express routes through Next.js because server-side rewrites
// strip cookies in both directions, breaking HTTP-only cookie authentication.
//
// next.config.ts rewrites are intentionally removed for Express routes.
// If you add Next.js API Routes (app/api/*) in the future, configure them there.

const nextConfig: NextConfig = {
  reactCompiler: true,
};

export default nextConfig;
