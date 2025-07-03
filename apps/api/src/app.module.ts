import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { GithubModule } from './github/github.module';

@Module({
  imports: [GithubModule, ConfigModule.forRoot({
      expandVariables: true,
    })],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
