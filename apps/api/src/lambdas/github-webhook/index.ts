export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const body = event.body;
  console.log('Payload:', body);

  return {
    statusCode: 200,
    body: JSON.stringify({ message: 'Webhook received' }),
  };
};
