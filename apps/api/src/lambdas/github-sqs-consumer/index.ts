import type { PushEvent } from '@octokit/webhooks-types';
import type { SQSEvent, SQSRecord } from 'aws-lambda';

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
    try {
      const eventType = record.messageAttributes?.event?.stringValue ?? 'unknown';
      const body = JSON.parse(record.body);

      if (eventType !== 'push') {
        console.log(`Skipping event: ${eventType}`);

        continue;
      }

      const payload = body as PushEvent;

      console.log(`Processing push event to ${payload.ref} on repo ${payload.repository.full_name}`);

      await handlePushEvent(payload);
    } catch (err) {
      console.error('Failed to process message:', err);
      throw err;
    }
  }
};

async function handlePushEvent(payload: PushEvent): Promise<void> {
  const repo = payload.repository.full_name;
  const branch = payload.ref.replace('refs/heads/', '');
  const modifiedFiles = payload.head_commit?.modified ?? [];

  console.log(`[${repo}] push to branch: ${branch}`);
  console.log(`Modified files: ${modifiedFiles.join(', ')}`);

  // TODO: 
  // 1. Получить content до и после изменения
  // 2. Сравнить JSON-ключи
  // 3. Генерировать переводы
  // 4. Создать PR через GitHub API
}
