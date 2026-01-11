import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Base64 이미지를 파일로 저장합니다.
 * @param base64Data Base64 문자열 (data:image/jpeg;base64,...)
 * @param subDir 저장할 하위 디렉토리 (originals 또는 thumbnails)
 * @returns 저장된 파일의 상대 경로 (/uploads/...)
 */
export async function saveImageToFile(base64Data: string, subDir: 'originals' | 'thumbnails'): Promise<string> {
    if (!base64Data || !base64Data.startsWith('data:image')) {
        return base64Data; // 이미 URL이거나 잘못된 데이터면 그대로 반환
    }

    // Base64 데이터 추출
    const base64Content = base64Data.split(';base64,').pop();
    if (!base64Content) throw new Error('Invalid base64 data');

    const buffer = Buffer.from(base64Content, 'base64');
    const fileName = `${uuidv4()}.jpg`;

    // 저장 경로 설정 (public/uploads/...)
    const relativeDir = path.join('uploads', subDir);
    const absoluteDir = path.join(process.cwd(), 'public', relativeDir);

    // 디렉토리가 없으면 생성 (재귀적)
    if (!fs.existsSync(absoluteDir)) {
        fs.mkdirSync(absoluteDir, { recursive: true });
    }

    const absolutePath = path.join(absoluteDir, fileName);
    const relativePath = `/${path.join(relativeDir, fileName)}`; // 웹에서 접속 가능한 경로

    // 파일 저장
    fs.writeFileSync(absolutePath, buffer);

    return relativePath;
}
