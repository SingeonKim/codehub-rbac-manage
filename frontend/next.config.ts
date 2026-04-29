import type { NextConfig } from "next";

// 컨테이너/k8s 환경에서는 BACKEND_URL 환경변수로 백엔드 주소를 주입
// - 로컬 개발(HTTPS): https://localhost:8000 (기본값)
// - k8s: http://<backend-service>:8000
const backendUrl = process.env.BACKEND_URL ?? "https://localhost:8000";

const nextConfig: NextConfig = {
  // /api/* 요청을 FastAPI 백엔드로 프록시
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
