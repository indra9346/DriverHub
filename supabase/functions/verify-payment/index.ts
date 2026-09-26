import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

async function signatureFor(orderId: string, paymentId: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${orderId}|${paymentId}`)));
  return Array.from(signature, byte => byte.toString(16).padStart(2, '0')).join('');
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}').default;
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!url || !serviceKey || !keyId || !keySecret) return json({ error: 'Payment service is not configured.' }, 503);
    const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Sign in to verify this payment.' }, 401);
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return json({ error: 'Your session is invalid or expired. Sign in again.' }, 401);

    const body = await req.json();
    const orderId = String(body.razorpay_order_id ?? '');
    const paymentId = String(body.razorpay_payment_id ?? '');
    const suppliedSignature = String(body.razorpay_signature ?? '');
    if (!orderId || !paymentId || !suppliedSignature) return json({ error: 'Payment verification details are incomplete.' }, 400);

    const { data: order, error: orderError } = await db.from('driverhub_payment_orders').select('*')
      .eq('provider_order_id', orderId).eq('employer_id', auth.user.id).maybeSingle();
    if (orderError || !order) return json({ error: 'Payment order does not belong to this employer.' }, 404);
    if (order.status === 'paid') return json({ verified: true, already_applied: true });
    const expected = await signatureFor(orderId, paymentId, keySecret);
    if (!safeEqual(expected, suppliedSignature)) return json({ error: 'Payment signature could not be verified.' }, 400);

    // Confirm the provider's payment record too; never grant entitlements from
    // the browser callback alone.
    const paymentResponse = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
      headers: { Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}` },
    });
    const payment = await paymentResponse.json();
    if (!paymentResponse.ok || payment.order_id !== orderId || payment.amount !== order.amount_paise || payment.currency !== 'INR' || payment.status !== 'captured') {
      return json({ error: 'Payment is not captured yet. Your plan will activate after the provider confirms it.' }, 409);
    }
    const { error: completeError } = await db.rpc('complete_driverhub_payment', { p_order_id: order.id, p_payment_id: paymentId });
    if (completeError) {
      console.error('Payment entitlement activation failed', completeError.code);
      return json({ error: 'Payment was received, but plan activation needs a retry. Contact support with payment ID ' + paymentId }, 503);
    }
    return json({ verified: true, already_applied: false });
  } catch (error) {
    console.error('verify-payment failed', error);
    return json({ error: 'Could not verify payment. Please retry or contact support.' }, 500);
  }
});
