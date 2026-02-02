FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 1. 의존성 설치
FROM base AS deps

COPY package.json package-lock.json ./
RUN npm install

# 2. 빌드 단계
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma 클라이언트 생성 (로컬 바이너리 사용하여 버전 고정)
RUN ./node_modules/.bin/prisma generate

# Next.js 빌드
ENV NEXT_TELEMETRY_DISABLED=1
# 빌드 시 데이터베이스 URL이 필요할 수 있습니다 (정적 페이지 생성 등)
ENV DATABASE_URL="file:./dev.db"
RUN npm run build

# 3. 실행 단계
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# standalone 빌드 결과물 복사
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# Prisma 관련 파일 복사 (SQLite 환경)
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
# 사진 업로드 폴더 생성 및 권한 설정
RUN mkdir -p \
    public/uploads/originals \
    public/uploads/thumbnails \
    public/shinsung/uploads/images \
    public/shinsung/uploads/thumbnails \
    public/coating/uploads/images \
    public/coating/uploads/thumbnails \
    public/notepad/uploads/images \
    public/notepad/uploads/files \
    public/notepad/uploads/thumbnails && \
    chown -R nextjs:nodejs /app && \
    chmod -R 775 /app/public

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 실행 시 데이터베이스 동기화 및 서버 시작
# DATABASE_URL이 없을 경우에 대비한 기본값 설정 및 절대 경로 보장
ENTRYPOINT ["sh", "-c", "export DATABASE_URL=${DATABASE_URL:-file:/app/prisma/dev.db} && npx prisma db push --accept-data-loss && node server.js"]
