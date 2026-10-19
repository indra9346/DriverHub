import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle, CheckCircle2, Info, Loader2, Phone, Sparkles, Wallet, X
} from 'lucide-react';
import { DataStore } from '../../services/store';
import { EmployerSubscription, BillingTransaction } from '../../types';
import { SupabaseSync } from '../../services/supabaseSync';
import { useLanguage } from '../../services/i18n';
import {
  clearLastError, invokeEdgeFunction, loadRazorpayCheckout, RazorpaySuccessResponse
} from '../../services/employerApi';

/** Plan codes must match supabase/functions/create-payment-order (prices there are authoritative). */
type PlanCode = 'jobs-3' | 'jobs-6' | 'jobs-13' | 'unlimited-quarterly';

interface PlanCard {
  code: PlanCode;
  name: string;
  amount: number;
  jobs: number;
  drivers: number;
  days: number;
  slots: number;
  old?: number;
  detail: string;
  recommended?: boolean;
}

interface SelectedPlan extends PlanCard {
  validity: string;
}

interface PaymentOrder {
  key_id: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  email?: string;
  contact?: string;
}

type Toast = { text: string; type: 'success' | 'error' | 'info' };

const gstFor = (amount: number) => Math.round(amount * 0.18);

const formatDay = (date: Date) => date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

/** Transactions store a UTC date (YYYY-MM-DD) and time (HH:MM); demo rows store display text. */
function formatTxnWhen(txn: BillingTransaction): { date: string; time: string } {
  let when: Date | null = null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(txn.date)) {
    const time = /^\d{2}:\d{2}/.test(txn.time || '') ? txn.time.slice(0, 5) : '00:00';
    when = new Date(`${txn.date}T${time}:00Z`);
  } else if (txn.date) {
    when = new Date(`${txn.date} ${txn.time || ''}`.trim());
  }
  if (!when || Number.isNaN(when.getTime())) return { date: txn.date || '—', time: txn.time || '' };
  return {
    date: formatDay(when),
    time: when.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  };
}

function formatAppliesUntil(value: string): string {
  if (!value) return '—';
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
    const date = new Date(value.replace(' ', 'T'));
    if (!Number.isNaN(date.getTime())) return `Valid until ${formatDay(date)}`;
  }
  return value;
}

export const EmployerBilling: React.FC = () => {
  const { t } = useLanguage();
  const currentUser = DataStore.getCurrentUser();
  const employerId = currentUser?.role === 'employer' ? currentUser.id : '';

  const [subscription, setSubscription] = useState<EmployerSubscription>(
    DataStore.getSubscription(employerId)
  );
  const [transactions, setTransactions] = useState<BillingTransaction[]>(
    DataStore.getBillingTransactions(employerId)
  );
  const [statusFilter, setStatusFilter] = useState<'All' | 'Success' | 'Pending' | 'Failed'>('All');
  const [showGstinModal, setShowGstinModal] = useState(false);
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SelectedPlan | null>(null);
  const demoCheckoutAvailable = DataStore.isDemoMode();

  // GSTIN Form
  const [gstinInput, setGstinInput] = useState('');
  const [companyNameInput, setCompanyNameInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [gstinError, setGstinError] = useState('');
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);
  const [savingBilling, setSavingBilling] = useState(false);

  // Checkout
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const checkoutInFlight = useRef(false);
  const verifyingRef = useRef(false);

  const refreshData = () => {
    setSubscription(DataStore.getSubscription(employerId));
    setTransactions(DataStore.getBillingTransactions(employerId));
  };

  useEffect(() => {
    refreshData();
    window.addEventListener('driverhub_storage_updated', refreshData);
    return () => window.removeEventListener('driverhub_storage_updated', refreshData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employerId]);

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = (text: string, type: Toast['type'] = 'success') => {
    window.clearTimeout(toastTimer.current);
    setToast({ text, type });
    toastTimer.current = window.setTimeout(() => setToast(null), type === 'error' ? 7000 : type === 'info' ? 6000 : 4500);
  };

  const openGstinModal = () => {
    // Start from the saved billing profile every time the dialog opens.
    const current = DataStore.getSubscription(employerId);
    const employer = DataStore.getEmployerById(employerId);
    setGstinInput(current.gstin || employer?.gstin || '');
    setCompanyNameInput(current.billingCompanyName || employer?.companyName || '');
    setAddressInput(current.billingAddress || employer?.address || '');
    setGstinError('');
    setShowGstinModal(true);
  };

  const handleSaveGstin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingBilling) return;
    const billing = {
      gstin: gstinInput.trim().toUpperCase(),
      billingCompanyName: companyNameInput.trim(),
      billingAddress: addressInput.trim()
    };
    if (!/^[0-9A-Z]{15}$/.test(billing.gstin)) {
      setGstinError('GSTIN must be exactly 15 letters and digits.');
      return;
    }
    setGstinError('');
    setSavingBilling(true);
    clearLastError();
    let saved = false;
    try {
      saved = DataStore.isDemoMode()
        ? (DataStore.updateSubscription(employerId, billing), true)
        : await SupabaseSync.updateEmployerBillingProfile(employerId, billing);
      if (saved && !DataStore.isDemoMode()) {
        await SupabaseSync.fetchAndMergeRemoteData(DataStore);
      }
    } catch (err) {
      console.warn('Billing profile save error:', err);
    } finally {
      setSavingBilling(false);
    }
    if (!saved) {
      const reason = DataStore.getLastError('Billing profile could not be saved. Check your connection and try again.');
      setGstinError(reason);
      showToast(reason, 'error');
      return;
    }
    setShowGstinModal(false);
    refreshData();
    showToast('Billing profile saved. GSTIN verification is pending administrator review.');
  };

  const selectPlan = (plan: PlanCard) => {
    setCheckoutError('');
    setSelectedPlan({ ...plan, validity: `${t('validFor')} ${plan.days} ${t('days')}` });
  };

  const activateDemoPlan = () => {
    if (!selectedPlan || !demoCheckoutAvailable) return;
    const activated = DataStore.activateDemoPlan(employerId, selectedPlan.name, selectedPlan.amount,
      selectedPlan.jobs, selectedPlan.drivers, selectedPlan.days, selectedPlan.slots);
    if (!activated) return;
    showToast('Development demo plan activated. This is not a payment or production entitlement.', 'info');
    setShowPlansModal(false);
    setSelectedPlan(null);
    refreshData();
  };

  const finishCheckout = () => {
    checkoutInFlight.current = false;
    setCheckoutBusy(false);
  };

  const verifyPayment = async (response: RazorpaySuccessResponse, planName: string) => {
    verifyingRef.current = true;
    const result = await invokeEdgeFunction<{ verified?: boolean; already_applied?: boolean }>('verify-payment', {
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature
    });
    verifyingRef.current = false;

    if (result.data?.verified) {
      await SupabaseSync.fetchAndMergeRemoteData(DataStore);
      refreshData();
      setShowPlansModal(false);
      setSelectedPlan(null);
      showToast(`Payment successful. ${planName} is now active.`);
      return;
    }
    if (result.status === 409) {
      // The provider has the payment but has not confirmed capture yet; the webhook activates the plan.
      setShowPlansModal(false);
      setSelectedPlan(null);
      showToast('Payment received. Your plan is being activated and will appear here shortly.', 'info');
      void SupabaseSync.fetchAndMergeRemoteData(DataStore);
      return;
    }
    const reason = result.status === 503 && /not configured/i.test(result.error || '')
      ? 'Online payment is not configured yet — contact DriverHub support.'
      : result.error || 'The payment could not be verified.';
    setCheckoutError(reason.includes(response.razorpay_payment_id)
      ? reason
      : `${reason} If money was deducted, contact DriverHub support with payment ID ${response.razorpay_payment_id}.`);
  };

  const startCheckout = async () => {
    if (!selectedPlan || checkoutInFlight.current) return;
    checkoutInFlight.current = true;
    setCheckoutBusy(true);
    setCheckoutError('');
    const plan = selectedPlan;

    const order = await invokeEdgeFunction<PaymentOrder>('create-payment-order', { plan_code: plan.code });
    if (!order.data || !order.data.order_id) {
      setCheckoutError(order.status === 503
        ? 'Online payment is not configured yet — contact DriverHub support.'
        : order.error || 'Checkout could not be started. Please try again.');
      finishCheckout();
      return;
    }

    let Razorpay;
    try {
      Razorpay = await loadRazorpayCheckout();
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'The payment window could not be loaded.');
      finishCheckout();
      return;
    }

    try {
      const checkout = new Razorpay({
        key: order.data.key_id,
        order_id: order.data.order_id,
        amount: order.data.amount,
        currency: order.data.currency,
        name: 'DriverHub',
        description: order.data.name,
        prefill: {
          email: order.data.email || currentUser?.email || undefined,
          contact: order.data.contact || undefined
        },
        theme: { color: '#19745B' },
        handler: (response) => {
          void verifyPayment(response, order.data!.name || plan.name).finally(finishCheckout);
        },
        modal: {
          ondismiss: () => {
            if (verifyingRef.current) return;
            finishCheckout();
            showToast('Payment window closed. You can restart checkout at any time.', 'info');
          }
        }
      });
      checkout.on('payment.failed', (failure) => {
        setCheckoutError(failure?.error?.description || 'The payment failed. You can try again with another method.');
      });
      checkout.open();
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'The payment window could not be opened.');
      finishCheckout();
    }
  };

  const filteredTxns = transactions.filter(txn => {
    if (statusFilter === 'All') return true;
    if (statusFilter === 'Failed') return txn.status === 'Failed' || txn.status === 'Cancelled';
    return txn.status === statusFilter;
  });

  const planIsActive = subscription.status === 'active' && Date.parse(subscription.expiresAt) > Date.now();
  const planExpiry = !Number.isNaN(Date.parse(subscription.expiresAt)) && Date.parse(subscription.expiresAt) > 0
    ? formatDay(new Date(subscription.expiresAt))
    : '';

  const plans: PlanCard[] = [
    { code: 'jobs-3', name: `3 ${t('jobCredits')}`, amount: 1949, jobs: 3, drivers: 0, days: 30, slots: 0, old: 2097, detail: t('idealForSmallTeams') },
    { code: 'jobs-6', name: `6 ${t('jobCredits')}`, amount: 3649, jobs: 6, drivers: 0, days: 90, slots: 0, old: 4194, detail: t('forGrowingFleets'), recommended: true },
    { code: 'jobs-13', name: `13 ${t('jobCredits')}`, amount: 7099, jobs: 13, drivers: 0, days: 180, slots: 0, old: 9087, detail: t('forLargerNeeds') },
    { code: 'unlimited-quarterly', name: 'DriverHub Unlimited', amount: 5999, jobs: 0, drivers: 600, days: 90, slots: 1, detail: t('quarterlyPlanSingleCity') },
  ];

  return (
    <div className="space-y-6 pb-12">
      {toast && (
        <div
          role={toast.type === 'error' ? 'alert' : 'status'}
          className={`fixed top-4 sm:top-20 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-[60] flex items-start gap-2 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold animate-in fade-in ${
            toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-[#08233F] text-white border-slate-700'
          }`}
        >
          {toast.type === 'error'
            ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-px" />
            : toast.type === 'info'
            ? <Info className="w-4 h-4 text-amber-300 shrink-0 mt-px" />
            : <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-px" />}
          <span className="min-w-0 flex-1 break-words">{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss"
            className="-my-2 -mr-2 min-h-10 min-w-10 inline-flex items-center justify-center opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 font-display">{t('billing')}</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('billingDesc')}
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 shadow-2xs flex items-center gap-2 flex-wrap">
            <Wallet className="w-4 h-4 text-emerald-700" />
            <span>{t('jobCredits')}: <strong className="text-emerald-700">{subscription.jobCredits}</strong></span>
            <span className="text-slate-300">|</span>
            <span>{t('dbUnlocks')}: <strong className="text-blue-700">{subscription.dbUnlockCredits}</strong></span>
          </div>

          <button
            onClick={() => setShowPlansModal(true)}
            className="px-4 py-2.5 bg-[#19745B] hover:bg-[#135A46] text-white font-bold rounded-xl text-xs shadow-sm cursor-pointer inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" /> {t('buyCreditsUpgrade')}
          </button>
        </div>
      </div>

      {/* Billing Profile Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle p-4 sm:p-7">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2.5 min-w-0">
            <h2 className="text-base font-extrabold text-slate-900">{t('billingProfile')}</h2>

            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="font-bold text-slate-800">GSTIN:</span>
              <span className="text-slate-700 font-mono break-all">{subscription.gstin || 'Not added yet'}</span>
              {subscription.gstin && (
                <span className={`inline-flex items-center gap-1 font-bold ${subscription.gstinVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {subscription.gstinVerified ? <><CheckCircle2 className="w-3.5 h-3.5 fill-emerald-600 text-white" /> {t('verified')}</> : t('verificationPending')}
                </span>
              )}
            </div>

            <div className="text-xs break-words">
              <span className="font-bold text-slate-800">{t('companyName')}: </span>
              <span className="text-slate-700">{subscription.billingCompanyName || 'Not added yet'}</span>
            </div>

            <div className="text-xs max-w-2xl leading-relaxed break-words">
              <span className="font-bold text-slate-800">{t('address')}: </span>
              <span className="text-slate-600">{subscription.billingAddress || 'Not added yet'}</span>
            </div>
          </div>

          <button
            onClick={openGstinModal}
            className="min-h-10 px-4 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 shadow-2xs shrink-0 self-start cursor-pointer"
          >
            {t('updateGstin')}
          </button>
        </div>
      </div>

      {/* Yellow ISD-GSTIN Info Banner */}
      <div className="bg-[#FEF9E7] border border-amber-200/80 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-start sm:items-center gap-2 text-slate-800">
          <Info className="w-4 h-4 text-slate-700 shrink-0" />
          <span>{t('isdGstinNotice')}</span>
        </div>
        <button
          onClick={openGstinModal}
          className="min-h-10 text-blue-600 hover:text-blue-800 font-semibold underline shrink-0 text-left cursor-pointer"
        >
          {t('updateGstin')}
        </button>
      </div>

      {/* Billing History Card & Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-subtle overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-base font-extrabold text-slate-900">{t('billingHistory')}</h2>
            <span className="text-xs text-slate-500 break-words">
              {t('activePlan')}:{' '}
              <strong className={planIsActive ? 'text-emerald-700' : 'text-slate-700'}>{subscription.planName}</strong>
              {planIsActive && planExpiry ? ` · valid until ${planExpiry}` : !planIsActive && planExpiry ? ` · expired ${planExpiry}` : ''}
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Success', 'Pending', 'Failed'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`min-h-10 px-4 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                  statusFilter === tab
                    ? 'bg-blue-50 text-blue-800 border-blue-500 font-bold'
                    : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {tab === 'All' ? t('all') : tab === 'Success' ? t('success') : tab === 'Pending' ? t('pending') : 'Failed / Cancelled'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold text-slate-600">
                <th className="py-3.5 px-4 sm:px-6">{t('date')}</th>
                <th className="py-3.5 px-4 sm:px-6">{t('planDetails')}</th>
                <th className="py-3.5 px-4 sm:px-6">{t('appliesUntil')}</th>
                <th className="py-3.5 px-4 sm:px-6">{t('amount')}</th>
                <th className="py-3.5 px-4 sm:px-6">{t('status')}</th>
                <th className="py-3.5 px-4 sm:px-6">{t('action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {filteredTxns.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 px-6 text-center text-slate-500">
                    {transactions.length === 0 ? 'No payments yet. Your plan purchases will appear here.' : 'No transactions match this filter.'}
                  </td>
                </tr>
              )}
              {filteredTxns.map(txn => {
                const when = formatTxnWhen(txn);
                return (
                  <tr key={txn.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                      <div className="font-semibold text-slate-800">{when.date}</div>
                      <div className="text-[11px] text-slate-500">{when.time}</div>
                    </td>
                    <td className="py-4 px-4 sm:px-6">
                      <button
                        onClick={() => setShowPlansModal(true)}
                        className="font-semibold text-slate-800 underline hover:text-blue-700 text-left cursor-pointer"
                      >
                        {txn.planDetails}
                      </button>
                      {txn.invoiceId && <div className="text-[10px] text-slate-400 mt-0.5 font-mono">{txn.invoiceId}</div>}
                    </td>
                    <td className="py-4 px-4 sm:px-6 text-slate-600 whitespace-nowrap">{formatAppliesUntil(txn.appliesUntil)}</td>
                    <td className="py-4 px-4 sm:px-6 font-bold text-slate-900 whitespace-nowrap">
                      ₹ {Number(txn.amount || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                      {txn.status === 'Success' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {t('success')}
                        </span>
                      ) : txn.status === 'Pending' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          {t('pending')}
                        </span>
                      ) : txn.status === 'Cancelled' ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                          Cancelled
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 sm:px-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <Link
                          to="/contact"
                          className="inline-flex items-center gap-1.5 min-h-10 text-emerald-700 hover:text-emerald-900 font-bold"
                        >
                          <Phone className="w-3.5 h-3.5" /> {t('contactUs')}
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* UPDATE GSTIN MODAL */}
      {showGstinModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <form
            onSubmit={handleSaveGstin}
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-8 shadow-2xl border border-slate-200 space-y-4 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-extrabold text-[#08233F]">{t('updateGstin')}</h3>
              <button
                type="button"
                onClick={() => setShowGstinModal(false)}
                aria-label="Close"
                className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div>
              <label htmlFor="billing-gstin" className="block text-xs font-bold text-slate-700 mb-1">15-Digit GSTIN / ISD-GSTIN *</label>
              <input
                id="billing-gstin"
                type="text"
                required
                maxLength={15}
                autoCapitalize="characters"
                value={gstinInput}
                onChange={e => setGstinInput(e.target.value.toUpperCase())}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs font-mono"
              />
            </div>

            <div>
              <label htmlFor="billing-company" className="block text-xs font-bold text-slate-700 mb-1">{t('companyName')} *</label>
              <input
                id="billing-company"
                type="text"
                required
                value={companyNameInput}
                onChange={e => setCompanyNameInput(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label htmlFor="billing-address" className="block text-xs font-bold text-slate-700 mb-1">{t('address')} *</label>
              <textarea
                id="billing-address"
                rows={3}
                required
                value={addressInput}
                onChange={e => setAddressInput(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            {gstinError && (
              <p role="alert" className="text-xs font-semibold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 break-words">
                {gstinError}
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowGstinModal(false)}
                className="min-h-10 px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={savingBilling}
                className="min-h-10 px-5 py-2 bg-[#19745B] hover:bg-[#135A46] disabled:opacity-60 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                {savingBilling ? t('saving') : t('saveChanges')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUBSCRIPTION PLANS & CREDIT PACKAGES MODAL */}
      {showPlansModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl max-w-6xl w-full p-5 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90dvh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[11px] font-extrabold">
                  {t('driverHubHiringPlans')}
                </span>
                <h3 className="text-xl font-extrabold text-[#08233F] mt-1">
                  {t('everythingToHireDrivers')}
                </h3>
                <p className="text-xs text-slate-500">
                  {t('chooseCreditsOrSubscription')}
                </p>
              </div>
              <button
                onClick={() => { if (!checkoutBusy) setShowPlansModal(false); }}
                disabled={checkoutBusy}
                aria-label="Close"
                className="min-h-10 min-w-10 inline-flex items-center justify-center text-slate-400 hover:text-slate-900 cursor-pointer disabled:opacity-40 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {plans.map(plan => (
                <section key={plan.code} className={`relative p-5 rounded-2xl border flex flex-col justify-between gap-5 ${
                  selectedPlan?.code === plan.code ? 'border-emerald-600 ring-2 ring-emerald-500/30' : plan.recommended ? 'border-emerald-600 bg-emerald-50/30' : 'border-slate-200'
                }`}>
                  {plan.recommended && <span className="absolute -top-2.5 right-4 px-2.5 py-0.5 bg-emerald-600 text-white rounded-full text-[10px] font-bold">{t('recommended')}</span>}
                  <div className="space-y-2">
                    <h4 className="text-base font-extrabold text-slate-900">{plan.name}</h4>
                    <p className="text-xs text-slate-500">{plan.detail}</p>
                    <div className="text-2xl font-extrabold text-[#08233F]">₹{plan.amount.toLocaleString('en-IN')}</div>
                    {plan.old && <p className="text-[11px] text-slate-500 line-through">₹{plan.old.toLocaleString('en-IN')} {t('listPrice')}</p>}
                    <p className="text-[11px] text-slate-500">{t('validForDays', { days: plan.days })} · {t('gstAddedAtCheckout')}</p>
                    <ul className="space-y-1.5 pt-2 text-xs text-slate-700">
                      {plan.jobs > 0 && <li>✓ {plan.jobs} {t('driverJobCreditsDesc')}</li>}
                      {plan.drivers > 0 && <><li>✓ 1 {t('activeSlot90Days')}</li><li>✓ {plan.drivers} {t('driverDbCreditsDesc')}</li></>}
                      {plan.jobs > 0 && <li>✓ {t('chooseJobType')}</li>}
                      <li>✓ {t('driverAppsFollowUp')}</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => selectPlan(plan)}
                    disabled={checkoutBusy}
                    className="w-full min-h-10 py-2.5 bg-[#19745B] hover:bg-[#135A46] disabled:opacity-60 text-white font-bold rounded-xl text-xs cursor-pointer"
                  >
                    {t('viewOrder')}
                  </button>
                </section>
              ))}
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
              <div><strong className="text-slate-900">{t('needSingleCredit')}</strong><p className="text-slate-600 mt-0.5">{t('contactForOneCredit')}</p></div>
              <Link to="/contact" onClick={() => setShowPlansModal(false)} className="font-bold text-emerald-700 shrink-0">{t('contactSales')} →</Link>
            </div>
            <p className="text-xs text-slate-500">{t('creditUsageInfo')}</p>
            <section className="grid md:grid-cols-2 gap-6 border-t border-slate-200 pt-5">
              <div><h4 className="font-bold text-slate-900">{t('needCustomPlan')}</h4><p className="text-xs text-slate-600 mt-1">{t('tellAboutLocations')}</p><Link to="/contact" onClick={() => setShowPlansModal(false)} className="inline-block mt-3 text-sm font-bold text-emerald-700">{t('contactSales')} →</Link></div>
              <div><h4 className="font-bold text-slate-900">{t('faqs')}</h4><details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">{t('faqCreditsWork')}</summary><p className="mt-1">{t('faqCreditsAnswer')}</p></details><details className="mt-2 text-xs text-slate-600"><summary className="cursor-pointer font-semibold">{t('faqMoreCandidates')}</summary><p className="mt-1">{t('faqMoreCandidatesAnswer')}</p></details></div>
            </section>
            {selectedPlan && (
              <aside className="rounded-2xl bg-slate-50 border border-slate-200 p-4 sm:p-5 grid md:grid-cols-[1fr_auto] gap-4 items-center">
                <div className="min-w-0">
                  <h4 className="font-bold text-slate-900">{t('orderSummary')} · {selectedPlan.name}</h4>
                  <p className="text-xs text-slate-600 mt-1">{selectedPlan.jobs ? `${selectedPlan.jobs} ${t('jobCredits')}` : `${selectedPlan.drivers} ${t('dbUnlocks')}`} · {selectedPlan.validity}</p>
                  <div className="text-xs text-slate-600 mt-3 space-y-1">
                    <p className="flex justify-between gap-4">{t('subtotal')} <span>₹{selectedPlan.amount.toLocaleString('en-IN')}</span></p>
                    <p className="flex justify-between gap-4">GST (18%) <span>₹{gstFor(selectedPlan.amount).toLocaleString('en-IN')}</span></p>
                    <p className="flex justify-between gap-4 font-extrabold text-slate-900 border-t border-slate-200 pt-2">{t('totalInclGst')} <span>₹{(selectedPlan.amount + gstFor(selectedPlan.amount)).toLocaleString('en-IN')}</span></p>
                  </div>
                </div>
                <div className="md:text-right">
                  {demoCheckoutAvailable ? (
                    <>
                      <p className="text-xs text-amber-800 font-semibold">{t('devTestCheckout')}</p>
                      <p className="text-[11px] text-slate-500 mt-1">{t('noRealPaymentDemo')}</p>
                      <button onClick={activateDemoPlan} className="mt-3 w-full md:w-auto min-h-10 px-5 py-2.5 rounded-xl bg-[#19745B] text-white text-xs font-bold">{t('activateDemoPlan')}</button>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] text-slate-500">Secure payment by Razorpay (UPI, cards, net banking).</p>
                      <button
                        onClick={startCheckout}
                        disabled={checkoutBusy}
                        className="mt-3 w-full md:w-auto min-h-10 px-5 py-2.5 rounded-xl bg-[#19745B] hover:bg-[#135A46] disabled:opacity-60 disabled:cursor-wait text-white text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
                      >
                        {checkoutBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                        {checkoutBusy ? 'Processing payment…' : `${t('proceedToPayment')} · ₹${(selectedPlan.amount + gstFor(selectedPlan.amount)).toLocaleString('en-IN')}`}
                      </button>
                    </>
                  )}
                </div>
                {checkoutError && (
                  <p role="alert" className="md:col-span-2 text-xs font-semibold text-rose-700 bg-rose-50 p-2.5 rounded-xl border border-rose-200 break-words">
                    {checkoutError}
                  </p>
                )}
              </aside>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
