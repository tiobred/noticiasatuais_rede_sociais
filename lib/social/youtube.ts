import axios from 'axios';
import fs from 'fs';

/**
 * YouTube Publisher - Handles uploading viral shorts to YouTube.
 */
export class YouTubePublisher {
  constructor() {}

  /**
   * Gets YouTube configurations from environment variables.
   */
  private getConfigs() {
    const clientId = process.env.YOUTUBE_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_CLIENT_SECRET;
    const refreshToken = process.env.YOUTUBE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error('[youtube] Credenciais do YouTube ausentes no .env (YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, YOUTUBE_REFRESH_TOKEN)');
    }

    return { clientId, clientSecret, refreshToken };
  }

  /**
   * Gets a fresh access token using the refresh token.
   */
  private async getAccessToken(): Promise<string> {
    const { clientId, clientSecret, refreshToken } = this.getConfigs();

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }, { timeout: 15000 });

    return response.data.access_token;
  }

  /**
   * Uploads a video as a YouTube Short.
   */
  async publishShort(videoPath: string, title: string, description: string): Promise<{ postId: string }> {
    console.log(`[youtube] Iniciando upload de Short: ${title}`);
    
    const accessToken = await this.getAccessToken();
    const videoSize = fs.statSync(videoPath).size;

    // 1. Iniciar upload resumível
    const metadata = {
      snippet: {
        title: title.slice(0, 100),
        description: `${description}\n\n#shorts #viral #news`,
        categoryId: '25', // Notícias e Política
      },
      status: {
        privacyStatus: 'public',
        selfDeclaredMadeForKids: false,
      },
    };

    const initRes = await axios.post(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      metadata,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Length': videoSize,
          'X-Upload-Content-Type': 'video/mp4',
        },
        timeout: 20000,
      }
    );

    const uploadUrl = initRes.headers.location;

    // 2. Upload do binário do vídeo
    const videoBuffer = fs.readFileSync(videoPath);
    const uploadRes = await axios.put(uploadUrl, videoBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Length': videoSize,
      },
      timeout: 300000, // 5 minutes for video upload
    });

    console.log(`[youtube] ✅ Upload concluído com sucesso: ${uploadRes.data.id}`);
    return { postId: uploadRes.data.id };
  }
}
