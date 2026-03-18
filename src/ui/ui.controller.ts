import { Controller, Get, Render } from '@nestjs/common';
import { UiService } from './ui.service';

@Controller()
export class UiController {
  constructor(private readonly uiService: UiService) {}

  @Get()
  @Render('dashboard')
  async dashboard() {
    const { sources, stats } = await this.uiService.getDashboardData();
    return {
      title: 'Dashboard',
      page: 'dashboard',
      sources,
      stats,
    };
  }

  @Get('upload')
  @Render('upload')
  uploadPage() {
    return { title: 'Upload Files', page: 'upload' };
  }

  @Get('website')
  @Render('website')
  websitePage() {
    return { title: 'Ingest Website', page: 'website' };
  }

  @Get('chat')
  @Render('chat')
  chatPage() {
    return { title: 'Chat', page: 'chat' };
  }
}
