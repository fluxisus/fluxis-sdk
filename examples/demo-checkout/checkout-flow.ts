import { FluxisClient, FluxisError, FluxisAuthError } from '@fluxisus/sdk';

async function main() {
  const fluxis = new FluxisClient({
    apiKey: 'fxs.stg.xxx',
    apiSecret: 'your-api-secret',
  });

  try {
    // Create PoS with webhook
    const pos = await fluxis.pointOfSale.create({
      name: 'Web Checkout',
      merchant: { name: 'My Store' },
    });

    // Set up webhook notifications — the primary way to track payment status
    const webhook = await fluxis.pointOfSale.createNotifications(pos.id, {
      webhookUrl: 'https://myshop.com/webhooks/fluxis',
    });

    console.log('Save this webhook secret:', webhook.secret);

    // Create a hosted checkout (amount in fiat reference currency, payment in crypto).
    // Order data is defined server-side — never trust client-supplied amounts.
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
    console.log('Checkout URL:', checkout.checkoutUrl);

    // Poll as a fallback — prefer webhooks for production payment fulfillment
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
