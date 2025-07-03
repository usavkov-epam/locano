import { Injectable } from '@nestjs/common';
import { APIGatewayEvent } from 'aws-lambda';

import { handler } from '../lambdas/github-webhook';

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
    }

    return handler(apiGatewayEvent as unknown as APIGatewayEvent);
  }
}
