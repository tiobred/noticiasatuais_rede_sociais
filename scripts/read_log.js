const fs = require('fs');
const buf = fs.readFileSync('debug_reels_test.log');
const content = buf.toString('utf16le');
const lines = content.split('\n');
for (let i = 0; i < Math.min(lines.length, 50); i++) {
    console.log(`L${i + 1}: ${lines[i].trim()}`);
}
