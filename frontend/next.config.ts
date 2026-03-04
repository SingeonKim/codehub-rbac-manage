import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 개발 환경에서 /api/* 요청을 FastAPI 백엔드로 프록시
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "https://localhost:8000/api/:path*",
      },
    ];
  },
};

export default nextConfig;
