import { Injectable } from '@nestjs/common';
import { APIGatewayEvent } from 'aws-lambda';

import * as webhook from '../lambdas/github-webhook';
import * as consumer from '../lambdas/github-sqs-consumer';

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

  async handleMessage(payload: any) {
    return consumer.handler(payload);
  }
}
