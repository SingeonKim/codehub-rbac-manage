/**
 * Next.js 개발 서버 실행 helper
 *
 * 왜 이 스크립트가 필요한가?
 * Next.js 15+의 rewrite 프록시는 내부적으로 undici(Node.js 네이티브 fetch)를 사용함.
 * undici는 보안 설계상 NODE_TLS_REJECT_UNAUTHORIZED=0 을 무시함.
 * → mkcert CA 인증서를 NODE_EXTRA_CA_CERTS로 직접 신뢰 목록에 추가해야 함.
 *
 * mkcert -CAROOT 경로를 동적으로 획득하므로 팀원 PC마다 경로가 달라도 동작함.
 *
 * 사용법:
 *   node scripts/dev.js          → HTTP 모드 (npm run dev)
 *   node scripts/dev.js --https  → HTTPS 모드 (npm run dev:https)
 */

const { execSync, spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const isHttps = process.argv.includes("--https");
const isWindows = process.platform === "win32";

// ── mkcert CA 경로 결정 ───────────────────────────────────────────────────────
// 시도 1: winget 기본 설치 경로의 mkcert.exe로 -CAROOT 획득 (Windows)
// 시도 2: PATH에 있는 mkcert로 -CAROOT 획득 (Unix / PATH 등록된 경우)
// 시도 3: Windows 기본 mkcert CA 위치 fallback
let extraCaPath = "";
const mkcertCandidates = isWindows
  ? [
      path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WinGet", "Links", "mkcert.exe"),
      "mkcert",
    ]
  : ["mkcert"];

for (const mkcertBin of mkcertCandidates) {
  try {
    const caRoot = execSync(`"${mkcertBin}" -CAROOT`, {
      stdio: ["pipe", "pipe", "pipe"],
    })
      .toString()
      .trim();
    const candidate = path.join(caRoot, "rootCA.pem");
    if (fs.existsSync(candidate)) {
      extraCaPath = candidate;
      break;
    }
  } catch {
    // 이 경로에 mkcert 없음 → 다음 후보 시도
  }
}

// fallback: Windows 기본 mkcert CA 위치
if (!extraCaPath && isWindows && process.env.LOCALAPPDATA) {
  const fallback = path.join(process.env.LOCALAPPDATA, "mkcert", "rootCA.pem");
  if (fs.existsSync(fallback)) extraCaPath = fallback;
}

if (extraCaPath) {
  console.log(`[dev] NODE_EXTRA_CA_CERTS → ${extraCaPath}`);
} else {
  console.warn("[dev] mkcert rootCA.pem을 찾을 수 없습니다. TLS 프록시 오류가 발생할 수 있습니다.");
}

// ── next dev 실행 인자 구성 ───────────────────────────────────────────────────
const nextArgs = ["dev"];
if (isHttps) {
  nextArgs.push(
    "--experimental-https",
    "--experimental-https-key",
    "../certs/localhost-key.pem",
    "--experimental-https-cert",
    "../certs/localhost.pem"
  );
}

// ── 환경변수 주입 후 next dev 실행 ────────────────────────────────────────────
const env = { ...process.env };
if (extraCaPath) {
  env.NODE_EXTRA_CA_CERTS = extraCaPath;
}

// Windows: next.cmd (npm scripts용 래퍼), Unix: next
const nextBin = path.join(
  "node_modules",
  ".bin",
  isWindows ? "next.cmd" : "next"
);

const child = spawn(nextBin, nextArgs, {
  env,
  stdio: "inherit",
  cwd: process.cwd(),
  // Windows에서 .cmd 파일 실행을 위해 shell 옵션 활성화
  shell: isWindows,
});

child.on("exit", (code) => process.exit(code ?? 0));
