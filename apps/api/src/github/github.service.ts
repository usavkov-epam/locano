import { Injectable } from '@nestjs/common';
import { APIGatewayEvent, SQSEvent } from 'aws-lambda';

import * as consumer from '../lambdas/github-sqs-consumer';
import * as webhook from '../lambdas/github-webhook';

@Injectable()
export class GithubService {
  async handlePush(payload: any) {
    const apiGatewayEvent = {
      body: JSON.stringify(payload),
      headers: {
        'x-github-event': 'push',
        'content-type': 'application/json',
      },
      isBase64Encoded: false,
    };

    return webhook.handler(apiGatewayEvent as unknown as APIGatewayEvent);
  }

  async handleMessage(payload: SQSEvent) {
    return consumer.handler(payload);
  }
}
