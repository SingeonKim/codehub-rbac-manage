FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Next.js / sharp가 alpine에서 필요로 하는 호환 라이브러리
RUN apk add --no-cache libc6-compat

# 의존성 설치 (devDependencies 포함 — next build에 필요)
# 사내 npm registry 프록시 사용
COPY package.json package-lock.json ./
RUN npm ci \
    --registry https://repository.samsungds.net/artifactory/api/npm/npm-remote \
    --strict-ssl=false

# 소스 복사 후 빌드
COPY . .
RUN npm run build

EXPOSE 3000

# rewrite 대상(BACKEND_URL)은 k8s Deployment의 env로 주입 (예: http://rbac-backend:8000)
CMD ["npm", "start"]
