import { buffer } from 'node:stream/consumers';
import Stripe from 'stripe';
import { getRedis, tierKey } from '../lib/redis.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '');

function tierFromPriceId(priceId) {
  if (!priceId) return 'lite';
  if (process.env.STRIPE_PRICE_MAX && priceId === process.env.STRIPE_PRICE_MAX) {
    return 'max';
  }
  if (process.env.STRIPE_PRICE_PRO && priceId === process.env.STRIPE_PRICE_PRO) {
    return 'pro';
  }
  return 'lite';
}

function tierFromSubscription(sub) {
  if (!sub || sub.status === 'canceled' || sub.status === 'unpaid') {
    return 'lite';
  }
  const priceId = sub.items?.data?.[0]?.price?.id || '';
  const fromMeta = sub.metadata?.tier;
  if (fromMeta === 'max' || fromMeta === 'pro' || fromMeta === 'lite') {
    return fromMeta;
  }
  return tierFromPriceId(priceId);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const sig = req.headers['stripe-signature'];
  if (!secret || !sig) {
    return res.status(400).send('Missing webhook configuration');
  }

  let event;
  try {
    let buf;
    if (Buffer.isBuffer(req.body)) buf = req.body;
    else if (typeof req.body === 'string') buf = Buffer.from(req.body, 'utf8');
    else buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, secret);
  } catch (err) {
    console.error('Stripe webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const redis = getRedis();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.instant_user_id || session.metadata?.user_id;
        if (!userId) {
          console.warn('checkout.session.completed missing instant_user_id');
          break;
        }
        let tier = session.metadata?.tier;
        if (tier !== 'pro' && tier !== 'max' && tier !== 'lite') {
          tier = 'lite';
        }
        if (session.subscription && tier === 'lite') {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          tier = tierFromSubscription(sub);
        }
        if (redis) await redis.set(tierKey(userId), tier);
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const userId = sub.metadata?.instant_user_id || sub.metadata?.user_id;
        if (!userId) {
          console.warn('subscription event missing instant_user_id');
          break;
        }
        const tier =
          event.type === 'customer.subscription.deleted'
            ? 'lite'
            : tierFromSubscription(sub);
        if (redis) await redis.set(tierKey(userId), tier);
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error('Stripe handler error:', e);
    return res.status(500).json({ error: 'Handler failed' });
  }

  return res.status(200).json({ received: true });
}
