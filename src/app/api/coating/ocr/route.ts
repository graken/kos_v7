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
        // DATE 2026/ 1/12 -> 2026/01/12
        const dateMatch = fullText.match(/DATE\s*[:\s]*(\d{4})\s*\/\s*(\d{1,2})\s*\/\s*(\d{1,2})/i);
        if (dateMatch) {
            const year = dateMatch[1];
            const month = dateMatch[2].padStart(2, '0');
            const day = dateMatch[3].padStart(2, '0');
            extractedValues['측정날짜'] = `${year}/${month}/${day}`;
        }

        // TIME 19 : 5 -> 19:05
        const timeMatch = fullText.match(/TIME\s*[:\s]*(\d{1,2})\s*[:\s]\s*(\d{1,2})/i);
        if (timeMatch) {
            const hour = timeMatch[1].padStart(2, '0');
            const minute = timeMatch[2].padStart(2, '0');
            extractedValues['측정시간'] = `${hour}:${minute}`;
        }

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
        // MAX 패턴 - \b를 사용하여 정확한 단어 경계 확인 및 오타 대응
        const maxMatch = fullText.match(/\b(MAX|M4X|MQX)\b\s*[:\s]*(\d+\.\d+)/i);
        if (maxMatch) extractedValues['최대(MAX)'] = maxMatch[2];

        // MIN 패턴 - M1N, MIN 등 대응
        const minMatch = fullText.match(/\b(MIN|M1N|MlN)\b\s*[:\s]*(\d+\.\d+)/i);
        if (minMatch) extractedValues['최소(MIN)'] = minMatch[2];

        // 평균 (다양한 인식 패턴 대응)
        const avgPatterns = [
            /\b(ㄡˇ|X|AVG|평균)\b\s*[:\s]*(\d+\.\d{4,6})/i,
            /ㄡˇ[\s\S]*?(\d+\.\d{4,6})/i,
            /(\d+\.\d{5,6})/ // 평균은 보통 5-6자리로 인식됨
        ];

        for (const pattern of avgPatterns) {
            const match = fullText.match(pattern);
            if (match) {
                // 캡처 그룹이 있는 경우와 없는 경우 대응
                const val = match.length > 1 ? match[match.length - 1] : match[0];
                // 이미 추출된 MAX/MIN과 겹치지 않는지 확인
                if (val !== extractedValues['최대(MAX)'] && val !== extractedValues['최소(MIN)']) {
                    extractedValues['평균(avg)'] = val;
                    break;
                }
            }
        }

        // 4. 최종 교정 및 보완 로직 (추가)
        const measurements: number[] = [];
        for (let i = 1; i <= totalN; i++) {
            const v = parseFloat(extractedValues[`측정_${i}`]);
            if (!isNaN(v)) measurements.push(v);
        }

        if (measurements.length > 0) {
            const realMax = Math.max(...measurements);
            const realMin = Math.min(...measurements);
            const realMaxStr = realMax.toFixed(4);
            const realMinStr = realMin.toFixed(4);

            let currentMax = parseFloat(extractedValues['최대(MAX)']);
            let currentMin = parseFloat(extractedValues['최소(MIN)']);

            // 1. 값이 없으면 측정값으로 채움
            if (!extractedValues['최대(MAX)']) extractedValues['최대(MAX)'] = realMaxStr;
            if (!extractedValues['최소(MIN)']) extractedValues['최소(MIN)'] = realMinStr;

            // 2. 값이 있어도 측정값 범위를 벗어나면 교정 (OCR 오인식 방지)
            // 예: MIN이 0.0050인데 실제 측정값에 0.0048이 있으면 0.0048로 교정
            if (!isNaN(currentMax) && currentMax < realMax) extractedValues['최대(MAX)'] = realMaxStr;
            if (!isNaN(currentMin) && currentMin > realMin) extractedValues['최소(MIN)'] = realMinStr;

            // 3. MAX와 MIN이 같게 인식되었는데 실제로는 다른 경우 교정
            if (extractedValues['최대(MAX)'] === extractedValues['최소(MIN)'] && realMax !== realMin) {
                extractedValues['최대(MAX)'] = realMaxStr;
                extractedValues['최소(MIN)'] = realMinStr;
            }

            // 4. 최종 대소 관계 확인
            currentMax = parseFloat(extractedValues['최대(MAX)']);
            currentMin = parseFloat(extractedValues['최소(MIN)']);
            if (!isNaN(currentMax) && !isNaN(currentMin) && currentMax < currentMin) {
                const temp = extractedValues['최대(MAX)'];
                extractedValues['최대(MAX)'] = extractedValues['최소(MIN)'];
                extractedValues['최소(MIN)'] = temp;
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
