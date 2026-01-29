import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
    console.log('--- SHINSUNG OCR POST REQUEST RECEIVED (GEMINI) ---');
    try {
        const { image } = await req.json();
        if (!image) return NextResponse.json({ error: 'image data is required' }, { status: 400 });

        // Gemini 2.0 Flash 모델 사용
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const prompt = `
            사용자가 업로드한 성적서 이미지에서 데이터를 추출하여 정해진 JSON 형식으로만 응답하세요.
            이미지에는 측정 데이터 테이블이 있으며, No 1부터 No 10까지의 행과 마지막 AVR(평균) 행이 있습니다.
            
            ⚠️ 매우 중요: 테이블의 마지막 줄인 "AVR" 행을 "No 10"으로 오해하지 마세요. 
            만약 실제 데이터가 No 5까지만 있다면 No 6 ~ No 10은 반드시 빈 문자열 ""로 채우세요.

            추출해야 할 항목:
            1. 시험일시: "2026-01-27 14:53" 같은 형식으로 이미지 상단의 날짜와 시간을 찾아 결합하세요.
            2. 비율: "7.8:2.2" 같은 형식의 비율 데이터를 찾으세요.
            3. 두께: "두께 83" 또는 "83" 숫자를 찾으세요.
            4. 테이블 상세: No 1 ~ No 10 각 행에 대해 20mm, 40mm, 60mm, 80mm, AVR 값을 추출하세요.
            5. 요약 평균: 테이블 하단의 전체 AVR 행 데이터를 추출하세요.

            응답 JSON 형식:
            {
              "시험일시": "YYYY-MM-DD HH:mm",
              "비율": "x:y",
              "두께": "숫자",
              "No.1_20mm": "값", "No.1_40mm": "값", "No.1_60mm": "값", "No.1_80mm": "값", "No.1_AVR": "값",
              ... (No.10까지 동일한 규칙)
              "AVR_20mm": "값", "AVR_40mm": "값", "AVR_60mm": "값", "AVR_80mm": "값", "AVR_AVR": "값"
            }

            데이터가 없는 칸은 반드시 빈 문자열 ""을 넣으세요. 오직 JSON 데이터만 반환하세요.
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

        // JSON 추출 (마크다운 코드 블록 제거)
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        const extractedValues = jsonMatch ? JSON.parse(jsonMatch[0]) : { "Error": "JSON 파싱 실패" };

        return NextResponse.json({
            text: text, // Gemini의 전체 응답(디버깅용)
            extractedValues: extractedValues,
            isMock: false
        });
    } catch (error: any) {
        console.error('Gemini OCR failed:', error);

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
