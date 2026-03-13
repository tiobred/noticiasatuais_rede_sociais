import { rehostVideo, deleteHostedFile } from '../lib/social/image-composer';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function test() {
    const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
    console.log('🚀 Starting normalization test...');
    
    try {
        const result = await rehostVideo(videoUrl, 'test-norm', true);
        console.log('✅ Result:', JSON.stringify(result, null, 2));
        
        if (result.filename) {
            console.log('🗑️ Cleaning up storage...');
            await deleteHostedFile(result.filename);
            console.log('✅ Cleanup complete.');
        }
    } catch (err) {
        console.error('❌ Test failed:', err);
    }
}

test();
