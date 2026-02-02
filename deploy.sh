#!/bin/bash

# =================================================================
# KOS_V7 NAS 배포 자동화 스크립트
# =================================================================

# 설정
PROJECT_DIR="/Users/graken/Documents/kos_v7"
NAS_HOST="graken.synology.me"
NAS_USER="graken"
NAS_PATH="/volume1/docker/kos_v7"
NAS_PORT="1202"

# 스크립트 실행 위치와 관계없이 프로젝트 폴더로 이동
cd "$PROJECT_DIR" || { echo "❌ 프로젝트 폴더를 찾을 수 없습니다."; exit 1; }

echo "🚀 [1/3] 로컬 변경 사항을 깃허브에 백업합니다..."
git add .
git commit -m "Deploy: 자동 배포 스크립트 실행 ($(date '+%Y-%m-%d %H:%M:%S'))"
git push

echo ""
echo "📡 [2/3] 나스(NAS)에 접속하여 업데이트 명령을 내립니다 (Port: ${NAS_PORT})..."
echo "💡 나스 계정의 비밀번호를 물어볼 수 있습니다."

ssh -p ${NAS_PORT} -t ${NAS_USER}@${NAS_HOST} "cd ${NAS_PATH} && \
    echo '📥 최신 코드 내려받기 (main 브랜치)...' && \
    git pull origin main && \
    echo '🐳 도커 컨테이너 재빌드 및 재시작...' && \
    sudo docker-compose up -d --build && \
    echo '✅ 배포가 성공적으로 완료되었습니다!'"

echo ""
echo "🏁 [3/3] 모든 과정이 완료되었습니다. 이제 나스 주소로 접속해 보세요!"
