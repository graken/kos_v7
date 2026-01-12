import { NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import path from 'path';

// Google Vision Client 초기화 - 인증 정보의 개행 문자 문제를 방지하기 위해 명시적으로 로드
function getVisionClient() {
    try {
        const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS || 'google-key.json');

        if (!fs.existsSync(keyPath)) {
            console.error('KEY FILE NOT FOUND AT:', keyPath);
            return null;
        }

        const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

        // 프라이빗 키의 개행 문자(\n)가 문자열 그대로 들어있는 경우를 대비해 실제 개행 문자로 변환
        // gRPC 라이브러리에서 PEM 형식을 인식하려면 실제 줄바꿈이 필요합니다.
        if (keyFile.private_key) {
            keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
        }

        return new ImageAnnotatorClient({
            credentials: {
                client_email: keyFile.client_email,
                private_key: keyFile.private_key
            },
            projectId: keyFile.project_id
        });
    } catch (error) {
        console.error('Google Vision client initialization failed:', error);
        return null;
    }
}

export async function POST(req: Request) {
    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json({ error: 'image data is required' }, { status: 400 });
        }

        const client = getVisionClient();
        if (!client) {
            return NextResponse.json({
                text: "인증 정보 초기화 실패. 서버 로그를 확인하세요.",
                extractedValues: ["인증 오류"],
                isMock: true
            });
        }

        const [result] = await client.textDetection({
            image: { content: image }
        });

        const fullText = result.fullTextAnnotation?.text || "";
        console.log('OCR EXTRACTED TEXT:', fullText);

        const extractedValues: any = {};

        // 1. 기본 정보 추출 (날짜, 시간, N)
        const dateMatch = fullText.match(/DATE\s*[:\s]*(\d{4}\/\s*\d+\/\s*\d+)/i);
        if (dateMatch) {
            extractedValues['측정날짜'] = dateMatch[1].replace(/\s+/g, '');
        }

        const timeMatch = fullText.match(/TIME\s*[:\s]*(\d+:\d+)/i);
        if (timeMatch) extractedValues['측정시간'] = timeMatch[1];

        // 측정 횟수 N 감지 (가변 횟수 지원)
        // \bN\b 를 사용하여 MIN 등의 단어 끝에 있는 N과 혼동되지 않도록 함
        const nMatch = fullText.match(/\bN\b\s*[:\s]*(\d+)/i);
        let totalN = nMatch ? parseInt(nMatch[1]) : 10;
        if (totalN <= 0) totalN = 10; // 0으로 오인식된 경우 기본값 10으로 복구

        // 2. 개별 측정값 추출
        const lines = fullText.split('\n');
        let measurementCount = 1;
        let isResultSection = false;

        for (const line of lines) {
            const cleanLine = line.trim();
            if (!cleanLine) continue;

            // 결과 섹션 시작 시 측정값 추출 중단
            if (cleanLine.includes('* RESULT *') || cleanLine.includes('RESULT')) {
                isResultSection = true;
                continue;
            }

            // 결과 섹션 이전이면서 N횟수 이내일 때만 소수점 4자리 추출
            if (!isResultSection && measurementCount <= totalN) {
                // 숫자로 시작하거나 "순번 숫자" 형태인 경우 탐색 강화
                const match = cleanLine.match(/(\d+\.\d{4})/);
                if (match) {
                    // 기기 메타데이터나 통계 키워드가 포함된 행은 제외
                    // \b 를 사용하여 정확한 단어 매칭
                    const isStatsCandidate = /\b(MAX|MIN|AVG|X|N|TIME|DATE|PART|NAME|CLEAR)\b/i.test(cleanLine);

                    if (!isStatsCandidate) {
                        extractedValues[`측정_${measurementCount}`] = match[1];
                        measurementCount++;
                    }
                }
            }
        }

        // 3. 통계 데이터 추출 (전체 텍스트에서 패턴 매칭)
        const maxMatch = fullText.match(/MAX\s*[:\s]*(\d+\.\d+)/i);
        if (maxMatch) extractedValues['최대(MAX)'] = maxMatch[1];

        const minMatch = fullText.match(/MIN\s*[:\s]*(\d+\.\d+)/i);
        if (minMatch) extractedValues['최소(MIN)'] = minMatch[1];

        // 평균 (다양한 인식 패턴 대응)
        const avgPatterns = [
            /ㄡˇ\s*(\d+\.\d{6})/i,
            /ㄡˇ[\s\S]*?(\d+\.\d{6})/i,
            /X\s*[:\s]*(\d+\.\d{6})/i,
            /평균\s*[:\s]*(\d+\.\d{6})/i,
            /(\d+\.\d{5,6})/ // 평균은 보통 5-6자리로 인식됨
        ];

        for (const pattern of avgPatterns) {
            const match = fullText.match(pattern);
            if (match) {
                // 이미 추출된 MAX/MIN과 겹치지 않는지 확인 (정규식 순서상 중요)
                if (match[1] !== extractedValues['최대(MAX)'] && match[1] !== extractedValues['최소(MIN)']) {
                    extractedValues['평균(avg)'] = match[1];
                    break;
                }
            }
        }

        return NextResponse.json({
            text: fullText,
            extractedValues: Object.keys(extractedValues).length > 0 ? extractedValues : ["데이터 자동 추출 실패. 수동 입력을 권장합니다."],
            isMock: false
        });

    } catch (error: any) {
        console.error('OCR process error:', error);
        return NextResponse.json({
            error: 'OCR processing failed',
            message: error.message,
            isMock: true
        }, { status: 500 });
    }
}
