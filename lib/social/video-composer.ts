import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';
import fs from 'fs';

/**
 * Video Composer - Handles splitscreen creation and dynamic captioning.
 * Inspired by RealOficial strategy.
 */
export class VideoComposer {
  private tempDir: string;
  private ffmpegResolvedPath: string | null = null;

  constructor() {
    this.tempDir = path.join(process.cwd(), 'tmp', 'video-process');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
    this.resolveFfmpegPath();
  }

  private resolveFfmpegPath(): string | null {
    if (this.ffmpegResolvedPath) return this.ffmpegResolvedPath;

    let importedPath = ffmpegPath as any;
    if (importedPath && typeof importedPath === 'object' && importedPath.default) {
      importedPath = importedPath.default;
    }

    const possiblePaths = [
      importedPath,
      path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
      path.join(process.cwd(), 'node_modules', 'ffmpeg-static', 'ffmpeg'),
      path.join(process.cwd(), '..', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'), // Just in case of different CWD
      'C:\\Users\\Anderson\\noticias_redes_sociais\\noticiasatuais_rede_sociais\\node_modules\\ffmpeg-static\\ffmpeg.exe' // Absolute fallback
    ].filter(p => p && typeof p === 'string');

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log(`[video-composer] v3 - FFmpeg binary found at: ${p}`);
        this.ffmpegResolvedPath = p;
        ffmpeg.setFfmpegPath(p);
        return p;
      }
    }

    return null;
  }

  /**
   * Checks if FFmpeg is available in the system path.
   */
  async isFfmpegAvailable(): Promise<boolean> {
    console.log(`[video-composer] v3 - Checking FFmpeg availability...`);
    
    const p = this.resolveFfmpegPath();
    if (p) return true;

    console.error(`[video-composer] v3 - FFmpeg NOT found in node_modules.`);

    // Fallback: Check if 'ffmpeg' is in system path
    try {
      const { execSync } = require('child_process');
      execSync('ffmpeg -version');
      console.log(`[video-composer] v3 - FFmpeg found in system PATH.`);
      ffmpeg.setFfmpegPath('ffmpeg');
      this.ffmpegResolvedPath = 'ffmpeg';
      return true;
    } catch (e) {
      console.error(`[video-composer] v3 - FFmpeg NOT found in system PATH.`);
    }

    return new Promise((resolve) => {
      ffmpeg.getAvailableCodecs((err) => {
        if (err) {
          console.error(`[video-composer] v3 - FFmpeg getAvailableCodecs failed: ${err.message}`);
          resolve(false);
        } else {
          console.log(`[video-composer] v3 - FFmpeg confirmed via getAvailableCodecs.`);
          resolve(true);
        }
      });
    });
  }

  /**
   * Gets the duration of a video in seconds.
   */
  async getDuration(videoPath: string): Promise<number> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) reject(err);
        else resolve(metadata.format.duration || 0);
      });
    });
  }

  /**
   * Trims a video to a specific duration.
   */
  async trimVideo(videoPath: string, maxDuration: number, outputFileName: string): Promise<string> {
    const outputPath = path.join(this.tempDir, outputFileName);
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .duration(maxDuration)
        .outputOptions(['-c:v copy', '-c:a copy'])
        .on('error', (err) => reject(err))
        .on('end', () => resolve(outputPath))
        .save(outputPath);
    });
  }

  /**
   * Creates a splitscreen video (Vertical 9:16).
   * Top: Main content (News/Video)
   * Bottom: Satisfying video (GTA/Parkour/etc.)
   */
  async createViralSplitscreen(
    contentVideoPath: string,
    satisfyingVideoPath: string,
    outputFileName: string
  ): Promise<string> {
    const outputPath = path.join(this.tempDir, outputFileName);

    return new Promise((resolve, reject) => {
      ffmpeg()
        .input(contentVideoPath)
        .input(satisfyingVideoPath)
        .complexFilter([
          // Redimensionar e cortar para 1080x960 (2x = 1920 altura total, 9:16)
          '[0:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[top]',
          '[1:v]scale=1080:960:force_original_aspect_ratio=increase,crop=1080:960[bottom]',
          '[top][bottom]vstack=inputs=2[v]'
        ])
        .outputOptions([
          '-map [v]',
          '-map 0:a?', // Áudio opcional do conteúdo principal
          '-c:v libx264',
          '-preset veryfast',
          '-crf 23',
          '-pix_fmt yuv420p',
          '-t 59' // Força duração máxima de 59 segundos para YouTube Shorts
        ])
        .on('start', (cmd) => console.log(`[video-composer] FFmpeg command: ${cmd}`))
        .on('error', (err) => {
          console.error(`[video-composer] FFmpeg error: ${err.message}`);
          reject(new Error(`[video-composer] FFmpeg error: ${err.message}`));
        })
        .on('end', () => resolve(outputPath))
        .save(outputPath);
    });
  }

  /**
   * Adds dynamic-style centered captions to a video.
   */
  async addDynamicCaptions(
    videoPath: string,
    text: string,
    outputFileName: string
  ): Promise<string> {
    const outputPath = path.join(this.tempDir, outputFileName);
    
    // Escapar texto para o filtro drawtext (especialmente importante no Windows)
    const escapedText = (text || '').toUpperCase()
      .replace(/:/g, '\\:')
      .replace(/'/g, "'\\\\\\''")
      .replace(/%/g, '\\%');

    // Posicionar no meio do vídeo
    const drawtextFilter = `drawtext=text='${escapedText}':fontcolor=yellow:fontsize=54:x=(w-text_w)/2:y=(h-text_h)/2:bordercolor=black:borderw=4:enable='between(t,0,10)'`;

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoFilters(drawtextFilter)
        .on('start', (cmd) => console.log(`[video-composer] Captions command: ${cmd}`))
        .on('error', (err) => {
          console.error(`[video-composer] Captions error: ${err.message}`);
          reject(new Error(`[video-composer] Captions error: ${err.message}`));
        })
        .on('end', () => resolve(outputPath))
        .save(outputPath);
    });
  }

  async normalizeForInstagram(inputPath: string, outputFileName: string, maxDuration = 60): Promise<string> {
    const outputPath = path.join(this.tempDir, outputFileName);
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .duration(maxDuration)
        .complexFilter([
          // Resize and crop to 1080x1920 (9:16)
          'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920'
        ])
        .outputOptions([
          '-c:v libx264',
          '-preset veryfast',
          '-crf 23',
          '-pix_fmt yuv420p',
          '-c:a aac',
          '-b:a 128k',
          '-movflags +faststart' // Good for web playback/processing
        ])
        .on('start', (cmd) => console.log(`[video-composer] Normalizing command: ${cmd}`))
        .on('error', (err) => {
          console.error(`[video-composer] Normalization error: ${err.message}`);
          reject(new Error(`[video-composer] Normalization error: ${err.message}`));
        })
        .on('end', () => resolve(outputPath))
        .save(outputPath);
    });
  }
}
