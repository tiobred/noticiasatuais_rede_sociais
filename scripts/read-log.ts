import fs from 'fs';

try {
    const content = fs.readFileSync('scripts/debug_run_promo_3.log', 'utf16le');
    console.log(content);
} catch (err) {
    console.error(err);
}
