import { SendMessageCommand,SQSClient } from '@aws-sdk/client-sqs';
import { APIGatewayEvent } from 'aws-lambda';
import { createHmac, timingSafeEqual } from 'crypto';

const sqs = new SQSClient({});

export const handler = async (event: APIGatewayEvent) => {
  try {
    const body = event.body;

    if (!body) {
      return {
        statusCode: 400,
        body: 'Missing body',
      };
    };

    if (!verifySignature(event)) {
      return {
        statusCode: 401,
        body: 'Signature verification failed.',
      };
    };

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL!,
        MessageBody: body,
        MessageAttributes: {
          event: {
            DataType: 'String',
            StringValue: event.headers['x-github-event'] || 'unknown',
          },
        },
      })
    );

    return {
      statusCode: 202,
      body: 'Accepted',
    };
  } catch (err) {
    console.error('Webhook error:', err);

    return {
      statusCode: 500,
      body: 'Internal Server Error',
    };
  }
};

function verifySignature(event: APIGatewayEvent): boolean {
  const signature = event.headers['x-hub-signature-256'];
  const secret = process.env.GITHUB_WEBHOOK_SECRET;

  if (!signature || !event.body || !secret) return false;

  const expectedSignature = `sha256=${createHmac('sha256', secret)
    .update(event.body, 'utf8')
    .digest('hex')}`;

  try {
    const actualSigBuffer = Buffer.from(signature);
    const expectedSigBuffer = Buffer.from(expectedSignature);

    return (
      actualSigBuffer.length === expectedSigBuffer.length && timingSafeEqual(actualSigBuffer, expectedSigBuffer)
    );
  } catch (err) {
    console.error('Signature verification failed:', err);

    return false;
  }
}
