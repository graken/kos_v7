import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    console.log('--- COATING OCR POST REQUEST RECEIVED (GEMINI) ---');
    try {
        const { image } = await req.json();

        if (!image) {
            return NextResponse.json({ error: 'image data is required' }, { status: 400 });
        }

        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
            사용자가 업로드한 측정 데이터 이미지에서 정보를 추출하여 JSON 형식으로만 응답하세요.
            이미지에는 측정 데이터 테이블이 있으며, No 1부터 No 10까지의 행과 요약 데이터(MAX, MIN, AVG)가 포함되어 있습니다.

            추출해야 할 항목:
            1. 측정날짜: "2026/01/27" 형식으로 날짜를 찾으세요.
            2. 측정시간: "14:53" 형식으로 시간을 찾으세요.
            3. 측정_n: 각 행(No 1 ~ No 10)의 AVR(평균) 또는 대표 측정값을 "측정_1", "측정_2" ... "측정_10" 키로 추출하세요.
            4. 통계: 최대(MAX), 최소(MIN), 평균(avg) 값을 추출하세요. 평균은 가능한 한 많은 소수점 자리를 포함하세요.

            응답 JSON 형식:
            {
              "측정날짜": "YYYY/MM/DD",
              "측정시간": "HH:mm",
              "측정_1": "값",
              "측정_2": "값",
              ...
              "최대(MAX)": "값",
              "최소(MIN)": "값",
              "평균(avg)": "값"
            }

            값이 없는 경우 제외하지 말고 빈 문자열 ""로 채우세요. 오직 JSON 데이터만 반환하세요.
        `;

        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: image,
                    mimeType: "image/png"
                }
            }
        ]);

        const response = await result.response;
        const text = response.text();

        // JSON 추출
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const extractedValues = jsonMatch ? JSON.parse(jsonMatch[0]) : { "Error": "JSON 파싱 실패" };

        return NextResponse.json({
            text: text,
            extractedValues: (extractedValues && Object.keys(extractedValues).length > 0) ? extractedValues : {},
            isMock: false
        });

    } catch (error: any) {
        console.error('OCR process error:', error);

        let errorMessage = '사진 분석 중 오류가 발생했습니다.';
        let errorType = 'UNKNOWN_ERROR';

        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('api key') || msg.includes('403') || msg.includes('auth')) {
            errorMessage = 'API 키 인증에 실패했습니다. (관리자 문의)';
            errorType = 'API_KEY_ERROR';
        } else if (msg.includes('quota') || msg.includes('429') || msg.includes('rate limit')) {
            errorMessage = '분석 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.';
            errorType = 'QUOTA_ERROR';
        } else if (msg.includes('safety') || msg.includes('blocked')) {
            errorMessage = '안전 정책으로 인해 분석이 차단되었습니다.';
            errorType = 'SAFETY_ERROR';
        } else if (msg.includes('invalid') || msg.includes('bad request')) {
            errorMessage = '올바르지 않은 이미지 데이터입니다.';
            errorType = 'INVALID_IMAGE';
        }

        return NextResponse.json({
            error: errorType,
            message: errorMessage,
            rawError: error.message,
            isMock: true
        }, { status: 500 });
    }
}
