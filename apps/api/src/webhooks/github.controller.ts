import { Controller, Post, Headers, Body } from '@nestjs/common';

import { GithubService } from './github.service';

@Controller('webhooks/github')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  @Post()
  async handleWebhook(
    @Headers('x-github-event') event: string,
    @Body() payload: any
  ) {
    if (event === 'push') {
      return this.githubService.handlePush(payload);
    }

    return { status: 'ignored', event };
  }
}
