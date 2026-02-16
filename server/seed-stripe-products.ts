import { getUncachableStripeClient } from './stripeClient';

const PLANS = [
  {
    name: 'Foundations',
    description: 'For small ministries just getting started. 1 Admin + 1 Leader account with all platform features.',
    metadata: { plan_id: 'foundations', leader_limit: '1' },
    priceAmount: 1999,
  },
  {
    name: 'Formation',
    description: 'For growing ministries ready to expand their team. 1 Admin + up to 3 Leader accounts with all platform features.',
    metadata: { plan_id: 'formation', leader_limit: '3' },
    priceAmount: 2999,
  },
  {
    name: 'Stewardship',
    description: 'For established ministries with larger leadership teams. 1 Admin + up to 10 Leader accounts with all platform features.',
    metadata: { plan_id: 'stewardship', leader_limit: '10' },
    priceAmount: 5999,
  },
];

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  for (const plan of PLANS) {
    const existing = await stripe.products.search({
      query: `name:'${plan.name}' active:'true'`,
    });

    if (existing.data.length > 0) {
      console.log(`Product "${plan.name}" already exists (${existing.data[0].id}), skipping`);
      continue;
    }

    const product = await stripe.products.create({
      name: plan.name,
      description: plan.description,
      metadata: plan.metadata,
    });

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: plan.priceAmount,
      currency: 'usd',
      recurring: { interval: 'month' },
    });

    console.log(`Created product "${plan.name}" (${product.id}) with price ${price.id} ($${plan.priceAmount / 100}/month)`);
  }

  console.log('Done seeding Stripe products');
}

seedProducts().catch(console.error);
