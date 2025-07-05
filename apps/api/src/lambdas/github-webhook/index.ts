import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import type { WebhookEvent } from '@octokit/webhooks-types';
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

    const parsedBody = JSON.parse(body);
    const eventType = event.headers['x-github-event'] || event.headers['X-GitHub-Event'] || 'unknown';

    /*
      Verify the signature of the incoming webhook event.
      If the signature verification fails, we return a 401 status code
      indicating that the request is unauthorized. 
     */
    if (!verifySignature(event)) {
      return {
        statusCode: 401,
        body: 'Signature verification failed',
      };
    };


    /*
      Check if the event type is either "push" or "pull_request" and if the
      modified files include the default locale file path.
      If not, we return a 100 status code indicating that the event does not
      require handling. 
     */
    if (
      !parsedBody?.head_commit?.modified?.includes(process.env.DEFAULT_LOCALE_FILE_PATH!) ||
      !['push'].includes(eventType)
    ) {
      return {
        statusCode: 100,
        body: `Event type ${eventType} does not require handling`,
      };
    }

    /*
      Check if the installation ID is present in the parsed body.
      If the installation ID is not present, we return a 400 status code
      indicating that the request is malformed. 
     */
    if (!parsedBody?.installation?.id) {
      return {
        statusCode: 400,
        body: 'Could not resolve installation ID',
      };
    }

    const messageBody = {
      ...parsedBody,
    }

    await sqs.send(
      new SendMessageCommand({
        QueueUrl: process.env.SQS_QUEUE_URL!,
        MessageBody: JSON.stringify(messageBody),
        MessageAttributes: {
          event: {
            DataType: 'String',
            StringValue: eventType,
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
  const signature = event.headers['x-hub-signature-256'] || event.headers['X-Hub-Signature-256'];
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
