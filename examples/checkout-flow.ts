import { FluxisClient, FluxisError, FluxisAuthError } from '@fluxisus/sdk';

async function main() {
  const fluxis = new FluxisClient({
    apiKey: 'fxs.stg.xxx',
    apiSecret: 'your-api-secret',
    environment: 'staging',
  });

  try {
    // Create PoS with webhook
    const pos = await fluxis.pointOfSale.create({
      name: 'Web Checkout',
      merchant: { name: 'My Store' },
    });

    // Set up webhook notifications
    const webhook = await fluxis.pointOfSale.createNotifications(pos.id, {
      webhookUrl: 'https://myshop.com/webhooks/fluxis',
    });

    console.log('Save this webhook secret:', webhook.secret);

    // Create a checkout URL (amount in reference currency, payment processed in crypto)
    const checkout = await fluxis.pointOfSale.createPaymentRequestCheckout(pos.id, {
      amount: '49.99',
      coinCode: 'USD',
      referenceId: 'order-002',
      order: {
        total: '49.99',
        coinCode: 'USD',
        description: 'Premium subscription',
        items: [
          {
            description: 'Premium Plan - Monthly',
            quantity: 1,
            unitPrice: '49.99',
            amount: '49.99',
            coinCode: 'USD',
          },
        ],
      },
    });

    console.log('Checkout payment ID:', checkout.id);
    console.log('Status:', checkout.status);

    // Check payment status later
    const status = await fluxis.pointOfSale.getPaymentRequest(pos.id, checkout.id);
    console.log('Payment status:', status.status);
  } catch (error) {
    if (error instanceof FluxisAuthError) {
      console.error('Authentication failed:', error.message);
    } else if (error instanceof FluxisError) {
      console.error(`API error [${error.code}]: ${error.message}`);
      if (error.details) console.error('Details:', error.details);
    } else {
      throw error;
    }
  }
}

main().catch(console.error);
