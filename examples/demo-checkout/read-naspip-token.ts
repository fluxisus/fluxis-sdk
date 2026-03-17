import { FluxisClient } from '@fluxisus/sdk';

async function main() {
  const fluxis = new FluxisClient({
    apiKey: 'fxs.stg.xxx',
    apiSecret: 'your-api-secret',
  });

  const token = 'v4.local.your-naspip-token-here';

  // Check format before making API call
  if (!fluxis.naspip.isValidTokenFormat(token)) {
    console.error('Invalid NASPIP token format. Must start with "v4.local."');
    process.exit(1);
  }

  // Decode the token via the API
  const data = await fluxis.naspip.read(token);

  console.log('Payment info:', data.payment);
  console.log('Order info:', data.order);
  console.log('Payment options:', data.paymentOptions);
}

main().catch(console.error);
