import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

/**
 * Base64 이미지를 파일로 저장합니다.
 * @param base64Data Base64 문자열 (data:image/jpeg;base64,...)
 * @param subDir 저장할 하위 디렉토리 (originals 또는 thumbnails)
 * @returns 저장된 파일의 상대 경로 (/uploads/...)
 */
export async function saveImageToFile(base64Data: string, subDir: string): Promise<string> {
    try {
        if (!base64Data || !base64Data.startsWith('data:image')) {
            return base64Data;
        }

        const base64Content = base64Data.split(';base64,').pop();
        if (!base64Content) throw new Error('Invalid base64 data');

        const buffer = Buffer.from(base64Content, 'base64');
        const fileName = `${uuidv4()}.jpg`;

        const relativeDir = path.join('uploads', subDir);
        const absoluteDir = path.join(process.cwd(), 'public', relativeDir);

        if (!fs.existsSync(absoluteDir)) {
            fs.mkdirSync(absoluteDir, { recursive: true });
        }

        const absolutePath = path.join(absoluteDir, fileName);
        const relativePath = `/${path.join(relativeDir, fileName)}`;

        fs.writeFileSync(absolutePath, buffer);
        console.log(`Image saved successfully: ${absolutePath}`);

        return relativePath;
    } catch (error) {
        console.error('saveImageToFile error:', error);
        throw error;
    }
}

/**
 * 메모장 파일을 저장합니다. (이미지 및 일반 파일 대응)
 * 이미지가 'image' 타입으로 들어오면 썸네일을 함께 생성합니다.
 */
export async function saveMemoFile(data: string | Buffer, filename: string, type: 'image' | 'file'): Promise<{ url: string, thumbnailUrl?: string }> {
    const buffer = typeof data === 'string' ? Buffer.from(data.split(';base64,').pop() || '', 'base64') : data;

    // 1. 원본/파일 저장 경로 설정
    const appSubDir = type === 'image' ? 'images' : 'files';
    const relativeDir = path.join('notepad', 'uploads', appSubDir);
    const absoluteDir = path.join(process.cwd(), 'public', relativeDir);

    if (!fs.existsSync(absoluteDir)) fs.mkdirSync(absoluteDir, { recursive: true });

    const safeFileName = `${uuidv4()}_${filename}`;
    const absolutePath = path.join(absoluteDir, safeFileName);
    const relativePath = `/${path.join(relativeDir, safeFileName)}`;

    fs.writeFileSync(absolutePath, buffer);

    // 2. 이미지인 경우 썸네일 생성
    let thumbnailUrl: string | undefined = undefined;
    if (type === 'image') {
        const thumbRelativeDir = path.join('notepad', 'uploads', 'thumbnails');
        const thumbAbsoluteDir = path.join(process.cwd(), 'public', thumbRelativeDir);

        if (!fs.existsSync(thumbAbsoluteDir)) fs.mkdirSync(thumbAbsoluteDir, { recursive: true });

        const thumbFileName = `thumb_${safeFileName}`;
        const thumbAbsolutePath = path.join(thumbAbsoluteDir, thumbFileName);
        thumbnailUrl = `/${path.join(thumbRelativeDir, thumbFileName)}`;

        try {
            await sharp(buffer)
                .resize(200, 200, { fit: 'cover' })
                .toFile(thumbAbsolutePath);
        } catch (e) {
            console.error('Thumbnail generation failed:', e);
            // 썸네일 생성 실패 시 원본 경로를 대신 사용하거나 undefined 유지
        }
    }

    return { url: relativePath, thumbnailUrl };
}

/**
 * 내부 공통 이미지 처리 함수
 */
async function _processAndSaveImage(
    base64Data: string,
    dirName: string,
    options: { maxWidth?: number, quality?: number, thumbSize?: number } = {}
): Promise<{ url: string, thumbnailUrl: string }> {
    if (!base64Data || !base64Data.startsWith('data:image')) {
        throw new Error('Invalid image data');
    }

    const { maxWidth = 1200, quality = 80, thumbSize = 200 } = options;
    const base64Content = base64Data.split(';base64,').pop();
    if (!base64Content) throw new Error('Invalid base64 content');
    const buffer = Buffer.from(base64Content, 'base64');
    const fileName = `${uuidv4()}.jpg`;

    try {
        // 1. 원본 압축 저장
        const imgRelativeDir = path.join(dirName, 'uploads', 'images');
        const imgAbsoluteDir = path.join(process.cwd(), 'public', imgRelativeDir);

        console.log(`[IMAGE_SAVE] Request for ${dirName}. CWD: ${process.cwd()}`);
        console.log(`[IMAGE_SAVE] Absolute Directory: ${imgAbsoluteDir}`);

        if (!fs.existsSync(imgAbsoluteDir)) {
            console.log(`[IMAGE_SAVE] Creating directory: ${imgAbsoluteDir}`);
            fs.mkdirSync(imgAbsoluteDir, { recursive: true });
        }

        const imgAbsolutePath = path.join(imgAbsoluteDir, fileName);
        // URL은 항상 포직스 스타일(/)을 사용해야 하므로 직접 조합하거나 path.posix를 사용
        const imgRelativePath = `/${dirName}/uploads/images/${fileName}`;

        console.log(`[IMAGE_SAVE] Attempting to save file to: ${imgAbsolutePath}`);
        await sharp(buffer)
            .resize(maxWidth, undefined, { withoutEnlargement: true, fit: 'inside' })
            .jpeg({ quality })
            .toFile(imgAbsolutePath);

        console.log(`[IMAGE_SAVE] Save success! File exists: ${fs.existsSync(imgAbsolutePath)}`);

        // 2. 썸네일 생성
        const thumbRelativeDir = path.join(dirName, 'uploads', 'thumbnails');
        const thumbAbsoluteDir = path.join(process.cwd(), 'public', thumbRelativeDir);
        if (!fs.existsSync(thumbAbsoluteDir)) {
            console.log(`[OCR] Creating directory: ${thumbAbsoluteDir}`);
            fs.mkdirSync(thumbAbsoluteDir, { recursive: true });
        }

        const thumbFileName = `thumb_${fileName}`;
        const thumbAbsolutePath = path.join(thumbAbsoluteDir, thumbFileName);
        const thumbRelativePath = `/${dirName}/uploads/thumbnails/${thumbFileName}`;

        try {
            console.log(`[OCR] Saving thumbnail to: ${thumbAbsolutePath}`);
            await sharp(buffer)
                .resize(thumbSize, thumbSize, { fit: 'cover' })
                .jpeg({ quality: Math.max(quality - 10, 60) })
                .toFile(thumbAbsolutePath);

            return { url: imgRelativePath, thumbnailUrl: thumbRelativePath };
        } catch (thumbError) {
            console.error(`[OCR] Thumbnail generation failed, but original was saved:`, thumbError);
            return { url: imgRelativePath, thumbnailUrl: null as any };
        }
    } catch (error) {
        console.error(`[OCR] Error saving image:`, error);
        throw error;
    }
}

/**
 * 신성데이터 이미지를 압축하여 저장하고 썸네일을 생성합니다.
 */
export async function saveShinsungImage(base64Data: string): Promise<{ url: string, thumbnailUrl: string }> {
    return _processAndSaveImage(base64Data, 'shinsung');
}

/**
 * 박막도포 이미지를 압축하여 저장하고 썸네일을 생성합니다.
 */
export async function saveCoatingImage(base64Data: string): Promise<{ url: string, thumbnailUrl: string }> {
    return _processAndSaveImage(base64Data, 'coating');
}
