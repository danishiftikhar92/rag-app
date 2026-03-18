import { Module } from '@nestjs/common';
import { UiController } from './ui.controller';
import { UiService } from './ui.service';
import { RagModule } from '../rag/rag.module';

@Module({
  imports: [RagModule],
  controllers: [UiController],
  providers: [UiService],
})
export class UiModule {}
