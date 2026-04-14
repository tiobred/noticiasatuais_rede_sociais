import { createCanvas, loadImage } from '@napi-rs/canvas';
import type { SKRSContext2D } from '@napi-rs/canvas';
import { VideoComposer } from './video-composer';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Diretório local onde as mídias temporárias são salvas
const LOCAL_MEDIA_DIR = path.join(process.cwd(), 'tmp', 'media');

/**
 * Garante que o diretório de mídia temporária exista.
 */
function ensureMediaDir() {
    if (!fs.existsSync(LOCAL_MEDIA_DIR)) {
        fs.mkdirSync(LOCAL_MEDIA_DIR, { recursive: true });
    }
}

/**
 * Helper com timeout para evitar que loadImage fique travado em sockets pendentes
 */
async function fetchImageBuffer(url: string): Promise<Buffer> {
    try {
        const response = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 });
        return Buffer.from(response.data);
    } catch (err: any) {
        throw new Error(`Timeout/erro ao baixar imagem ${url}: ${err.message}`);
    }
}

/**
 * Retorna a URL pública para um arquivo local servido via API route.
 * Em dev: http://localhost:3000/api/media/<filename>
 * Em produção: https://<domínio>/api/media/<filename>
 */
function getLocalMediaUrl(filename: string): string {
    const base = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
    return `${base}/api/media/${filename}`;
}

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
            const imgBuf = await fetchImageBuffer(highResUrl);
            const img = await loadImage(imgBuf);

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

    // ── 8. Salvar localmente e retornar URL via API route ───────────────
    const buffer = canvas.toBuffer('image/jpeg', 90);
    const filename = `slide-${Date.now()}-${slideIndex}-${Math.floor(Math.random() * 10000)}.jpg`;
    ensureMediaDir();
    fs.writeFileSync(path.join(LOCAL_MEDIA_DIR, filename), buffer);
    const publicUrl = getLocalMediaUrl(filename);
    console.log(`[composer] ✅ Slide ${slideIndex + 1} salvo localmente: ${filename}`);
    return { publicUrl };
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
            const imgBuf = await fetchImageBuffer(highResUrl);
            const img = await loadImage(imgBuf);

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

    // ── 7. Salvar localmente e retornar URL via API route ───────
    const buffer = canvas.toBuffer('image/jpeg', 90);
    const filename = `story-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
    ensureMediaDir();
    fs.writeFileSync(path.join(LOCAL_MEDIA_DIR, filename), buffer);
    const publicUrl = getLocalMediaUrl(filename);
    console.log(`[composer] ✅ Story salvo localmente: ${filename}`);
    return { publicUrl, _localFile: filename } as any;
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
        const imgBuf = await fetchImageBuffer(highResUrl);
        const img = await loadImage(imgBuf);

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

    // 3. Salvar localmente e retornar URL via API route
    const buffer = canvas.toBuffer('image/jpeg', 90);
    const filename = `story-orig-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
    ensureMediaDir();
    fs.writeFileSync(path.join(LOCAL_MEDIA_DIR, filename), buffer);
    const publicUrl = getLocalMediaUrl(filename);
    console.log(`[composer] ✅ Story original salvo localmente: ${filename}`);
    return { publicUrl, _localFile: filename } as any;
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
        const imgBuf = await fetchImageBuffer(highRes);
        const img = await loadImage(imgBuf);

        const canvas = createCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        const buffer = canvas.toBuffer('image/jpeg', 90);
        const filename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}.jpg`;
        ensureMediaDir();
        fs.writeFileSync(path.join(LOCAL_MEDIA_DIR, filename), buffer);
        return getLocalMediaUrl(filename);
    } catch (err) {
        console.error(`[composer] Erro ao re-hospedar imagem:`, err);
        return url; // fallback para URL original
    }
}

/**
 * Re-hospeda um vídeo externo no Supabase Storage, opcionalmente normalizando para Instagram.
 * @returns Um objeto contendo a URL pública e o nome do arquivo para deleção posterior.
 */
export async function rehostVideo(url: string, prefix = 'video', normalize = false): Promise<{ publicUrl: string; filename: string }> {
    const safeUrl = url || '';
    console.log(`[composer] Re-hospedando vídeo${normalize ? ' (com normalização)' : ''}: ${safeUrl.slice(0, 50)}...`);
    
    const tempDir = path.join(process.cwd(), 'tmp', 'rehost');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    
    const inputFilename = `raw-${Date.now()}-${Math.floor(Math.random() * 1000)}.mp4`;
    const inputPath = path.join(tempDir, inputFilename);

    try {
        const response = await axios.get(safeUrl, { responseType: 'arraybuffer', timeout: 30000 });
        const buffer = Buffer.from(response.data);
        fs.writeFileSync(inputPath, buffer);

        let finalPath = inputPath;
        let finalFilename = `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}.mp4`;

        if (normalize) {
            const videoComposer = new VideoComposer();
            finalPath = await videoComposer.normalizeForInstagram(inputPath, `norm-${finalFilename}`);
        }

        // Salvar vídeo no diretório local de mídias
        ensureMediaDir();
        const localPath = path.join(LOCAL_MEDIA_DIR, finalFilename);
        fs.copyFileSync(finalPath, localPath);

        // Cleanup dos temporários de processamento
        if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
        if (normalize && fs.existsSync(finalPath) && finalPath !== localPath) fs.unlinkSync(finalPath);

        const publicUrl = getLocalMediaUrl(finalFilename);
        return { publicUrl, filename: finalFilename };
    } catch (err) {
        console.error(`[composer] Erro ao re-hospedar vídeo:`, err);
        if (fs.existsSync(inputPath)) try { fs.unlinkSync(inputPath); } catch {}
        return { publicUrl: url, filename: '' }; // fallback
    }
}

/**
 * Remove um arquivo de mídia temporário local.
 */
export async function deleteHostedFile(filename: string): Promise<void> {
    if (!filename) return;
    try {
        const filePath = path.join(LOCAL_MEDIA_DIR, path.basename(filename));
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`[composer] Arquivo local removido: ${filename}`);
        }
    } catch (err) {
        console.error(`[composer] Falha ao remover arquivo local:`, err);
    }
}

// ── Helpers ────────────────────────────────────────────────────

/**
 * Tenta obter uma versão de maior resolução da imagem.
 * Suporta padrões comuns de CDNs (WordPress, Cloudinary, Imgix, G1, InfoMoney, etc).
 */
function getHighResUrl(url: string): string {
    if (!url) return '';
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

/**
 * Limpa arquivos de mídia temporários mais antigos que determinada idade (ms).
 * O padrão é limpar arquivos com mais de 1 hora.
 */
export async function cleanupLocalMedia(olderThanMs = 3600000): Promise<void> {
    console.log(`[composer] Verificando limpeza de arquivos locais antigos...`);
    const dirs = [LOCAL_MEDIA_DIR, path.join(process.cwd(), 'tmp', 'rehost')];
    
    for (const dir of dirs) {
        if (!fs.existsSync(dir)) continue;
        const files = fs.readdirSync(dir);
        let count = 0;
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            try {
                const stats = fs.statSync(filePath);
                if (Date.now() - stats.mtimeMs > olderThanMs) {
                    fs.unlinkSync(filePath);
                    count++;
                }
            } catch (err) {
                // ignora o erro individual
            }
        }
        if (count > 0) {
            console.log(`[composer] ✅ Removidos ${count} arquivos antigos no diretório ${path.basename(dir)}`);
        }
    }
}
