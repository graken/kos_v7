#!/bin/sh

# 데이터베이스 디렉토리 상태 확인 (권한 문제 확인용)
echo "Checking /app/prisma directory..."
ls -la /app/prisma

# 데이터베이스 동기화 (SQLite)
echo "Syncing database with Prisma..."
./node_modules/.bin/prisma db push --accept-data-loss

# 서버 시작
echo "Starting Next.js server..."
exec node server.js
