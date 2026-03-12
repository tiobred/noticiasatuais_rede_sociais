import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
);

const BUCKET = 'media';

// Dimensões do carrossel Instagram (quadrado 1:1)
const W = 1080;
const H = 1080;

// Dimensões do Story Instagram (9:16 vertical)
const SW = 1080;
const SH = 1920;

export interface SlideImageResult {
    publicUrl: string;
}

export interface LayoutConfig {
    fontSizeTitle?: number;
    fontSizeBody?: number;
    fontColor?: string;
    overlayAlpha?: number;
}

/**
 * Compõe uma imagem de slide para o carrossel do Instagram.
 */
export async function composeSlideImage(
    sourceImageUrl: string | undefined | null,
    title: string,
    summary: string,
    slideIndex: number,
    config?: LayoutConfig
): Promise<SlideImageResult> {
    console.log(`[composer] Compondo slide ${slideIndex + 1}: "${title.slice(0, 40)}..."`);

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ── 1. Fundo com Imagem Borrada e Imagem Fit ────────────────
    if (sourceImageUrl) {
        try {
            const highResUrl = getHighResUrl(sourceImageUrl);
            const img = await loadImage(highResUrl);

            // 1a. Fundo Borrado (Scale to fill)
            const fillScale = Math.max(W / img.width, H / img.height);
            const fw = img.width * fillScale;
            const fh = img.height * fillScale;

            ctx.filter = 'blur(45px) brightness(0.5)';
            ctx.drawImage(img, (W - fw) / 2, (H - fh) / 2, fw, fh);
            ctx.filter = 'none';

            // 1b. Imagem Principal (Scale to fit mantendo aspect ratio)
            // Deixar espaço na parte inferior para o overlay de texto (aprox. 55% da altura)
            const fitScale = Math.min((W * 0.9) / img.width, (H * 0.55) / img.height);
            const sw = img.width * fitScale;
            const sh = img.height * fitScale;
            const sx = (W - sw) / 2;
            const sy = 40; // Margem superior

            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 40;
            ctx.shadowOffsetY = 10;
            ctx.drawImage(img, sx, sy, sw, sh);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;

        } catch {
            drawGradientBg(ctx, W, H);
        }
    } else {
        drawGradientBg(ctx, W, H);
    }

    // ── 2. Overlay gradiente no rodapé ──────────────────────────
    const overlayHeight = Math.round(H * 0.56);
    const alpha = config?.overlayAlpha !== undefined ? config.overlayAlpha : 0.85;
    const gradient = ctx.createLinearGradient(0, H - overlayHeight, 0, H);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.35, `rgba(0, 0, 0, ${alpha * 0.8})`);
    gradient.addColorStop(1, `rgba(0, 0, 0, ${Math.min(1, alpha * 1.2)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, H - overlayHeight, W, overlayHeight);

    // ── 3. Linha de acento (verde esmeralda) ─────────────────────
    ctx.fillStyle = '#10b981';
    ctx.fillRect(60, H - overlayHeight + 20, 80, 5);

    // ── 4. Título ────────────────────────────────────────────────
    const titleY = H - overlayHeight + 44;
    const maxW = W - 120;

    // Default 48px mapped to canvas size (approx 5x)
    const titleSize = (config?.fontSizeTitle || 48) * 2.5;
    ctx.font = `bold ${titleSize}px sans-serif`;
    ctx.textBaseline = 'top';
    ctx.fillStyle = config?.fontColor || '#ffffff';

    const titleLines = wrapText(ctx, title.toUpperCase(), maxW);
    let currentY = titleY;
    for (const line of titleLines.slice(0, 2)) {
        ctx.fillText(line, 60, currentY);
        currentY += titleSize * 1.1;
    }

    // ── 5. Resumo ─────────────────────────────────────────────────
    ctx.fillStyle = config?.fontColor ? `${config.fontColor}E6` : 'rgba(255, 255, 255, 0.9)'; // Slightly transparent
    const bodySize = (config?.fontSizeBody || 32) * 2.5;
    ctx.font = `${bodySize}px sans-serif`;
    currentY += 20;

    const summaryLines = wrapText(ctx, summary, maxW);
    for (const line of summaryLines.slice(0, 3)) {
        ctx.fillText(line, 60, currentY);
        currentY += bodySize * 1.3;
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
    const buffer = canvas.toBuffer('image/jpeg', 100);
    const filename = `slide-${Date.now()}-${slideIndex}.jpg`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, buffer, {
            contentType: 'image/jpeg',
            upsert: true,
        });

    if (error) throw new Error(`[composer] Erro ao fazer upload do slide: ${error.message}`);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    console.log(`[composer] ✅ Slide ${slideIndex + 1} pronto: ${filename}`);
    return { publicUrl: urlData.publicUrl };
}

/**
 * Compõe uma imagem de Story para o Instagram (formato 9:16 — 1080x1920).
 */
export async function composeStoryImage(
    sourceImageUrl: string | undefined | null,
    title: string,
    summary: string,
    config?: LayoutConfig
): Promise<SlideImageResult> {
    console.log(`[composer] Compondo story 2× (2160×3840): "${title.slice(0, 40)}..."`);

    const SCALE = 2;
    const CW = SW * SCALE;  // 2160
    const CH = SH * SCALE;  // 3840

    const canvas = createCanvas(CW, CH);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // ── 1. Fundo com Imagem Borrada e Imagem Fit ────────────────
    if (sourceImageUrl) {
        try {
            const highResUrl = getHighResUrl(sourceImageUrl);
            const img = await loadImage(highResUrl);

            // Fundo borrado scale to fill
            const fillScale = Math.max(CW / img.width, CH / img.height);
            const fw = img.width * fillScale;
            const fh = img.height * fillScale;

            ctx.filter = 'blur(60px) brightness(0.4)';
            ctx.drawImage(img, (CW - fw) / 2, (CH - fh) / 2, fw, fh);
            ctx.filter = 'none';

            // Imagem Principal Scale to Fit na parte superior
            const fitScale = Math.min((CW * 0.9) / img.width, (CH * 0.45) / img.height);
            const iw = img.width * fitScale;
            const ih = img.height * fitScale;

            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 40 * SCALE;
            ctx.shadowOffsetY = 10 * SCALE;
            ctx.drawImage(img, (CW - iw) / 2, 100 * SCALE, iw, ih);
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        } catch {
            drawGradientBg(ctx, CW, CH);
        }
    } else {
        drawGradientBg(ctx, CW, CH);
    }

    // ── 2. Overlay escuro na parte do texto ─────────────────
    const overlayH = Math.round(CH * 0.60);
    const overlayY = CH - overlayH;

    const alpha = config?.overlayAlpha !== undefined ? config.overlayAlpha : 0.65;
    const grad = ctx.createLinearGradient(0, overlayY, 0, CH);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.15, `rgba(0,0,0,${alpha * 0.7})`);
    grad.addColorStop(0.35, `rgba(0,0,0,${alpha * 1.1})`);
    grad.addColorStop(1, `rgba(0,0,0,${Math.min(1, alpha * 1.3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, overlayY, CW, overlayH);

    const padX = 90 * SCALE;
    const maxTextW = CW - padX * 2;

    // ── 3. Linha de acento verde ──────────────────────────────
    const lineY = overlayY + 90 * SCALE;
    ctx.fillStyle = '#10b981';
    ctx.fillRect(padX, lineY, 130 * SCALE, 8 * SCALE);

    // ── 4. Título ──────────────────
    ctx.fillStyle = config?.fontColor || '#ffffff';
    const titleSize = (config?.fontSizeTitle || 60) * SCALE;
    ctx.font = `bold ${titleSize}px sans-serif`;
    ctx.textBaseline = 'top';

    const titleLines = wrapText(ctx, title.toUpperCase(), maxTextW);
    let curY = lineY + 32 * SCALE;
    for (const line of titleLines.slice(0, 3)) {
        ctx.fillText(line, padX, curY);
        curY += titleSize * 1.1;
    }

    // ── 5. Resumo ──────────────────
    curY += 40 * SCALE;
    ctx.fillStyle = config?.fontColor ? `${config.fontColor}E6` : 'rgba(255,255,255,0.95)';
    const bodySize = (config?.fontSizeBody || 40) * SCALE;
    ctx.font = `${bodySize}px sans-serif`;

    const summaryLines = wrapText(ctx, summary, maxTextW);
    for (const line of summaryLines.slice(0, 6)) {
        ctx.fillText(line, padX, curY);
        curY += bodySize * 1.35;
    }

    // ── 6. Branding no rodapé ─────────────────────────────────
    const brandY = CH - 110 * SCALE;
    ctx.fillStyle = 'rgba(16,185,129,0.3)';
    ctx.fillRect(padX, brandY - 24 * SCALE, maxTextW, 2 * SCALE);

    ctx.fillStyle = '#10b981';
    ctx.font = `bold ${40 * SCALE}px sans-serif`;
    ctx.fillText('📊 Notícia da Hora', padX, brandY);

    // ── 7. Upload ao Supabase ───────
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

/**
 * Compõe uma imagem de Story para posts originais do Instagram (formato 9:16).
 * Coloca a imagem no centro com um fundo escuro fosco (mantém aspect ratio original, sem texto da notícia).
 */
export async function composeOriginalStoryImage(
    sourceImageUrl: string
): Promise<SlideImageResult> {
    console.log(`[composer] Compondo story original (9:16 fallback) para: ${sourceImageUrl.slice(0, 50)}...`);

    const SCALE = 2;
    const CW = SW * SCALE;  // 2160
    const CH = SH * SCALE;  // 3840

    const canvas = createCanvas(CW, CH);
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Fundo Gradiente Fosco
    drawGradientBg(ctx, CW, CH);

    // 2. Desenhar Imagem Original no Centro
    try {
        const highResUrl = getHighResUrl(sourceImageUrl);
        const img = await loadImage(highResUrl);

        // Calcular escala para caber na tela sem perder proporções
        const scale = Math.min((CW * 0.95) / img.width, (CH * 0.85) / img.height); // margem segura
        const iw = img.width * scale;
        const ih = img.height * scale;

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;

        ctx.drawImage(img, (CW - iw) / 2, (CH - ih) / 2, iw, ih);

        // Resetar sombra
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
    } catch {
        console.warn(`[composer] Falha ao carregar imagem original para composeOriginalStoryImage`);
    }

    // 3. Upload
    const buffer = canvas.toBuffer('image/jpeg', 95);
    const filename = `story-orig-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;

    const { error } = await supabase.storage
        .from(BUCKET)
        .upload(filename, buffer, { contentType: 'image/jpeg', upsert: true });

    if (error) throw new Error(`[composer] Erro ao fazer upload do story original: ${error.message}`);

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    console.log(`[composer] ✅ Story original pronto: ${filename}`);
    return { publicUrl: urlData.publicUrl };
}

/**
 * Re-hospeda uma imagem externa no Supabase Storage sem qualquer composição.
 * Útil para evitar erros de "circular reference" ou URLs temporárias do Instagram API.
 */
export async function rehostImage(url: string, prefix = 'original'): Promise<string> {
    console.log(`[composer] Re-hospedando imagem: ${url.slice(0, 50)}...`);
    if (prefix === 'original' || prefix === 'ig-original') {
        console.log(`[composer] Usando URL original de imagem (rehosting desativado p/ republicações): ${url.slice(0, 50)}...`);
        return url;
    }
    try {
        const highRes = getHighResUrl(url);
        const img = await loadImage(highRes);

        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const buffer = canvas.toBuffer('image/jpeg', 95);
        const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.jpg`;

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(filename, buffer, {
                contentType: 'image/jpeg',
                upsert: true,
            });

        if (error) throw error;

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
        return urlData.publicUrl;
    } catch (err) {
        console.error(`[composer] Erro ao re-hospedar imagem:`, err);
        return url; // fallback para URL original
    }
}

/**
 * Re-hospeda um vídeo externo no Supabase Storage.
 * Crucial para Reels, pois URLs do Instagram CDN expiram rápido ou falham no processamento.
 * @returns Um objeto contendo a URL pública e o nome do arquivo para deleção posterior.
 */
export async function rehostVideo(url: string, prefix = 'video'): Promise<{ publicUrl: string; filename: string }> {
    console.log(`[composer] Re-hospedando vídeo: ${url.slice(0, 50)}...`);
    try {
        const axios = require('axios');
        const response = await axios.get(url, { responseType: 'arraybuffer' });
        const buffer = Buffer.from(response.data);

        const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.mp4`;

        const { error } = await supabase.storage
            .from(BUCKET)
            .upload(filename, buffer, {
                contentType: 'video/mp4',
                upsert: true,
            });

        if (error) {
            throw error;
        }

        const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename);
        return { publicUrl: urlData.publicUrl, filename };
    } catch (err) {
        console.error(`[composer] Erro ao re-hospedar vídeo:`, err);
        return { publicUrl: url, filename: '' }; // fallback
    }
}

/**
 * Remove um arquivo do bucket do Supabase.
 */
export async function deleteHostedFile(filename: string): Promise<void> {
    if (!filename) return;
    try {
        console.log(`[composer] Removendo arquivo temporário: ${filename}`);
        await supabase.storage.from(BUCKET).remove([filename]);
    } catch (err) {
        console.error(`[composer] Falha ao remover arquivo do storage:`, err);
    }
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
