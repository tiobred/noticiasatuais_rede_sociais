console.log('Loading @napi-rs/canvas...');
try {
    const canvas = require('@napi-rs/canvas');
    console.log('Success!', Object.keys(canvas));
} catch (e: any) {
    console.error('Failed!', e.message);
}
