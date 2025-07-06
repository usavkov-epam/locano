import { Body,Controller, Headers, Post } from '@nestjs/common';
import { SQSEvent } from 'aws-lambda';

import { GithubService } from './github.service';

@Controller('github/webhook')
export class GithubController {
  constructor(private readonly githubService: GithubService) {}

  // @Post()
  // async handleWebhook(
  //   @Headers('x-github-event') event: string,
  //   @Body() payload: any
  // ) {
  //   if (event === 'push') {
  //     return this.githubService.handlePush(payload);
  //   }

  //   return { status: 'ignored', event };
  // }

  @Post()
  async handleProxyWebhook(
    @Headers('x-github-event') event: string,
    @Body() payload: any
  ) {
    const branch = payload?.ref?.replace('refs/heads/', '');

    if (branch !== process.env.GITHUB_TARGET_BRANCH) {
      return {
        status: 'ignored',
        event,
        message: `Skipping event from non-target branch ${branch}, target is ${process.env.GITHUB_TARGET_BRANCH}`,
      };
    }

    if (event === 'push') {
      const message: SQSEvent = {
        Records: [
          {
            body: JSON.stringify(payload),
            attributes: {
              ApproximateReceiveCount: '1',
              SentTimestamp: Date.now().toString(),
              SenderId: 'github-webhook',
              ApproximateFirstReceiveTimestamp: Date.now().toString(),
            },
            messageId: '1',
            receiptHandle: '1',
            md5OfBody: '1',
            eventSource: 'aws:sqs',
            eventSourceARN: 'arn:aws:sqs:us-east-1:123456789012:github-webhook',
            awsRegion: 'us-east-1',
            messageAttributes: {
              event: {
                dataType: 'String',
                stringValue: event,
              }
            },
          },
        ],
      };
  
      return this.githubService.handleMessage(message);
    }

    return { status: 'ignored', event };
  }

  @Post('sqs')
  async handleMessage(@Body() payload: any) {
    return this.githubService.handleMessage(payload);
  }
}
