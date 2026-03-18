import { Injectable } from '@nestjs/common';
import { RagService } from '../rag/rag.service';

@Injectable()
export class UiService {
  constructor(private readonly ragService: RagService) {}

  async getDashboardData() {
    const sources = await this.ragService.getSources();
    const stats = await this.ragService.getStats();
    return { sources, stats };
  }
}
