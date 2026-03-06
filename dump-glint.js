const { chromium } = require('playwright');
const fs = require('fs');

async function main() {
    console.log('Iniciando browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    console.log('Acessando glint.trade...');
    await page.goto('https://glint.trade/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000); // 5 seconds
    const content = await page.content();
    fs.writeFileSync('glint-dump.html', content);
    console.log('Dump salvo em glint-dump.html');
    await browser.close();
}

main().catch(console.error);
