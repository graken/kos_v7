import { NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import path from 'path';

function getVisionClient() {
    try {
        const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_APPLICATION_CREDENTIALS || 'google-key.json');
        if (!fs.existsSync(keyPath)) return null;
        const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        if (keyFile.private_key) keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');
        return new ImageAnnotatorClient({
            credentials: { client_email: keyFile.client_email, private_key: keyFile.private_key },
            projectId: keyFile.project_id
        });
    } catch (error) {
        console.error('Vision client init failed:', error);
        return null;
    }
}

export async function POST(req: Request) {
    console.log('--- SHINSUNG OCR POST REQUEST RECEIVED ---');
    try {
        const { image } = await req.json();
        if (!image) return NextResponse.json({ error: 'image data is required' }, { status: 400 });

        const client = getVisionClient();
        if (!client) {
            return NextResponse.json({
                text: "인증 오류",
                extractedValues: { "Error": "Vision Authentication Failed" },
                isMock: true
            });
        }

        const [result] = await client.textDetection({ image: { content: image } });
        const fullText = result.fullTextAnnotation?.text || "";

        console.log('--- Raw Vision Response (Shinsung) ---');
        console.log(fullText);
        console.log('--------------------------------------');

        const extractedValues: any = {};

        // 1. Test Date & Time (시험일시)
        let extractedTime = "";
        const dateTimeMatch = fullText.match(/(\d{4})[-.년]\s*(\d{1,2})[-.월]\s*(\d{1,2})[-.일]?\s*(\d{1,2}:\d{1,2})/);
        if (dateTimeMatch) {
            extractedTime = dateTimeMatch[4];
            extractedValues['시험일시'] = `${dateTimeMatch[1]}-${dateTimeMatch[2].padStart(2, '0')}-${dateTimeMatch[3].padStart(2, '0')} ${dateTimeMatch[4]}`;
        }

        // 2. Ratio (비율)
        // Strategy: 
        // A. Look for explicit labels "Ratio" or "비율"
        // B. Look for generic pattern but exclude the extracted time
        let ratioVal = "";
        const explicitRatioMatch = fullText.match(/(?:Ratio|비율)\s*[:=]?\s*(\d+\.?\d*\s*:\s*\d+\.?\d*)/i);
        if (explicitRatioMatch) {
            ratioVal = explicitRatioMatch[1].replace(/\s+/g, '');
        } else {
            // Fallback: Find all x:y patterns
            const allMatches = fullText.matchAll(/(\d+\.?\d*)\s*:\s*(\d+\.?\d*)/g);
            for (const m of allMatches) {
                const candidate = `${m[1]}:${m[2]}`;
                // If this candidate acts exactly like the time we found, skip it
                if (extractedTime && (candidate === extractedTime || candidate.replace(/^0+/, '') === extractedTime.replace(/^0+/, ''))) {
                    continue;
                }
                // Also heuristic: Ratios usually have larger numbers (e.g. 100:30) or specific formats different from HH:MM
                // But user might have 1:1. 
                // Let's take the first non-time match.
                ratioVal = candidate;
                break;
            }
        }
        if (ratioVal) {
            extractedValues['비율'] = ratioVal;
        }

        // 3. Thickness (두께)
        const thicknessMatch = fullText.match(/(?:Thickness|두께)\s*[:=]?\s*(\d+)/i);
        if (thicknessMatch) {
            extractedValues['두께'] = thicknessMatch[1];
        }

        // 4. Table Data
        for (let i = 1; i <= 10; i++) {
            const noRegex = new RegExp(`No\\.?\\s*${i}\\s+([\\s\\d\\.]+)`, 'i');
            const match = fullText.match(noRegex);
            if (match) {
                const values = match[1].trim().split(/\s+/).filter(v => !isNaN(parseFloat(v)));
                if (values.length >= 5) {
                    extractedValues[`No.${i}_20mm`] = values[1];
                    extractedValues[`No.${i}_40mm`] = values[2];
                    extractedValues[`No.${i}_60mm`] = values[3];
                    extractedValues[`No.${i}_80mm`] = values[4];
                    extractedValues[`No.${i}_AVR`] = values[5];
                }
            }
        }

        // 5. AVR row
        const avrRowMatch = fullText.match(/AVR\s+([\d\.\s]+)/i);
        if (avrRowMatch && !avrRowMatch[0].includes('Load')) {
            const values = avrRowMatch[1].trim().split(/\s+/).filter(v => !isNaN(parseFloat(v)));
            if (values.length >= 5) {
                extractedValues[`AVR_20mm`] = values[1];
                extractedValues[`AVR_40mm`] = values[2];
                extractedValues[`AVR_60mm`] = values[3];
                extractedValues[`AVR_80mm`] = values[4];
                extractedValues[`AVR_AVR`] = values[5];
            }
        }

        return NextResponse.json({
            text: fullText,
            extractedValues: Object.keys(extractedValues).length > 0 ? extractedValues : { "결과": "데이터를 찾을 수 없습니다." },
            isMock: false
        });
    } catch (error: any) {
        console.error('OCR failed:', error);
        return NextResponse.json({ error: 'OCR failed', message: error.message }, { status: 500 });
    }
}
