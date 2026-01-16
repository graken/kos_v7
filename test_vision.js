const { ImageAnnotatorClient } = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');

async function testVision() {
    try {
        const keyPath = path.resolve(process.cwd(), 'google-key.json');
        if (!fs.existsSync(keyPath)) {
            console.error('Key file not found');
            return;
        }
        const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
        if (keyFile.private_key) keyFile.private_key = keyFile.private_key.replace(/\\n/g, '\n');

        const client = new ImageAnnotatorClient({
            credentials: { client_email: keyFile.client_email, private_key: keyFile.private_key },
            projectId: keyFile.project_id
        });

        const imagePath = '/Users/graken/.gemini/antigravity/brain/8f964fb8-3685-49ec-97cb-4a4cdc788a55/uploaded_image_1768353200721.png';
        if (!fs.existsSync(imagePath)) {
            console.error('Image file not found:', imagePath);
            return;
        }
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString('base64');

        console.log('Calling Vision API...');
        const [result] = await client.textDetection({ image: { content: base64Image } });
        const fullText = result.fullTextAnnotation?.text || "";

        console.log('--- Vision Full Text ---');
        console.log(fullText);
        console.log('------------------------');

    } catch (error) {
        console.error('Vision test failed:', error);
    }
}

testVision();
