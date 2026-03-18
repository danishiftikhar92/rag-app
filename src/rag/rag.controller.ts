import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UploadedFiles,
  UseInterceptors,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { RagService } from './rag.service';
import { IngestUrlDto, QueryDto } from './dto';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const storage = diskStorage({
  destination: './uploads',
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

@Controller('api/rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('ingest')
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage,
      limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
      fileFilter: (_req, file, cb) => {
        const allowedMimes = [
          'application/pdf',
          'text/plain',
          'text/markdown',
          'audio/mpeg',
          'audio/wav',
          'audio/mp3',
          'audio/ogg',
          'audio/flac',
          'video/mp4',
          'video/webm',
          'video/avi',
          'video/mkv',
          'application/octet-stream',
        ];

        if (allowedMimes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new HttpException(
              `Unsupported file type: ${file.mimetype}`,
              HttpStatus.BAD_REQUEST,
            ),
            false,
          );
        }
      },
    }),
  )
  async ingestFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: { collectionName?: string },
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('No files uploaded', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.ragService.ingestFiles(files, body.collectionName);
    } catch (error) {
      throw new HttpException(
        `Ingestion failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('ingest/url')
  async ingestUrl(@Body() dto: IngestUrlDto) {
    if (!dto.url) {
      throw new HttpException('URL is required', HttpStatus.BAD_REQUEST);
    }

    try {
      new URL(dto.url);
    } catch {
      throw new HttpException('Invalid URL format', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.ragService.ingestUrl(dto.url, dto.collectionName);
    } catch (error) {
      throw new HttpException(
        `URL ingestion failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('query')
  async query(@Body() dto: QueryDto) {
    if (!dto.question) {
      throw new HttpException('Question is required', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.ragService.query(
        dto.question,
        dto.collectionName,
        dto.topK || 5,
      );
    } catch (error) {
      throw new HttpException(
        `Query failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('sources')
  async getSources() {
    return this.ragService.getSources();
  }

  @Get('stats')
  async getStats() {
    return this.ragService.getStats();
  }

  @Delete('source/:id')
  async deleteSource(@Param('id') id: string) {
    if (!id) {
      throw new HttpException('Collection ID is required', HttpStatus.BAD_REQUEST);
    }

    try {
      return await this.ragService.deleteSource(id);
    } catch (error) {
      throw new HttpException(
        `Deletion failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete('clear')
  async clearAll() {
    return this.ragService.clearAll();
  }
}
