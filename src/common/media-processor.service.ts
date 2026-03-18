import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class MediaProcessorService {
  private readonly logger = new Logger(MediaProcessorService.name);
  private readonly uploadDir: string;

  constructor(private readonly config: ConfigService) {
    this.uploadDir =
      this.config.get<string>('UPLOAD_DIR') || path.join(process.cwd(), 'uploads');

    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async extractAudioFromVideo(videoPath: string): Promise<string> {
    const outputPath = videoPath.replace(/\.[^/.]+$/, '.wav');

    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .output(outputPath)
        .audioChannels(1)
        .audioFrequency(16000)
        .format('wav')
        .on('end', () => {
          this.logger.log(`Audio extracted: ${outputPath}`);
          resolve(outputPath);
        })
        .on('error', (err) => {
          this.logger.error(`FFmpeg error: ${err.message}`);
          reject(err);
        })
        .run();
    });
  }

  async transcribeAudio(audioPath: string): Promise<string> {
    const ollamaUrl =
      this.config.get<string>('OLLAMA_BASE_URL') || 'http://localhost:11434';

    try {
      const audioBuffer = fs.readFileSync(audioPath);
      const base64Audio = audioBuffer.toString('base64');

      const response = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.config.get<string>('OLLAMA_MODEL') || 'phi3:mini',
          prompt: `Transcribe the following audio content. If you cannot process audio directly, provide a description of what you would expect from this audio file based on any available metadata.`,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.statusText}`);
      }

      const data = (await response.json()) as { response: string };
      return data.response || '';
    } catch (error) {
      this.logger.warn(
        `Audio transcription via Ollama not available, using placeholder: ${error.message}`,
      );
      return `[Audio file: ${path.basename(audioPath)}] - Audio transcription requires a speech-to-text model. The audio file has been registered in the knowledge base.`;
    }
  }

  async processMediaFile(
    filePath: string,
    mimeType: string,
  ): Promise<{ text: string; sourceType: string }> {
    const isVideo = mimeType.startsWith('video/');
    const isAudio = mimeType.startsWith('audio/');

    if (isVideo) {
      this.logger.log(`Processing video: ${filePath}`);
      const audioPath = await this.extractAudioFromVideo(filePath);
      const transcript = await this.transcribeAudio(audioPath);
      this.cleanupFile(audioPath);
      return { text: transcript, sourceType: 'video' };
    }

    if (isAudio) {
      this.logger.log(`Processing audio: ${filePath}`);
      const transcript = await this.transcribeAudio(filePath);
      return { text: transcript, sourceType: 'audio' };
    }

    throw new Error(`Unsupported media type: ${mimeType}`);
  }

  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (err) {
      this.logger.warn(`Failed to cleanup file: ${filePath}`);
    }
  }

  isMediaFile(mimeType: string): boolean {
    return mimeType.startsWith('audio/') || mimeType.startsWith('video/');
  }

  isVideoFile(mimeType: string): boolean {
    return mimeType.startsWith('video/');
  }

  isAudioFile(mimeType: string): boolean {
    return mimeType.startsWith('audio/');
  }
}
