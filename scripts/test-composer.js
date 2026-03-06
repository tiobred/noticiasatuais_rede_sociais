// Script de teste mínimo para verificar a composição de slides
// Usa somente a lógica do canvas e upload sem depender dos módulos TS

require('dotenv/config');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const W = 1080, H = 1080;

async function composeAndUpload(imageUrl, title, summary, idx) {
    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // --- Fundo ---
    if (imageUrl) {
        try {
            const img = await loadImage(imageUrl);
            const scale = Math.max(W / img.width, H / img.height);
            ctx.drawImage(img, (W - img.width * scale) / 2, (H - img.height * scale) / 2, img.width * scale, img.height * scale);
        } catch {
            drawBg(ctx);
        }
    } else {
        drawBg(ctx);
    }

    // --- Overlay ---
    const over = ctx.createLinearGradient(0, H * 0.5, 0, H);
    over.addColorStop(0, 'rgba(0,0,0,0)');
    over.addColorStop(0.5, 'rgba(0,0,0,0.8)');
    over.addColorStop(1, 'rgba(0,0,0,0.97)');
    ctx.fillStyle = over;
    ctx.fillRect(0, H * 0.5, W, H * 0.5);

    // --- Acento ---
    ctx.fillStyle = '#10b981';
    ctx.fillRect(60, H * 0.52, 80, 5);

    // --- Título ---
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 46px sans-serif';
    ctx.textBaseline = 'top';
    const titleLines = wrap(ctx, title.toUpperCase(), W - 120);
    let y = H * 0.52 + 24;
    for (const ln of titleLines.slice(0, 3)) { ctx.fillText(ln, 60, y); y += 56; }

    // --- Resumo ---
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '30px sans-serif';
    y += 10;
    const sumLines = wrap(ctx, summary, W - 120);
    for (const ln of sumLines.slice(0, 4)) { ctx.fillText(ln, 60, y); y += 38; }

    // --- Branding ---
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('📊 Notícia da Hora', 60, H - 44);

    // --- Número do slide ---
    ctx.textAlign = 'right';
    ctx.fillText(`${idx + 1}`, W - 40, 40);
    ctx.textAlign = 'left';

    // --- Upload ---
    const buf = canvas.toBuffer('image/jpeg', 95);
    const name = `slide-${Date.now()}-${idx}.jpg`;

    const { error } = await supabase.storage.from('carousel-slides').upload(name, buf, { contentType: 'image/jpeg', upsert: true });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from('carousel-slides').getPublicUrl(name);
    return data.publicUrl;
}

function drawBg(ctx) {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#052e16');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
}

function wrap(ctx, text, maxW) {
    const words = text.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
        else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
}

async function main() {
    console.log('\n🎨 Testando composição de slides...\n');

    const slides = [
        {
            imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=1080',
            title: 'Queda nas Exportações para os EUA',
            summary: 'A queda contínua nas exportações para os EUA contrasta com o aumento para a China, indicando fortalecimento do real frente ao dólar.'
        },
        {
            imageUrl: null,
            title: 'Eclipse Lunar: Impacto Econômico Limitado',
            summary: 'O eclipse tem pouco ou nenhum impacto direto na economia brasileira, sem afetar câmbio ou Ibovespa.'
        }
    ];

    for (let i = 0; i < slides.length; i++) {
        try {
            const url = await composeAndUpload(slides[i].imageUrl, slides[i].title, slides[i].summary, i);
            console.log(`✅ Slide ${i + 1} OK → ${url}`);
        } catch (e) {
            console.error(`❌ Slide ${i + 1} FALHOU:`, e.message);
        }
    }
}

main().catch(console.error);
