import { Module } from '@nestjs/common';

import { GithubController } from './github.controller';
import { GithubService } from './github.service';

@Module({
  imports: [],
  controllers: [GithubController],
  providers: [GithubService],
})
export class WebhooksModule {}
