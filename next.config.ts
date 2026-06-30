import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure the analyze prompt ships with the serverless function on Vercel.
  outputFileTracingIncludes: {
    "/api/analyze": ["./prompts/analyze.md"],
  },
};

export default nextConfig;
