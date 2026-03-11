import { rehostVideo, deleteHostedFile } from './lib/social/image-composer';
import * as dotenv from 'dotenv';
dotenv.config();

async function test() {
    console.log('Testing rehostVideo...');
    try {
        const url = "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4";
        const res = await rehostVideo(url, 'test-simple');
        console.log('Result:', res);
        if (res.filename) {
            await deleteHostedFile(res.filename);
            console.log('Deleted successfully.');
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
