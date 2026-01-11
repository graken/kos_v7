/**
 * 이미지 압축 및 썸네일 생성을 위한 유틸리티
 */

export interface ProcessedImages {
    original: string; // 압축된 원본 (Base64)
    thumbnail: string; // 썸네일 (Base64)
}

/**
 * 브라우저에서 이미지를 압축하고 썸네일을 생성합니다.
 */
export async function processImage(file: File): Promise<ProcessedImages> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                // 1. 압축된 원본 생성 (최대 해상도 1920px)
                const originalBase64 = compressImage(img, 1920, 0.7);
                // 2. 썸네일 생성 (최대 해상도 200px)
                const thumbnailBase64 = compressImage(img, 200, 0.6);

                resolve({
                    original: originalBase64,
                    thumbnail: thumbnailBase64
                });
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
}

function compressImage(img: HTMLImageElement, maxWidth: number, quality: number): string {
    let width = img.width;
    let height = img.height;

    // 비율 유지하며 리사이징
    if (width > maxWidth) {
        height = (maxWidth / width) * height;
        width = maxWidth;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return "";

    ctx.drawImage(img, 0, 0, width, height);

    // JPEG 형식으로 압축
    return canvas.toDataURL('image/jpeg', quality);
}
