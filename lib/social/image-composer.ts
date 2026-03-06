import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BUCKET = 'carousel-slides';

// Dimensões do carrossel Instagram (quadrado 1:1)
const W = 1080;
const H = 1080;

// Dimensões do Story Instagram (9:16 vertical)
const SW = 1080;
const SH = 1920;

export interface SlideImageResult {
    publicUrl: string;
}

/**
 * Compõe uma imagem de slide para o carrossel do Instagram.
 * - Se houver imageUrl: baixa a imagem original e aplica overlay de texto
 * - Se não houver: gera um fundo premium com gradiente escuro
 * Faz upload ao Supabase Storage e retorna a URL pública acessível pela Meta.
 */
export async function composeSlideImage(
    sourceImageUrl: string | undefined | null,
    title: string,
    summary: string,
    slideIndex: number
): Promise<SlideImageResult> {
    console.log(`[composer] Compondo slide ${slideIndex + 1}: "${title.slice(0, 40)}..."`);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    // Alta qualidade de renderização
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ── 1. Fundo ────────────────────────────────────────────────
    if (sourceImageUrl) {
        try {
            // Tenta buscar a versão maior da imagem antes de renderizar
            const highResUrl = getHighResUrl(sourceImageUrl);
            const img = await loadImage(highResUrl);
            // Preencher o canvas com a imagem (object-fit: cover) com alta qualidade
            const scale = Math.max(W / img.width, H / img.height);
            const sw = img.width * scale;
            const sh = img.height * scale;
            const sx = (W - sw) / 2;
            const sy = (H - sh) / 2;
            ctx.drawImage(img, sx, sy, sw, sh);
        } catch {
            // Fallback para fundo gradiente se a imagem falhar
            drawGradientBackground(ctx);
        }
    } else {
        drawGradientBackground(ctx);
    }

    // ── 2. Overlay gradiente no rodapé ──────────────────────────
    const overlayHeight = Math.round(H * 0.56);  // um pouco maior para acomodar fontes maiores
    const gradient = ctx.createLinearGradient(0, H - overlayHeight, 0, H);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.35, 'rgba(0, 0, 0, 0.75)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.96)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, H - overlayHeight, W, overlayHeight);

    // ── 3. Linha de acento (verde esmeralda) ─────────────────────
    ctx.fillStyle = '#10b981';
    ctx.fillRect(60, H - overlayHeight + 20, 80, 5);

    // ── 4. Título ────────────────────────────────────────────────
    const titleY = H - overlayHeight + 44;
    const maxW = W - 120;

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 64px sans-serif';  // 64px
    ctx.textBaseline = 'top';

    const titleLines = wrapText(ctx, title.toUpperCase(), maxW);
    let currentY = titleY;
    for (const line of titleLines.slice(0, 3)) {
        ctx.fillText(line, 60, currentY);
        currentY += 66;  // era 56 — mais espaço entre linhas do título
    }

    // ── 5. Resumo ─────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '42px sans-serif';  // 42px
    currentY += 28;  // era 10 — espaço vertical generoso entre título e descrição

    const summaryLines = wrapText(ctx, summary, maxW);
    for (const line of summaryLines.slice(0, 4)) {
        ctx.fillText(line, 60, currentY);
        currentY += 46;  // era 38 — entrelinha maior p/ legibilidade
    }

    // ── 6. Branding no rodapé ─────────────────────────────────────
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('📊 Notícia da Hora', 60, H - 44);

    // ── 7. Número do slide (canto superior direito) ───────────────
    ctx.fillStyle = 'rgba(16, 185, 129, 0.9)';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${slideIndex + 1}`, W - 40, 40);
    ctx.textAlign = 'left';

    // ── 8. Upload para Supabase Storage ──────────────────────────
    const buffer = canvas.toBuffer('image/jpeg', 100);  // qualidade MÁXIMA
    const filename = `slide-${Date.now()}-${slideIndex}.jpg`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
        });

    if (error) {
        throw new Error(`[composer] Erro ao fazer upload do slide: ${error.message}`);
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);

    console.log(`[composer] ✅ Slide ${slideIndex + 1} pronto: ${filename}`);

    return { publicUrl: urlData.publicUrl };
}

/**
 * Compõe uma imagem de Story para o Instagram (formato 9:16 — 1080x1920).
 * Layout vertical com texto bem posicionado na parte inferior da tela.
 */
export async function composeStoryImage(
    sourceImageUrl: string | undefined | null,
    title: string,
    summary: string,
): Promise<SlideImageResult> {
    console.log(`[composer] Compondo story 2× (2160×3840): "${title.slice(0, 40)}..."`);

    // ── Render em 2× para upscale (2160×3840) ────────────────
    const SCALE = 2;
    const CW = SW * SCALE;  // 2160
    const CH = SH * SCALE;  // 3840

    const canvas = createCanvas(CW, CH);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ── 1. Fundo ──────────────────────────────────────────────
    if (sourceImageUrl) {
        try {
            const highResUrl = getHighResUrl(sourceImageUrl);
            const img = await loadImage(highResUrl);
            const scale = Math.max(CW / img.width, CH / img.height);
            const iw = img.width * scale;
            const ih = img.height * scale;
            ctx.drawImage(img, (CW - iw) / 2, (CH - ih) / 2, iw, ih);
        } catch {
            drawGradientBg(ctx, CW, CH);
        }
    } else {
        drawGradientBg(ctx, CW, CH);
    }

    // ── 2. Overlay escuro nos 65% inferiores ─────────────────
    //    Mais espaço para texto com degradê fundo
    const overlayH = Math.round(CH * 0.65);
    const overlayY = CH - overlayH;
    const grad = ctx.createLinearGradient(0, overlayY, 0, CH);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.15, 'rgba(0,0,0,0.60)');
    grad.addColorStop(0.35, 'rgba(0,0,0,0.85)');
    grad.addColorStop(1, 'rgba(0,0,0,0.97)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, overlayY, CW, overlayH);

    const padX = 90 * SCALE;  // padding lateral
    const maxTextW = CW - padX * 2;

    // ── 3. Linha de acento verde ──────────────────────────────
    const lineY = overlayY + 90 * SCALE;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(padX, lineY, 130 * SCALE, 8 * SCALE);

    // ── 4. Título (Máx 3 linhas, 75px base) ──────────────────
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${75 * SCALE}px sans-serif`;
    ctx.textBaseline = 'top';

    const titleLines = wrapText(ctx, title.toUpperCase(), maxTextW);
    let curY = lineY + 32 * SCALE;
    for (const line of titleLines.slice(0, 3)) {
        ctx.fillText(line, padX, curY);
        curY += 86 * SCALE; // line height do título
    }

    // ── 5. Resumo (Máx 6 linhas, 46px base) ──────────────────
    curY += 16 * SCALE; // respiro entre titulo e texto
    ctx.fillStyle = 'rgba(255,255,255,0.90)';
    ctx.font = `${46 * SCALE}px sans-serif`;

    const summaryLines = wrapText(ctx, summary, maxTextW);
    for (const line of summaryLines.slice(0, 6)) {
        ctx.fillText(line, padX, curY);
        curY += 60 * SCALE; // line height do resumo
    }

    // ── 6. Branding no rodapé ─────────────────────────────────
    const brandY = CH - 110 * SCALE;
    // Divisor sutil
    ctx.fillStyle = 'rgba(16,185,129,0.3)';
    ctx.fillRect(padX, brandY - 24 * SCALE, maxTextW, 2 * SCALE);

    // Nome marca
    ctx.fillStyle = '#10b981';
    ctx.font = `bold ${40 * SCALE}px sans-serif`;
    ctx.fillText('📊 Notícia da Hora', padX, brandY);

    // ── 7. Upload ao Supabase (salvando qualidade max) ───────
    const buffer = canvas.toBuffer('image/jpeg', 100);
    const filename = `story-${Date.now()}.jpg`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, buffer, { contentType: 'image/jpeg', upsert: true });

    if (error) throw new Error(`[composer] Erro ao fazer upload do story: ${error.message}`);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    console.log(`[composer] ✅ Story pronto: ${filename}`);
    return { publicUrl: urlData.publicUrl };
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Tenta obter uma versão de maior resolução da imagem.
 * Suporta padrões comuns de CDNs (WordPress, Cloudinary, Imgix, G1, InfoMoney, etc).
 */
function getHighResUrl(url: string): string {
    try {
        const u = new URL(url);

        // Cloudinary: substitui w_NNN ou h_NNN por valores maiores
        if (u.hostname.includes('cloudinary')) {
            return url.replace(/\/w_\d+/, '/w_1920').replace(/\/h_\d+/, '/h_1920').replace(/\/q_\d+/, '/q_95');
        }

        // Imgix: substitui parâmetros w/h
        if (u.hostname.includes('imgix') || u.searchParams.has('w') || u.searchParams.has('width')) {
            u.searchParams.set('w', '1920');
            u.searchParams.set('q', '95');
            u.searchParams.delete('width');
            return u.toString();
        }

        // WordPress comum (ex: infomoney, exame): remove sufixo de tamanho
        // Padrão: imagem-300x200.jpg → imagem.jpg (versão full)
        const wpPattern = url.replace(/-\d+x\d+(\.(?:jpg|jpeg|png|webp))$/i, '$1');
        if (wpPattern !== url) return wpPattern;

        // G1/Globo: parâmetro ?fitIn=NNxNN → aumenta
        if (u.hostname.includes('globo') || u.searchParams.has('fitIn')) {
            u.searchParams.set('fitIn', '1920x1920');
            return u.toString();
        }

        // Genérico: adiciona ?w=1920 se não tiver parâmetros de tamanho
        if (!u.searchParams.has('w') && !u.searchParams.has('width') && !u.searchParams.has('size')) {
            u.searchParams.set('w', '1920');
            return u.toString();
        }

        return url; // fallback: URL original
    } catch {
        return url; // URL inválida, usa original
    }
}

function drawGradientBg(ctx: SKRSContext2D, width: number, height: number): void {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(0.5, '#0d1f3c');
    bg.addColorStop(1, '#052e16');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Grid pattern decorativo
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 60) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = 0; y < height; y += 60) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
}

/** @deprecated use drawGradientBg */
function drawGradientBackground(ctx: SKRSContext2D): void {
    drawGradientBg(ctx, W, H);
}

function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let current = '';

    for (const word of words) {
        const test = current ? `${current} ${word}` : word;
        const { width } = ctx.measureText(test);
        if (width > maxWidth && current) {
            lines.push(current);
            current = word;
        } else {
            current = test;
        }
    }
    if (current) lines.push(current);
    return lines;
}
