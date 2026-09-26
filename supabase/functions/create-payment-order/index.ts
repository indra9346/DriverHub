import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const plans = {
  'jobs-3': { name: '3 Job credits', base: 1949, jobs: 3, database: 0, slots: 0, days: 30 },
  'jobs-6': { name: '6 Job credits', base: 3649, jobs: 6, database: 0, slots: 0, days: 90 },
  'jobs-13': { name: '13 Job credits', base: 7099, jobs: 13, database: 0, slots: 0, days: 180 },
  'unlimited-quarterly': { name: 'DriverHub Unlimited', base: 5999, jobs: 0, database: 600, slots: 1, days: 90 },
} as const;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
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
    if (!token) return json({ error: 'Sign in as an employer to purchase a plan.' }, 401);
    const db = createClient(url, serviceKey, { auth: { persistSession: false } });
    const { data: auth, error: authError } = await db.auth.getUser(token);
    if (authError || !auth.user) return json({ error: 'Your session is invalid or expired. Sign in again.' }, 401);
    const { data: profile } = await db.from('profiles').select('role,status,email,full_name,phone').eq('id', auth.user.id).maybeSingle();
    if (profile?.role !== 'employer' || profile.status !== 'active') return json({ error: 'An active employer account is required.' }, 403);

    const { plan_code } = await req.json();
    const plan = plans[plan_code as keyof typeof plans];
    if (!plan) return json({ error: 'Choose a valid DriverHub plan.' }, 400);
    const gst = Math.round(plan.base * 0.18);
    const amountPaise = (plan.base + gst) * 100;
    const localOrderId = crypto.randomUUID();
    const receipt = `dh${localOrderId.replaceAll('-', '')}`;
    const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ amount: amountPaise, currency: 'INR', receipt, notes: { driverhub_order_id: localOrderId, employer_id: auth.user.id, plan_code } }),
    });
    const razorpayOrder = await razorpayResponse.json();
    if (!razorpayResponse.ok || !razorpayOrder.id) {
      console.error('Razorpay order create failed', razorpayResponse.status, razorpayOrder.error?.code);
      return json({ error: 'Could not create a payment order. Please retry.' }, 502);
    }

    const { error: orderError } = await db.from('driverhub_payment_orders').insert({
      id: localOrderId, employer_id: auth.user.id, provider_order_id: razorpayOrder.id,
      plan_code, plan_name: plan.name, amount_paise: amountPaise, job_credits: plan.jobs,
      database_credits: plan.database, active_job_slots: plan.slots, validity_days: plan.days,
    });
    if (orderError) {
      console.error('Payment order persistence failed', orderError.code);
      return json({ error: 'Could not save the payment order. No payment was taken.' }, 500);
    }
    const { error: billingError } = await db.from('billing_transactions').insert({
      id: localOrderId, employer_id: auth.user.id, plan_details: plan.name,
      amount: (amountPaise / 100), status: 'Pending', invoice_id: null,
      job_credits_added: 0, db_credits_added: 0,
    });
    if (billingError) {
      await db.from('driverhub_payment_orders').delete().eq('id', localOrderId);
      console.error('Pending transaction persistence failed', billingError.code);
      return json({ error: 'Could not save the billing record. No payment was taken.' }, 500);
    }
    return json({ key_id: keyId, order_id: razorpayOrder.id, amount: amountPaise, currency: 'INR', name: plan.name, email: profile.email ?? auth.user.email, contact: profile.phone ?? '' });
  } catch (error) {
    console.error('create-payment-order failed', error);
    return json({ error: 'Could not start checkout. Please retry.' }, 500);
  }
});
