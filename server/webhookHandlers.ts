import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    const stripe = await getUncachableStripeClient();
    let event: Stripe.Event;
    try {
      event = JSON.parse(payload.toString()) as Stripe.Event;
    } catch {
      return;
    }

    await WebhookHandlers.handleSubscriptionEvent(event);
  }

  static async handleSubscriptionEvent(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
          if (customerId) {
            const church = await storage.getChurchByStripeCustomerId(customerId);
            if (church && church.subscriptionStatus !== 'free' && church.stripeSubscriptionId) {
              await storage.updateChurchSubscription(church.id, { subscriptionStatus: 'past_due' });
              console.log(`Ministry ${church.name} subscription set to past_due due to payment failure`);
            }
          }
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
          if (customerId) {
            const church = await storage.getChurchByStripeCustomerId(customerId);
            if (church && church.subscriptionStatus !== 'free') {
              await storage.updateChurchSubscription(church.id, { subscriptionStatus: 'active' });
              console.log(`Ministry ${church.name} subscription restored to active after payment`);
            }
          }
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const church = await storage.getChurchByStripeSubscriptionId(subscription.id);
          if (church) {
            let newStatus: "active" | "past_due" | "suspended" | "canceled" = "active";
            if (subscription.status === 'past_due') {
              newStatus = 'past_due';
            } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
              newStatus = 'suspended';
            } else if (subscription.status === 'active' || subscription.status === 'trialing') {
              newStatus = 'active';
            }
            await storage.updateChurchSubscription(church.id, { subscriptionStatus: newStatus });
            console.log(`Ministry ${church.name} subscription updated to ${newStatus}`);
          }
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const church = await storage.getChurchByStripeSubscriptionId(subscription.id);
          if (church) {
            await storage.updateChurchSubscription(church.id, { subscriptionStatus: 'suspended' });
            console.log(`Ministry ${church.name} subscription canceled/deleted, set to suspended`);
          }
          break;
        }

        default:
          break;
      }
    } catch (error) {
      console.error('Error handling subscription event:', error);
    }
  }
}
