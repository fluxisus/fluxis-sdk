import { FluxisClient } from '@fluxisus/sdk';

async function main() {
  const fluxis = new FluxisClient({
    apiKey: 'fxs.stg.xxx',
    apiSecret: 'your-api-secret',
  });

  // Create a Point of Sale
  const pos = await fluxis.pointOfSale.create({
    name: 'Online Store',
    merchant: { name: 'My Shop', description: 'E-commerce store' },
    paymentOptions: ['npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359'],
  });

  console.log('Created PoS:', pos.id);

  // Create a payment request — returns a NASPIP token
  const payment = await fluxis.pointOfSale.createPaymentRequest(pos.id, {
    amount: '25.00',
    uniqueAssetId: 'npolygon_t0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    referenceId: 'order-001',
  });

  console.log('NASPIP Token:', payment.token);
  console.log('Status:', payment.status);
  console.log('Expires at:', payment.expiration);
}

main().catch(console.error);
