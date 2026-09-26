import { createClient } from 'npm:@supabase/supabase-js@2';

async function hmacHex(message: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  try {
    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default;
    const signature = req.headers.get('x-razorpay-signature') ?? '';
    if (!webhookSecret || !url || !serviceKey || !signature) return new Response('Webhook not configured', { status: 503 });
    const rawBody = await req.text();
    const expected = await hmacHex(rawBody, webhookSecret);
    if (!safeEqual(expected, signature)) return new Response('Invalid signature', { status: 401 });
    const event = JSON.parse(rawBody);
    if (event.event !== 'payment.captured') return new Response('Ignored', { status: 200 });

    const payment = event.payload?.payment?.entity;
    if (!payment?.id || !payment?.order_id) return new Response('Invalid event', { status: 400 });
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: order, error } = await db.from('driverhub_payment_orders').select('id,amount_paise,status')
      .eq('provider_order_id', payment.order_id).maybeSingle();
    if (error || !order) return new Response('Order not found', { status: 404 });
    if (payment.amount !== order.amount_paise || payment.currency !== 'INR' || payment.status !== 'captured') {
      return new Response('Captured payment does not match the order', { status: 409 });
    }
    const { error: activationError } = await db.rpc('complete_driverhub_payment', { p_order_id: order.id, p_payment_id: payment.id });
    if (activationError) {
      console.error('Webhook entitlement activation failed', activationError.code);
      return new Response('Activation failed; provider will retry', { status: 503 });
    }
    return new Response('Payment activated', { status: 200 });
  } catch (error) {
    console.error('razorpay-webhook failed', error);
    return new Response('Webhook processing failed', { status: 500 });
  }
});
