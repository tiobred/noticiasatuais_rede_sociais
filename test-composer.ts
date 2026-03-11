import { composeSlideImage, composeStoryImage } from './lib/social/image-composer';
import { LayoutConfig } from './lib/social/image-composer';

async function test() {
    const imageUrl = 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=1000&auto=format&fit=crop';
    const title = 'This is a very long test title designed to see how it breaks into multi-lines and checking the upscale.';
    const summary = 'This is the summary of the post, we need to make sure the font colors and overlays work well.';

    const feedLayout: LayoutConfig = {
        fontSizeTitle: 50,
        fontSizeBody: 30,
        fontColor: '#FFFF00', // yellow
        overlayAlpha: 0.8
    };

    console.log('Generating Feed Image...');
    try {
        const feedRes = await composeSlideImage(imageUrl, title, summary, 0, feedLayout);
        console.log('Feed Image URL:', feedRes.publicUrl);
    } catch (e) {
        console.error('Failed to generate feed image', e);
    }

    const storyLayout: LayoutConfig = {
        fontSizeTitle: 70,
        fontSizeBody: 45,
        fontColor: '#00FF00', // green
        overlayAlpha: 0.4
    };

    console.log('Generating Story Image...');
    try {
        const storyRes = await composeStoryImage(imageUrl, title, summary, storyLayout);
        console.log('Story Image URL:', storyRes.publicUrl);
    } catch (e) {
        console.error('Failed to generate story image', e);
    }
}

test();
