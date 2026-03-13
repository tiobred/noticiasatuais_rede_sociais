require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: "commonjs",
    esModuleInterop: true
  }
});

const path = require('path');
const root = 'c:\\Users\\Anderson\\noticias_redes_sociais\\noticiasatuais_rede_sociais';
const { rehostVideo, deleteHostedFile } = require(path.join(root, 'lib', 'social', 'image-composer'));
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config({ path: path.join(root, '.env') });

async function test() {
    const videoUrl = 'https://www.w3schools.com/html/mov_bbb.mp4';
    console.log('🚀 Starting normalization test (Absolute Paths)...');
    
    try {
        const result = await rehostVideo(videoUrl, 'test-norm-abs', true);
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
